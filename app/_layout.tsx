import { Redirect, Stack, usePathname } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth, db } from "../firebaseConfig";

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // ✔ Verificar si existe el documento en Firestore
          const userRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            // ❌ El usuario existe en Auth pero NO en Firestore → cerrar sesión
            // Esto previene usuarios "zombis"
            console.warn("Usuario autenticado sin documento en Firestore. Cerrando sesión.");
            await signOut(auth);
            setUser(null);
          } else {
            // ✔ Usuario válido y con perfil
            setUser(firebaseUser);
          }
        } catch (error) {
          console.error("Error verificando usuario:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#3EB489" />
      </View>
    );
  }

  // 📌 Lógica de Protección de Rutas
  // Si NO hay usuario y NO estamos en login -> Mandar a Login
  if (!user && pathname !== "/login") {
    return <Redirect href="/login" />;
  }

  // Si HAY usuario y estamos en login -> Mandar al Home (Tabs)
  // 🛠 CORRECCIÓN TYPESCRIPT: Usar "/" en lugar de "/(tabs)/"
  // En Expo Router v3+, la ruta raíz de un grupo suele ser simplemente "/" si (tabs) es el índice.
  // Si eso no funciona, prueba "/(tabs)" sin la barra final.
  if (user && pathname === "/login") {
    return <Redirect href="/(tabs)" />; 
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      {/* 'modal' es una presentación especial, asegúrate de que en tu 
         estructura de archivos sea app/modal.tsx 
      */}
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="createPost" />
      <Stack.Screen name="(tabs)" />
      
      {/* Asegúrate de registrar aquí cualquier otra pantalla que esté fuera de (tabs)
          como: editarperfil, restaurantes/[id], perfil/[id], etc.
          Si no las registras, funcionarán, pero es buena práctica.
      */}
    </Stack>
  );
}