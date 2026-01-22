import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔧 CONFIG FIREBASE (ENV VARS)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 🔥 INIT APP
const app = initializeApp(firebaseConfig);

// 🔐 AUTH COM PERSISTÊNCIA (ESSENCIAL NO VERCEL)
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Erro ao persistir auth:", err);
});

// 🔥 FIRESTORE
export const db = getFirestore(app);

// 📦 STORAGE — BUCKET FORÇADO (FIX DEFINITIVO PARA VERCEL)
export const storage = getStorage(
  app,
  "gs://ijp-web.firebasestorage.app"
);
