import { useMemo, useState } from "react";
import { Box, IconButton, Typography, Tooltip } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTranslation } from "react-i18next";

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// YYYY-MM-DD en heure locale (évite le décalage UTC de toISOString()).
function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calendrier mensuel pour la sélection de la date d'arrivée (locations).
 *
 * Avant ce composant, la sélection se faisait via un <input type="date">
 * natif : le navigateur ne permet aucune personnalisation visuelle du
 * calendrier, donc les périodes déjà réservées n'étaient listées qu'en texte
 * sous le champ ("📅 Occupé : 12/07 → 15/07 · ..."), obligeant le visiteur à
 * comparer manuellement les dates avant de choisir. Ce composant affiche à la
 * place un vrai calendrier où les jours déjà réservés/bloqués sont coloriés
 * différemment (et non cliquables), pour une lecture immédiate.
 *
 * Props :
 * - value : date sélectionnée (string "YYYY-MM-DD") ou ""
 * - onChange(isoDateString) : appelé au clic sur un jour disponible
 * - bookedRanges : [{ check_in, check_out }] — bornes occupées, check_out exclu
 * - minDate : première date sélectionnable (par défaut aujourd'hui)
 */
export default function BookingCalendar({ value, onChange, bookedRanges = [], minDate }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";

  // Locale-aware short weekday names starting Monday
  const WEEKDAYS = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date(2021, 0, 4 + i); // Jan 4 2021 = Monday
      return d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
    });
  }, [locale]);

  const today = useMemo(() => toDateOnly(new Date()), []);
  const min = minDate ? toDateOnly(minDate) : today;
  const initialMonth = value ? toDateOnly(value) : min;
  const [viewDate, setViewDate] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
  );

  const ranges = useMemo(
    () =>
      bookedRanges
        .map((b) => ({ start: toDateOnly(b.check_in), end: toDateOnly(b.check_out) }))
        .filter((r) => !isNaN(r.start.getTime()) && !isNaN(r.end.getTime())),
    [bookedRanges]
  );

  function isOccupied(d) {
    return ranges.some((r) => d >= r.start && d < r.end);
  }
  function isPast(d) {
    return d < min;
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // semaine commençant lundi
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));

  const monthLabel = viewDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const selected = value ? toDateOnly(value) : null;

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <IconButton
          size="small"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          aria-label="Mois précédent"
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ textTransform: "capitalize", fontWeight: 600 }}>
          {monthLabel}
        </Typography>
        <IconButton
          size="small"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          aria-label="Mois suivant"
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.5 }}>
        {WEEKDAYS.map((w) => (
          <Typography
            key={w}
            variant="caption"
            align="center"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            {w}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {cells.map((d, i) => {
          if (!d) return <Box key={"empty-" + i} />;
          const occupied = isOccupied(d);
          const past = isPast(d);
          const isSelected = !!selected && d.getTime() === selected.getTime();
          const disabled = occupied || past;

          return (
            <Tooltip
              key={isoDay(d)}
              title={occupied ? t("property.cal_booked") : past ? "" : t("property.cal_available")}
              arrow
            >
              <span>
                <Box
                  component="button"
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(isoDay(d))}
                  sx={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    border: "none",
                    borderRadius: 1,
                    fontSize: 13,
                    fontFamily: "inherit",
                    cursor: disabled ? "not-allowed" : "pointer",
                    bgcolor: isSelected
                      ? "primary.main"
                      : occupied
                      ? "#ffcdd2"
                      : "#e8f5e9",
                    color: isSelected
                      ? "primary.contrastText"
                      : occupied
                      ? "#b71c1c"
                      : past
                      ? "text.disabled"
                      : "#2e7d32",
                    opacity: past && !occupied ? 0.4 : 1,
                    fontWeight: isSelected ? 700 : 400,
                    "&:hover": disabled ? {} : { opacity: 0.85 },
                  }}
                >
                  {d.getDate()}
                </Box>
              </span>
            </Tooltip>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
        <Legend color="#e8f5e9" label={t("property.cal_available")} />
        <Legend color="#ffcdd2" label={t("property.cal_booked")} />
        <Legend color="primary.main" label={t("property.cal_selected")} />
      </Box>
    </Box>
  );
}

function Legend({ color, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
