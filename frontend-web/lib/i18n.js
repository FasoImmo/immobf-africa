import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

if (!i18n.isInitialized) {
  // Restaurer la langue sauvegardée (côté client uniquement)
  const savedLang = typeof window !== "undefined"
    ? localStorage.getItem("immobf_lang") || "fr"
    : "fr";

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { tr