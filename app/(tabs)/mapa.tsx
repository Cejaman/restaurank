import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { db } from "../../firebaseConfig";


// 🎨 ESTILO PARA LIMPIAR EL MAPA
const cleanMapStyle = [
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
];

// 🧩 SUB-COMPONENTE PARA EL MARCADOR (Optimización de Imagen)
const CustomMarker = ({ restaurant, router }: { restaurant: any, router: any }) => {
    // Truco para recargar el marcador cuando la imagen está lista
    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    const stopTracking = () => {
        setTracksViewChanges(false);
    };

    return (
        <Marker
            coordinate={{
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
            }}
            tracksViewChanges={tracksViewChanges} // Clave para que la imagen se vea
        >
            {/* 📍 PIN FOTO CIRCULAR */}
            <View style={styles.markerContainer}>
                <Image
                    source={{ uri: restaurant.photoURL || "https://via.placeholder.com/100?text=R" }}
                    style={styles.markerImage}
                    onLoad={stopTracking} // Detiene el re-renderizado al cargar
                    fadeDuration={0} // Evita parpadeo en Android
                />
                <View style={styles.markerArrow} />
            </View>

            {/* 💬 BURBUJA */}
            <Callout tooltip onPress={() => router.push(`/restaurantes/${restaurant.id}`)}>
                <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{restaurant.name}</Text>
                    <Text style={styles.calloutCategory}>{restaurant.category || "Restaurante"}</Text>
                    <View style={styles.btnProfile}>
                        <Text style={styles.btnTextWhite}>Ver Perfil</Text>
                    </View>
                </View>
            </Callout>
        </Marker>
    );
};

export default function MapaScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const snapshot = await getDocs(collection(db, "restaurants"));
        const data = snapshot.docs.map((doc) => {
            const d = doc.data();
            const lat = d.location?.latitude || d.latitude;
            const long = d.location?.longitude || d.longitude;
            return { id: doc.id, ...d, latitude: lat, longitude: long };
        });
        setRestaurants(data.filter(r => r.latitude && r.longitude));
      } catch (error) {
        console.error("Error cargando mapa:", error);
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3EB489" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={cleanMapStyle}
        initialRegion={{
          latitude: restaurants[0]?.latitude || 25.6866,
          longitude: restaurants[0]?.longitude || -100.3161,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
        showsPointsOfInterest={false}
        showsCompass={false}
        showsBuildings={false}
        showsIndoors={false}
      >
        {restaurants.map((r) => (
          <CustomMarker key={r.id} restaurant={r} router={router} />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  /* --- ESTILOS DEL PIN --- */
  markerContainer: { alignItems: "center", justifyContent: "center", width: 50, height: 55 },
  markerImage: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#3EB489", backgroundColor: "#fff",
  },
  markerArrow: {
    width: 0, height: 0, backgroundColor: "transparent", borderStyle: "solid",
    borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 0, borderTopWidth: 8,
    borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#3EB489", marginTop: -2,
  },

  /* --- ESTILOS DE LA BURBUJA --- */
  calloutContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    width: 160,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
    marginBottom: 5,
  },
  calloutTitle: { fontWeight: "bold", fontSize: 15, color: "#2E2E2E", marginBottom: 2, textAlign: 'center' },
  calloutCategory: { fontSize: 12, color: "#888", marginBottom: 8 },
  
  btnProfile: {
    backgroundColor: "#3EB489",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center'
  },
  btnTextWhite: { color: "#fff", fontSize: 12, fontWeight: "600" },
});