import { useState } from "react";
import { useRouter } from "next/router";
import { Box, Paper, TextField, Button, Typography, Alert } from "@mui/material";
import Layout from "../components/Layout";
import { Auth } from "../lib/api";

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e.preventDefault(); setErr(null);
    try {
      const { access, user } = await Auth.login({ phone, password });
      localStorage.setItem("immobf_token", access);
      localStorage.setItem("immobf_user", JSON.stringify(user));
      router.push("/");
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message);
    }
  }

  return (
    <Layout title="Connexion — ImmoBF">
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Paper sx={{ p: 4, maxWidth: 380, width: "100%" }} elevation={2}>
          <Typography variant="h5" gutterBottom>Connexion</Typography>
          <form onSubmit={onSubmit}>
            <TextField fullWidth label="Téléphone (+226…)" margin="normal"
              value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <TextField fullWidth label="Mot de passe" type="password" margin="normal"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>Se connecter</Button>
          </form>
        </Paper>
      </Box>
    </Layout>
  );
}
