"use client";
/**
 * MapView — carte Leaflet avec clustering des annonces.
 *
 * Clustering via leaflet.markercluster (CJS pur — aucun conflit ESM/CJS Next.js).
 * Le CSS est importé globalement dans pages/_app.js.
 *
 * Import dans les pages :
 *   const MapView = dynamic(() => import("../components/MapView"), { ssr: false });
 */

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

// ─── Fix icône par défaut Leaflet (webpack casse le chemin _getIconUrl) ───────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Formatage prix ──────────────────────────────────────────────────────────
function formatPrice(price, currency) {
  if (!price) return "Prix à définir";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "XOF",
    maximumFractionDigits: 0,
  }).format(price);
}

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

// ─── Composant cluster — leaflet.markercluster natif (CJS) ───────────────────
function ClusterLayer({ properties, onSelect }) {
  const map = useMap();
  const clusterRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // Import dynamique : garantit l'absence d'accès SSR à window
    import("leaflet.markercluster").then(() => {
      if (cancelled) return;

      // Détruire l'ancien cluster
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }

      const cluster = L.markerClusterGroup({ chunkedLoading: true });
      clusterRef.current = cluster;

      properties.forEach((property) => {
        if (!property.location?.lat || !property.location?.lng) return;

        const marker = L.marker([property.location.lat, property.location.lng]);

        marker.bindPopup(
          `<div style="min-width:180px">
            ${property.photos?.[0]
              ? `<img src="${property.photos[0]}" alt="${property.title}"
                   style="width:100%;height:90px;object-fit:cover;border-radius:4px;margin-bottom:6px">`
              : ""}
            <div style="font-weight:700;font-size:13px;margin-bottom:2px">${property.title}</div>
            <div style="color:#1976d2;font-weight:600;font-size:13px">
              ${formatPrice(property.price, property.currency)}
            </div>
            <div style="font-size:12px;color:#666;margin-top:2px">
              ${[property.city, property.country_code].filter(Boolean).join(", ")}
            </div>
            <a href="/properties/${property.id}"
               style="font-size:12px;color:#1976d2;margin-top:6px;display:block">
              Voir l'annonce →
            </a>
          </div>`
        );

        if (onSelect) {
          marker.on("click", () => onSelect(property));
        }

        cluster.addLayer(marker);
      });

      map.addLayer(cluster);
    });

    return () => {
      cancelled = true;
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map, properties, onSelect]);

  return null;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MapView({ properties = [], onSelect }) {
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
        <span style={{ fontSize: 13 }}>
          Les annonceurs peuvent ajouter des coordonnées GPS lors de la publication.
        </span>
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
      <ClusterLayer properties={geoProps} onSelect={onSelect} />
    </MapContainer>
  );
}
