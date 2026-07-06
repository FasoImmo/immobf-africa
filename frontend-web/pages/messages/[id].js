import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, TextField, Button, Paper, Avatar,
  CircularProgress, Divider, IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import Layout from "../../components/Layout";
import { Messages } from "../../lib/api";

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ConversationPage() {
  const router = useRouter();
  const { id } = router.query;

  const [conv, setConv]       = useState(null);
  const [messages, setMsgs]   = useState([]);
  const [body, setBody]       = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const meId = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("immobf_user") || "{}")?.id; } catch { return null; }
  })();

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function load() {
    if (!id) return;
    try {
      const d = await Messages.getMessages(id);
      setConv(d.conversation);
      setMsgs(d.messages || []);
      scrollToBottom();
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("immobf_token") : null;
    if (!token) { router.push("/login"); return; }
    load();
    // Polling toutes les 10s
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [id]); // eslint-disable-line

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const { message } = await Messages.send(id, body.trim());
      setMsgs((prev) => [...prev, message]);
      setBody("");
      scrollToBottom();
    } catch (_) {} finally { setSending(false); }
  }

  if (loading) return (
    <Layout title="Conversation — ImmoBF">
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>
    </Layout>
  );

  const otherName = conv
    ? (meId === conv.buyer_id ? conv.seller_name : conv.buyer_name)
    : "Conversation";

  // Regrouper les messages par date
  const grouped = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <Layout title={`${otherName || "Conversation"} — ImmoBF`}>
      {/* En-tête */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton onClick={() => router.push("/messages")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
          {otherName?.charAt(0).toUpperCase() || "?"}
        </Avatar>
        <Box>
          <Typography fontWeight={700}>{otherName}</Typography>
          {conv?.property_title && (
            <Typography variant="caption" color="text.secondary">
              <Link href={`/properties/${conv.property_id}`} style={{ color: "#0E7C66" }}>
                {conv.property_title}
              </Link>
            </Typography>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Fil de messages */}
      <Box sx={{ minHeight: 300, maxHeight: "60vh", overflowY: "auto", mb: 2, px: 1 }}>
        {messages.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            Commencez la conversation ci-dessous.
          </Typography>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <Box key={date}>
            <Typography variant="caption" color="text.secondary"
              sx={{ display: "block", textAlign: "center", my: 2 }}>
              {date}
            </Typography>
            {msgs.map((msg) => {
              const isMe = msg.sender_id === meId;
              return (
                <Box key={msg.id} sx={{
                  display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", mb: 1,
                }}>
                  {!isMe && (
                    <Avatar sx={{ width: 28, height: 28, mr: 1, mt: 0.5, bgcolor: "grey.400", fontSize: 12 }}>
                      {msg.sender_name?.charAt(0) || "?"}
                    </Avatar>
                  )}
                  <Box sx={{ maxWidth: "72%" }}>
                    <Paper elevation={0} sx={{
                      px: 2, py: 1,
                      bgcolor: isMe ? "primary.main" : "grey.100",
                      color: isMe ? "white" : "text.primary",
                      borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    }}>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {msg.body}
                      </Typography>
                    </Paper>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ display: "block", textAlign: isMe ? "right" : "left", mt: 0.25, px: 0.5 }}>
                      {formatTime(msg.created_at)}
                      {isMe && msg.read_at && " · Lu"}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Zone de saisie */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          fullWidth multiline maxRows={4} size="small"
          placeholder="Votre message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <IconButton
          color="primary" onClick={handleSend}
          disabled={sending || !body.trim()}
          sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" },
                "&:disabled": { bgcolor: "grey.300" } }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Layout>
  );
}
