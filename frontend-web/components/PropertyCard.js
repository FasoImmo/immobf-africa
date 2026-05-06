import Link from "next/link";
import { Card, CardActionArea, CardContent, CardMedia, Typography, Chip, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { formatFCFA, formatArea } from "../lib/format";

export default function PropertyCard({ property }) {
  const { t } = useTranslation();
  const cover = property.photos?.[0]?.url
    || `https://picsum.photos/seed/${property.id}/600/400`;

  return (
    <Card elevation={2}>
      <CardActionArea component={Link} href={`/properties/${property.id}`}>
        <CardMedia component="img" height="180" image={cover} alt={property.title} />
        <CardContent>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <Chip size="small" label={t(`types.${property.type}`)} color="primary" />
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
            {property.bedrooms ? ` · ${property.bedrooms} ch.` : ""}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
