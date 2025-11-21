import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebaseConfig";

export default function RestaurantesScreen() {
  const router = useRouter();
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null);
  
  // Estado para la lista completa y la búsqueda
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔐 1. Sesión + rol en vivo
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setIsBusiness(false);
        await AsyncStorage.setItem("userRole", "persona");
        return;
      }

      const cached = await AsyncStorage.getItem("userRole");
      if (cached) setIsBusiness(cached === "negocio");

      const userRef = doc(db, "users", currentUser.uid);
      const unsubUser = onSnapshot(
        userRef,
        async (snap) => {
          const role = (snap.exists() && snap.data().role) || "persona";
          setIsBusiness(role === "negocio");
          await AsyncStorage.setItem("userRole", role);
        },
        (err) => {
          console.error("onSnapshot users error:", err);
          setIsBusiness(false);
        }
      );
      return () => unsubUser();
    });
    return () => unsubAuth();
  }, []);

  // 🎲 Función para mezclar el array (Aleatoriedad)
  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // 🍽️ 2. Cargar restaurantes
  useEffect(() => {
    const load = async () => {
      try {
        const qs = await getDocs(collection(db, "restaurants"));
        const data = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        // Mezclamos los resultados para que salgan aleatorios
        const shuffledData = shuffleArray(data);
        
        setAllRestaurants(shuffledData);
        setFilteredRestaurants(shuffledData); 
      } catch (e) {
        console.error("Error cargando restaurantes:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 🔍 3. Lógica del Buscador
  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text) {
      const newData = allRestaurants.filter((item) => {
        const itemData = item.name ? item.name.toUpperCase() : "".toUpperCase();
        const textData = text.toUpperCase();
        return itemData.indexOf(textData) > -1;
      });
      setFilteredRestaurants(newData);
    } else {
      setFilteredRestaurants(allRestaurants);
    }
  };

  if (loading || isBusiness === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#3EB489" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Descubre</Text>

      {/* --- BARRA DE BÚSQUEDA --- */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar restaurante..."
          placeholderTextColor="#aaa"
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* --- LISTA DE RESTAURANTES --- */}
      <FlatList
        data={filteredRestaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? "Cargando..." : "No se encontraron restaurantes."}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.9}
            onPress={() => router.push(`/restaurantes/${item.id}`)}
          >
            {/* Foto del Restaurante */}
            <Image
              source={{ 
                uri: item.photoURL || "https://via.placeholder.com/400x200?text=Sin+Foto" 
              }}
              style={styles.cardImage}
            />

            {/* Información */}
            <View style={styles.cardContent}>
              <View style={styles.rowBetween}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#fff" />
                    <Text style={styles.ratingText}>4.5</Text> 
                </View>
              </View>

              <View style={styles.rowInfo}>
                <Ionicons name="restaurant-outline" size={14} color="#3EB489" />
                <Text style={styles.category}>{item.category || "General"}</Text>
              </View>

              <View style={styles.rowInfo}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.hours}>
                  {item.openTime ? `${item.openTime} - ${item.closeTime}` : "Horario no disponible"}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.locationRow}>
                 <Ionicons name="location-sharp" size={14} color="#ccc" />
                 <Text style={styles.city} numberOfLines={1}>{item.city || "Ubicación desconocida"}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "800", color: "#2E2E2E", marginTop: 10, marginBottom: 15 },
  
  // Buscador
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10, 
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  
  // Tarjeta (Card)
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 16,
  },
  
  // Textos dentro de la tarjeta
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E2E2E",
    flex: 1,
    marginRight: 10,
  },
  ratingBadge: {
      flexDirection: 'row',
      backgroundColor: '#3EB489',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      alignItems: 'center',
      gap: 4
  },
  ratingText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold'
  },
  
  rowInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  category: {
    fontSize: 14,
    color: "#3EB489",
    fontWeight: "600",
  },
  hours: {
    fontSize: 13,
    color: "#555",
  },
  
  divider: {
      height: 1,
      backgroundColor: '#f0f0f0',
      marginVertical: 10
  },
  
  locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4
  },
  city: {
    fontSize: 13,
    color: "#888",
  },

  emptyText: { textAlign: "center", color: "#888", marginTop: 40, fontSize: 16 },
});