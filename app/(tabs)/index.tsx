import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import PostCard from "../../components/PostCard";
import { COLORS } from "../../constants/Theme";
import { auth, db } from "../../firebaseConfig";

// --- Interfaces para Tipado ---
interface SearchResult {
  id: string;
  type: "user" | "business";
  name: string;
  detail: string; // Username o Ciudad
  photoURL: string;
  followersCount: number;
}

export default function HomeScreen() {
  const router = useRouter();

  // Estados de Datos
  const [posts, setPosts] = useState<any[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [isUser, setIsUser] = useState<boolean | null>(null);

  // Estados de UI
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de Búsqueda
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  /* -----------------------------------------------------
     🔐 1. Detectar Rol y Auth
  ----------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setIsUser(false);
        await AsyncStorage.setItem("userRole", "persona");
        return;
      }

      // Cache rápido para evitar parpadeo
      const cached = await AsyncStorage.getItem("userRole");
      if (cached) setIsUser(cached === "persona");

      // Listener en tiempo real para cambios de rol
      const userRef = doc(db, "users", currentUser.uid);
      return onSnapshot(userRef, async (snap) => {
        const role = snap.exists() ? snap.data().role : "persona";
        setIsUser(role === "persona");
        await AsyncStorage.setItem("userRole", role);
      });
    });
    return () => unsub();
  }, []);

  /* -----------------------------------------------------
     👥 2. Obtener lista de seguidos (Following)
  ----------------------------------------------------- */
  const fetchFollowing = async () => {
    if (!auth.currentUser) return;
    try {
      const followingRef = collection(db, "users", auth.currentUser.uid, "following");
      const snap = await getDocs(followingRef);
      setFollowing(snap.docs.map((d) => d.id));
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  useEffect(() => {
    fetchFollowing();
  }, []);

  /* -----------------------------------------------------
     📰 3. Cargar Feed (Optimizado con Limit)
  ----------------------------------------------------- */
  useEffect(() => {
    // Agregamos limit(50) para no traer toda la base de datos
    const q = query(collection(db, "posts"), orderBy("time", "desc"), limit(50));

    const unsub = onSnapshot(q, (snapshot) => {
      const myId = auth.currentUser?.uid;
      
      // Filtrado en cliente (Idealmente esto sería server-side con 'in' query, 
      // pero Firestore limita 'in' a 10 items. Para MVP esto está bien).
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((post: any) => {
             // Si no hay usuario logueado, mostrar todo (o nada, según prefieras)
             if(!myId) return true; 
             return post.userId === myId || following.includes(post.userId);
        });

      setPosts(data);
      setLoadingPosts(false);
    });

    return () => unsub();
  }, [following]);

  // Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFollowing();
    // El listener de posts se actualiza solo, simulamos espera
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  /* -----------------------------------------------------
     🔍 4. Lógica de Búsqueda (Optimizado con Debounce)
  ----------------------------------------------------- */
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchText.trim() === "") {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      const term = searchText.toLowerCase();
      const results: SearchResult[] = [];

      try {
        // Buscar Usuarios
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const name = d.name?.toLowerCase() || "";
          const username = d.username?.toLowerCase() || "";
          
          if (name.includes(term) || username.includes(term)) {
            results.push({
              id: docSnap.id,
              type: "user",
              name: d.name,
              detail: `@${d.username}`,
              photoURL: d.photoURL,
              followersCount: d.followersCount || 0,
            });
          }
        });

        // Buscar Restaurantes
        const restSnap = await getDocs(collection(db, "restaurants"));
        restSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const name = d.name?.toLowerCase() || "";
          const city = d.city?.toLowerCase() || "";

          if (name.includes(term) || city.includes(term)) {
            results.push({
              id: docSnap.id,
              type: "business",
              name: d.name,
              detail: d.city || "Ubicación no disponible",
              photoURL: d.photoURL,
              followersCount: d.followersCount || 0,
            });
          }
        });

        setSearchResults(results);
      } catch (error) {
        console.error("Error en búsqueda:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // ⏳ Espera 500ms después de dejar de escribir

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  /* -----------------------------------------------------
     RENDER UI
  ----------------------------------------------------- */
  const isSearching = searchText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header / Buscador */}
      <View style={styles.headerContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios o comida..."
            placeholderTextColor="#aaa"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {isSearching && (
            <TouchableOpacity onPress={() => { setSearchText(""); Keyboard.dismiss(); }}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      {isSearching ? (
        /* --- VISTA DE RESULTADOS --- */
        <ScrollView
          contentContainerStyle={styles.resultsContent}
          keyboardShouldPersistTaps="handled"
        >
          {searchLoading ? (
            <ActivityIndicator size="large" color={COLORS.button} style={{ marginTop: 20 }} />
          ) : searchResults.length === 0 ? (
             <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No encontramos resultados.</Text>
             </View>
          ) : (
            searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultItem}
                onPress={() => {
                  if (item.type === "user") {
                    router.push(`/perfil/${item.id}`);
                  } else {
                    router.push(`/restaurantes/${item.id}`);
                  }
                }}
              >
                <Image
                  source={{ uri: item.photoURL || "https://i.imgur.com/8Km9tLL.png" }}
                  style={styles.avatar}
                />
                <View style={styles.textInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultDetail}>{item.detail}</Text>
                  <View style={styles.followersRow}>
                    <Ionicons name="people" size={12} color="#3EB489" />
                    <Text style={styles.followersText}>
                      {item.followersCount} seguidores
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={item.type === "user" ? "chevron-forward" : "storefront-outline"}
                  size={20}
                  color="#ccc"
                />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        /* --- VISTA DEL FEED --- */
        <ScrollView
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.button]} />
          }
        >
          {loadingPosts ? (
             <ActivityIndicator size="large" color={COLORS.button} style={{ marginTop: 20 }} />
          ) : posts.length === 0 ? (
             <View style={styles.emptyContainer}>
                <Image 
                  source={{ uri: "https://cdn-icons-png.flaticon.com/512/7486/7486744.png" }} 
                  style={{ width: 80, height: 80, marginBottom: 10, opacity: 0.5 }} 
                />
                <Text style={styles.emptyText}>Aún no hay publicaciones.</Text>
                <Text style={styles.emptySubText}>¡Sigue a personas o restaurantes para ver su contenido!</Text>
             </View>
          ) : (
            posts.map((post) => <PostCard key={post.id} {...post} />)
          )}
        </ScrollView>
      )}

      {/* FAB (Solo Persona) */}
      {isUser && !isSearching && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => router.push("/createPost")}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9", // Fondo ligeramente gris para resaltar las tarjetas
  },
  headerContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  
  // --- Resultados Búsqueda ---
  resultsContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    // Sombra suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#eee",
  },
  textInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E2E2E",
  },
  resultDetail: {
    fontSize: 13,
    color: "#777",
  },
  followersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  followersText: {
    fontSize: 12,
    color: "#3EB489",
    fontWeight: "600",
  },

  // --- Feed ---
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100,
  },
  
  // --- Empty States ---
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    opacity: 0.8
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 10
  },
  emptySubText: {
      fontSize: 14,
      color: '#888',
      textAlign: 'center',
      marginTop: 5,
      paddingHorizontal: 40
  },

  // --- FAB ---
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.button,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});