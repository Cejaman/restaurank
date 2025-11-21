import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PostCard from "../../components/PostCard";
import { COLORS } from "../../constants/Theme";
import { auth, db } from "../../firebaseConfig";

/* --- TIPOS --- */
type UserRole = "persona" | "negocio";

type UserData = {
  uid: string;
  name: string;
  email: string;
  username?: string;
  photoURL?: string;
  role: UserRole;
  followers?: string[];
};

type UserStats = {
  globalRating: number;
  totalPosts: number;
  followers: number;
  uniqueReviews: number;
};

/* --- UTILS --- */
function getLevelInfo(uniqueReviews: number) {
  if (uniqueReviews > 40) return { label: "Diamante", icon: "diamond-outline", color: COLORS.button };
  if (uniqueReviews > 15) return { label: "Oro", icon: "medal-outline", color: "#FFD700" };
  if (uniqueReviews > 5) return { label: "Plata", icon: "medal-outline", color: "#C0C0C0" };
  return { label: "Bronce", icon: "medal-outline", color: "#CD7F32" };
}

export default function CuentaScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats>({
    globalRating: 0,
    totalPosts: 0,
    followers: 0,
    uniqueReviews: 0,
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [myRestaurants, setMyRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 📥 Carga de Datos
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return;

        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) return;
        const userInfo = userSnap.data() as UserData;
        setUserData(userInfo);

        const followersCount = Array.isArray(userInfo.followers) ? userInfo.followers.length : 0;
        const postsRef = collection(db, "posts");
        let rawPosts: any[] = [];
        let ratingAvg = 0;

        if (userInfo.role === "negocio") {
          const q = query(postsRef, where("restaurant", "==", userInfo.name), orderBy("time", "desc"));
          const snap = await getDocs(q);
          rawPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          
          const ratings = rawPosts.map((p) => parseFloat(p.rating)).filter((n) => !isNaN(n));
          if (ratings.length > 0) ratingAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

          const restaurantsRef = collection(db, "restaurants");
          const qRest = query(restaurantsRef, where("ownerId", "==", user.uid));
          const restSnap = await getDocs(qRest);
          const myRestData = restSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMyRestaurants(myRestData);

        } else {
          const q = query(postsRef, where("userId", "==", user.uid), orderBy("time", "desc"));
          const snap = await getDocs(q);
          rawPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          const ratings = rawPosts.map((p) => parseFloat(p.rating)).filter((n) => !isNaN(n));
          if (ratings.length > 0) ratingAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        }

        setPosts(rawPosts);

        const uniqueByRestaurant = new Set();
        rawPosts.forEach((post) => {
          const key = post.restaurantId || post.restaurantName || post.restaurant;
          if (key) uniqueByRestaurant.add(key);
        });

        setStats({
          globalRating: Number(ratingAvg.toFixed(1)),
          totalPosts: rawPosts.length,
          followers: followersCount,
          uniqueReviews: uniqueByRestaurant.size,
        });

      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 🔴 FUNCIÓN ELIMINAR
  const handleDelete = (postId: string) => {
    Alert.alert(
      "Eliminar reseña",
      "¿Estás seguro de que quieres borrar esta reseña?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "posts", postId));
              setPosts((prev) => prev.filter((p) => p.id !== postId));
              setStats((prev) => ({...prev, totalPosts: prev.totalPosts - 1}));
            } catch (error) {
              console.error("Error eliminando post:", error);
              Alert.alert("Error", "No se pudo eliminar.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => { await auth.signOut(); router.replace("/login"); }},
    ]);
  };

  if (loading || !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.button} />
      </View>
    );
  }

  // --- VISTA PERSONA ---
  const renderPersonaView = () => {
    const levelInfo = getLevelInfo(stats.uniqueReviews);
    return (
      <>
        <View style={styles.levelBadgeContainer}>
          <Ionicons name={levelInfo.icon as any} size={20} color={levelInfo.color} />
          <Text style={[styles.levelText, { color: levelInfo.color }]}>Nivel {levelInfo.label}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.globalRating > 0 ? stats.globalRating : "-"}</Text>
            <Text style={styles.statLabel}>Promedio</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalPosts}</Text>
            <Text style={styles.statLabel}>Reseñas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mis Reseñas</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aún no has publicado nada.</Text>
            <Text style={styles.emptySubtitle}>Tus aventuras culinarias aparecerán aquí.</Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              userId={post.userId}
              user={post.user || post.userName}
              userImage={post.userImage || post.userPhoto}
              time={post.time}
              text={post.text}
              image={post.image}
              restaurant={post.restaurant || post.restaurantName}
              restaurantId={post.restaurantId}
              rating={post.rating}
              likes={post.likes || 0}
              comments={post.comments || 0}
              onDelete={() => handleDelete(post.id)} // ✅ Pasamos la función sin errores
            />
          ))
        )}
      </>
    );
  };

  // --- VISTA NEGOCIO ---
  const renderBusinessView = () => {
    return (
      <>
        <View style={styles.statsContainer}>
           <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.globalRating > 0 ? stats.globalRating : "N/A"}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Opiniones</Text>
          </View>
          <View style={styles.statDivider} />
           <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Mis restaurantes</Text>
            <TouchableOpacity onPress={() => router.push("/restaurantes/crear")}>
                <Text style={{color: COLORS.button, fontWeight: '600'}}>+ Crear</Text>
            </TouchableOpacity>
        </View>
        
        {myRestaurants.length === 0 ? (
            <View style={styles.emptyBox}>
                <Ionicons name="restaurant-outline" size={48} color="#CCC" />
                <Text style={styles.emptyTitle}>No tienes restaurantes.</Text>
                <Text style={styles.emptySubtitle}>Registra tu primer negocio para empezar.</Text>
                <TouchableOpacity 
                    style={styles.createFirstBtn}
                    onPress={() => router.push("/restaurantes/crear")}
                >
                    <Text style={styles.createFirstText}>Crear Restaurante</Text>
                </TouchableOpacity>
            </View>
        ) : (
            myRestaurants.map((rest) => (
                <TouchableOpacity 
                    key={rest.id} 
                    style={styles.myRestaurantCard}
                    onPress={() => router.push(`/restaurantes/${rest.id}`)}
                >
                    <Image 
                        source={{ uri: rest.photoURL || "https://via.placeholder.com/150" }} 
                        style={styles.myRestaurantImage} 
                    />
                    <View style={styles.myRestaurantInfo}>
                        <Text style={styles.myRestaurantName}>{rest.name}</Text>
                        <Text style={styles.myRestaurantCategory}>{rest.category || "General"}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-sharp" size={14} color="#888" />
                            <Text style={styles.myRestaurantCity}>{rest.city}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#CCC" />
                </TouchableOpacity>
            ))
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          
          <View style={styles.headerIcons}>
            {/* ⚙️ CONFIGURACIÓN */}
            <TouchableOpacity 
                onPress={() => router.push("/configuracion")} 
                style={styles.iconButton}
            >
               <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>

            {/* 🚪 LOGOUT */}
            <TouchableOpacity 
                onPress={handleLogout} 
                style={styles.iconButton}
            >
               <Ionicons name="log-out-outline" size={24} color="#FF6F61" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Perfil (SIN BOTÓN EDITAR) */}
        <View style={styles.profileHeader}>
           <Image
              source={{ uri: userData.photoURL || "https://i.imgur.com/8Km9tLL.png" }}
              style={styles.avatar}
            />
            <Text style={styles.nameText}>{userData.name}</Text>
            {userData.username && <Text style={styles.userText}>@{userData.username}</Text>}
        </View>

        <View style={styles.content}>
            {userData.role === "negocio" ? renderBusinessView() : renderPersonaView()}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9F9F9" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textDark },
  headerIcons: { flexDirection: "row", gap: 15 },
  iconButton: { padding: 4 },

  profileHeader: { alignItems: "center", paddingVertical: 20, backgroundColor: "#FFF" },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  nameText: { fontSize: 20, fontWeight: "bold", color: "#333" },
  userText: { fontSize: 14, color: "#888", marginBottom: 10 },

  levelBadgeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, marginTop: -5 },
  levelText: { fontSize: 14, fontWeight: "700", marginLeft: 5 },
  statsContainer: {
    flexDirection: "row", backgroundColor: "#FFF", borderRadius: 12, paddingVertical: 15,
    marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statBox: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "#EEE" },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#333" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },

  content: { paddingHorizontal: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10 },
  
  myRestaurantCard: {
      flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 16,
      marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0',
      shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, elevation: 1
  },
  myRestaurantImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  myRestaurantInfo: { flex: 1 },
  myRestaurantName: { fontSize: 16, fontWeight: '700', color: '#333' },
  myRestaurantCategory: { fontSize: 13, color: COLORS.button, fontWeight: '600', marginBottom: 2 },
  myRestaurantCity: { fontSize: 12, color: '#888' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  createFirstBtn: { marginTop: 15, backgroundColor: COLORS.button, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  createFirstText: { color: '#FFF', fontWeight: '600' },

  emptyBox: { alignItems: "center", marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  emptySubtitle: { fontSize: 14, color: "#999", textAlign: 'center', marginTop: 4 },
});