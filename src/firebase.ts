import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBYFnlPGLGtZvGHMama4dAS9wIZ9JXM4z4",
  authDomain: "smartdine-pro.firebaseapp.com",
  projectId: "smartdine-pro",
  storageBucket: "smartdine-pro.firebasestorage.app",
  messagingSenderId: "413474090630",
  appId: "1:413474090630:web:6108e771cab4d7c240eb07",
  measurementId: "G-EH0580SGWB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
