export function formatFCFA(amount, currency = "XOF", locale = "fr-FR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(amount);
}

export function formatArea(m2) {
  if (m2 == null) return "—";
  return `${Number(m2).toLocaleString("fr-FR")} m²`;
}

/** Nombre avec séparateur de milliers (espace), sans devise */
export function formatNumber(n, locale = "fr-FR") {
  if (n == null) return "—";
  return new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }).format(n);
}
