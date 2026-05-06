export function formatFCFA(amount, currency = "XOF", locale = "fr-FR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatArea(m2) {
  if (m2 == null) return "—";
  return `${Number(m2).toLocaleString("fr-FR")} m²`;
}
