import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const showFAB = pathname === "/(tabs)";

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#3EB489",
          tabBarInactiveTintColor: "#7A7A7A",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            height: 70,
            paddingBottom: 4,
            paddingTop: 4,
            borderTopColor: "#DDDDDD",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="restaurantes"
          options={{
            title: "Restaurantes",
            tabBarIcon: ({ color }) => (
              <Ionicons name="restaurant-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="mapa"
          options={{
            title: "Mapa",
            tabBarIcon: ({ color }) => (
              <Ionicons name="map-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="top"
          options={{
            title: "Destacados",
            tabBarIcon: ({ color }) => (
              <Ionicons name="star-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="cuenta"
          options={{
            title: "Mi perfil",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person-outline" size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* FAB */}
      {pathname === "/(tabs)" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/createPost")}
        >
          <Ionicons name="add" size={32} color="#FFF" />
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "#3EB489",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    zIndex: 9999,
  },
});
