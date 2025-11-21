import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONTS } from "../constants/Theme";
import { db } from "../firebaseConfig";

type Restaurant = {
  id: string;
  name: string;
  image: string;
  category: string;
  rating: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (restaurant: Restaurant) => void;
};

export default function RestaurantPicker({ visible, onClose, onSelect }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "restaurants"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Restaurant[];
        setRestaurants(data);
      } catch (error) {
        console.error("Error al obtener restaurantes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (visible) fetchRestaurants();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.cardBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: "70%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text style={[FONTS.user, { fontSize: 18 }]}>Selecciona un restaurante</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: COLORS.button, fontWeight: "600" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.button} />
          ) : (
            <FlatList
              data={restaurants}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[FONTS.user, { color: COLORS.textPrimary }]}>
                      {item.name}
                    </Text>
                    <Text style={[FONTS.meta, { color: COLORS.textSecondary }]}>
                      {item.category} • ⭐ {item.rating}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
