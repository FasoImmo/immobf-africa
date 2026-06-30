import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LANG_KEY = "immobf_lang";

export const LangContext = createContext({ lang: "fr", setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState("fr");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => { if (v) setLangState(v); });
  }, []);

  async function setLang(l) {
    setLangState(l);
    await AsyncStorage.setItem(LANG_KEY, l);
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
