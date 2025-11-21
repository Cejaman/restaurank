import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
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
import { COLORS } from "../constants/Theme";
import { auth, db, storage } from "../firebaseConfig";

const { width } = Dimensions.get("window");

export default function CreatePost() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Datos de Restaurantes
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [randomSuggestions, setRandomSuggestions] = useState<any[]>([]);

 // 🔹 1. Cargar restaurantes y generar sugerencias
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "restaurants"));
        
        // 🟢 CORRECCIÓN DE TIPADO AQUÍ
        const restaurantList = querySnapshot.docs
          .map((docSnap) => {
              const data = docSnap.data();
              return { id: docSnap.id, ...data } as { id: string; name?: string; city?: string }; 
          })
          // Ahora TS sabe que 'r' puede tener 'name'
          .filter((r) => r.name && r.name.trim() !== "");

        setRestaurants(restaurantList);
        setFilteredRestaurants([]); 

        if (restaurantList.length > 0) {
            const shuffled = [...restaurantList].sort(() => 0.5 - Math.random());
            setRandomSuggestions(shuffled.slice(0, 3));
        }

      } catch (error) {
        console.error("Error al obtener restaurantes:", error);
      }
    };
    fetchRestaurants();
  }, []);

  // 🔍 2. Lógica de búsqueda en tiempo real
  const handleSearch = (queryText: string) => {
      setSearchQuery(queryText);
      
      if (queryText.trim() === "") {
          setFilteredRestaurants([]);
          setSelectedRestaurant(null); 
          return;
      }

      const filtered = restaurants.filter((r) =>
        r.name.toLowerCase().includes(queryText.toLowerCase())
      );
      setFilteredRestaurants(filtered);
  };

  const selectRestaurant = (restaurant: any) => {
      setSelectedRestaurant(restaurant);
      setSearchQuery(restaurant.name);
      setFilteredRestaurants([]);
      Keyboard.dismiss(); // 🟢 Cierra el teclado al seleccionar
  };

  // 📸 Seleccionar imagen
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // ☁️ Subir imagen
  const uploadImageAsync = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const imageRef = ref(storage, filename);
    await uploadBytes(imageRef, blob);
    return await getDownloadURL(imageRef);
  };

  // 🟢 Publicar en Firestore
  const handlePublish = async () => {
    if (!text.trim() && !image) {
      Alert.alert("Publicación vacía", "Escribe algo o sube una foto.");
      return;
    }
    if (!selectedRestaurant) {
      Alert.alert("Falta restaurante", "Por favor selecciona un restaurante para tu reseña.");
      return;
    }
    if (rating === 0) {
        Alert.alert("Falta calificación", "¿Cuántas estrellas le das?");
        return;
    }

    try {
      setLoading(true);

      const currentUser = auth.currentUser;
      if (!currentUser) return; 

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      let finalUserName = "Usuario Anónimo";
      let finalUserImage = "https://i.imgur.com/8Km9tLL.png";

      if (userSnap.exists()) {
        const userData = userSnap.data();
        finalUserName = userData.name || userData.username || currentUser.email?.split('@')[0] || "Usuario";
        finalUserImage = userData.photoURL || finalUserImage;
      }

      let imageURL = "";
      if (image) imageURL = await uploadImageAsync(image);

      await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        user: finalUserName,
        userImage: finalUserImage,
        
        restaurant: selectedRestaurant.name,
        restaurantId: selectedRestaurant.id, 
        restaurantCity: selectedRestaurant.city || "", 
        
        text: text,
        image: imageURL,
        rating: rating,
        time: serverTimestamp(),
        likes: 0,
        likedBy: [] 
      });

      Alert.alert("¡Listo!", "Reseña publicada con éxito.");
      router.back();
    } catch (error) {
      console.error("Error al publicar:", error);
      Alert.alert("Error", "No se pudo publicar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Reseña</Text>
        <TouchableOpacity onPress={handlePublish} disabled={loading}>
             <Text style={[styles.headerAction, loading && {color: '#ccc'}]}>Publicar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scroll} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled" // 🟢 Permite tocar elementos aunque el teclado esté abierto
          >
            
            {/* 1. Sección de Restaurante */}
            <View style={styles.section}>
                <Text style={styles.label}>¿Dónde comiste?</Text>
                
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#888" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Busca el restaurante..."
                        placeholderTextColor="#B5B5B5"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        returnKeyType="done" // 🟢 Botón de "Listo" en teclado
                    />
                    {selectedRestaurant && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery("");
                            setSelectedRestaurant(null);
                        }}>
                            <Ionicons name="close-circle" size={20} color="#888" />
                        </TouchableOpacity>
                    )}
                </View>

                {searchQuery.length > 0 && filteredRestaurants.length > 0 && !selectedRestaurant && (
                    <View style={styles.resultsList}>
                        {filteredRestaurants.map((item) => (
                            <TouchableOpacity 
                                key={item.id} 
                                style={styles.resultItem}
                                onPress={() => selectRestaurant(item)}
                            >
                                <Text style={styles.resultText}>{item.name}</Text>
                                <Text style={styles.resultSubText}>{item.city}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {!searchQuery && !selectedRestaurant && (
                    <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>Sugerencias rápidas:</Text>
                        <View style={styles.chipsRow}>
                            {randomSuggestions.map((item) => (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={styles.chip}
                                    onPress={() => selectRestaurant(item)}
                                >
                                    <Text style={styles.chipText}>{item.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* 2. Calificación */}
            <View style={styles.section}>
                <Text style={styles.label}>Calificación</Text>
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <TouchableOpacity key={i} onPress={() => setRating(i)}>
                            <Ionicons
                                name={i <= rating ? "star" : "star-outline"}
                                size={36}
                                color={i <= rating ? "#FFD166" : "#DDD"}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 3. Opinión y Foto */}
            <View style={styles.section}>
                 <TextInput
                    style={styles.textArea}
                    placeholder="Escribe aquí tu opinión..."
                    placeholderTextColor="#B5B5B5"
                    multiline
                    textAlignVertical="top"
                    value={text}
                    onChangeText={setText}
                    blurOnSubmit={true} // 🟢 Cierra teclado al dar enter (si no es multiline infinito)
                    returnKeyType="default" 
                 />

                 {image ? (
                     <View style={styles.imagePreviewContainer}>
                         <Image source={{ uri: image }} style={styles.imagePreview} />
                         <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
                             <Ionicons name="trash" size={20} color="#fff" />
                         </TouchableOpacity>
                     </View>
                 ) : (
                     <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                         <Ionicons name="camera-outline" size={24} color={COLORS.button} />
                         <Text style={styles.addPhotoText}>Agregar foto</Text>
                     </TouchableOpacity>
                 )}
            </View>

            {loading && <ActivityIndicator size="large" color={COLORS.button} style={{marginTop: 20}} />}
            <View style={{height: 60}}/> 

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 🎨 Estilos (Sin cambios mayores)
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#F9F9F9" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
    paddingTop: Platform.OS === "android" ? 40 : 12
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  headerAction: { fontSize: 16, fontWeight: "600", color: COLORS.button },
  backButton: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#666", marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Buscador
  searchBar: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
      borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
      paddingHorizontal: 12, height: 50
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
  
  // Resultados Buscador
  resultsList: {
      backgroundColor: '#FFF', borderRadius: 12, marginTop: 5,
      borderWidth: 1, borderColor: '#EEE', elevation: 3, zIndex: 10,
      maxHeight: 200
  },
  resultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  resultText: { fontSize: 16, fontWeight: '600', color: '#333' },
  resultSubText: { fontSize: 12, color: '#888' },

  // Sugerencias (Chips)
  suggestionsContainer: { marginTop: 12 },
  suggestionsTitle: { fontSize: 12, color: '#888', marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
      backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 12,
      borderRadius: 20, borderWidth: 1, borderColor: COLORS.button
  },
  chipText: { color: COLORS.button, fontSize: 13, fontWeight: '500' },

  // Estrellas
  starsRow: { flexDirection: 'row', gap: 8 },

  // Area de texto
  textArea: {
      backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
      padding: 15, fontSize: 16, color: '#333', height: 120, marginBottom: 15
  },

  // Fotos
  addPhotoButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      padding: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: COLORS.button,
      borderRadius: 12, backgroundColor: '#F0FDF4'
  },
  addPhotoText: { marginLeft: 8, color: COLORS.button, fontWeight: '600' },
  
  imagePreviewContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 200, resizeMode: 'cover' },
  removeImage: {
      position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 6, borderRadius: 20
  }
});