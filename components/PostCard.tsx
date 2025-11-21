import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants/Theme";
import { auth, db } from "../firebaseConfig";

type PostProps = {
  id: string;
  user: string;
  userImage?: string;
  userId: string;
  time?: any;
  text: string;
  image?: string;
  restaurant?: string;
  restaurantId?: string;
  rating?: number;
  likes: number;
  comments: number;
  // 🟢 ESTA ES LA CLAVE PARA CORREGIR EL ERROR:
  onDelete?: (id: string) => void;
};

export default function PostCard({
  id,
  user,
  userImage,
  userId,
  time,
  text,
  image,
  restaurant,
  restaurantId,
  rating = 0,
  likes,
  comments,
  onDelete, // 🟢 Recibimos la función
}: PostProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  let formattedTime = "";
  if (time) {
    if (typeof time.toDate === 'function') {
        formattedTime = time.toDate().toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    } else if (time instanceof Date) {
        formattedTime = time.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    }
  }

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "posts", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLikeCount(data.likes || 0);
        const likedBy = data.likedBy || [];
        setLiked(likedBy.includes(auth.currentUser?.uid));
      }
    });
    return () => unsub();
  }, [id]);

  const handleLike = async () => {
    if (!auth.currentUser) return;
    const postRef = doc(db, "posts", id);
    const currentUserId = auth.currentUser.uid;
    try {
      if (liked) {
        await updateDoc(postRef, { likes: (likeCount - 1 > 0 ? likeCount - 1 : 0), likedBy: arrayRemove(currentUserId) });
      } else {
        await updateDoc(postRef, { likes: likeCount + 1, likedBy: arrayUnion(currentUserId) });
      }
    } catch (error) { console.error("Error like:", error); }
  };

  const handleDeletePress = () => {
      if (onDelete) {
          Alert.alert(
              "Eliminar reseña",
              "¿Estás seguro de borrar esta reseña?",
              [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Eliminar", style: "destructive", onPress: () => onDelete(id) }
              ]
          );
      }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.headerUser} 
            onPress={() => userId && router.push(`/perfil/${userId}`)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: userImage || "https://i.imgur.com/8Km9tLL.png" }} style={styles.avatar} />
            <View>
              <Text style={styles.userName}>{user}</Text>
              {formattedTime ? <Text style={styles.dateText}>{formattedTime}</Text> : null}
            </View>
          </TouchableOpacity>

          {/* 🟢 Botón borrar si existe la función */}
          {onDelete && (
              <TouchableOpacity onPress={handleDeletePress} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#FF6F61" />
              </TouchableOpacity>
          )}
      </View>

      {restaurant && (
        <TouchableOpacity style={styles.restaurantRow} onPress={() => restaurantId && router.push(`/restaurantes/${restaurantId}`)} activeOpacity={0.7}>
          <MaterialIcons name="restaurant" size={18} color={COLORS.button} style={{ marginRight: 6 }} />
          <Text style={styles.restaurantName}>{restaurant}</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name={i <= Math.round(rating) ? "star" : "star-outline"} size={16} color={i <= Math.round(rating) ? "#FFD166" : "#E0E0E0"} />
            ))}
          </View>
        </TouchableOpacity>
      )}

      {text ? <Text style={styles.postText}>{text}</Text> : null}
      {image ? <Image source={{ uri: image }} style={styles.postImage} resizeMode="cover" /> : null}

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? "#FF6F61" : "#7A7A7A"} />
          <Text style={[styles.actionText, liked && {color: "#FF6F61"}]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push({ pathname: "/comments/[id]", params: { id } })}>
          <Ionicons name="chatbubble-outline" size={22} color="#7A7A7A" />
          <Text style={styles.actionText}>{comments}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#F0F0F0", padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  headerContainer: { flexDirection: "row", justifyContent: 'space-between', alignItems: "flex-start", marginBottom: 10 },
  headerUser: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12, backgroundColor: '#EEE' },
  userName: { fontSize: 16, fontWeight: "700", color: "#2E2E2E" },
  dateText: { fontSize: 12, color: "#999", marginTop: 2 },
  deleteBtn: { padding: 5 }, 
  restaurantRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, backgroundColor: '#F9F9F9', padding: 8, borderRadius: 8 },
  restaurantName: { fontWeight: "700", fontSize: 14, color: COLORS.button, marginRight: 8, flex: 1 },
  ratingContainer: { flexDirection: "row", alignItems: "center" },
  postText: { fontSize: 15, color: "#444", lineHeight: 22, marginBottom: 10 },
  postImage: { width: "100%", height: 250, borderRadius: 12, marginBottom: 12, backgroundColor: '#EEE' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  actionText: { color: "#7A7A7A", fontSize: 14, fontWeight: '500' }
});