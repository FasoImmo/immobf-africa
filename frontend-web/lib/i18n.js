import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

if (!i18n.isInitialized) {
  // Toujours démarrer en "fr" pour éviter les erreurs d'hydratation React
  // (SSR et CSR doivent avoir la même langue au premier rendu)
  // La langue préférée est restaurée dans _app.js via useEffect après hydratation
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
      },
      lng: "fr",
      fallbackLng: "fr",
      interpolation: { escapeValue: false },
    });
}

export default i18n;
