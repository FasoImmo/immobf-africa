import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLang } from "../lib/lang";
import { Properties, Reviews } from "../lib/api";

function fmtNum(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
import FallbackImage from "../components/FallbackImage";

const T = {
  fr: {
    noListing: "Aucune annonce",
    commission: "Commission (5%)",
    total: "Total séjour",
    nights: "nuit(s)",
    months: "mois",
    duration: "Durée",
    arrival: "Date d'arrivée",
    departure: "Date de départ",
    pricePerNight: "Prix / nuit",
    pricePerMonth: "Prix / mois",
    salePrice: "Prix de vente",
    payBtn: "Réserver et payer la commission",
    whatsappBtn: "Contacter sur WhatsApp",
    contactOwner: "Contacter l'annonceur",
    sale: "Vente",
    rentLong: "Location longue durée",
    rentShort: "Court séjour",
    noContact: "Aucun contact disponible",
    lockMsg: "🔒 Réglez la commission pour débloquer le contact WhatsApp de l'annonceur.",
  },
  en: {
    noListing: "No listing",
    commission: "Commission (5%)",
    total: "Total stay",
    nights: "night(s)",
    months: "month(s)",
    duration: "Duration",
    arrival: "Check-in date",
    departure: "Check-out date",
    pricePerNight: "Price / night",
    pricePerMonth: "Price / month",
    salePrice: "Sale price",
    payBtn: "Book and pay commission",
    whatsappBtn: "Contact on WhatsApp",
    contactOwner: "Contact the advertiser",
    sale: "For sale",
    rentLong: "Long-term rental",
    rentShort: "Short stay",
    noContact: "No contact available",
    lockMsg: "🔒 Pay the commission to unlock the advertiser's WhatsApp contact.",
  },
};

// Formate une date en DD/MM/YYYY
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtDateStr(isoStr) {
  // Parse "YYYY-MM-DD" or ISO datetime safely without timezone shift
  const s = isoStr ? String(isoStr).slice(0, 10) : "";
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function Stepper({ value, onChange, min = 1, max = 365 }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Calendrier pur JS ──────────────────────────────────────────────────── */
const MONTH_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTH_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_FR   = ["Lu","Ma","Me","Je","Ve","Sa","Di"];
const DOW_EN   = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function isoDay(d) {
  // Returns YYYY-MM-DD string (local)
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromIso(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function CalendarPicker({ label, date, onChange, blockedRanges = [], lang = "fr" }) {
  const [open, setOpen] = useState(false);
  const [viewYear,  setViewYear]  = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());

  const today = new Date(); today.setHours(0,0,0,0);
  const months = lang === "fr" ? MONTH_FR : MONTH_EN;
  const dows   = lang === "fr" ? DOW_FR   : DOW_EN;

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build grid: weeks starting Monday
  function buildGrid() {
    const first = new Date(viewYear, viewMonth, 1);
    // Monday=0 offset
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }

  function isBlocked(d) {
    if (!d) return false;
    const ds = isoDay(d);
    return blockedRanges.some(({ check_in, check_out }) => ds >= check_in.slice(0,10) && ds < check_out.slice(0,10));
  }
  function isPast(d) { return d && d < today; }
  function isSelected(d) { return d && isoDay(d) === isoDay(date); }

  const rows = buildGrid();

  return (
    <>
      {/* Champ cliquable */}
      <View style={styles.dateStepper}>
        <Text style={styles.dateLabel}>{label}</Text>
        <TouchableOpacity style={styles.calendarTrigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
          <Text style={styles.calendarTriggerIcon}>📅</Text>
          <Text style={styles.calendarTriggerText}>{fmtDate(date)}</Text>
          <Text style={styles.calendarTriggerChevron}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Modal calendrier */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.calModalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity style={styles.calModal} activeOpacity={1} onPress={() => {}}>
            {/* En-tête mois */}
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calMonthTitle}>{months[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Jours de la semaine */}
            <View style={styles.calDowRow}>
              {dows.map((d) => <Text key={d} style={styles.calDow}>{d}</Text>)}
            </View>

            {/* Grille */}
            {rows.map((row, ri) => (
              <View key={ri} style={styles.calRow}>
                {row.map((d, ci) => {
                  const blocked  = isBlocked(d);
                  const past     = isPast(d);
                  const selected = isSelected(d);
                  const disabled = !d || blocked || past;
                  return (
                    <TouchableOpacity
                      key={ci}
                      style={[
                        styles.calCell,
                        selected  && styles.calCellSelected,
                        blocked   && styles.calCellBlocked,
                        past      && styles.calCellPast,
                      ]}
                      disabled={disabled}
                      onPress={() => { onChange(d); setOpen(false); }}
                    >
                      <Text style={[
                        styles.calCellText,
                        selected && styles.calCellTextSelected,
                        (blocked || past) && styles.calCellTextDisabled,
                      ]}>
                        {d ? d.getDate() : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Légende */}
            <View style={styles.calLegend}>
              <View style={[styles.calLegDot, { backgroundColor: "#B91C1C" }]} />
              <Text style={styles.calLegText}>{lang === "fr" ? "Indisponible" : "Unavailable"}</Text>
              <View style={[styles.calLegDot, { backgroundColor: "#0E7C66", marginLeft: 16 }]} />
              <Text style={styles.calLegText}>{lang === "fr" ? "Sélectionné" : "Selected"}</Text>
            </View>

            <TouchableOpacity style={styles.calCloseBtn} onPress={() => setOpen(false)}>
              <Text style={styles.calCloseBtnText}>{lang === "fr" ? "Fermer" : "Close"}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function PropertyScreen({ route, navigation }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  // Accepte soit { property: {...} } (navigation depuis anciens écrans)
  // soit { id: "..." } (navigation depuis HomeScreen / BrowseScreen redesign)
  const initialProp = route.params?.property
    || (route.params?.id ? { id: route.params.id } : null);
  const [prop, setProp] = useState(initialProp);
  const [loading, setLoading] = useState(false);
  const [commissionPaid, setCommissionPaid] = useState(false);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [propertyReviews, setPropertyReviews] = useState([]);

  // Recharge l'état "commission payée" depuis AsyncStorage chaque fois que l'écran est visible
  // (notamment au retour depuis PaymentScreen)
  useFocusEffect(useCallback(() => {
    const id = initialProp?.id;
    if (!id) return;
    AsyncStorage.getItem(`commission_paid_${id}`)
      .then((v) => { if (v === "1") setCommissionPaid(true); })
      .catch(() => {});
  }, [initialProp?.id]));

  // Charge les dates réservées + bloquées par l'annonceur
  useEffect(() => {
    if (!initialProp?.id) return;
    Properties.availability(initialProp.id)
      .then((d) => setBookedRanges([...(d.booked || []), ...(d.blocked || [])]))
      .catch(() => {});
  }, [initialProp?.id]);

  // Re-fetch avec la bonne langue quand lang change
  useEffect(() => {
    if (!initialProp?.id) return;
    setLoading(true);
    Properties.get(initialProp.id, lang)
      .then((d) => setProp(d.property || d))
      .catch(() => {})
      .finally(() => setLoading(false));
    // Enregistrer la vue (fire-and-forget — ne bloque pas l'affichage)
    Properties.trackView(initialProp.id, { event_type: "view" }).catch(() => {});
    // Charger les avis de l'annonce
    Reviews.forProperty(initialProp.id)
      .then((d) => setPropertyReviews(d.reviews || []))
      .catch(() => {});
  }, [lang, initialProp?.id]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [duration, setDuration] = useState(1);
  const [arrival, setArrival] = useState(today);

  const p = prop || initialProp;
  if (!p) return <Text style={{ padding: 20 }}>{t.noListing}</Text>;

  const unitPrice = Number(p.price) || 0;
  const cur = p.currency || "XOF";
  const cover = p.photos?.[0]?.url;
  const type = p.transaction_type;

  const isShort = type === "rent_short";
  const isLong = type === "rent_long";
  const isSale = !isShort && !isLong;

  // Commission court séjour (sur durée choisie) et longue durée (1 mois)
  // Minimum 100 XOF harmonisé avec le backend (APP_COMMISSION_MIN)
  const MIN_COMMISSION = 100;
  const totalAmount = unitPrice * duration;
  const commission = Math.max(MIN_COMMISSION, Math.round(totalAmount * (Number(p.deposit_pct || 5) / 100)));
  const commissionLong = Math.max(MIN_COMMISSION, Math.round(unitPrice * (Number(p.deposit_pct || 5) / 100)));
  const departure = addDays(arrival, duration);

  const typeLabel = isShort ? t.rentShort : isLong ? t.rentLong : t.sale;
  const priceLabel = isShort ? t.pricePerNight : isLong ? t.pricePerMonth : t.salePrice;
  const unitLabel = t.nights;

  // Contact WhatsApp de l'annonceur
  const ownerWa = p.owner_whatsapp || p.owner_phone || null;
  function openWhatsApp() {
    if (!ownerWa) return;
    const clean = ownerWa.replace(/\s+/g, "").replace(/^\+/, "");
    const msg = encodeURIComponent(
      lang === "fr"
        ? `Bonjour, je vous contacte au sujet de votre annonce "${p.title}" sur ImmoBF Africa.`
        : `Hello, I'm contacting you about your listing "${p.title}" on ImmoBF Africa.`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white" }} contentContainerStyle={{ paddingBottom: 80 }}>
      <FallbackImage source={{ uri: cover }} style={{ width: "100%", height: 240 }} />
      <View style={{ padding: 16 }}>
        {loading && <ActivityIndicator color="#0E7C66" style={{ marginBottom: 8 }} />}

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.city}>{p.city}, {p.country_code}</Text>
        <Text style={styles.body}>{p.description}</Text>

        {/* ── Avis des utilisateurs ────────────────────────────────────── */}
        {propertyReviews.length > 0 && (
          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 }}>
            <Text style={[styles.title, { fontSize: 15, marginBottom: 10 }]}>
              ⭐ {lang === "fr" ? `Avis (${propertyReviews.length})` : `Reviews (${propertyReviews.length})`}
            </Text>
            {propertyReviews.map((rv) => (
              <View key={rv.id} style={reviewStyles.card}>
                <View style={reviewStyles.header}>
                  <Text style={reviewStyles.stars}>{"⭐".repeat(Math.min(5, Math.max(1, Number(rv.rating) || 1)))}</Text>
                  <Text style={reviewStyles.name}>{rv.reviewer_name || "Utilisateur"}</Text>
                  <Text style={reviewStyles.date}>
                    {new Date(rv.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                {rv.comment ? (
                  <Text style={reviewStyles.comment}>{rv.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* ── Vidéos de présentation ───────────────────────────────────── */}
        {p.videos && p.videos.length > 0 && (
          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 }}>
            <Text style={[styles.sectionTitle || styles.title, { fontSize: 15, fontWeight: "700", marginBottom: 8 }]}>
              🎬 {lang === "fr" ? "Vidéos de présentation" : "Property videos"}
            </Text>
            {p.videos.map((v, i) => (
              <TouchableOpacity
                key={v.id || i}
                onPress={() => Linking.openURL(v.url)}
                style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: "#f5f5f5", borderRadius: 8,
                  padding: 12, marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>▶️</Text>
                <Text style={{ color: "#0E7C66", fontWeight: "600", flex: 1 }}>
                  {lang === "fr" ? `Vidéo ${i + 1}` : `Video ${i + 1}`}
                </Text>
                <Text style={{ color: "#888", fontSize: 12 }}>
                  {lang === "fr" ? "Ouvrir" : "Open"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Prix unitaire */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{priceLabel}</Text>
          <Text style={styles.price}>{fmtNum(unitPrice)} {cur}</Text>
        </View>

        {/* ── COURT SÉJOUR : sélecteur dates + commission + paiement ── */}
        {isShort && (() => {
          // Calcul conflit ici pour usage dans le JSX ci-dessous
          const hasConflict = bookedRanges.some((b) => {
            const bStart = new Date(b.check_in);
            const bEnd   = new Date(b.check_out);
            return arrival < bEnd && departure > bStart;
          });
          return (
          <>
            <View style={styles.durationBox}>
              <CalendarPicker
                label={t.arrival}
                date={arrival}
                onChange={(d) => setArrival(d)}
                blockedRanges={bookedRanges}
                lang={lang}
              />
              <View style={[styles.durationRow, { marginTop: 14 }]}>
                <Text style={styles.durationLabel}>{t.duration}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Stepper value={duration} onChange={setDuration} min={1} max={90} />
                  <Text style={styles.durationUnit}>{unitLabel}</Text>
                </View>
              </View>
              <View style={[styles.dateRow, { marginTop: 10, justifyContent: "flex-start", gap: 8 }]}>
                <Text style={styles.dateLabel}>{t.departure}</Text>
                <Text style={[styles.dateValue, { fontSize: 14, color: "#0E7C66" }]}>{fmtDate(departure)}</Text>
              </View>
            </View>

            {/* Périodes indisponibles — liste des dates bloquées/réservées */}
            {bookedRanges.length > 0 && (
              <View style={{ marginTop: 10, backgroundColor: "#fff8f0", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#fcd8aa" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#c0392b", marginBottom: 6 }}>
                  🔒 {lang === "fr" ? "Dates indisponibles" : "Unavailable dates"}
                </Text>
                {bookedRanges
                  .filter((b) => new Date(b.check_out) >= today)
                  .sort((a, b) => new Date(a.check_in) - new Date(b.check_in))
                  .slice(0, 6)
                  .map((b, i) => (
                    <Text key={i} style={{ fontSize: 12, color: "#c0392b", marginBottom: 2 }}>
                      • {fmtDateStr(b.check_in)} → {fmtDateStr(b.check_out)}
                    </Text>
                  ))
                }
              </View>
            )}

            {/* Avertissement visuel dates occupées */}
            {hasConflict && (
              <View style={{ backgroundColor: "#fee2e2", borderRadius: 8, padding: 10, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16 }}>⛔</Text>
                <Text style={{ color: "#c0392b", fontSize: 13, flex: 1 }}>
                  {lang === "fr" ? "Ces dates sont déjà réservées ou bloquées. Choisissez d'autres dates." : "These dates are already booked or blocked. Please choose different dates."}
                </Text>
              </View>
            )}

            <View style={styles.recap}>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>{t.total}</Text>
                <Text style={styles.recapValue}>{fmtNum(totalAmount)} {cur}</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>{t.commission}</Text>
                <Text style={[styles.recapValue, { color: "#0E7C66", fontWeight: "700" }]}>
                  {fmtNum(commission)} {cur}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, hasConflict && { backgroundColor: "#aaa" }]}
              disabled={hasConflict}
              onPress={() => {
                navigation.navigate("Payment", {
                  property: p,
                  amount: commission,
                  duration,
                  arrival: fmtDate(arrival),
                  departure: fmtDate(departure),
                  total: totalAmount,
                });
              }}
            >
              <Text style={styles.btnText}>{t.payBtn}</Text>
            </TouchableOpacity>
          </>
          );
        })()}

        {/* ── COURT SÉJOUR : WhatsApp affiché si commission déjà payée ── */}
        {isShort && commissionPaid && ownerWa && (
          <View style={[styles.contactBox, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
              <Text style={styles.waIcon}>💬</Text>
              <Text style={styles.waBtnText}>{ownerWa}  —  {t.whatsappBtn}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOCATION LONGUE DURÉE : commission + WhatsApp gated ── */}
        {isLong && (
          <View style={styles.contactBox}>
            <Text style={styles.contactLabel}>{t.contactOwner}</Text>
            {!commissionPaid ? (
              <>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => navigation.navigate("Payment", {
                    property: p,
                    amount: commissionLong,
                    duration: 1,
                    arrival: fmtDate(today),
                    departure: fmtDate(addDays(today, 30)),
                    total: unitPrice,
                  })}
                >
                  <Text style={styles.btnText}>{t.payBtn} — {fmtNum(commissionLong)} {cur}</Text>
                </TouchableOpacity>
                {ownerWa && <Text style={styles.lockMsg}>{t.lockMsg}</Text>}
              </>
            ) : (
              ownerWa ? (
                <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
                  <Text style={styles.waIcon}>💬</Text>
                  <Text style={styles.waBtnText}>{ownerWa}  —  {t.whatsappBtn}</Text>
                </TouchableOpacity>
              ) : <Text style={styles.noContact}>{t.noContact}</Text>
            )}
          </View>
        )}

        {/* ── VENTE : contact WhatsApp direct (pas de commission) ── */}
        {isSale && (
          <View style={styles.contactBox}>
            <Text style={styles.contactLabel}>{t.contactOwner}</Text>
            {ownerWa ? (
              <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
                <Text style={styles.waIcon}>💬</Text>
                <Text style={styles.waBtnText}>{ownerWa}  —  {t.whatsappBtn}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noContact}>{t.noContact}</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dateStepper: { marginBottom: 4 },
  dateLabel: { color: "#555", fontWeight: "600", fontSize: 13, marginBottom: 6 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#0E7C66", alignItems: "center", justifyContent: "center",
  },
  dateBtnText: { color: "white", fontSize: 20, fontWeight: "700", lineHeight: 24 },
  dateValue: { fontSize: 16, fontWeight: "600", color: "#333" },
  // ── CalendarPicker ──
  calendarTrigger: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0FAF7", borderWidth: 1.5, borderColor: "#0E7C66",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  calendarTriggerIcon: { fontSize: 18 },
  calendarTriggerText: { fontSize: 16, fontWeight: "700", color: "#0E7C66", flex: 1 },
  calendarTriggerChevron: { fontSize: 11, color: "#0E7C66" },
  calModalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  calModal: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, paddingBottom: 28,
  },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calNavBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  calNavText: { fontSize: 24, color: "#0E7C66", fontWeight: "700" },
  calMonthTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  calDowRow: { flexDirection: "row", marginBottom: 4 },
  calDow: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  calRow: { flexDirection: "row", marginBottom: 2 },
  calCell: {
    flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 8, margin: 1,
  },
  calCellSelected: { backgroundColor: "#0E7C66" },
  calCellBlocked:  { backgroundColor: "#FEE2E2" },
  calCellPast:     { backgroundColor: "#F8FAFC" },
  calCellText:     { fontSize: 14, fontWeight: "500", color: "#1E293B" },
  calCellTextSelected: { color: "#fff", fontWeight: "700" },
  calCellTextDisabled: { color: "#CBD5E1" },
  calLegend: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 4 },
  calLegDot: { width: 12, height: 12, borderRadius: 4, marginRight: 4 },
  calLegText: { fontSize: 12, color: "#64748B" },
  calCloseBtn: {
    marginTop: 12, backgroundColor: "#0E7C66", borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  calCloseBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  typeBadge: {
    alignSelf: "flex-start", backgroundColor: "#e8f5f1",
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  typeBadgeText: { color: "#0E7C66", fontWeight: "600", fontSize: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  city: { color: "#666", marginTop: 4 },
  body: { marginTop: 10, lineHeight: 22, color: "#333" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  priceLabel: { color: "#666", fontSize: 14 },
  price: { color: "#0E7C66", fontSize: 20, fontWeight: "700" },
  durationBox: {
    marginTop: 16, backgroundColor: "#f7f7f7", borderRadius: 10, padding: 14,
  },
  durationLabel: { color: "#555", fontWeight: "600", marginBottom: 10 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  durationUnit: { color: "#555", fontSize: 15 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 0 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "#0E7C66", alignItems: "center", justifyContent: "center",
  },
  stepBtnText: { color: "white", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  stepValue: { minWidth: 44, textAlign: "center", fontSize: 20, fontWeight: "700" },
  recap: {
    marginTop: 16, backgroundColor: "#f0faf6", borderRadius: 10, padding: 14, gap: 8,
  },
  recapRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recapLabel: { color: "#555", fontSize: 14 },
  recapValue: { fontSize: 15 },
  btn: { backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, marginTop: 20, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
  // Contact WhatsApp (vente / location longue durée)
  contactBox: {
    marginTop: 20, backgroundColor: "#f0faf6", borderRadius: 12, padding: 16,
  },
  contactLabel: { color: "#555", fontWeight: "600", fontSize: 13, marginBottom: 10 },
  waBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#25D366", borderRadius: 10, padding: 14,
  },
  waIcon: { fontSize: 20 },
  waBtnText: { color: "white", fontWeight: "700", fontSize: 14, flex: 1 },
  noContact: { color: "#999", fontStyle: "italic" },
  lockMsg: { color: "#888", fontSize: 12, marginTop: 8, textAlign: "center" },
});

const reviewStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fafafa", borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: "#e8e8e8",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  stars: { fontSize: 12 },
  name: { fontWeight: "700", fontSize: 13, flex: 1 },
  date: { color: "#aaa", fontSize: 11 },
  comment: { fontSize: 13, color: "#444", lineHeight: 19 },
});
