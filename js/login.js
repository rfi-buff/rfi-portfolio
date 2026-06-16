import { auth, googleProvider } from './firebase.js';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// If already logged in, go straight to app
onAuthStateChanged(auth, user => {
  if (user) window.location.href = 'index.html';
});

// ── Toggle password visibility ──────────────────────────────
const togglePw  = document.getElementById('toggle-pw');
const eyeIcon   = document.getElementById('eye-icon');
const pwInput   = document.getElementById('password');

togglePw.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
  eyeIcon.className = isText ? 'ti ti-eye' : 'ti ti-eye-off';
});

// ── Mode toggle: login ↔ register ──────────────────────────
let mode = 'login';
const card        = document.querySelector('.form-card');
const formHeader  = document.querySelector('.form-header h2');
const formSubhead = document.querySelector('.form-header p');
const btnSubmit   = document.getElementById('btn-submit');
const linkReg     = document.getElementById('link-register');

linkReg.addEventListener('click', () => {
  mode = mode === 'login' ? 'register' : 'login';
  if (mode === 'register') {
    formHeader.textContent  = 'Create account';
    formSubhead.textContent = 'Register to start tracking';
    btnSubmit.innerHTML     = '<i class="ti ti-user-plus"></i> Create Account';
    linkReg.textContent     = 'Sign in instead';
  } else {
    formHeader.textContent  = 'Welcome back';
    formSubhead.textContent = 'Sign in to your portfolio';
    btnSubmit.innerHTML     = '<i class="ti ti-login"></i> Sign In';
    linkReg.textContent     = 'Create one';
  }
  showErr('');
});

// ── Error helper ───────────────────────────────────────────
function showErr(msg) {
  const el = document.getElementById('form-err');
  el.textContent = msg;
  el.className = 'form-err' + (msg ? ' show' : '');
}

const errMsgs = {
  'auth/user-not-found':       'No account found with this email.',
  'auth/wrong-password':       'Incorrect password.',
  'auth/invalid-credential':   'Invalid email or password.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/weak-password':        'Password must be at least 6 characters.',
  'auth/invalid-email':        'Please enter a valid email address.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/popup-blocked':        'Pop-up blocked by browser. Please allow pop-ups and try again.',
};

// ── Google Sign-In ─────────────────────────────────────────
document.getElementById('btn-google').addEventListener('click', async () => {
  showErr('');
  try {
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged will redirect
  } catch (e) {
    showErr(errMsgs[e.code] || 'Google sign-in failed. Try again.');
  }
});

// ── Email / Password ───────────────────────────────────────
btnSubmit.addEventListener('click', handleEmailAuth);
document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleEmailAuth();
});
document.getElementById('email').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('password').focus();
});

async function handleEmailAuth() {
  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;
  showErr('');
  if (!email || !pass) { showErr('Please fill in both fields.'); return; }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="ti ti-loader-2"></i> Please wait...';

  try {
    if (mode === 'login') {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      await createUserWithEmailAndPassword(auth, email, pass);
    }
    // onAuthStateChanged will redirect
  } catch (e) {
    showErr(errMsgs[e.code] || 'Something went wrong. Please try again.');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = mode === 'login'
      ? '<i class="ti ti-login"></i> Sign In'
      : '<i class="ti ti-user-plus"></i> Create Account';
  }
}
