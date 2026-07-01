import { useState, useEffect } from "react";
import { Box, Button, Paper, Typography, Link as MuiLink } from "@mui/material";
import CookieIcon from "@mui/icons-material/Cookie";
import NextLink from "next/link";
import { useTranslation } from "react-i18next";

const CONSENT_KEY = "immobf_cookie_consent";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const stored = localStorage.getItem(CONSENT_KEY);
      setVisible(!stored);
    };
    check();
    // Écouter les mises à jour depuis la page /legal/cookies
    window.addEventListener("cookie_consent_update", check);
    return () => window.removeEventListener("cookie_consent_update", check);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const refuse = () => {
    localStorage.setItem(CONSENT_KEY, "refused");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        borderRadius: 0,
        borderTop: "3px solid #1B6B3A",
        backgroundColor: "#fff",
        px: { xs: 2, md: 4 },
        py: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: "lg",
          mx: "auto",
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <CookieIcon sx={{ color: "#1B6B3A", flexShrink: 0, fontSize: 28 }} />

        <Typography variant="body2" sx={{ color: "#444", flex: 1, lineHeight: 1.6 }}>
          {t("cookie.banner_text")}{" "}
          <MuiLink component={NextLink} href="/legal/cookies" sx={{ color: "#1B6B3A" }}>
            {t("cookie.learn_more")}
          </MuiLink>
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
          <Button
            variant="contained"
            size="small"
            onClick={accept}
            sx={{
              backgroundColor: "#1B6B3A",
              "&:hover": { backgroundColor: "#145530" },
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            {t("cookie.accept")}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={refuse}
            sx={{
              borderColor: "#ccc",
              color: "#666",
              textTransform: "none",
            }}
          >
            {t("cookie.refuse")}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
