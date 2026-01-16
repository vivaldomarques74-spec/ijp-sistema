import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyARluOvO6TjFzP_dqRq2gHg5Pwj-a_3tvw",
  authDomain: "ijp-web.firebaseapp.com",
  projectId: "ijp-web",

  // 🔥 AQUI ESTÁ A CORREÇÃO
  storageBucket: "ijp-web.appspot.com",

  messagingSenderId: "698456103004",
  appId: "1:698456103004:web:1a15835f935194dd7eae99",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
