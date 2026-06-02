import Link from "next/link";
import { Card, CardActionArea, CardContent, CardMedia, Typography, Chip, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { formatFCFA, formatArea } from "../lib/format";

export default function PropertyCard({ property }) {
  const { t } = useTranslation();
  const cover = property.photos?.[0]?.url
    || `https://picsum.photos/seed/${property.id}/600/400`;

  const TX_LABEL = {
    sale:       { label: t("nav.publish_sale"),      color: "#1565c0" },
    rent_long:  { label: t("nav.publish_rent_long"), color: "#2e7d32" },
    rent_short: { label: t("nav.publish_rent_short"),color: "#6a1b9a" },
  };
  const txInfo = TX_LABEL[property.transaction_type];

  return (
    <Card elevation={2}>
      <CardActionArea component={Link} href={`/properties/${property.id}`}>
        <CardMedia component="img" height="180" image={cover} alt={property.title} />
        <CardContent>
          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={t(`types.${property.type}`)} color="primary" />
            {txInfo && (
              <Chip size="small" label={txInfo.label}
                sx={{ bgcolor: txInfo.color, color: "white" }} />
            )}
            {property.is_furnished && (
              <Chip size="small" label={t("property.furnished")} variant="outlined" />
            )}
            {property.boosted_until && <Chip size="small" label="★" color="warning" />}
          </Box>
          <Typography variant="subtitle1" noWrap>{property.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {property.city}, {property.country_code}
          </Typography>
          <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
            {formatFCFA(property.price, property.currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatArea(property.area_m2)}
            {property.bedrooms ? ` · ${property.bedrooms} ${t("property.bedrooms_short")}` : ""}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
