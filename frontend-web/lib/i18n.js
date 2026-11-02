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

// Une instance par langue, choisie à partir de la locale de l'URL (/en → anglais).
// Le rendu serveur et le premier rendu client utilisent donc la même langue,
// sans erreur d'hydratation, et /en est réellement servi en anglais.
const instances = {};
export function getI18n(lng) {
  const lang = lng === "en" ? "en" : "fr";
  if (!instances[lang]) {
    const inst = i18n.createInstance();
    inst.use(initReactI18next).init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
      },
      lng: lang,
      fallbackLng: "fr",
      interpolation: { escapeValue: false },
      initImmediate: false, // ressources en mémoire : initialisation synchrone
    });
    instances[lang] = inst;
  }
  return instances[lang];
}

export default i18n;
