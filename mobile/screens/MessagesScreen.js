import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Messages } from "../lib/api";

export default function MessagesScreen() {
  const [myId, setMyId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // objet conversation complet
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem("immobf_user").then((v) => {
      if (v) {
        try { setMyId(JSON.parse(v).id); } catch (_) {}
      }
    });
    loadConversations();
  }, []);

  async function loadConversations() {
    setLoading(true);
    try {
      const d = await Messages.list();
      setConversations(d.conversations || []);
    } catch (_) {
      Alert.alert("Erreur", "Impossible de charger les messages.");
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(conv) {
    setSelected(conv);
    setMsgLoading(true);
    try {
      const d = await Messages.getMessages(conv.id);
      setMessages(d.messages || []);
    } catch (_) {
      Alert.alert("Erreur", "Impossible de charger les messages.");
    } finally {
      setMsgLoading(false);
    }
  }

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const d = await Messages.send(selected.id, body.trim());
      setMessages((prev) => [...prev, d.message]);
      setBody("");
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  // ─── Vue messages d'une conversation ───────────────────────────────────────
  if (selected) {
    const otherName = myId === selected.buyer_id ? selected.seller_name : selected.buyer_name;
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#fff" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={s.convHeader}>
          <TouchableOpacity
            onPress={() => { setSelected(null); loadConversations(); }}
            style={s.backBtn}
          >
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.convHeaderName} numberOfLines={1}>{otherName || "Conversation"}</Text>
            <Text style={s.convHeaderSub} numberOfLines={1}>{selected.property_title || ""}</Text>
          </View>
        </View>

        {/* Messages */}
        {msgLoading ? (
          <ActivityIndicator color="#0E7C66" style={{ marginTop: 30 }} />
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#aaa", fontSize: 14 }}>Aucun message. Démarrez la conversation.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: 14, paddingBottom: 16 }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine = item.sender_id === myId;
              return (
                <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
                  {!isMine && (
                    <Text style={s.bubbleSender}>{item.sender_name || otherName}</Text>
                  )}
                  <Text style={[s.bubbleText, isMine && { color: "#fff" }]}>{item.body}</Text>
                  <Text style={[s.bubbleTime, isMine && { color: "rgba(255,255,255,0.7)" }]}>
                    {new Date(item.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Saisie */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Votre message…"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity style={[s.sendBtn, !body.trim() && { backgroundColor: "#ccc" }]} onPress={send} disabled={sending || !body.trim()}>
            <Text style={s.sendBtnText}>{sending ? "…" : "➤"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Liste des conversations ────────────────────────────────────────────────
  if (loading) {
    return <ActivityIndicator color="#0E7C66" style={{ marginTop: 40 }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {conversations.length === 0 ? (
        <View style={{ padding: 24, alignItems: "center", marginTop: 60 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
          <Text style={{ color: "#888", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
            Aucun message pour l'instant.{"\n"}Contactez un annonceur depuis une fiche annonce.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => String(c.id)}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />}
          renderItem={({ item }) => {
            const otherName = myId === item.buyer_id ? item.seller_name : item.buyer_name;
            const initial = (otherName || "?")[0].toUpperCase();
            return (
              <TouchableOpacity style={s.convRow} onPress={() => openConversation(item)}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.convName} numberOfLines={1}>{otherName || "Utilisateur"}</Text>
                  <Text style={s.convProp} numberOfLines={1}>{item.property_title || "Annonce"}</Text>
                  {item.last_message ? (
                    <Text style={s.convLast} numberOfLines={1}>{item.last_message}</Text>
                  ) : null}
                </View>
                {item.unread_count > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.unread_count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // Header conversation
  convHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backBtn: { marginRight: 12, paddingVertical: 4 },
  backText: { color: "#0E7C66", fontWeight: "600", fontSize: 14 },
  convHeaderName: { fontWeight: "700", fontSize: 15, color: "#1a1a1a" },
  convHeaderSub: { color: "#0E7C66", fontSize: 12, marginTop: 1 },
  // Bulles
  bubble: {
    maxWidth: "80%", borderRadius: 14, padding: 10,
    marginBottom: 8,
  },
  bubbleMine: { backgroundColor: "#0E7C66", alignSelf: "flex-end" },
  bubbleOther: { backgroundColor: "#f0f0f0", alignSelf: "flex-start" },
  bubbleSender: { fontSize: 11, color: "#888", marginBottom: 3, fontWeight: "600" },
  bubbleText: { fontSize: 14, color: "#333", lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: "#888", marginTop: 4, textAlign: "right" },
  // Input
  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    padding: 10, borderTopWidth: 1, borderTopColor: "#eee",
    gap: 8, backgroundColor: "#fff",
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    maxHeight: 100, fontSize: 14, backgroundColor: "#fafafa",
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#0E7C66", alignItems: "center", justifyContent: "center",
  },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  // Liste conversations
  convRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "#0E7C66", alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  convName: { fontWeight: "700", fontSize: 14, color: "#1a1a1a" },
  convProp: { color: "#0E7C66", fontSize: 12, marginTop: 1 },
  convLast: { color: "#888", fontSize: 12, marginTop: 2 },
  badge: {
    backgroundColor: "#c0392b", borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
