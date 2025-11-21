import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebaseConfig";

export default function CommentsScreen() {
  const { id } = useLocalSearchParams();
  const postId = Array.isArray(id) ? id[0] : id; // ✅ Normalización del parámetro
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // ---------------------------------------------------------------------------
  // 🔹 Cargar post completo
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const snap = await getDoc(doc(db, "posts", postId as string));
        console.log("📄 Intentando obtener:", postId, "=> existe:", snap.exists());

        if (!snap.exists()) {
          console.log("⚠️ El post no existe.");
          return;
        }

        const data = snap.data();
        setPost(data);

        // Verificar si hay restaurante
        if (data.restaurant) {
          const restSnap = await getDoc(doc(db, "restaurants", data.restaurant));
          if (restSnap.exists()) {
            const r = restSnap.data() as any;

            if (r.horario?.apertura && r.horario?.cierre) {
              const [hA, mA] = r.horario.apertura.split(":").map(Number);
              const [hC, mC] = r.horario.cierre.split(":").map(Number);
              const now = new Date();
              const hr = now.getHours() + now.getMinutes() / 60;

              setIsOpen(hr >= hA + mA / 60 && hr < hC + mC / 60);
            }
          }
        }
      } catch (err) {
        console.log("❌ Error obteniendo el post:", err);
      }
    };

    fetchPost();
  }, [postId]);

  // ---------------------------------------------------------------------------
  // 🔹 Escuchar comentarios del post
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!postId) return;

    const q = query(
      collection(db, "posts", postId as string, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, [postId]);

  // ---------------------------------------------------------------------------
  // 🔹 Enviar comentario
  // ---------------------------------------------------------------------------
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const userSnap = await getDoc(doc(db, "users", uid));
    const userData = userSnap.exists() ? userSnap.data() : {};

    const comment = {
      text: newComment.trim(),
      userId: uid,
      userName: userData.name || "Usuario",
      userPhoto: userData.photoURL || "https://i.imgur.com/8Km9tLL.png",
      username: userData.username || "",
      likes: 0,
      likedBy: [],
      replyTo: replyTo || null,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "posts", postId as string, "comments"), comment);

    setNewComment("");
    setReplyTo(null);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
  };

  // ---------------------------------------------------------------------------
  // ❤️ Like de comentario
  // ---------------------------------------------------------------------------
  const handleLikeComment = async (cid: string, liked: boolean) => {
    if (!auth.currentUser) return;

    const ref = doc(db, "posts", postId as string, "comments", cid);
    const userId = auth.currentUser.uid;

    const current = comments.find((c) => c.id === cid)?.likes || 0;

    await updateDoc(ref, {
      likes: liked ? current - 1 : current + 1,
      likedBy: liked ? arrayRemove(userId) : arrayUnion(userId),
    });
  };

  // ---------------------------------------------------------------------------
  // 🔹 Render de comentarios (soporta replies)
  // ---------------------------------------------------------------------------
  const renderComments = (parent: string | null = null, level = 0) =>
    comments
      .filter((c) => c.replyTo === parent)
      .map((c) => {
        const liked = c.likedBy?.includes(auth.currentUser?.uid);

        return (
          <View
            key={c.id}
            style={{
              marginLeft: level * 25,
              borderLeftWidth: level > 0 ? 1 : 0,
              borderLeftColor: "#ddd",
              paddingLeft: level > 0 ? 10 : 0,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Image
                source={{ uri: c.userPhoto }}
                style={{ width: 30, height: 30, borderRadius: 15, marginRight: 8 }}
              />
              <View>
                <Text style={{ fontWeight: "600", color: "#333" }}>{c.userName}</Text>
                {c.username ? (
                  <Text style={{ fontSize: 12, color: "#777" }}>{c.username}</Text>
                ) : null}
              </View>
            </View>

            <Text style={{ fontSize: 14, color: "#444", marginBottom: 6 }}>{c.text}</Text>

            <View style={{ flexDirection: "row", gap: 18 }}>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                onPress={() => handleLikeComment(c.id, liked)}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={17}
                  color={liked ? "#FF6F61" : "#777"}
                />
                <Text style={{ color: "#777" }}>{c.likes || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                onPress={() => setReplyTo(c.id)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#777" />
                <Text style={{ color: "#777" }}>Responder</Text>
              </TouchableOpacity>
            </View>

            {renderComments(c.id, level + 1)}
          </View>
        );
      });

  // ---------------------------------------------------------------------------
  // ⏳ Loading
  // ---------------------------------------------------------------------------
  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3EB489" />
      </SafeAreaView>
    );

  // ---------------------------------------------------------------------------
  // 🧱 UI
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* 🔙 Header */}
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        {/* 🔽 Scroll */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 90 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* 📌 POST COMPLETO */}
          {post && (
            <View
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#eee",
                borderRadius: 16,
                padding: 14,
                marginBottom: 20,
              }}
            >
              {/* Usuario */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Image
                  source={{
                    uri: post.userImage || "https://i.imgur.com/8Km9tLL.png",
                  }}
                  style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600" }}>{post.user}</Text>
                  <Text style={{ fontSize: 12, color: "#777" }}>
                    {post.time?.toDate
                      ? new Date(post.time.toDate()).toLocaleString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </Text>
                </View>
              </View>

              {/* Texto */}
              {post.text ? <Text style={{ marginBottom: 8 }}>{post.text}</Text> : null}

              {/* Imagen */}
              {post.image ? (
                <Image
                  source={{ uri: post.image }}
                  style={{ width: "100%", height: 220, borderRadius: 12, marginBottom: 10 }}
                />
              ) : null}

              {/* Estado */}
              {isOpen !== null && (
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
                  <Ionicons
                    name={isOpen ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={isOpen ? "#3EB489" : "#FF5A5F"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: isOpen ? "#3EB489" : "#FF5A5F",
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {isOpen ? "Abierto ahora" : "Cerrado ahora"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 💬 Comentarios */}
          {comments.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#777", marginTop: 20 }}>
              No hay comentarios todavía.
            </Text>
          ) : (
            renderComments()
          )}
        </ScrollView>

        {/* ✏️ Campo de comentario */}
        <View
          style={{
            flexDirection: "row",
            padding: 10,
            borderTopWidth: 1,
            borderColor: "#eee",
            backgroundColor: "#fff",
          }}
        >
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 20,
              paddingHorizontal: 14,
              height: 42,
              backgroundColor: "#fafafa",
            }}
            placeholder={replyTo ? "Responder..." : "Escribe un comentario..."}
            value={newComment}
            onChangeText={setNewComment}
            onFocus={() =>
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)
            }
          />

          <TouchableOpacity onPress={handleAddComment} style={{ marginLeft: 10 }}>
            <Ionicons name="send" size={24} color="#3EB489" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
