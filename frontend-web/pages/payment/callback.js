import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box, Paper, Typography, Alert, CircularProgress } from "@mui/material";
import Layout from "../../components/Layout";

export default function Callback() {
  const router = useRouter();
  const { ref } = router.query;
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    if (!ref) return;
    // poll le backend toutes les 3s pendant 60s
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      try {
        const token = localStorage.getItem("immobf_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments?ref=${ref}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const tx = (data.items || []).find((t) => t.reference === ref);
        if (tx && (tx.status === "succeeded" || tx.status === "failed")) {
          setStatus(tx.status);
          clearInterval(id);
        }
      } catch { /* ignore */ }
      if (tries > 20) { clearInterval(id); }
    }, 3000);
    return () => clearInterval(id);
  }, [ref]);

  return (
    <Layout title="Paiement — ImmoBF">
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Paper sx={{ p: 4, maxWidth: 440, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>Paiement {ref}</Typography>
          {status === "pending" && (<><CircularProgress /><Typography sx={{ mt: 2 }}>En attente de confirmation opérateur…</Typography></>)}
          {status === "succeeded" && <Alert severity="success">Paiement confirmé. Un reçu PDF vous a été envoyé.</Alert>}
          {status === "failed" && <Alert severity="error">Le paiement a échoué. Merci de réessayer.</Alert>}
        </Paper>
      </Box>
    </Layout>
  );
}
