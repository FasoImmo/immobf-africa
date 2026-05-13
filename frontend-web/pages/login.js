import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Paper, TextField, Button, Typography, Alert,
  Checkbox, FormControlLabel, Tabs, Tab, Divider
} from "@mui/material";
import Layout from "../components/Layout";
import { Auth } from "../lib/api";

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState(0); // 0 = connexion, 1 = inscription

  // Connexion
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);

  // Inscription
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [cguAccepted, setCguAccepted] = useState(false);
  const [regErr, setRegErr] = useState(null);

  async function onLogin(e) {
    e.preventDefault();
    setErr(null);
    try {
      const { access, user } = await Auth.login({ phone, password });
      localStorage.setItem("immobf_token", access);
      localStorage.setItem("immobf_user", JSON.stringify(user));
      router.push("/");
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message);
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    setRegErr(null);
    if (!cguAccepted) {
      setRegErr("Vous devez accepter les CGU pour créer un compte.");
      return;
    }
    try {
      const { access, user } = await Auth.register({
        phone: regPhone,
        password: regPassword,
        full_name: regName,
      });
      localStorage.setItem("immobf_token", access);
      localStorage.setItem("immobf_u