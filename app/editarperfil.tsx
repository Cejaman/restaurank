import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants/Theme";
import { auth, db, storage } from "../firebaseConfig";

export default function EditarPerfilScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [photo, setPhoto] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [bio, setBio] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [role, setRole] = useState<"persona" | "negocio">("persona");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔹 Cargar datos del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setNombre(data.name || "");
          setUsuario(data.username || "");
          setBio(data.bio || "");
          setCiudad(data.city || "");
          setPhoto(data.photoURL || "https://i.imgur.com/8Km9tLL.png");
          setRole(data.role || "persona");
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
        Alert.alert("Error", "No se pudieron cargar tus datos de perfil.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // 📸 Cambiar foto
  const handleChangePhoto = async () => {
    Alert.alert("Cambiar foto", "Selecciona una opción", [
      {
        text: "Cámara",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled) {
            const uri = result.assets[0].uri;
            await uploadImageToFirebase(uri);
          }
        },
      },
      {
        text: "Galería",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled) {
            const uri = result.assets[0].uri;
            await uploadImageToFirebase(uri);
          }
        },
      },
      {
        text: "Eliminar foto",
        style: "destructive",
        onPress: () => setPhoto(null),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  // 🧩 Subir imagen
  const uploadImageToFirebase = async (uri: string) => {
    try {
      if (!user) return;

      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      setPhoto(downloadURL);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: downloadURL });

      Alert.alert("Foto actualizada", "Tu nueva foto se ha guardado correctamente.");
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      Alert.alert("Error", "No se pudo subir la imagen. Intenta de nuevo.");
    }
  };

  // 💾 Guardar cambios
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: nombre,
        username: usuario,
        bio,
        city: ciudad,
        photoURL: photo,
        role,
      });

      Alert.alert("✅ Cambios guardados", "Tu perfil se actualizó correctamente.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Hubo un problema al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.button} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 🔙 Flecha de regreso */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 👤 Foto */}
        <View style={styles.photoSection}>
          <Image
            source={{ uri: photo || "https://i.imgur.com/8Km9tLL.png" }}
            style={styles.profilePhoto}
          />
          <TouchableOpacity style={styles.changePhotoBtn} onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>

        {/* 🧑‍💼 Información personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información personal</Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#B5B5B5"
            value={nombre}
            onChangeText={setNombre}
          />

          <TextInput
            style={styles.input}
            placeholder="@usuario"
            placeholderTextColor="#B5B5B5"
            value={usuario}
            onChangeText={setUsuario}
          />

          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: "top" }]}
            multiline
            placeholder="Escribe algo sobre ti..."
            placeholderTextColor="#B5B5B5"
            value={bio}
            onChangeText={setBio}
          />

          <TextInput
            style={styles.input}
            placeholder="Ciudad"
            placeholderTextColor="#B5B5B5"
            value={ciudad}
            onChangeText={setCiudad}
          />
        </View>

        {/* 🔒 Seguridad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad / Cuenta</Text>
          <TextInput
            style={[styles.input, { color: "#999" }]}
            value={user?.email || ""}
            editable={false}
          />

          {/* 🔀 Switch con alerta simple */}
          <View style={styles.switchRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={role === "persona" ? "person-outline" : "storefront-outline"}
                size={20}
                color={COLORS.button}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.switchLabel}>
                {role === "persona" ? "Persona" : "Negocio"}
              </Text>
            </View>
            <Switch
              value={role === "negocio"}
              onValueChange={async (val) => {
                const newRole = val ? "negocio" : "persona";
                setRole(newRole);

                if (!user) return;
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, { role: newRole });

                if (newRole === "negocio") {
                  Alert.alert(
                    "Modo negocio activado",
                    "Tu perfil ahora está en modo negocio. Puedes registrar tu negocio desde la sección de restaurantes.",
                    [{ text: "Entendido", style: "default" }]
                  );
                } else {
                  Alert.alert(
                    "Modo persona activado",
                    "Tu cuenta volvió al modo personal.",
                    [{ text: "Ok", style: "default" }]
                  );
                }
              }}
              trackColor={{ false: "#ccc", true: COLORS.button }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cambiar contraseña</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton}>
            <Text style={styles.deleteText}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* 💾 Guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* 🎨 Estilos */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: COLORS.textDark },
  photoSection: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 20,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.button,
  },
  changePhotoBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: COLORS.button,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  changePhotoText: { color: COLORS.button, fontWeight: "600" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#2E2E2E",
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: "500",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.button,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { color: COLORS.button, fontWeight: "600" },
  deleteButton: { marginTop: 12, alignItems: "center" },
  deleteText: { color: "#FF6F61", fontWeight: "600" },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.button,
    height: 55,
    borderRadius: 16,
  },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 16, marginLeft: 6 },
});
