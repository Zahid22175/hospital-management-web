import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB_s10MgIZGnZFhYc45AYmSzMLY1aNlMm8",
  authDomain: "patient-management-e94a1.firebaseapp.com",
  projectId: "patient-management-e94a1",
  storageBucket: "patient-management-e94a1.firebasestorage.app",
  messagingSenderId: "585502487",
  appId: "1:585502487:web:51671a9d4fd3830482f152",
  measurementId: "G-735LKZ6MZ5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === SECONDARY APP FOR DOCTOR CREATION (ADMIN SESSION SAFE) ===
const secondaryApp = initializeApp(firebaseConfig, "SecondaryDoctorApp");
const secondaryAuth = getAuth(secondaryApp);

export {
  auth,
  db,
  secondaryAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  collection,
  addDoc,
  setDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
};