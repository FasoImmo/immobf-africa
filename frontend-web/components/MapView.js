"use client";
/**
 * MapView — carte Leaflet avec clustering des annonces.
 *
 * Rendu côté client uniquement (SSR désactivé dans l'import dynamique du parent).
 * Import dans pages/properties/index.js :
 *
 *   const MapView = dynamic(() => import("../components/MapView"), { ssr: false });
 *
 * Props :
 *   properties  {Array}  liste d'annonces (chaque objet doit avoir location:{lat,lng})
 *   onSelect    {fn}     callback(property) quand l'utilisateur clique sur un marqueur
 */

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

// ─── Fix icône par défaut Leaflet (webpack casse le chemin _getIconUrl) ───────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Composant interne : ajuste les bounds quand les données changent ─────────
function FitBounds({ properties }) {
  const map = useMap();
  useEffect(() => {
    const pts = properties
      .filter((p) => p.location?.lat && p.location?.lng)
      .map((p) => [p.location.lat, p.location.lng]);
    if (pts.length > 0) {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, properties]);
  return null;
}

// ─── Formatage prix ──────────────────────────────────────────────────────────
function formatPrice(price, currency) {
  if (!price) return "Prix à définir";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "XOF",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MapView({ properties = [], onSelect }) {
  // Filtre uniquement les annonces géolocalisées
  const geoProps = properties.filter((p) => p.location?.lat && p.location?.lng);

  // Centre par défaut : Ouagadougou
  const defaultCenter = [12.3647, -1.5333];
  const defaultZoom  = 6;

  if (geoProps.length === 0) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#888",
        gap: 8,
      }}>
        <span style={{ fontSize: 40 }}>🗺️</span>
        <span>Aucune annonce géolocalisée pour l'afficher sur la carte.</span>
        <span style={{ fontSize: 13 }}>Les annonceurs peuvent ajouter des coordonnées GPS lors de la publication.</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: "100%", width: "100%", borderRadius: 8 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds properties={geoProps} />

      <MarkerClusterGroup chunkedLoading>
        {geoProps.map((property) => (
          <Marker
            key={property.id}
            position={[property.location.lat, property.location.lng]}
            eventHandlers={{
              click: () => onSelect && onSelect(property),
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                {property.photos?.[0] && (
                  <img
                    src={property.photos[0]}
                    alt={property.title}
                    style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4, marginBottom: 6 }}
                  />
                )}
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                  {property.title}
                </div>
                <div style={{ color: "#1976d2", fontWeight: 600, fontSize: 13 }}>
                  {formatPrice(property.price, property.currency)}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {[property.city, property.country_code].filter(Boolean).join(", ")}
                </div>
                <a
                  href={`/properties/${property.id}`}
                  style={{ fontSize: 12, color: "#1976d2", marginTop: 6, display: "block" }}
                >
                  Voir l'annonce →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
