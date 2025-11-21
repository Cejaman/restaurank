import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
// 🟢 1. Importamos addDoc y collection
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db, storage } from "../../firebaseConfig";

const foodTypes = [
    "Mexicana", "Sushi", "Burgers", "Cafeterías", "Italiana", "Pizza", "Saludable", "Postres",
];

export default function CrearNegocioScreen() {
    const router = useRouter();
    const user = auth.currentUser;

    const [photo, setPhoto] = useState<string | null>(null);
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [correo, setCorreo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    
    const [direccion, setDireccion] = useState("");
    const [ciudad, setCiudad] = useState("");
    
    const [tipoComida, setTipoComida] = useState<string | null>(null);
    const [variasSucursales, setVariasSucursales] = useState(false);
    const [loading, setLoading] = useState(false);

    const [horaApertura, setHoraApertura] = useState("");
    const [horaCierre, setHoraCierre] = useState("");
    
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'open' | 'close' | null>(null);
    const [tempDate, setTempDate] = useState(new Date());

    const [region, setRegion] = useState<any>(null);
    const [pin, setPin] = useState<any>(null);

    // 1. Verificar Acceso
    useEffect(() => {
        const verificarAcceso = async () => {
            if (!auth.currentUser) { router.replace("/login"); return; }
            try {
                const userRef = doc(db, "users", auth.currentUser.uid);
                const snap = await getDoc(userRef);
                if (!snap.exists() || snap.data().role !== "negocio") {
                    Alert.alert("Acceso denegado", "Solo negocios.");
                    router.back();
                }
            } catch (error) { console.error(error); router.back(); }
        };
        verificarAcceso();
    }, []);

    // Obtener dirección desde coordenadas
    const getAddressFromCoords = async (latitude: number, longitude: number) => {
        try {
            const addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (addressResponse.length > 0) {
                const item = addressResponse[0];
                const calle = item.street || "";
                const numero = item.streetNumber || "";
                const col = item.district || item.subregion || "";
                const cd = item.city || item.region || "";
                
                const direccionCompleta = `${calle} ${numero}, ${col}`.trim().replace(/^, /, '');
                setDireccion(direccionCompleta);
                setCiudad(cd);
            }
        } catch (error) {
            console.log("Error obteniendo dirección:", error);
        }
    };

    // 2. Ubicación Inicial
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            
            const loc = await Location.getCurrentPositionAsync({});
            const initialRegion = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            setRegion(initialRegion);
            setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            getAddressFromCoords(loc.coords.latitude, loc.coords.longitude);
        })();
    }, []);

    const handleMapPress = (e: any) => {
        const coord = e.nativeEvent.coordinate;
        setPin(coord);
        getAddressFromCoords(coord.latitude, coord.longitude);
    };

    const handleImagePick = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.7 });
        if (!result.canceled) setPhoto(result.assets[0].uri);
    };

    const uploadImageToFirebase = async (uri: string, path: string) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    };

    const openPicker = (mode: 'open' | 'close') => {
        setPickerMode(mode);
        setShowPicker(true);
        setTempDate(new Date());
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (event.type === 'set' && selectedDate) confirmTime(selectedDate);
        } else {
            if (selectedDate) setTempDate(selectedDate);
        }
    };

    const confirmIOSDate = () => { confirmTime(tempDate); setShowPicker(false); };

    const confirmTime = (date: Date) => {
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        if (pickerMode === 'open') setHoraApertura(formattedTime);
        if (pickerMode === 'close') setHoraCierre(formattedTime);
    };

    // 🟢 2. FUNCIÓN CREAR MODIFICADA PARA MULTIPLES RESTAURANTES
    const handleCreate = async () => {
        if (!user) return;
        if (!nombre.trim()) return Alert.alert("Error", "Nombre obligatorio.");
        if (!pin) return Alert.alert("Error", "Ubicación obligatoria.");
        if (!direccion.trim()) return Alert.alert("Error", "La dirección es obligatoria."); 

        setLoading(true);
        try {
            let downloadURL = null;
            // Usamos un nombre único para la imagen basado en tiempo para no sobrescribir
            if (photo) {
                const path = `businessImages/${user.uid}_${Date.now()}.jpg`;
                downloadURL = await uploadImageToFirebase(photo, path);
            }

            // 🟢 CAMBIO CLAVE: Usamos addDoc en lugar de setDoc
            // Esto crea un ID único automáticamente para cada restaurante
            const restaurantsRef = collection(db, "restaurants");
            
            await addDoc(restaurantsRef, {
                ownerId: user.uid, // Esto vincula el restaurante contigo
                name: nombre,
                phone: telefono || null,
                email: correo || null,
                description: descripcion,
                address: direccion, 
                city: ciudad,
                category: tipoComida || "General",
                hasMultipleBranches: variasSucursales,
                photoURL: downloadURL,
                latitude: pin.latitude,
                longitude: pin.longitude,
                openTime: horaApertura,
                closeTime: horaCierre,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            Alert.alert("¡Éxito!", "Restaurante creado correctamente.");
            router.push("/restaurantes"); // Regresa a la lista o al perfil
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Hubo un problema al crear el restaurante.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2E2E2E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Crear negocio</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Imagen */}
                <View style={styles.imageSection}>
                    <TouchableOpacity onPress={handleImagePick}>
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.businessImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="camera" size={40} color="#3EB489" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleImagePick} style={styles.changePhotoBtn}>
                        <Text style={styles.changePhotoText}>Cambiar foto</Text>
                    </TouchableOpacity>
                </View>

                {/* Datos Generales */}
                <View style={styles.section}>
                    <Text style={styles.label}>Nombre del negocio</Text>
                    <TextInput style={styles.input} placeholder="Ej: Tacos El Primo" placeholderTextColor="#B5B5B5" value={nombre} onChangeText={setNombre} />
                    <Text style={styles.label}>Teléfono (opcional)</Text>
                    <TextInput style={styles.input} placeholder="8112345678" placeholderTextColor="#B5B5B5" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
                    <Text style={styles.label}>Correo (opcional)</Text>
                    <TextInput style={styles.input} placeholder="contacto@tacosprimo.com" placeholderTextColor="#B5B5B5" keyboardType="email-address" value={correo} onChangeText={setCorreo} />
                </View>

                {/* Horarios */}
                <View style={styles.section}>
                    <Text style={styles.label}>Horario de Atención</Text>
                    <View style={styles.rowContainer}>
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.subLabel}>Apertura</Text>
                            <TouchableOpacity style={styles.timePickerButton} onPress={() => openPicker('open')}>
                                <Ionicons name="time-outline" size={20} color="#3EB489" style={{marginRight: 8}}/>
                                <Text style={[styles.timeText, !horaApertura && {color: '#B5B5B5'}]}>{horaApertura || "09:00 AM"}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ width: 15 }} /> 
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.subLabel}>Cierre</Text>
                            <TouchableOpacity style={styles.timePickerButton} onPress={() => openPicker('close')}>
                                <Ionicons name="time-outline" size={20} color="#FF6F61" style={{marginRight: 8}}/>
                                <Text style={[styles.timeText, !horaCierre && {color: '#B5B5B5'}]}>{horaCierre || "10:00 PM"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Tipo de Comida */}
                <View style={styles.section}>
                    <Text style={styles.label}>Tipo de comida</Text>
                    <View style={styles.chipContainer}>
                        {foodTypes.map((type) => (
                            <TouchableOpacity key={type} style={[styles.chip, tipoComida === type && { backgroundColor: "#3EB48920", borderColor: "#3EB489" }]} onPress={() => setTipoComida(type)}>
                                <Text style={[styles.chipText, tipoComida === type && { color: "#3EB489", fontWeight: "600" }]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Descripción */}
                <View style={styles.section}>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput style={[styles.input, { height: 120, textAlignVertical: "top" }]} placeholder="Cuéntanos qué ofrece tu negocio..." placeholderTextColor="#B5B5B5" multiline maxLength={500} value={descripcion} onChangeText={setDescripcion} />
                </View>

                {/* Ubicación */}
                <View style={styles.section}>
                    <Text style={styles.label}>Ubicación</Text>
                    <Text style={styles.mapHint}>Arrastra el pin para ajustar la dirección.</Text>
                    {region ? (
                        <MapView style={styles.map} initialRegion={region} onPress={handleMapPress}>
                            {pin && <Marker coordinate={pin} draggable onDragEnd={handleMapPress} />}
                        </MapView>
                    ) : ( <ActivityIndicator color="#3EB489" /> )}
                    <View style={{height: 15}} />
                    <Text style={styles.label}>Dirección exacta</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#F9F9F9'}]} placeholder="Calle, Número, Colonia" placeholderTextColor="#B5B5B5" value={direccion} onChangeText={setDireccion} multiline />
                    <Text style={styles.label}>Ciudad / Municipio</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#F9F9F9'}]} placeholder="Ej. Monterrey" placeholderTextColor="#B5B5B5" value={ciudad} onChangeText={setCiudad} />
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Este negocio tendrá varias sucursales</Text>
                        <Switch value={variasSucursales} onValueChange={setVariasSucursales} trackColor={{ false: "#ccc", true: "#3EB489" }} thumbColor="#fff" />
                    </View>
                </View>

                <TouchableOpacity style={[styles.createButton, loading && { opacity: 0.6 }]} onPress={handleCreate} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name="checkmark" size={20} color="#fff" />
                            <Text style={styles.createButtonText}>Crear negocio</Text>
                        </>
                    )}
                </TouchableOpacity>
                <View style={{ height: 60 }} />
            </ScrollView>

            {/* Modales Picker */}
            {Platform.OS === 'ios' && (
                <Modal transparent={true} visible={showPicker} animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{pickerMode === 'open' ? "Hora de Apertura" : "Hora de Cierre"}</Text>
                            <DateTimePicker value={tempDate} mode="time" display="spinner" is24Hour={false} onChange={onTimeChange} textColor="#000" themeVariant="light" style={{ height: 200, width: '100%' }} />
                            <TouchableOpacity style={styles.modalBtn} onPress={confirmIOSDate}>
                                <Text style={styles.modalBtnText}>Confirmar Hora</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
            
            {Platform.OS === 'android' && showPicker && (
                <DateTimePicker value={tempDate} mode="time" display="default" is24Hour={false} onChange={onTimeChange} accentColor="#3EB489" themeVariant="light" />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
    header: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 10 },
    backButton: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontWeight: "600", color: "#2E2E2E" },
    imageSection: { alignItems: "center", marginBottom: 20 },
    businessImage: { width: 260, height: 150, borderRadius: 16, resizeMode: "cover" },
    placeholderImage: { width: 260, height: 150, backgroundColor: "#F5EEDC", borderRadius: 16, justifyContent: "center", alignItems: "center" },
    changePhotoBtn: { marginTop: 10, borderWidth: 1.5, borderColor: "#3EB489", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    changePhotoText: { color: "#3EB489", fontWeight: "600" },
    section: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5E5E5", padding: 16, marginBottom: 20 },
    label: { fontSize: 14, color: "#2E2E2E", fontWeight: "600", marginBottom: 6 },
    input: { borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#2E2E2E", marginBottom: 10 },
    rowContainer: { flexDirection: "row", justifyContent: "space-between" },
    halfInputContainer: { flex: 1 },
    subLabel: { fontSize: 12, color: "#666", marginBottom: 6, fontWeight: '500' },
    timePickerButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#FAFAFA' },
    timeText: { fontSize: 15, color: '#333', fontWeight: '500' },
    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, alignItems: 'center', paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#3EB489', marginBottom: 10 },
    modalBtn: { marginTop: 20, backgroundColor: '#3EB489', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center' },
    modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderWidth: 1, borderColor: "#E5E5E5", backgroundColor: "#F5EEDC", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 },
    chipText: { fontSize: 14, color: "#3EB489" },
    mapHint: { fontSize: 13, color: "#666", marginBottom: 10, fontStyle: "italic" },
    map: { width: "100%", height: 250, borderRadius: 12 },
    switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    switchLabel: { fontSize: 14, color: "#2E2E2E" },
    createButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: "#3EB489", height: 55, borderRadius: 16 },
    createButtonText: { color: "#fff", fontWeight: "600", fontSize: 16, marginLeft: 6 },
});