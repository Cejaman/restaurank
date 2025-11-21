import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
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

  // Estado para cambio de imagen principal
  const [uploadingImage, setUploadingImage] = useState(false);

  // --- ESTADOS PARA MODAL DE MENÚ (Agregar/Editar) ---
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodImage, setProdImage] = useState<string | null>(null);
  const [savingMenu, setSavingMenu] = useState(false);

  // --- ESTADOS PARA MODAL DE RESTAURANTE (Editar Info) ---
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editOpenTime, setEditOpenTime] = useState("");
  const [editCloseTime, setEditCloseTime] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingRest, setSavingRest] = useState(false);

  // 1. Cargar datos
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "restaurants", id as string);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setRestaurant(data);
                if (currentUser && data.ownerId === currentUser.uid) {
                  setIsOwner(true);
                }
            }
        });
        return unsub;
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

  // --- 📸 SUBIR IMAGEN GENÉRICA ---
  const uploadImageToStorage = async (uri: string, path: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw error;
    }
  };

  // ============================================================
  // 🖼️ LÓGICA CAMBIAR FOTO PORTADA (NUEVO)
  // ============================================================
  const handleChangeMainImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Formato panorámico para portada
        quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
        const localUri = result.assets[0].uri;
        setUploadingImage(true);
        try {
            // Subir a storage
            const filename = `restaurants/${id}/main_photo_${Date.now()}.jpg`;
            const downloadURL = await uploadImageToStorage(localUri, filename);

            // Actualizar Firestore
            const restRef = doc(db, "restaurants", id as string);
            await updateDoc(restRef, {
                photoURL: downloadURL
            });
            
            Alert.alert("Éxito", "Foto de portada actualizada.");
        } catch (error) {
            console.error("Error cambiando foto:", error);
            Alert.alert("Error", "No se pudo subir la imagen.");
        } finally {
            setUploadingImage(false);
        }
    }
  };

  // ============================================================
  // 🗺️ NAVEGACIÓN MAPAS
  // ============================================================
  const handleNavigate = () => {
    if (!restaurant) return;
    const lat = restaurant.location?.latitude || restaurant.latitude;
    const lng = restaurant.location?.longitude || restaurant.longitude;
    const label = restaurant.name;
    const urlBrowser = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancelar", "Apple Maps", "Google Maps", "Waze"], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) Linking.openURL(`maps:0,0?q=${label}@${lat},${lng}`);
          else if (buttonIndex === 2) Linking.openURL(`comgooglemaps://?q=${label}&center=${lat},${lng}`).catch(() => Linking.openURL(urlBrowser));
          else if (buttonIndex === 3) Linking.openURL(`waze://?ll=${lat},${lng}&navigate=yes`).catch(() => Linking.openURL(urlBrowser));
        }
      );
    } else {
      const url = `geo:0,0?q=${lat},${lng}(${label})`;
      Linking.openURL(url).catch(() => Linking.openURL(urlBrowser));
    }
  };

  // ============================================================
  // 🍔 LÓGICA DEL MENÚ
  // ============================================================

  // Selección de foto para producto
  const pickProductImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setProdImage(result.assets[0].uri);
  };

  const openMenuModal = (item: any = null) => {
    if (item) {
        setEditingMenuItem(item);
        setProdName(item.name);
        setProdPrice(item.price);
        setProdDesc(item.description || "");
        setProdImage(item.photoURL || null);
    } else {
        setEditingMenuItem(null);
        setProdName("");
        setProdPrice("");
        setProdDesc("");
        setProdImage(null);
    }
    setMenuModalVisible(true);
  };

  const handleSaveMenu = async () => {
    if (!prodName || !prodPrice) {
      Alert.alert("Error", "Nombre y precio son obligatorios.");
      return;
    }
    setSavingMenu(true);
    try {
      let downloadURL = prodImage;
      if (prodImage && prodImage.startsWith('file')) {
        const filename = `menuItems/${id}/${Date.now()}.jpg`;
        downloadURL = await uploadImageToStorage(prodImage, filename);
      }

      const menuRef = collection(db, "restaurants", id as string, "menu");

      if (editingMenuItem) {
          await updateDoc(doc(menuRef, editingMenuItem.id), {
            name: prodName,
            price: prodPrice,
            description: prodDesc,
            photoURL: downloadURL,
          });
          Alert.alert("Actualizado", "Producto modificado.");
      } else {
          await addDoc(menuRef, {
            name: prodName,
            price: prodPrice,
            description: prodDesc,
            photoURL: downloadURL,
            createdAt: new Date(),
          });
          Alert.alert("Agregado", "Producto agregado.");
      }
      setMenuModalVisible(false);
    } catch (error) {
      console.error("Error menu:", error);
      Alert.alert("Error", "No se pudo guardar.");
    } finally {
      setSavingMenu(false);
    }
  };

  const handleDeleteMenuItem = (itemId: string) => {
      Alert.alert(
          "Eliminar Producto",
          "¿Seguro que quieres eliminar este platillo?",
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Eliminar", 
                  style: "destructive",
                  onPress: async () => {
                      try {
                          await deleteDoc(doc(db, "restaurants", id as string, "menu", itemId));
                      } catch (error) {
                          console.error("Error eliminando:", error);
                      }
                  }
              }
          ]
      );
  };

  // ============================================================
  // 🏢 LÓGICA DEL RESTAURANTE (EDITAR INFO)
  // ============================================================

  const openRestModal = () => {
      setEditDesc(restaurant.description || "");
      setEditOpenTime(restaurant.openTime || "");
      setEditCloseTime(restaurant.closeTime || "");
      setEditPhone(restaurant.phone || "");
      setRestModalVisible(true);
  };

  const handleSaveRestaurantInfo = async () => {
      setSavingRest(true);
      try {
          const restRef = doc(db, "restaurants", id as string);
          await updateDoc(restRef, {
              description: editDesc,
              openTime: editOpenTime,
              closeTime: editCloseTime,
              phone: editPhone
          });
          setRestModalVisible(false);
          Alert.alert("Éxito", "Información actualizada.");
      } catch (error) {
          console.error("Error info:", error);
          Alert.alert("Error", "No se pudo actualizar.");
      } finally {
          setSavingRest(false);
      }
  };

  // ============================================================

  const handleCall = () => restaurant?.phone && Linking.openURL(`tel:${restaurant.phone}`);
  const handleEmail = () => restaurant?.email && Linking.openURL(`mailto:${restaurant.email}`);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3EB489" /></View>;
  if (!restaurant) return <View style={styles.centered}><Text>Restaurante no encontrado.</Text></View>;

  const lat = restaurant.location?.latitude || restaurant.latitude || 25.6866;
  const long = restaurant.location?.longitude || restaurant.longitude || -100.3161;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HEADER IMAGEN CON EDICIÓN */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: restaurant.photoURL || "https://via.placeholder.com/500x300?text=Sin+Imagen" }}
            style={styles.image}
          />
          <View style={styles.imageOverlay} />
          
          {/* Botón Regresar */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* 📸 BOTÓN CAMBIAR FOTO (SOLO DUEÑOS) */}
          {isOwner && (
              <TouchableOpacity 
                style={styles.editImageButton} 
                onPress={handleChangeMainImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                    <ActivityIndicator size="small" color="#3EB489" />
                ) : (
                    <Ionicons name="camera" size={22} color="#333" />
                )}
              </TouchableOpacity>
          )}
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
              <Text style={[styles.tabText, activeTab === "info" && styles.activeTabText]}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === "menu" && styles.activeTabButton]} onPress={() => setActiveTab("menu")}>
              <Text style={[styles.tabText, activeTab === "menu" && styles.activeTabText]}>Menú</Text>
            </TouchableOpacity>
          </View>

          {/* --- TAB RESEÑAS --- */}
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
                            dateStr = review.time.toDate().toLocaleDateString("es-MX", { day: 'numeric', month: 'short' });
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
                                        <Ionicons key={i} name={i < Math.round(parseFloat(review.rating)) ? "star" : "star-outline"} size={14} color="#FFD700" />
                                    ))}
                                </View>
                                <Text style={styles.reviewText}>{review.text}</Text>
                                {review.image && (<Image source={{ uri: review.image }} style={styles.reviewImage} />)}
                            </View>
                        );
                    })
                )}
            </View>
          )}

          {/* --- TAB INFORMACIÓN --- */}
          {activeTab === "info" && (
            <View style={{ marginTop: 20 }}>
              {isOwner && (
                  <TouchableOpacity style={styles.editInfoButton} onPress={openRestModal}>
                      <Ionicons name="create-outline" size={20} color="#FFF" />
                      <Text style={styles.editInfoText}>Editar Información</Text>
                  </TouchableOpacity>
              )}

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
                  <Marker coordinate={{ latitude: lat, longitude: long }} onPress={handleNavigate} />
                </MapView>
              </View>
              <Text style={styles.mapHintText}>Toca el pin para navegar 🚗</Text>
            </View>
          )}

          {/* --- TAB MENÚ --- */}
          {activeTab === "menu" && (
            <View style={{ marginTop: 10 }}>
              {isOwner && (
                <TouchableOpacity style={styles.addMenuButton} onPress={() => openMenuModal(null)}>
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

                    {/* 🔧 BOTONES DE EDICIÓN PARA DUEÑOS */}
                    {isOwner && (
                        <View style={styles.menuActions}>
                            <TouchableOpacity onPress={() => openMenuModal(item)} style={styles.actionBtnEdit}>
                                <Ionicons name="pencil" size={18} color="#3EB489" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteMenuItem(item.id)} style={styles.actionBtnDelete}>
                                <Ionicons name="trash" size={18} color="#FF4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODALES (Menú y Restaurante) */}
      <Modal animationType="slide" transparent={true} visible={menuModalVisible} onRequestClose={() => setMenuModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingMenuItem ? "Editar Producto" : "Nuevo Producto"}</Text>
                        <TouchableOpacity style={styles.modalImagePicker} onPress={pickProductImage}>
                            {prodImage ? <Image source={{ uri: prodImage }} style={styles.modalImagePreview} /> : <View style={{alignItems: 'center'}}><Ionicons name="camera-outline" size={32} color="#3EB489" /><Text style={styles.modalImageText}>Agregar Foto</Text></View>}
                        </TouchableOpacity>
                        <TextInput style={styles.modalInput} placeholder="Nombre del platillo" value={prodName} onChangeText={setProdName} />
                        <TextInput style={styles.modalInput} placeholder="Precio (ej. 120)" keyboardType="numeric" value={prodPrice} onChangeText={setProdPrice} />
                        <TextInput style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]} placeholder="Descripción corta" multiline value={prodDesc} onChangeText={setProdDesc} />
                        <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setMenuModalVisible(false)}><Text style={styles.modalBtnTextCancel}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveMenu} disabled={savingMenu}>{savingMenu ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalBtnTextSave}>Guardar</Text>}</TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={restModalVisible} onRequestClose={() => setRestModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Información</Text>
                        <Text style={styles.labelInput}>Descripción</Text>
                        <TextInput style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]} placeholder="Describe tu restaurante..." multiline value={editDesc} onChangeText={setEditDesc} />
                        <Text style={styles.labelInput}>Horario Apertura</Text>
                        <TextInput style={styles.modalInput} placeholder="Ej. 08:00 AM" value={editOpenTime} onChangeText={setEditOpenTime} />
                        <Text style={styles.labelInput}>Horario Cierre</Text>
                        <TextInput style={styles.modalInput} placeholder="Ej. 10:00 PM" value={editCloseTime} onChangeText={setEditCloseTime} />
                        <Text style={styles.labelInput}>Teléfono</Text>
                        <TextInput style={styles.modalInput} placeholder="Teléfono de contacto" keyboardType="phone-pad" value={editPhone} onChangeText={setEditPhone} />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setRestModalVisible(false)}><Text style={styles.modalBtnTextCancel}>Cancelar</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveRestaurantInfo} disabled={savingRest}>{savingRest ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalBtnTextSave}>Actualizar</Text>}</TouchableOpacity>
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
  
  // 📸 Estilo del botón de editar foto
  editImageButton: { 
    position: "absolute", bottom: 40, right: 20, 
    backgroundColor: "#fff", padding: 10, borderRadius: 25,
    shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, elevation: 5
  },

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
  mapHintText: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 6, fontStyle: 'italic' },

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
  editInfoButton: { backgroundColor: "#2E2E2E", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, borderRadius: 10, marginBottom: 15 },
  editInfoText: { color: "#fff", marginLeft: 8, fontWeight: "600" },

  menuPlaceholder: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  menuPlaceholderText: { fontSize: 18, fontWeight: "600", color: "#555", marginTop: 10 },
  menuPlaceholderSub: { fontSize: 14, color: "#999", marginTop: 5 },
  
  menuItemCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  menuItemImage: { width: 80, height: 80, borderRadius: 8, resizeMode: 'cover' },
  menuItemName: { fontSize: 16, fontWeight: '700', color: '#333' },
  menuItemDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  menuItemPrice: { fontSize: 15, fontWeight: 'bold', color: "#3EB489", marginTop: 5 },
  
  menuActions: { alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  actionBtnEdit: { padding: 6 },
  actionBtnDelete: { padding: 6 },

  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  
  modalImagePicker: { width: '100%', height: 150, backgroundColor: '#F5F5F5', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  modalImagePreview: { width: '100%', height: '100%', borderRadius: 12 },
  modalImageText: { color: '#3EB489', fontWeight: '600', marginTop: 5 },

  modalInput: { borderWidth: 1, borderColor: "#DDD", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  labelInput: { fontSize: 12, color: "#888", marginBottom: 4, fontWeight: "600" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalBtnCancel: { flex: 1, padding: 12, alignItems: "center" },
  modalBtnSave: { flex: 1, backgroundColor: "#3EB489", padding: 12, borderRadius: 8, alignItems: "center" },
  modalBtnTextCancel: { color: "#666", fontWeight: "600" },
  modalBtnTextSave: { color: "#FFF", fontWeight: "bold" },
});