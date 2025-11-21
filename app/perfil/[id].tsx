import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"; // 🔐 Importante para verificar contraseña
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/Theme";
import { auth, db } from "../../firebaseConfig";

/* --- UTILS --- */
function getLevelInfo(uniqueReviews: number) {
  if (uniqueReviews > 40) return { label: "Diamante", icon: "diamond-outline", color: COLORS.button };
  if (uniqueReviews > 15) return { label: "Oro", icon: "medal-outline", color: "#FFD700" };
  if (uniqueReviews > 5) return { label: "Plata", icon: "medal-outline", color: "#C0C0C0" };
  return { label: "Bronce", icon: "medal-outline", color: "#CD7F32" };
}

export default function PerfilVisitanteScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUser = auth.currentUser;

  // 👇👇👇 AQUÍ ESTABA EL ERROR, ESTA ES LA CORRECCIÓN 👇👇👇
  // Si 'id' viene en la URL (visitante), úsalo. Si no (mi perfil), usa currentUser.uid
  const paramId = Array.isArray(id) ? id[0] : id;
  const targetUserId = paramId || currentUser?.uid;
  
  // Determinamos si soy yo
  const isMyProfile = currentUser?.uid === targetUserId;
  // 👆👆👆 FIN DE LA CORRECCIÓN 👆👆👆

  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({ globalRating: 0, totalPosts: 0, followers: 0, uniqueReviews: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [myRestaurants, setMyRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // --- ESTADOS PARA ELIMINAR CON CONTRASEÑA ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<{id: string, name: string} | null>(null);
  const [password, setPassword] = useState("");
  const [loadingDelete, setLoadingDelete] = useState(false);

  // 1. Cargar Datos
  useEffect(() => {
    const loadData = async () => {
      // Esperar a que haya un ID válido
      if (!targetUserId) {
          setLoading(false);
          return;
      }
      
      try {
        // A. Datos del Usuario
        const userDocRef = doc(db, "users", targetUserId);
        const userSnap = await getDoc(userDocRef);
        
        if (!userSnap.exists()) {
            setLoading(false); 
            return;
        }
        
        const userInfo = userSnap.data();
        setUserData({ ...userInfo, uid: targetUserId });

        // B. Verificar si YO lo sigo
        if (currentUser) {
            const followersList = userInfo?.followers || [];
            setIsFollowing(followersList.includes(currentUser.uid));
        }

        // C. Cargar Posts y Stats
        const postsRef = collection(db, "posts");
        let rawPosts: any[] = [];
        let ratingAvg = 0;

        if (userInfo?.role === "negocio") {
             // NEGOCIO: Cargar restaurantes Y posts
             const restRef = collection(db, "restaurants");
             const qRest = query(restRef, where("ownerId", "==", targetUserId));
             const restSnap = await getDocs(qRest);
             setMyRestaurants(restSnap.docs.map(d => ({id: d.id, ...d.data()})));
             
             const qPosts = query(postsRef, where("restaurant", "==", userInfo.name), orderBy("time", "desc"));
             const snapPosts = await getDocs(qPosts);
             rawPosts = snapPosts.docs.map(d => ({ id: d.id, ...d.data() }));
             
             const ratings = rawPosts.map((p) => parseFloat(p.rating)).filter((n) => !isNaN(n));
             if (ratings.length > 0) ratingAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

        } else {
             // PERSONA
             const q = query(postsRef, where("userId", "==", targetUserId), orderBy("time", "desc"));
             const snap = await getDocs(q);
             rawPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
             
             const ratings = rawPosts.map((p) => parseFloat(p.rating)).filter((n) => !isNaN(n));
             if (ratings.length > 0) ratingAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        }

        setPosts(rawPosts);

        // Calcular Gamificación
        const uniqueByRestaurant = new Set();
        rawPosts.forEach(post => {
             const key = post.restaurantId || post.restaurantName || post.restaurant;
             if (key) uniqueByRestaurant.add(key);
        });

        setStats({
            globalRating: Number(ratingAvg.toFixed(1)),
            totalPosts: rawPosts.length,
            followers: (userInfo?.followers || []).length,
            uniqueReviews: uniqueByRestaurant.size
        });

      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [targetUserId]); // Se recarga si cambia el ID

  // 2. Lógica Seguir
  const handleFollowToggle = async () => {
    if (!currentUser || !targetUserId) return;
    if (loadingFollow) return;

    setLoadingFollow(true);
    const myUserId = currentUser.uid;

    const targetUserRef = doc(db, "users", targetUserId);
    const myFollowingRef = doc(db, "users", myUserId, "following", targetUserId);

    try {
        if (isFollowing) {
            await setDoc(targetUserRef, { followers: arrayRemove(myUserId) }, { merge: true });
            await deleteDoc(myFollowingRef);
            setIsFollowing(false);
            setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        } else {
            await setDoc(targetUserRef, { followers: arrayUnion(myUserId) }, { merge: true });
            await setDoc(myFollowingRef, { 
                followedAt: new Date(),
                type: userData?.role || 'usuario'
            }, { merge: true });
            setIsFollowing(true);
            setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
    } catch (error) {
        console.error("Error follow:", error);
        Alert.alert("Error", "No se pudo completar la acción.");
    } finally {
        setLoadingFollow(false);
    }
  };

  // 3. INICIAR ELIMINACIÓN
  const initiateDelete = (restaurantId: string, restaurantName: string) => {
    setRestaurantToDelete({ id: restaurantId, name: restaurantName });
    setPassword(""); 
    setDeleteModalVisible(true);
  };

  // 4. CONFIRMAR CON CONTRASEÑA
  const confirmDeleteWithPassword = async () => {
    if (!password) {
        Alert.alert("Atención", "Debes ingresar tu contraseña.");
        return;
    }
    if (!currentUser || !currentUser.email || !restaurantToDelete) return;

    setLoadingDelete(true);

    try {
        // Re-autenticar
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);

        // Borrar
        await deleteDoc(doc(db, "restaurants", restaurantToDelete.id));
        
        // Actualizar lista visualmente
        setMyRestaurants(prev => prev.filter(r => r.id !== restaurantToDelete.id));
        
        setDeleteModalVisible(false);
        setRestaurantToDelete(null);
        Alert.alert("Eliminado", `"${restaurantToDelete.name}" ha sido eliminado.`);

    } catch (error: any) {
        console.error("Error al eliminar:", error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            Alert.alert("Error", "Contraseña incorrecta.");
        } else {
            Alert.alert("Error", "No se pudo eliminar. Intenta nuevamente.");
        }
    } finally {
        setLoadingDelete(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3EB489" /></View>;
  if (!userData) return <View style={styles.center}><Text>Usuario no encontrado</Text></View>;

  const levelInfo = getLevelInfo(stats.uniqueReviews);

  // --- VISTA PERSONA ---
  const renderPersonaView = () => (
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

      <Text style={styles.sectionTitle}>Reseñas de {userData.name.split(" ")[0]}</Text>
      
      {posts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aún no ha publicado nada.</Text>
        </View>
      ) : (
        posts.map((post) => {
          let dateString = "";
          if (post.time && typeof post.time.toDate === 'function') {
             dateString = post.time.toDate().toLocaleDateString("es-MX", {
               day: "numeric", month: "short", year: "numeric"
             });
          }

          return (
            <TouchableOpacity
              key={post.id}
              style={styles.reviewCard}
              onPress={() => router.push({ pathname: "/comments/[id]", params: { id: post.id } })}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#FFD166" />
                  <Text style={styles.reviewRating}>{post.rating}</Text>
                </View>
                <Text style={styles.reviewDate}>{dateString}</Text>
              </View>
              <Text style={styles.restaurantName}>{post.restaurantName || post.restaurant}</Text>
              {post.text ? <Text numberOfLines={3} style={styles.reviewText}>{post.text}</Text> : null}
              {post.image && (
                  <Image source={{ uri: post.image }} style={styles.reviewImage} />
              )}
            </TouchableOpacity>
          );
        })
      )}
    </>
  );

  // --- VISTA NEGOCIO ---
  const renderBusinessView = () => (
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

      <Text style={styles.sectionTitle}>Restaurantes de {userData.name}</Text>
      
      {myRestaurants.length === 0 ? (
          <View style={styles.emptyBox}>
              <Ionicons name="restaurant-outline" size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>No tiene restaurantes registrados.</Text>
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
                  
                  {/* 🗑️ BOTÓN DE ELIMINAR (Solo si es mi perfil) */}
                  {isMyProfile ? (
                    <TouchableOpacity 
                        style={styles.deleteBtn} 
                        onPress={() => initiateDelete(rest.id, rest.name)}
                    >
                        <Ionicons name="trash-outline" size={22} color="#FF4444" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color="#CCC" />
                  )}
              </TouchableOpacity>
          ))
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{userData.username || "usuario"}</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
         <View style={styles.profileCard}>
            <Image 
                source={{ uri: userData.photoURL || "https://i.imgur.com/8Km9tLL.png" }} 
                style={styles.avatar} 
            />
            <Text style={styles.name}>{userData.name}</Text>
            
            {/* Botón Seguir (Solo si NO eres tú) */}
            {!isMyProfile && (
                <TouchableOpacity 
                    style={[styles.followBtn, isFollowing ? styles.followingBtn : styles.notFollowingBtn]}
                    onPress={handleFollowToggle}
                    disabled={loadingFollow}
                >
                    {loadingFollow ? (
                        <ActivityIndicator size="small" color={isFollowing ? "#3EB489" : "#FFF"} />
                    ) : (
                        <Text style={[styles.followText, isFollowing ? {color: "#3EB489"} : {color: "#FFF"}]}>
                            {isFollowing ? "Siguiendo" : "Seguir"}
                        </Text>
                    )}
                </TouchableOpacity>
            )}
         </View>

         <View style={styles.contentSection}>
            {userData.role === 'negocio' ? renderBusinessView() : renderPersonaView()}
         </View>
      </ScrollView>

      {/* 🔒 MODAL DE SEGURIDAD */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
                    <View style={styles.deleteModalContent}>
                        <View style={styles.warningIcon}>
                            <Ionicons name="warning" size={32} color="#FF4444" />
                        </View>
                        
                        <Text style={styles.deleteTitle}>Eliminar Restaurante</Text>
                        <Text style={styles.deleteMessage}>
                            Esta acción no se puede deshacer. Ingresa tu contraseña para confirmar.
                        </Text>
                        
                        <Text style={styles.restaurantNameHighlight}>
                            "{restaurantToDelete?.name}"
                        </Text>

                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Contraseña"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={styles.modalCancelBtn} 
                                onPress={() => setDeleteModalVisible(false)}
                                disabled={loadingDelete}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.modalDeleteBtn} 
                                onPress={confirmDeleteWithPassword}
                                disabled={loadingDelete}
                            >
                                {loadingDelete ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.modalDeleteText}>Eliminar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', alignItems: 'center' },
  headerTitle: { fontWeight: 'bold', fontSize: 18 },
  backButton: { padding: 4 },
  
  profileCard: { alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 10 },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  
  followBtn: { paddingHorizontal: 30, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  notFollowingBtn: { backgroundColor: '#3EB489', borderColor: '#3EB489' },
  followingBtn: { backgroundColor: '#FFF', borderColor: '#3EB489' },
  followText: { fontWeight: '600' },
  
  statsContainer: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 12, paddingVertical: 15, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statBox: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#333" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#EEE" },
  
  levelBadgeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, marginTop: -5 },
  levelText: { fontWeight: 'bold', marginLeft: 5 },

  contentSection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  
  reviewCard: {
    backgroundColor: "#FFF", padding: 15, borderRadius: 12, marginBottom: 15,
    borderWidth: 1, borderColor: "#F0F0F0", shadowColor: "#000", shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  reviewRating: { marginLeft: 4, fontWeight: "bold", color: "#333" },
  reviewDate: { fontSize: 12, color: "#999", fontStyle: 'italic' },
  restaurantName: { fontSize: 16, fontWeight: "700", color: COLORS.button, marginBottom: 6 },
  reviewText: { color: "#555", fontSize: 14, lineHeight: 20, marginBottom: 10 },
  reviewImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover', marginTop: 5 },

  myRestaurantCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  myRestaurantImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  myRestaurantInfo: { flex: 1 },
  myRestaurantName: { fontSize: 16, fontWeight: '700', color: '#333' },
  myRestaurantCategory: { fontSize: 13, color: COLORS.button, fontWeight: '600', marginBottom: 2 },
  myRestaurantCity: { fontSize: 12, color: '#888' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  
  deleteBtn: { padding: 10, marginLeft: 5 },

  emptyBox: { alignItems: "center", marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#333" },

  // --- ESTILOS DEL MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  keyboardView: { width: '100%', alignItems: 'center' },
  deleteModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
  warningIcon: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 50, marginBottom: 15 },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  deleteMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 10 },
  restaurantNameHighlight: { fontSize: 16, fontWeight: 'bold', color: '#FF4444', marginBottom: 20, textAlign: 'center' },
  passwordInput: { width: '100%', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#FAFAFA' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center' },
  modalDeleteBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#FF4444', alignItems: 'center' },
  modalCancelText: { fontWeight: 'bold', color: '#666' },
  modalDeleteText: { fontWeight: 'bold', color: '#FFF' }
});