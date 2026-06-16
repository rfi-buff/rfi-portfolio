# 📈 RFI Portfolio

A web app for tracking your Indonesian stock portfolio (IDX) with real-time market prices, automatic gain/loss calculation, and interactive charts per stock.

---

## ✨ Features
- Dedicated login page with **Google Sign-In** and **Email/Password**
- Per-user data stored in Firestore cloud (syncs across devices)
- Market prices auto-refresh every 60 seconds via Yahoo Finance
- Automatic Gain/Loss in Rp and %
- Interactive chart per stock (1 Day to 1 Year)
- Auto dark mode support

---

## 🚀 Setup Guide

### 1. Create a GitHub Repository

1. Go to [github.com](https://github.com) → click **New repository**
2. Give it a name (e.g. `rfi-portfolio`) → **Create repository**
3. Extract the downloaded zip, then push all files:

```bash
git init
git add .
git commit -m "Initial setup"
git remote add origin https://github.com/rfi-buff/rfi-portfolio.git
git push -u origin main
```

---

### 2. Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `rfi-portfolio`)
3. Disable Google Analytics (optional) → **Create project**

---

### 3. Enable Authentication Methods

1. Firebase Console → **Authentication** → **Get started**
2. Go to the **Sign-in method** tab:
   - Enable **Email/Password** → Save
   - Enable **Google** → set Project support email → Save

---

### 4. Create a Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → region `asia-southeast2` (Jakarta) → Enable
3. Open the **Rules** tab and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/stocks/{stockId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
4. Click **Publish**

---

### 5. Get Your Firebase Config

1. Firebase Console → ⚙️ **Project Settings** → **General** tab
2. Scroll to **Your apps** → click `</>` (Web) → give it a name → **Register app**
3. Copy the `firebaseConfig` object

---

### 6. Paste Config into Code

Open `js/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "rfi-portfolio.firebaseapp.com",
  projectId: "rfi-portfolio",
  storageBucket: "rfi-portfolio.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Push the update:

```bash
git add js/firebase.js
git commit -m "Add Firebase config"
git push
```

---

### 7. Deploy to GitHub Pages

1. GitHub repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)` → **Save**
3. Your app will be live at: `https://rfi-buff.github.io/rfi-portfolio`

---

### 8. Authorize Your Domain in Firebase

Required for both Email/Password and Google Sign-In to work on GitHub Pages:

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain** → enter `rfi-buff.github.io` → Save

> **Note for Google Sign-In:** Google OAuth also requires your full GitHub Pages URL to be added as an authorized redirect URI in the [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → your OAuth 2.0 Client → Authorized redirect URIs → add `https://rfi-buff.github.io/rfi-portfolio`.

---

## 📁 File Structure

```
├── index.html          # Main portfolio app (requires login)
├── login.html          # Login page (Google + Email/Password)
├── css/
│   ├── style.css       # App styles
│   └── login.css       # Login page styles
├── js/
│   ├── firebase.js     # Firebase config & init  ← FILL IN YOUR CONFIG HERE
│   ├── login.js        # Login page logic
│   └── app.js          # Portfolio app logic
└── README.md
```

---

## 🔒 Security
- Each user can only read and write their own stock data (Firestore rules)
- Authentication handled entirely by Firebase — no passwords stored in your code

---

## 📊 Market Price Data Source
Prices are fetched from **Yahoo Finance** (free, no API key required).
Ticker format: stock code + `.JK` — e.g. `BBCA.JK`, `TLKM.JK`, `GOTO.JK`
