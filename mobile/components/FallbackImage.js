import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";

const LOGO = require("../assets/icon.png");

/**
 * Image avec fallback : si l'URL est absente ou cassée (onError),
 * affiche le logo ImmoBF Africa centré sur fond clair.
 *
 * Props : toutes celles de <Image> sont passées via {...rest}.
 * `style` applique le style à la fois sur le placeholder et sur l'image réelle.
 */
export default function FallbackImage({ source, style, ...rest }) {
  const [error, setError] = useState(false);

  const uri = source?.uri;
  const hasUri = uri && uri.startsWith("http");

  if (!hasUri || error) {
    return (
      <View style={[s.placeholder, style]}>
        <Image source={LOGO} style={s.logoImg} resizeMode="contain" />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      onError={() => setError(true)}
      {...rest}
    />
  );
}

const s = StyleSheet.create({
  placeholder: {
    backgroundColor: "#e8f4f0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: "60%",
    height: "60%",
    opacity: 0.55,
  },
});
