import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6ag7IztpbBCqGrIu8OyElhocRG3PJhsE",
  authDomain: "fs-avee-style-music-visualizer.firebaseapp.com",
  projectId: "fs-avee-style-music-visualizer",
  storageBucket: "fs-avee-style-music-visualizer.firebasestorage.app",
  messagingSenderId: "373529995834",
  appId: "1:373529995834:web:8636c65287c788de176303",
  measurementId: "G-S0TMQEVW1L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
