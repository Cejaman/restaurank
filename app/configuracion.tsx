import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useState } from "react";
import {
    Alert,
    LayoutAnimation,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants/Theme";
import { auth } from "../firebaseConfig";

// Habilitar animaciones en Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const FAQ_DATA = [
  {
    question: "¿Qué es Restaurank?",
    answer:
      "Es una comunidad gastronómica donde puedes descubrir los mejores lugares para comer, compartir tus experiencias y, si tienes un negocio, gestionar tu menú y sucursales.",
  },
  {
    question: "¿Cómo subo de nivel?",
    answer:
      "Tu nivel depende de cuántas reseñas únicas hagas. Empiezas en Bronce, subes a Plata (5+), Oro (15+) y alcanzas el estatus Diamante con más de 40 reseñas.",
  },
  {
    question: "¿Cómo registro mi restaurante?",
    answer:
      "Ve a tu perfil y busca la sección 'Mis Restaurantes'. Toca el botón '+ Crear', llena los datos de ubicación y horarios, ¡y listo!",
  },
  {
    question: "¿Cómo elimino una reseña?",
    answer:
      "Ve a tu perfil, busca la tarjeta de la reseña que deseas borrar y toca el icono de basura (🗑️) en la esquina superior derecha.",
  },
  {
    question: "¿Cómo cambio mi foto de perfil?",
    answer:
      "En esta misma pantalla, toca el botón 'Editar Datos de Perfil' en la parte superior para actualizar tu foto y nombre.",
  },
];

export default function ConfiguracionScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContact = () => {
    Linking.openURL("mailto:soporte@restaurank.com?subject=Ayuda con la App");
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración y Ayuda</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Opciones de Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/editarperfil")}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="person-circle-outline" size={24} color="#555" />
            </View>
            <Text style={styles.menuText}>Editar Datos de Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* 2. Contacto Directo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <TouchableOpacity style={styles.contactCard} onPress={handleContact}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>Contáctanos</Text>
              <Text style={styles.contactSub}>soporte@restaurank.com</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* 3. Guía de Iconos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guía de Iconos</Text>
          <View style={styles.iconGuideContainer}>
            <View style={styles.guideItem}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.guideText}>Top Mes</Text>
            </View>
            <View style={styles.guideDivider} />
            <View style={styles.guideItem}>
              <Ionicons name="flame" size={24} color="#FF6F61" />
              <Text style={styles.guideText}>Trending</Text>
            </View>
            <View style={styles.guideDivider} />
            <View style={styles.guideItem}>
              <Ionicons name="flash" size={24} color="#3EB489" />
              <Text style={styles.guideText}>Nuevos</Text>
            </View>
          </View>
        </View>

        {/* 4. Preguntas Frecuentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
          {FAQ_DATA.map((item, index) => (
            <View key={index} style={styles.faqContainer}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={
                    expandedIndex === index ? "chevron-up" : "chevron-down"
                  }
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              {expandedIndex === index && (
                <View style={styles.faqBody}>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 5. Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Restaurank v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },

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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  backButton: { padding: 4 },

  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Menu Item (Editar Perfil)
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  menuIcon: { marginRight: 12 },
  menuText: { fontSize: 16, color: "#333", fontWeight: "500", flex: 1 },

  // Contact Card
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  contactSub: { fontSize: 13, color: "#888" },

  // Icon Guide
  iconGuideContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 20,
    justifyContent: "space-around",
    alignItems: "center",
  },
  guideItem: { alignItems: "center", gap: 6 },
  guideText: { fontSize: 12, fontWeight: "600", color: "#555" },
  guideDivider: { width: 1, height: "80%", backgroundColor: "#EEE" },

  // FAQ
  faqContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FAFAFA",
  },
  faqAnswer: { fontSize: 14, color: "#555", lineHeight: 20 },

  // Logout
  logoutButton: {
    marginTop: 10,
    backgroundColor: "#FFEBEE",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  logoutText: { color: "#D32F2F", fontWeight: "700", fontSize: 16 },

  versionText: {
    textAlign: "center",
    color: "#CCC",
    fontSize: 12,
    marginTop: 20,
  },
});