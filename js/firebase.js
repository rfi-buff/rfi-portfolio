// ============================================================
//  FIREBASE CONFIG
//  Replace the values below with your own Firebase project.
//  Get them from: Firebase Console → Project Settings → Your Apps
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBj9t4Zemv86Psnzr0l0X6Q5DgmTxv-hkY",
  authDomain: "rfi-portfolio.firebaseapp.com",
  projectId: "rfi-portfolio",
  storageBucket: "rfi-portfolio.firebasestorage.app",
  messagingSenderId: "150811333694",
  appId: "1:150811333694:web:d6bfce199e6d8bb462ad6f"
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

export const db       = getFirestore(app);
export const auth     = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
