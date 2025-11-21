import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator, // 1. Importar ActionSheetIOS
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import MapView, { Marker } from "react-native-maps";
import { auth, db, storage } from "../../firebaseConfig";

const { width } = Dimensions.get("window");

export default function RestauranteDetalleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const [activeTab, setActiveTab] = useState<"reviews" | "info" | "menu">("reviews");

  // Estado Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);

  // 1. Cargar datos
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "restaurants", id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setRestaurant(data);
          if (currentUser && data.ownerId === currentUser.uid) {
            setIsOwner(true);
          }
        }
      } catch (error) {
        console.error("Error obteniendo restaurante:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id, currentUser]);

  // 2. Cargar reseñas
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "posts"), where("restaurantId", "==", id));
    const unsub = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(reviewsData);
    });
    return () => unsub();
  }, [id]);

  // 3. Cargar menú
  useEffect(() => {
    if (!id) return;
    const menuRef = collection(db, "restaurants", id as string, "menu");
    const unsub = onSnapshot(menuRef, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMenuItems(items);
    });
    return () => unsub();
  }, [id]);

  // --- 🗺️ LÓGICA DE NAVEGACIÓN (MAPAS) ---
  const handleNavigate = () => {
    if (!restaurant) return;

    const lat = restaurant.location?.latitude || restaurant.latitude;
    const lng = restaurant.location?.longitude || restaurant.longitude;
    const label = restaurant.name;

    // URL genérica de Google Maps (navegador) como fallback
    const urlBrowser = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    if (Platform.OS === "ios") {
      // Menú nativo de iOS
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancelar", "Apple Maps", "Google Maps", "Waze"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Linking.openURL(`maps:0,0?q=${label}@${lat},${lng}`);
          } else if (buttonIndex === 2) {
            Linking.openURL(`comgooglemaps://?q=${label}&center=${lat},${lng}`).catch(() =>
              Linking.openURL(urlBrowser)
            );
          } else if (buttonIndex === 3) {
            Linking.openURL(`waze://?ll=${lat},${lng}&navigate=yes`).catch(() =>
              Linking.openURL(urlBrowser)
            );
          }
        }
      );
    } else {
      // Android: Abre el selector nativo de aplicaciones de mapa
      const url = `geo:0,0?q=${lat},${lng}(${label})`;
      Linking.openURL(url).catch(() => Linking.openURL(urlBrowser));
    }
  };
  // -----------------------------------------

  const pickProductImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setNewProductImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `menuItems/${id}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw error;
    }
  };

  const handleAddProduct = async () => {
    if (!newProductName || !newProductPrice) {
      Alert.alert("Error", "Nombre y precio son obligatorios.");
      return;
    }
    setAddingProduct(true);
    try {
      let downloadURL = null;
      if (newProductImage) {
        downloadURL = await uploadImage(newProductImage);
      }

      const menuRef = collection(db, "restaurants", id as string, "menu");
      await addDoc(menuRef, {
        name: newProductName,
        price: newProductPrice,
        description: newProductDesc,
        photoURL: downloadURL,
        createdAt: new Date(),
      });

      setModalVisible(false);
      setNewProductName("");
      setNewProductPrice("");
      setNewProductDesc("");
      setNewProductImage(null);
      Alert.alert("Éxito", "Producto agregado al menú.");
    } catch (error) {
      console.error("Error al agregar producto:", error);
      Alert.alert("Error", "No se pudo agregar el producto.");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleCall = () => restaurant?.phone && Linking.openURL(`tel:${restaurant.phone}`);
  const handleEmail = () => restaurant?.email && Linking.openURL(`mailto:${restaurant.email}`);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3EB489" /></View>;
  if (!restaurant) return <View style={styles.centered}><Text>Restaurante no encontrado.</Text></View>;

  const lat = restaurant.location?.latitude || restaurant.latitude || 25.6866;
  const long = restaurant.location?.longitude || restaurant.longitude || -100.3161;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header Imagen */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: restaurant.photoURL || "https://via.placeholder.com/500x300?text=Sin+Imagen" }}
            style={styles.image}
          />
          <View style={styles.imageOverlay} />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        <View style={styles.contentContainer}>
          <View style={styles.headerInfo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{restaurant.category || "Restaurante"}</Text>
              <Text style={styles.name}>{restaurant.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.city}>{restaurant.city || "Sin ubicación"}</Text>
              </View>
            </View>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={16} color="#fff" />
              <Text style={styles.ratingText}>
                 {reviews.length > 0 
                    ? (reviews.reduce((acc, curr) => acc + parseFloat(curr.rating), 0) / reviews.length).toFixed(1)
                    : "N/A"}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Tabs */}
          <View style={styles.tabContainer}>
             <TouchableOpacity style={[styles.tabButton, activeTab === "reviews" && styles.activeTabButton]} onPress={() => setActiveTab("reviews")}>
              <Text style={[styles.tabText, activeTab === "reviews" && styles.activeTabText]}>Reseñas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === "info" && styles.activeTabButton]} onPress={() => setActiveTab("info")}>
              <Text style={[styles.tabText, activeTab === "info" && styles.activeTabText]}>Información</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === "menu" && styles.activeTabButton]} onPress={() => setActiveTab("menu")}>
              <Text style={[styles.tabText, activeTab === "menu" && styles.activeTabText]}>Menú</Text>
            </TouchableOpacity>
          </View>

          {/* Reseñas */}
          {activeTab === "reviews" && (
            <View style={{ marginTop: 10 }}>
                {reviews.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>Aún no hay reseñas.</Text>
                        <Text style={styles.emptySubText}>¡Sé el primero en opinar sobre este lugar!</Text>
                    </View>
                ) : (
                    reviews.map((review) => {
                        let dateStr = "";
                        if(review.time && typeof review.time.toDate === 'function') {
                            dateStr = review.time.toDate().toLocaleDateString("es-MX", {
                                day: 'numeric', month: 'short'
                            });
                        }
                        const userImg = review.userImage || "https://i.imgur.com/8Km9tLL.png";

                        return (
                            <View key={review.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.userRow}>
                                        <Image source={{ uri: userImg }} style={styles.reviewUserAvatar} />
                                        <Text style={styles.userName}>{review.user || review.userName || "Usuario"}</Text>
                                    </View>
                                    <Text style={styles.reviewDate}>{dateStr}</Text>
                                </View>
                                <View style={styles.ratingRow}>
                                    {[...Array(5)].map((_, i) => (
                                        <Ionicons 
                                            key={i} 
                                            name={i < Math.round(parseFloat(review.rating)) ? "star" : "star-outline"} 
                                            size={14} 
                                            color="#FFD700" 
                                        />
                                    ))}
                                </View>
                                <Text style={styles.reviewText}>{review.text}</Text>
                                {review.image && (
                                    <Image source={{ uri: review.image }} style={styles.reviewImage} />
                                )}
                            </View>
                        );
                    })
                )}
            </View>
          )}

          {/* Información */}
          {activeTab === "info" && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Sobre nosotros</Text>
              <Text style={styles.description}>
                {restaurant.description && restaurant.description.trim() !== "" ? restaurant.description : "El dueño no ha añadido una descripción detallada todavía."}
              </Text>
              <View style={styles.divider} />
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <Ionicons name="time" size={24} color="#3EB489" />
                  <Text style={styles.infoLabel}>Horario</Text>
                  <Text style={styles.infoValue}>{restaurant.openTime || "--:--"} - {restaurant.closeTime || "--:--"}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Ionicons name="storefront" size={24} color="#3EB489" />
                  <Text style={styles.infoLabel}>Sucursales</Text>
                  <Text style={styles.infoValue}>{restaurant.hasMultipleBranches ? "Múltiples" : "Única"}</Text>
                </View>
              </View>
              <View style={styles.contactRow}>
                {restaurant.phone && (
                  <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.contactButtonText}>Llamar</Text>
                  </TouchableOpacity>
                )}
                {restaurant.email && (
                  <TouchableOpacity style={[styles.contactButton, styles.emailButton]} onPress={handleEmail}>
                    <Ionicons name="mail" size={20} color="#fff" />
                    <Text style={styles.contactButtonText}>Correo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Ubicación</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{ latitude: lat, longitude: long, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                  scrollEnabled={false} zoomEnabled={false}
                >
                  {/* 👇 🔴 AHORA EL PIN ES TOCABLE PARA NAVEGAR */}
                  <Marker 
                    coordinate={{ latitude: lat, longitude: long }} 
                    onPress={handleNavigate}
                  />
                </MapView>
              </View>
              {/* Mensaje sutil para indicar que pueden tocar */}
              <Text style={styles.mapHintText}>Toca el pin para navegar 🚗</Text>
            </View>
          )}

          {/* Menú */}
          {activeTab === "menu" && (
            <View style={{ marginTop: 10 }}>
              {isOwner && (
                <TouchableOpacity style={styles.addMenuButton} onPress={() => setModalVisible(true)}>
                  <Ionicons name="add-circle" size={24} color="#fff" />
                  <Text style={styles.addMenuButtonText}>Agregar Producto</Text>
                </TouchableOpacity>
              )}

              {menuItems.length === 0 ? (
                <View style={styles.menuPlaceholder}>
                  <Ionicons name="restaurant" size={50} color="#ccc" />
                  <Text style={styles.menuPlaceholderText}>Menú vacío</Text>
                  <Text style={styles.menuPlaceholderSub}>Aún no hay productos registrados.</Text>
                </View>
              ) : (
                menuItems.map((item) => (
                  <View key={item.id} style={styles.menuItemCard}>
                    {item.photoURL ? (
                       <Image source={{ uri: item.photoURL }} style={styles.menuItemImage} />
                    ) : (
                       <View style={[styles.menuItemImage, {backgroundColor: '#EEE', alignItems:'center', justifyContent:'center'}]}>
                           <Ionicons name="fast-food" size={24} color="#CCC" />
                       </View>
                    )}
                    
                    <View style={{flex: 1, paddingHorizontal: 12}}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        {item.description ? <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text> : null}
                        <Text style={styles.menuItemPrice}>${item.price}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ width: '100%', alignItems: 'center' }}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nuevo Producto</Text>
                        
                        <TouchableOpacity style={styles.modalImagePicker} onPress={pickProductImage}>
                            {newProductImage ? (
                                <Image source={{ uri: newProductImage }} style={styles.modalImagePreview} />
                            ) : (
                                <View style={{alignItems: 'center'}}>
                                    <Ionicons name="camera-outline" size={32} color="#3EB489" />
                                    <Text style={styles.modalImageText}>Agregar Foto</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TextInput 
                        style={styles.modalInput} 
                        placeholder="Nombre del platillo" 
                        value={newProductName}
                        onChangeText={setNewProductName}
                        />
                        <TextInput 
                        style={styles.modalInput} 
                        placeholder="Precio (ej. 120)" 
                        keyboardType="numeric"
                        value={newProductPrice}
                        onChangeText={setNewProductPrice}
                        />
                        <TextInput 
                        style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]} 
                        placeholder="Descripción corta" 
                        multiline
                        value={newProductDesc}
                        onChangeText={setNewProductDesc}
                        />

                        <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalBtnSave} onPress={handleAddProduct} disabled={addingProduct}>
                            {addingProduct ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalBtnTextSave}>Guardar</Text>}
                        </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageContainer: { width: width, height: 280, position: 'relative' },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backButton: { position: "absolute", top: 50, left: 20, backgroundColor: "rgba(0,0,0,0.5)", padding: 8, borderRadius: 20 },
  contentContainer: { flex: 1, backgroundColor: "#fff", marginTop: -30, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 25, minHeight: 500 },
  headerInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  category: { fontSize: 14, color: "#3EB489", fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  name: { fontSize: 24, fontWeight: "800", color: "#2E2E2E", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  city: { fontSize: 14, color: "#666" },
  ratingBox: { backgroundColor: "#3EB489", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  ratingText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 20 },
  
  tabContainer: { flexDirection: "row", backgroundColor: "#F5F5F5", borderRadius: 25, padding: 4, marginBottom: 10 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 20 },
  activeTabButton: { backgroundColor: "#3EB489" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#888" },
  activeTabText: { color: "#fff", fontWeight: "700" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#2E2E2E", marginBottom: 10 },
  description: { fontSize: 15, color: "#555", lineHeight: 22 },
  infoGrid: { flexDirection: "row", gap: 15, marginTop: 20 },
  infoCard: { flex: 1, backgroundColor: "#F9F9F9", padding: 15, borderRadius: 16, alignItems: "center" },
  infoLabel: { fontSize: 12, color: "#888", marginTop: 5, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#2E2E2E" },
  contactRow: { flexDirection: "row", gap: 15, marginTop: 20 },
  contactButton: { flex: 1, backgroundColor: "#2E2E2E", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 14, gap: 8 },
  emailButton: { backgroundColor: "#3EB489" },
  contactButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  mapContainer: { borderRadius: 16, overflow: "hidden", height: 200, marginTop: 10 },
  map: { width: "100%", height: "100%" },
  mapHintText: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 6, fontStyle: 'italic' }, // Nuevo estilo para el texto de ayuda

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 5 },
  reviewCard: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#F0F0F0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewUserAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE' },
  userName: { fontSize: 14, fontWeight: '700', color: '#333' },
  reviewDate: { fontSize: 12, color: '#999' },
  ratingRow: { flexDirection: 'row', marginBottom: 8 },
  reviewText: { fontSize: 14, color: '#555', lineHeight: 20 },
  reviewImage: { width: '100%', height: 180, borderRadius: 12, marginTop: 10, resizeMode: 'cover' },

  addMenuButton: { backgroundColor: "#3EB489", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 12, marginBottom: 15 },
  addMenuButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  menuPlaceholder: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  menuPlaceholderText: { fontSize: 18, fontWeight: "600", color: "#555", marginTop: 10 },
  menuPlaceholderSub: { fontSize: 14, color: "#999", marginTop: 5 },
  
  menuItemCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  menuItemImage: { width: 80, height: 80, borderRadius: 8, resizeMode: 'cover' },
  menuItemName: { fontSize: 16, fontWeight: '700', color: '#333' },
  menuItemDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  menuItemPrice: { fontSize: 15, fontWeight: 'bold', color: "#3EB489", marginTop: 5 },

  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  
  modalImagePicker: { width: '100%', height: 150, backgroundColor: '#F5F5F5', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  modalImagePreview: { width: '100%', height: '100%', borderRadius: 12 },
  modalImageText: { color: '#3EB489', fontWeight: '600', marginTop: 5 },

  modalInput: { borderWidth: 1, borderColor: "#DDD", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalBtnCancel: { flex: 1, padding: 12, alignItems: "center" },
  modalBtnSave: { flex: 1, backgroundColor: "#3EB489", padding: 12, borderRadius: 8, alignItems: "center" },
  modalBtnTextCancel: { color: "#666", fontWeight: "600" },
  modalBtnTextSave: { color: "#FFF", fontWeight: "bold" },
});