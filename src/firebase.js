import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD38H275B23DsdZNAZPULHrQKWKKVUQfcg",
  authDomain: "foguete-e35f1.firebaseapp.com",
  projectId: "foguete-e35f1",
  storageBucket: "foguete-e35f1.firebasestorage.app",
  messagingSenderId: "850978024305",
  appId: "1:850978024305:web:675ab32be9bac0bc24a4d0",
};

const app = initializeApp(firebaseConfig);

// 🔐 Auth (login)
export const auth = getAuth(app);

// 🗄️ Banco de dados
export const db = getFirestore(app);