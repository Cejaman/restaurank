import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔧 Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCNVSA6xNvEZspYUygQHTRAE-3FcYOdlPk",
  authDomain: "restaurank-1425c.firebaseapp.com",
  projectId: "restaurank-1425c",
  storageBucket: "restaurank-1425c.firebasestorage.app", // 👈 CORREGIDO
  messagingSenderId: "460906918559",
  appId: "1:460906918559:web:1fddb61a9af759bec428aa",
  measurementId: "G-L502WNLFM0",
};

// 🚀 Inicializar app principal
const app = initializeApp(firebaseConfig);

// 🔐 Autenticación con persistencia
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// 🧠 Firestore DB
export const db = getFirestore(app);

// ☁️ Firebase Storage
export const storage = getStorage(app);

export default app;
