import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, List, ListItemButton, ListItemAvatar,
  Avatar, ListItemText, Divider, Badge, CircularProgress, Chip,
} from "@mui/material";
import Layout from "../../components/Layout";
import { Messages } from "../../lib/api";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function MessagesInbox() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("immobf_token") : null;
    if (!token) { router.push("/login"); return; }
    Messages.list()
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const meId = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("immobf_user") || "{}")?.id; } catch { return null; }
  })();

  if (loading) return (
    <Layout title="Messages — ImmoBF">
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>
    </Layout>
  );

  return (
    <Layout title="Messages — ImmoBF">
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>💬 Mes messages</Typography>

      {conversations.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 6, color: "text.secondary" }}>
          <Typography>Aucune conversation pour l&apos;instant.</Typography>
          <Link href="/properties" style={{ color: "#0E7C66", marginTop: 8, display: "inline-block" }}>
            Parcourir les annonces →
          </Link>
        </Box>
      ) : (
        <List sx={{ bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
          {conversations.map((conv, i) => {
            const isMe = conv.buyer_id === meId;
            const otherName = isMe ? conv.seller_name : conv.buyer_name;
            const initial = otherName ? otherName.charAt(0).toUpperCase() : "?";
            return (
              <Box key={conv.id}>
                {i > 0 && <Divider />}
                <ListItemButton
                  component={Link}
                  href={`/messages/${conv.id}`}
                  sx={{ py: 1.5 }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conv.unread_count || null}
                      color="error"
                      overlap="circular"
                    >
                      <Avatar sx={{ bgcolor: "primary.main" }}>{initial}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography fontWeight={conv.unread_count > 0 ? 700 : 400} noWrap sx={{ flex: 1 }}>
                          {otherName || "Utilisateur"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: "nowrap" }}>
                          {timeAgo(conv.last_message_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="primary.main" noWrap sx={{ fontSize: 12 }}>
                          {conv.property_title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 13 }}>
                          {conv.last_message || "Conversation démarrée"}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </Box>
            );
          })}
        </List>
      )}
    </Layout>
  );
}
