import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useRef, useState } from "react";
import {
  Animated,
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
import { auth, db } from "../firebaseConfig";

const RestaurankLogo = require("../assets/images/restaurank.png"); 

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Estado para el Banner
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-20)).current; 

  // 🔹 Función Banner
  const showBanner = (
    text: string,
    type: "success" | "error" | "info" = "info",
    duration = 4000
  ) => {
    setMessage({ text, type });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateYAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateYAnim, { toValue: -20, duration: 300, useNativeDriver: true })
      ]).start(() => setMessage(null));
    }, duration);
  };

  const getBannerStyle = (type: string) => {
      switch (type) {
          case 'success': return { bg: '#E8F5E9', border: '#2E7D32', icon: 'checkmark-circle', iconColor: '#2E7D32' };
          case 'error': return { bg: '#FFEBEE', border: '#C62828', icon: 'alert-circle', iconColor: '#C62828' };
          default: return { bg: '#E3F2FD', border: '#1565C0', icon: 'information-circle', iconColor: '#1565C0' };
      }
  };

  // 🔹 Reset Password
  const handlePasswordReset = async () => {
    if (!email) { showBanner("Por favor ingresa tu correo electrónico.", "info"); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      showBanner("Correo de restablecimiento enviado.", "success");
    } catch (error: any) {
      console.error("❌ Error:", error);
      showBanner("No se pudo enviar el correo.", "error");
    }
  };

  // 🔹 Auth
  const handleAuth = async () => {
    if (!email || !password) { showBanner("Por favor ingresa tu correo y contraseña.", "error"); return; }
    setLoading(true);
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const randomNames = ["FoodieLover", "TacoFan", "CoffeeHunter", "GastroExplorer"];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const defaultPhoto = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: randomName,
          username: `@${randomName.toLowerCase()}`,
          email: user.email,
          bio: "¡Bienvenido a Restaurank!",
          city: "",
          role: "persona",
          photoURL: defaultPhoto,
          createdAt: serverTimestamp(),
        });
        showBanner("Cuenta creada exitosamente 🎉", "success");
        
        // 🟢 CORRECCIÓN 1: Quitamos la barra final
        router.replace("/(tabs)"); 

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            const defaultPhoto = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: user.email?.split("@")[0] || "Usuario",
                username: `@${user.email?.split("@")[0]}`,
                email: user.email,
                bio: "",
                city: "",
                role: "persona",
                photoURL: defaultPhoto,
                createdAt: serverTimestamp(),
            });
        }
        showBanner("Inicio de sesión exitoso ✅", "success");
        
        // 🟢 CORRECCIÓN 2: Quitamos la barra final
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      const code = error.code?.replace("auth/", "") || "unknown";
      switch (code) {
        case "user-not-found": showBanner("Este correo no está registrado.", "error"); break;
        case "wrong-password":
        case "invalid-credential": setPassword(""); showBanner("Contraseña incorrecta.", "error"); break;
        case "email-already-in-use": showBanner("Este correo ya está registrado.", "info"); break;
        case "invalid-email": showBanner("El formato del correo no es válido.", "error"); break;
        default: showBanner("Ocurrió un problema. Intenta más tarde.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                
                {/* Banner */}
                {message && (
                <Animated.View
                    style={[
                    styles.bannerContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: translateYAnim }],
                        backgroundColor: getBannerStyle(message.type).bg,
                        borderColor: getBannerStyle(message.type).border,
                    },
                    ]}
                >
                    <Ionicons 
                        name={getBannerStyle(message.type).icon as any} 
                        size={24} 
                        color={getBannerStyle(message.type).iconColor} 
                        style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.bannerText, { color: getBannerStyle(message.type).iconColor }]}>
                    {message.text}
                    </Text>
                </Animated.View>
                )}

                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Image source={RestaurankLogo} style={styles.logo} />
                    <Text style={styles.appName}>RESTAURANK</Text>

                    <Text style={styles.title}>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</Text>

                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#3EB489" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Correo electrónico"
                            placeholderTextColor="#888"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#3EB489" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor="#888"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    {!isRegister && (
                    <TouchableOpacity onPress={handlePasswordReset}>
                        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>
                    )}

                    <TouchableOpacity
                    style={[styles.button, loading && { opacity: 0.7 }]}
                    onPress={handleAuth}
                    disabled={loading}
                    >
                    <Text style={styles.buttonText}>
                        {loading ? "Procesando..." : isRegister ? "Registrarse" : "Ingresar"}
                    </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                    <Text style={styles.switchText}>
                        {isRegister
                        ? "¿Ya tienes cuenta? Inicia sesión"
                        : "¿No tienes cuenta? Regístrate"}
                    </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 0,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#3EB489', 
    letterSpacing: 1.5,
    marginBottom: 30,
  },
  bannerContainer: {
    position: "absolute",
    top: Platform.OS === 'android' ? 50 : 60,
    width: "90%",
    alignSelf: 'center', 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 100,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2E2E2E",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#2E2E2E",
  },
  forgotText: {
    alignSelf: "flex-end",
    color: "#3EB489",
    fontSize: 14,
    marginBottom: 18,
    fontWeight: "500",
    width: '100%', 
    textAlign: 'right',
  },
  button: {
    backgroundColor: "#3EB489",
    borderRadius: 10,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#3EB489",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  switchText: {
    color: "#3EB489",
    fontSize: 15,
    marginTop: 10,
    fontWeight: "500",
  },
});