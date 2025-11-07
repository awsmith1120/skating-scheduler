import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCnryC_Ma6OyA6AMAWIeNCYX4dzR0eo2k4",
  authDomain: "skatingscheduler-b94ba.firebaseapp.com",
  projectId: "skatingscheduler-b94ba",
  storageBucket: "skatingscheduler-b94ba.firebasestorage.app",
  messagingSenderId: "125628612200",
  appId: "1:125628612200:web:9961671a51385a47ca85dd",
  measurementId: "G-MM2DXFLJ10",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const analytics = getAnalytics(app);
