import { db, auth } from './firebase.js';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── State ──────────────────────────────────────────────────
let stocks      = [];
let unsubscribe = null;
let currentUser = null;
const priceCache = {};

// ── Auth guard ─────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  document.getElementById('loading-screen').style.display = 'none';
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  document.getElementById('app-wrap').style.display = 'block';

  // Show user avatar / name in header
  const badge = document.getElementById('user-badge');
  if (user.photoURL) {
    badge.innerHTML = `<img src="${user.photoURL}" alt="avatar" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">`;
  } else {
    const initials = (user.displayName || user.email || 'U').slice(0, 2).toUpperCase();
    badge.innerHTML = `<div style="width:30px;height:30px;border-radius:50%;background:#1D9E75;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">${initials}</div>`;
  }

  document.getElementById('btn-logout').onclick = () => signOut(auth);
  subscribeToStocks();
  setInterval(() => { if (stocks.length) refreshAll(); }, 60000);
});

// ── Firestore listener ─────────────────────────────────────
function subscribeToStocks() {
  if (!currentUser) return;
  const ref = collection(db, 'users', currentUser.uid, 'stocks');
  const q   = query(ref, orderBy('createdAt', 'asc'));
  unsubscribe = onSnapshot(q, snapshot => {
    stocks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
    if (stocks.length) refreshAll();
  });
}

// ── Add stock panel ────────────────────────────────────────
window.togglePanel = function() {
  const p   = document.getElementById('add-panel');
  const open = p.classList.toggle('open');
  const btn  = document.getElementById('btn-open-add');
  btn.innerHTML = open
    ? '<i class="ti ti-x"></i> Tutup'
    : '<i class="ti ti-plus"></i> Tambah Saham';
  if (open) {
    document.getElementById('f-date').value = todayISO();
    document.getElementById('f-code').focus();
    document.getElementById('form-err').style.display = 'none';
  }
};

window.submitRow = async function() {
  const code     = document.getElementById('f-code').value.trim().toUpperCase();
  const buyDate  = document.getElementById('f-date').value;
  const lot      = parseFloat(document.getElementById('f-lot').value);
  const buyPrice = parseFloat(document.getElementById('f-price').value);
  const broker   = document.getElementById('f-broker').value.trim();
  const err      = document.getElementById('form-err');

  if (!code || !buyDate || isNaN(lot) || lot <= 0 || isNaN(buyPrice) || buyPrice < 0) {
    err.style.display = 'block'; return;
  }
  err.style.display = 'none';
  if (!currentUser) return;

  const ref = collection(db, 'users', currentUser.uid, 'stocks');
  await addDoc(ref, { code, buyDate, lot, buyPrice, broker: broker || '—', createdAt: Date.now() });

  ['f-code','f-lot','f-price','f-broker'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-date').value = todayISO();
};

// ── Delete ─────────────────────────────────────────────────
window.deleteRow = async function(stockId, code) {
  if (!confirm(`Hapus saham ${code}?`)) return;
  if (!currentUser) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'stocks', stockId));
};

// ── Fetch market price ─────────────────────────────────────
async function fetchPrice(code) {
  const now = Date.now();
  if (priceCache[code] && now - priceCache[code].ts < 55000) return priceCache[code].price;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${code}.JK?interval=1m&range=1d&nocache=${now}`
    );
    const d = await r.json();
    const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
    priceCache[code] = { price: p, ts: now };
    return p;
  } catch { return null; }
}

window.refreshAll = async function() {
  if (!stocks.length) return;
  const codes = [...new Set(stocks.map(s => s.code))];
  await Promise.all(codes.map(c => fetchPrice(c)));
  renderTable();
  document.getElementById('last-update').textContent =
    'Diperbarui: ' + new Date().toLocaleTimeString('id-ID');
};

// ── Render table ───────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('stock-body');
  if (!stocks.length) {
    tbody.innerHTML = `<tr class="empty-row">
      <td colspan="12"><i class="ti ti-plant"></i>Belum ada saham. Klik "Tambah Saham" untuk mulai.</td>
    </tr>`;
    updateSummary(); return;
  }
  tbody.innerHTML = stocks.map((s, i) => {
    const mktPrice = priceCache[s.code]?.price ?? null;
    const modal    = (s.lot || 0) * 100 * (s.buyPrice || 0);
    const mktVal   = mktPrice != null ? (s.lot || 0) * 100 * mktPrice : null;
    const gl       = mktVal != null ? mktVal - modal : null;
    const pct      = modal && gl != null ? (gl / modal) * 100 : null;
    const glCls    = gl == null ? 'neu' : gl > 0 ? 'pos' : 'neg';
    const pctCls   = pct == null ? 'neu' : pct > 0 ? 'pos' : 'neg';

    const mktDisp = mktPrice != null
      ? `<span class="mkt ${glCls}">${mktPrice.toLocaleString('id-ID')}</span>`
      : `<span class="mkt neu"><i class="ti ti-loader-2 spinning"></i></span>`;
    const glDisp  = gl != null
      ? `<span class="badge ${glCls}">${gl >= 0 ? '+' : ''}${Math.round(gl).toLocaleString('id-ID')}</span>`
      : `<span class="badge neu">—</span>`;
    const pctDisp = pct != null
      ? `<span class="badge ${pctCls}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>`
      : `<span class="badge neu">—</span>`;

    return `<tr>
      <td class="tc">${i + 1}</td>
      <td class="tl"><strong>${s.code}</strong></td>
      <td class="tl">${fmtDate(s.buyDate)}</td>
      <td>${(s.lot || 0).toLocaleString('id-ID')}</td>
      <td>${(s.buyPrice || 0).toLocaleString('id-ID')}</td>
      <td>${fmt(modal)}</td>
      <td>${mktDisp}</td>
      <td>${glDisp}</td>
      <td>${pctDisp}</td>
      <td class="tl">${s.broker || '—'}</td>
      <td class="tc">
        <button class="btn-chart" onclick="openChart('${s.code}',${s.buyPrice || 0})"
          title="Chart ${s.code}" aria-label="Chart ${s.code}">
          <i class="ti ti-chart-candlestick"></i>
        </button>
      </td>
      <td class="tc">
        <button class="btn-del" onclick="deleteRow('${s.id}','${s.code}')"
          title="Hapus" aria-label="Hapus ${s.code}">
          <i class="ti ti-x"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
  updateSummary();
}

function updateSummary() {
  let totalModal = 0, totalMkt = 0, hasMkt = false;
  stocks.forEach(s => {
    const modal    = (s.lot || 0) * 100 * (s.buyPrice || 0);
    const mktPrice = priceCache[s.code]?.price ?? null;
    totalModal += modal;
    if (mktPrice != null) { totalMkt += (s.lot || 0) * 100 * mktPrice; hasMkt = true; }
    else totalMkt += modal;
  });
  const gl  = totalMkt - totalModal;
  const pct = totalModal ? (gl / totalModal) * 100 : 0;

  document.getElementById('s-modal').textContent  = fmt(totalModal);
  document.getElementById('s-market').textContent = hasMkt ? fmt(totalMkt) : '—';
  const gs = document.getElementById('s-gain');
  gs.textContent = hasMkt ? (gl >= 0 ? '' : '-') + 'Rp ' + Math.abs(Math.round(gl)).toLocaleString('id-ID') : '—';
  gs.className = 'sval ' + (gl >= 0 ? 'pos' : 'neg');
  const ps = document.getElementById('s-pct');
  ps.textContent = hasMkt ? fmtPct(pct) : '—';
  ps.className = 'sval ' + (pct >= 0 ? 'pos' : 'neg');
}

// ── Chart window ───────────────────────────────────────────
window.openChart = function(code, buyPrice) {
  const ticker = code + '.JK';
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${code} – Chart</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;padding:20px}h1{font-size:20px;font-weight:600;margin-bottom:4px;color:#fff}.sub{font-size:13px;color:#94a3b8;margin-bottom:16px}.pills{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}.pill{background:#1e2433;border:1px solid #2d3748;border-radius:6px;padding:5px 14px;font-size:12px;cursor:pointer;color:#94a3b8}.pill.active,.pill:hover{background:#3266ad;border-color:#3266ad;color:#fff}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:16px}.stat{background:#1e2433;border-radius:8px;padding:10px 12px}.stat .l{font-size:10px;color:#64748b;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}.stat .v{font-size:16px;font-weight:600}.stat .v.pos{color:#10b981}.stat .v.neg{color:#f87171}.cw{background:#1e2433;border-radius:12px;padding:16px;position:relative;height:340px}#ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#1e2433;font-size:13px;color:#64748b;z-index:10}.err{text-align:center;padding:3rem;color:#f87171;font-size:14px}</style>
</head><body>
<h1>${code} <span style="font-size:14px;color:#64748b;font-weight:400">IDX</span></h1>
<div class="sub" id="sub">Memuat data...</div>
<div class="pills"><button class="pill active" onclick="lc('1d',this)">1 Hari</button><button class="pill" onclick="lc('5d',this)">5 Hari</button><button class="pill" onclick="lc('1mo',this)">1 Bulan</button><button class="pill" onclick="lc('3mo',this)">3 Bulan</button><button class="pill" onclick="lc('6mo',this)">6 Bulan</button><button class="pill" onclick="lc('1y',this)">1 Tahun</button></div>
<div class="stats"><div class="stat"><div class="l">Harga Sekarang</div><div class="v" id="sn">—</div></div><div class="stat"><div class="l">Harga Beli</div><div class="v">${buyPrice ? 'Rp ' + Number(buyPrice).toLocaleString('id-ID') : '—'}</div></div><div class="stat"><div class="l">Tertinggi</div><div class="v" id="sh">—</div></div><div class="stat"><div class="l">Terendah</div><div class="v" id="sl">—</div></div><div class="stat"><div class="l">Volume</div><div class="v" id="sv">—</div></div><div class="stat"><div class="l">Gain/Loss</div><div class="v" id="sg">—</div></div></div>
<div class="cw"><div id="ld">Memuat chart...</div><canvas id="mc" role="img" aria-label="Chart ${code}" style="height:100%"></canvas></div>
<script>
const BP=${buyPrice||0};let mc=null;
const im={'1d':'5m','5d':'30m','1mo':'1d','3mo':'1d','6mo':'1wk','1y':'1wk'};
async function lc(r,b){
  document.querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));if(b)b.classList.add('active');
  document.getElementById('ld').style.display='flex';
  try{
    const res=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range='+r+'&interval='+(im[r]||'1d')+'&nocache='+Date.now());
    const j=await res.json();const rs=j?.chart?.result?.[0];if(!rs)throw 0;
    const m=rs.meta,ts=rs.timestamp||[],q=rs.indicators?.quote?.[0]||{};
    const lb=ts.map(t=>{const d=new Date(t*1000);return r==='1d'?d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'});});
    const pr=q.close?.map(v=>v!=null?+v.toFixed(0):null)||[];
    const vl=pr.filter(v=>v!=null);
    const mxh=Math.max(...(q.high||[]).filter(v=>v!=null));
    const mnl=Math.min(...(q.low||[]).filter(v=>v!=null));
    const lv=[...(q.volume||[])].reverse().find(v=>v!=null);
    const nw=m.regularMarketPrice;const gl=BP?((nw-BP)/BP*100):null;
    const ip=vl.length>1?vl[vl.length-1]>=vl[0]:true;
    document.getElementById('sub').textContent=m.fullExchangeName+' · '+m.currency;
    document.getElementById('sn').textContent=nw?'Rp '+nw.toLocaleString('id-ID'):'—';
    document.getElementById('sh').textContent=mxh&&isFinite(mxh)?'Rp '+mxh.toLocaleString('id-ID'):'—';
    document.getElementById('sl').textContent=mnl&&isFinite(mnl)?'Rp '+mnl.toLocaleString('id-ID'):'—';
    document.getElementById('sv').textContent=lv?(lv/1e6).toFixed(1)+'M':'—';
    const ge=document.getElementById('sg');
    if(gl!=null){ge.textContent=(gl>=0?'+':'')+gl.toFixed(2)+'%';ge.className='v '+(gl>=0?'pos':'neg');}else ge.textContent='—';
    const ds=[{label:'Harga',data:pr,borderColor:ip?'#10b981':'#f87171',backgroundColor:ip?'rgba(16,185,129,0.08)':'rgba(248,113,113,0.08)',borderWidth:2,pointRadius:0,pointHoverRadius:4,fill:true,tension:0.3,spanGaps:true}];
    if(BP)ds.push({label:'Harga Beli',data:pr.map(()=>BP),borderColor:'#f59e0b',borderWidth:1.5,borderDash:[5,4],pointRadius:0,fill:false,spanGaps:true});
    if(mc)mc.destroy();
    const av=[...vl,BP].filter(Boolean);
    mc=new Chart(document.getElementById('mc').getContext('2d'),{type:'line',data:{labels:lb,datasets:ds},options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},interaction:{mode:'index',intersect:false},plugins:{legend:{display:BP>0,labels:{color:'#94a3b8',font:{size:11},boxWidth:12}},tooltip:{backgroundColor:'#1e293b',titleColor:'#e2e8f0',bodyColor:'#94a3b8',borderColor:'#334155',borderWidth:1,callbacks:{label:c=>{const v=c.raw;if(v==null)return'';let l=c.dataset.label+': Rp '+v.toLocaleString('id-ID');if(c.datasetIndex===0&&BP){const d=v-BP;l+=' ('+(d>=0?'+':'')+d.toLocaleString('id-ID')+' / '+(d>=0?'+':'')+((d/BP)*100).toFixed(2)+'%)';}return l;}}}},scales:{x:{ticks:{color:'#475569',maxTicksLimit:8,font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.08)'}},y:{ticks:{color:'#475569',font:{size:10},callback:v=>'Rp '+Math.round(v).toLocaleString('id-ID')},grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.08)'},min:Math.min(...av)*0.995,max:Math.max(...av)*1.005}}}});
    document.getElementById('ld').style.display='none';
  }catch(e){document.getElementById('ld').style.display='none';document.querySelector('.cw').innerHTML='<div class="err">⚠️ Gagal memuat data.</div>';}
}
lc('1d',document.querySelector('.pill.active'));
<\/script></body></html>`;
  const w = window.open('', '_blank', 'width=820,height=620,scrollbars=yes,resizable=yes');
  w.document.write(html); w.document.close();
};

// ── Helpers ────────────────────────────────────────────────
function fmt(n)    { return n == null || isNaN(n) ? '—' : 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function fmtPct(n) { return n == null || isNaN(n) ? '—' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? s : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
