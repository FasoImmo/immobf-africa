import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Chip, CircularProgress, Alert, Tooltip, TextField, InputAdornment,
  Avatar, Rating,
} from "@mui/material";
import DeleteIcon   from "@mui/icons-material/DeleteOutline";
import SearchIcon   from "@mui/icons-material/Search";
import StarIcon     from "@mui/icons-material/Star";
import AdminLayout  from "../../components/AdminLayout";
import { Admin }    from "../../lib/api";
import Link         from "next/link";

function StarBadge({ value }) {
  const colors = { 5: "#16a34a", 4: "#65a30d", 3: "#ca8a04", 2: "#ea580c", 1: "#dc2626" };
  return (
    <Chip
      icon={<StarIcon sx={{ fontSize: "14px !important" }} />}
      label={Number(value).toFixed(1)}
      size="small"
      sx={{ bgcolor: colors[value] + "22", color: colors[value], fontWeight: 700, border: `1px solid ${colors[value]}44`, fontSize: 12 }}
    />
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [error,   setError]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    Admin.reviews()
      .then((d) => setReviews(d.reviews || []))
      .catch(() => setError("Impossible de charger les avis."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm("Supprimer cet avis définitivement ?")) return;
    setDeleting(id);
    try {
      await Admin.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setDeleting(null);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? reviews.filter(
        (r) =>
          (r.reviewer_name || "").toLowerCase().includes(q) ||
          (r.property_title || "").toLowerCase().includes(q) ||
          (r.seller_name || "").toLowerCase().includes(q) ||
          (r.comment || "").toLowerCase().includes(q)
      )
    : reviews;

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <AdminLayout title="Avis & Notes — Admin ImmoBF">
      {/* KPI band */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total avis", value: reviews.length, color: "#0E7C66" },
          { label: "Note moyenne", value: avgRating, color: "#ca8a04" },
          { label: "5 étoiles", value: reviews.filter((r) => r.rating === 5).length, color: "#16a34a" },
          { label: "1–2 étoiles", value: reviews.filter((r) => r.rating <= 2).length, color: "#dc2626" },
        ].map(({ label, value, color }) => (
          <Paper
            key={label}
            sx={{
              p: 2, borderRadius: 2, minWidth: 130, flex: "1 1 130px",
              borderTop: `3px solid ${color}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color, mt: 0.25 }}>
              {value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Barre de recherche */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Rechercher par annonce, reviewer, commentaire…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: "#fff", borderRadius: 1, minWidth: 320 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: "#0E7C66" }} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: 12 }}>Note</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: 12 }}>Reviewer</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: 12 }}>Annonce</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: 12 }}>Annonceur</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: 12 }}>Commentaire</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: 12 }}>Date</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell>
                    <StarBadge value={r.rating} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: "#0E7C6622", color: "#0E7C66", fontSize: 12, fontWeight: 700 }}>
                        {(r.reviewer_name || "?")[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                          {r.reviewer_name || "ND"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.reviewer_phone || r.reviewer_email || ""}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/properties/${r.property_id}`}
                      target="_blank"
                      style={{ color: "#0E7C66", fontWeight: 500, fontSize: 13, textDecoration: "none" }}
                    >
                      {(r.property_title || "ND").substring(0, 40)}
                      {(r.property_title || "").length > 40 ? "…" : ""}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>{r.seller_name || "ND"}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    {r.comment ? (
                      <Typography variant="body2" sx={{ fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
                        {r.comment.length > 100 ? r.comment.substring(0, 100) + "…" : r.comment}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Supprimer l'avis">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting === r.id}
                        sx={{ color: "#ef4444", "&:hover": { bgcolor: "#fee2e2" } }}
                      >
                        {deleting === r.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.disabled" }}>
                    {q ? "Aucun avis correspondant à la recherche." : "Aucun avis pour le moment."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {filtered.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
          {filtered.length} avis {q ? `filtrés sur ${reviews.length}` : "au total"}
        </Typography>
      )}
    </AdminLayout>
  );
}
