// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// (from your Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyCnryC_Ma6OyA6AMAWIeNCYX4dzR0eo2k4",
  authDomain: "skatingscheduler-b94ba.firebaseapp.com",
  projectId: "skatingscheduler-b94ba",
  storageBucket: "skatingscheduler-b94ba.firebasestorage.app",
  messagingSenderId: "125628612200",
  appId: "1:125628612200:web:9961671a51385a47ca85dd",
  measurementId: "G-MM2DXFLJ10",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (for storing lessons)
export const db = getFirestore(app);

// Optional: Initialize Analytics (you can ignore if you don’t use it)
export const analytics = getAnalytics(app);
