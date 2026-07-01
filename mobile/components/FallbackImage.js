import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";

/**
 * Image avec fallback : si l'URL est absente ou cassée (onError),
 * affiche un placeholder gris avec une icône maison centrée.
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
        <View style={s.iconWrap}>
          <View style={s.roof} />
          <View style={s.body} />
        </View>
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
    backgroundColor: "#e8ede8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrap: {
    alignItems: "center",
    opacity: 0.35,
  },
  // Petit pictogramme maison dessiné en pur View (pas de dépendance icône)
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 14,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#4a7c5e",
    marginBottom: -2,
  },
  body: {
    width: 28,
    height: 20,
    backgroundColor: "#4a7c5e",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
