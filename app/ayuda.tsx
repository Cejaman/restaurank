import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

// Habilitar animaciones en Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const FAQ_DATA = [
  {
    question: "¿Cómo creo un restaurante?",
    answer: "Ve a tu perfil y si tienes cuenta de 'Negocio', verás el botón '+ Crear' en la sección de Mis Restaurantes."
  },
  {
    question: "¿Cómo puedo editar mi perfil?",
    answer: "En tu perfil, toca el icono de configuración (engranaje) en la esquina superior derecha y selecciona 'Editar Perfil'."
  },
  {
    question: "¿Qué significan los niveles?",
    answer: "Son reconocimientos por tu actividad. Bronce (0-5 reseñas), Plata (6-15), Oro (16-40) y Diamante (+40)."
  },
  {
    question: "¿Cómo elimino una reseña?",
    answer: "Ve a tu perfil, busca la reseña que quieres borrar y toca el icono de basura rojo en la esquina superior derecha de la tarjeta."
  },
];

export default function AyudaScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:soporte@restaurank.com?subject=Ayuda con la App");
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayuda y Soporte</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Sección 1: Contacto Directo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Necesitas ayuda urgente?</Text>
          <Text style={styles.sectionSubtitle}>Nuestro equipo está listo para asistirte.</Text>
          
          <TouchableOpacity style={styles.contactCard} onPress={handleContactSupport}>
            <View style={styles.iconCircle}>
               <Ionicons name="mail" size={24} color="#FFF" />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.contactTitle}>Enviar Correo</Text>
                <Text style={styles.contactSub}>soporte@restaurank.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Sección 2: Preguntas Frecuentes */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
           
           {FAQ_DATA.map((item, index) => (
             <View key={index} style={styles.faqItem}>
               <TouchableOpacity 
                 style={styles.faqHeader} 
                 onPress={() => toggleExpand(index)}
                 activeOpacity={0.7}
               >
                 <Text style={styles.faqQuestion}>{item.question}</Text>
                 <Ionicons 
                    name={expandedIndex === index ? "chevron-up" : "chevron-down"} 
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

        {/* Sección 3: Guía de Iconos (Ayuda visual) */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guía de Iconos</Text>
            <View style={styles.iconGuideRow}>
                <View style={styles.guideItem}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <Text style={styles.guideText}>Rating</Text>
                </View>
                <View style={styles.guideItem}>
                    <Ionicons name="flame" size={20} color="#FF6F61" />
                    <Text style={styles.guideText}>Trending</Text>
                </View>
                <View style={styles.guideItem}>
                    <Ionicons name="flash" size={20} color="#3EB489" />
                    <Text style={styles.guideText}>Nuevo</Text>
                </View>
            </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>Restaurank v1.0.0</Text>

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

  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#2E2E2E", marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: "#666", marginBottom: 15 },

  // Tarjeta de Contacto
  contactCard: {
      backgroundColor: "#FFF",
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#EEE",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.button,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
  },
  contactTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  contactSub: { fontSize: 14, color: "#888" },

  // FAQ
  faqItem: {
      backgroundColor: "#FFF",
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "#EEE",
      overflow: "hidden"
  },
  faqHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
  },
  faqQuestion: { fontSize: 15, fontWeight: "600", color: "#333", flex: 1, marginRight: 10 },
  faqBody: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: "#FAFAFA",
  },
  faqAnswer: { fontSize: 14, color: "#555", lineHeight: 20 },

  // Guía de Iconos
  iconGuideRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: "#FFF",
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#EEE"
  },
  guideItem: { alignItems: "center", gap: 6 },
  guideText: { fontSize: 12, color: "#666", fontWeight: "500" },

  footerText: { textAlign: "center", color: "#CCC", fontSize: 12, marginTop: 10 }
});
