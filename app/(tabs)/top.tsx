import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, documentId, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/Theme";
import { db } from "../../firebaseConfig";

const { width } = Dimensions.get("window");

export default function TopScreen() {
  const router = useRouter();
  
  const [destacados, setDestacados] = useState<any[]>([]);
  const [tendencias, setTendencias] = useState<any[]>([]);
  const [nuevos, setNuevos] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const now = new Date();
      const last30Days = new Date(new Date().setDate(now.getDate() - 30));
      const last7Days = new Date(new Date().setDate(now.getDate() - 7));

      const postsSnap = await getDocs(collection(db, "posts"));
      const allPosts = postsSnap.docs.map(d => d.data());

      // A. Destacados (Top Rated)
      const postsMes = allPosts.filter(p => p.time?.toDate() > last30Days);
      const ratingsMap: Record<string, number[]> = {};
      postsMes.forEach(p => {
          if (!p.restaurantId) return;
          if (!ratingsMap[p.restaurantId]) ratingsMap[p.restaurantId] = [];
          ratingsMap[p.restaurantId].push(parseFloat(p.rating));
      });
      const topRatedIds = Object.keys(ratingsMap)
          .map(id => {
              const ratings = ratingsMap[id];
              const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
              return { id, avg, count: ratings.length };
          })
          .filter(item => item.count >= 1) 
          .sort((a, b) => b.avg - a.avg) 
          .slice(0, 5)
          .map(i => i.id);

      // B. Tendencias (Most Reviewed)
      const postsSemana = allPosts.filter(p => p.time?.toDate() > last7Days);
      const countsMap: Record<string, number> = {};
      postsSemana.forEach(p => {
          if (!p.restaurantId) return;
          countsMap[p.restaurantId] = (countsMap[p.restaurantId] || 0) + 1;
      });
      const trendingIds = Object.keys(countsMap)
          .sort((a, b) => countsMap[b] - countsMap[a]) 
          .slice(0, 5)
          .map(id => id);

      // C. Fetch Datos
      const fetchDetails = async (ids: string[]) => {
          if (ids.length === 0) return [];
          const q = query(collection(db, "restaurants"), where(documentId(), "in", ids));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      };

      const [topRestaurantes, trendRestaurantes] = await Promise.all([
          fetchDetails(topRatedIds),
          fetchDetails(trendingIds)
      ]);

      // D. Recién Llegados
      const qNuevos = query(collection(db, "restaurants"), orderBy("createdAt", "desc"), limit(5));
      const nuevosSnap = await getDocs(qNuevos);
      const nuevosData = nuevosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setDestacados(topRatedIds.map(id => topRestaurantes.find(r => r.id === id)).filter(Boolean));
      setTendencias(trendingIds.map(id => trendRestaurantes.find(r => r.id === id)).filter(Boolean));
      setNuevos(nuevosData);

    } catch (error) {
      console.error("Error cargando TopScreen:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
      setRefreshing(true);
      loadData();
  };

  // Renderizado de Tarjeta (Diseño corregido)
  const renderCard = ({ item, type }: { item: any, type: 'star' | 'fire' | 'new' }) => {
    let badgeText = "";
    let badgeColor = "";
    let iconName: keyof typeof Ionicons.glyphMap = "star"; // Tipo correcto para TS

    if (type === 'star') { 
        badgeText = "Top Mes"; 
        badgeColor = "#FFD700"; 
        iconName = "star"; 
    }
    if (type === 'fire') { 
        badgeText = "Trending"; 
        badgeColor = "#FF6F61"; 
        iconName = "flame"; 
    }
    if (type === 'new') { 
        badgeText = "Nuevo"; 
        badgeColor = "#3EB489"; 
        iconName = "flash"; // Icono vectorial en lugar de sparkles emoji
    }

    return (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push(`/restaurantes/${item.id}`)}
            activeOpacity={0.9}
        >
            <Image 
                source={{ uri: item.photoURL || "https://via.placeholder.com/150" }} 
                style={styles.cardImage} 
            />
            
            {/* 🟢 ETIQUETA (Badge) - Posicionada Absolutamente Arriba */}
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                <Ionicons name={iconName} size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.badgeText}>{badgeText}</Text>
            </View>

            {/* Overlay Gradiente Abajo */}
            <View style={styles.cardOverlay}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardCategory} numberOfLines={1}>{item.category || "General"}</Text>
            </View>
        </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.button} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Explorar</Text>
            <Text style={styles.headerSub}>Los mejores lugares de la ciudad</Text>
        </View>

        {/* 1. DESTACADOS */}
        {destacados.length > 0 && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="star" size={20} color="#FFD700" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>Lo mejor calificado</Text>
                </View>
                <FlatList
                    data={destacados}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => renderCard({ item, type: 'star' })}
                />
            </View>
        )}

        {/* 2. TENDENCIAS */}
        {tendencias.length > 0 && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="flame" size={20} color="#FF6F61" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>En tendencia esta semana</Text>
                </View>
                <FlatList
                    data={tendencias}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => renderCard({ item, type: 'fire' })}
                />
            </View>
        )}

        {/* 3. RECIÉN LLEGADOS */}
        {nuevos.length > 0 && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="flash" size={20} color="#3EB489" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>Recién llegados</Text>
                </View>
                <FlatList
                    data={nuevos}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => renderCard({ item, type: 'new' })}
                />
            </View>
        )}
        
        {destacados.length === 0 && tendencias.length === 0 && nuevos.length === 0 && (
             <View style={styles.emptyContainer}>
                 <Text style={styles.emptyText}>Aún no hay suficientes datos para generar rankings.</Text>
             </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: { paddingHorizontal: 16, paddingTop: 10, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#2E2E2E" },
  headerSub: { fontSize: 14, color: "#888", marginTop: 4 },

  section: { marginBottom: 30 },
  sectionHeader: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 16, 
      marginBottom: 12, 
  },
  sectionIcon: { marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#2E2E2E" },

  // Tarjetas
  card: {
    width: 150,
    height: 220,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    overflow: "hidden", // Importante para recortar la imagen
    position: "relative", // Necesario para positioning absoluto interno
  },
  cardImage: { 
      width: "100%", 
      height: "100%", 
      resizeMode: "cover" 
  },
  
  // 🟢 ETIQUETA FLOTANTE (Badge) CORREGIDA
  badge: {
      position: 'absolute',
      top: 10, // Espacio desde arriba
      right: 10, // Espacio desde la derecha (o left: 10 si prefieres)
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      zIndex: 10, // Asegura que esté por encima de la imagen
      elevation: 5, // Sombra en Android
      shadowColor: "#000", // Sombra en iOS
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700", textTransform: 'uppercase' },

  // Overlay para texto inferior
  cardOverlay: {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: 80,
      justifyContent: 'flex-end',
      padding: 10,
      backgroundColor: 'rgba(0,0,0,0.5)' // Fondo semi-transparente oscuro
  },
  
  cardName: { color: "#FFF", fontWeight: "700", fontSize: 15, marginBottom: 2 },
  cardCategory: { color: "#DDD", fontSize: 12, fontWeight: '500' },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: "#888", textAlign: 'center' }
});