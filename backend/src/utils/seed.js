"use strict";

const { query, pool } = require("../config/db");
const User = require("../models/User");
const Property = require("../models/Property");

async function upsertUser(data) {
  const existing = await User.findByPhone(data.phone);
  if (existing) return existing;
  return User.create(data);
}

async function seed() {
  console.log("Seeding…");

  const admin = await upsertUser({
    email: "admin@immobf.africa", phone: "+22670000001",
    password: "admin2026", full_name: "Admin ImmoBF", role: "admin",
  });

  const agency = await upsertUser({
    email: "agence@demo.bf", phone: "+22670000002",
    password: "demo1234", full_name: "Agence Demo Ouaga", role: "agent",
  });

  const seller = await upsertUser({
    email: "proprio@demo.bf", phone: "+22670000003",
    password: "demo1234", full_name: "Proprio Demo", role: "seller",
  });

  await upsertUser({
    email: "acheteur@demo.bf", phone: "+22670000004",
    password: "demo1234", full_name: "Acheteur Demo", role: "buyer",
  });

  const samples = [
    // ── VENTE ──────────────────────────────────────────────────────────────
    {
      type: "house", transaction_type: "sale",
      title: "Villa moderne 4 chambres à Ouaga 2000",
      description: "Belle villa 4ch, jardin, piscine, quartier résidentiel Ouaga 2000. Titre foncier disponible.",
      price: 85_000_000, area_m2: 320, bedrooms: 4, bathrooms: 3,
      city: "Ouagadougou", lat: 12.346, lng: -1.522,
    },
    {
      type: "land", transaction_type: "sale",
      title: "Parcelle 600m² titrée à Saaba",
      description: "Parcelle 600m² avec titre foncier, proche route bitumée, eau ONEA raccordable.",
      price: 6_500_000, area_m2: 600,
      city: "Saaba", lat: 12.371, lng: -1.418,
    },
    {
      type: "house", transaction_type: "sale",
      title: "Maison familiale 3 chambres à Bobo-Dioulasso",
      description: "Maison 3ch avec grand salon et cour, quartier Colsama. Titre foncier.",
      price: 32_000_000, area_m2: 220, bedrooms: 3, bathrooms: 2,
      city: "Bobo-Dioulasso", lat: 11.178, lng: -4.298,
    },

    // ── LOCATION LONGUE DURÉE ───────────────────────────────────────────────
    {
      type: "house", transaction_type: "rent_long", rent_period: "monthly", is_furnished: true,
      title: "Villa 4 chambres meublée à louer — Ouaga 2000",
      description: "Superbe villa meublée 4ch, 3sdb, jardin, gardien, groupe électrogène. Idéale expatriés ou cadres supérieurs. Contrat 6 mois minimum.",
      price: 400_000, area_m2: 280, bedrooms: 4, bathrooms: 3,
      city: "Ouagadougou", lat: 12.348, lng: -1.524, deposit_pct: 10,
    },
    {
      type: "apartment", transaction_type: "rent_long", rent_period: "monthly", is_furnished: false,
      title: "Appartement F3 climatisé à louer — Hamdallaye",
      description: "F3 non meublé, 95m², 2 chambres, salon, cuisine équipée, parking sécurisé, eau 24h/24, proche marché Hamdallaye.",
      price: 150_000, area_m2: 95, bedrooms: 2, bathrooms: 1,
      city: "Ouagadougou", lat: 12.382, lng: -1.548, deposit_pct: 10,
    },
    {
      type: "apartment", transaction_type: "rent_long", rent_period: "monthly", is_furnished: true,
      title: "Studio meublé à louer — Zone du Bois",
      description: "Studio 40m² entièrement meublé, climatisé, WiFi, eau chaude. Proche ambassades et hôtels internationaux. Idéal célibataire ou couple.",
      price: 80_000, area_m2: 40, bedrooms: 1, bathrooms: 1,
      city: "Ouagadougou", lat: 12.365, lng: -1.535, deposit_pct: 10,
    },
    {
      type: "house", transaction_type: "rent_long", rent_period: "monthly", is_furnished: false,
      title: "Maison 3 chambres à louer — Pissy",
      description: "Maison 3ch non meublée, grande cour, forage, cuisine extérieure. Quartier calme, facile d'accès. Convient famille.",
      price: 75_000, area_m2: 150, bedrooms: 3, bathrooms: 1,
      city: "Ouagadougou", lat: 12.345, lng: -1.578, deposit_pct: 10,
    },
    {
      type: "office", transaction_type: "rent_long", rent_period: "monthly", is_furnished: false,
      title: "Bureau open space 60m² — Karpala",
      description: "Plateau bureau 60m², climatisé, connexion fibre, parking 4 véhicules. Immeuble sécurisé, accueil en rez-de-chaussée. Idéal startup ou cabinet.",
      price: 200_000, area_m2: 60,
      city: "Ouagadougou", lat: 12.358, lng: -1.510, deposit_pct: 10,
    },
    {
      type: "commercial", transaction_type: "rent_long", rent_period: "monthly", is_furnished: false,
      title: "Magasin 80m² centre-ville — Bobo-Dioulasso",
      description: "Local commercial 80m², vitrine sur avenue principale, réserve à l'arrière, toilettes. Fort passage piéton. Idéal boutique, pharmacie ou alimentaire.",
      price: 120_000, area_m2: 80,
      city: "Bobo-Dioulasso", lat: 11.180, lng: -4.302, deposit_pct: 10,
    },

    // ── LOCATION COURTE DURÉE / NUITÉE ─────────────────────────────────────
    {
      type: "house", transaction_type: "rent_short", rent_period: "nightly", is_furnished: true,
      title: "Villa prestige avec piscine — Ouaga 2000",
      description: "Villa 4ch haut standing, piscine privée, WiFi fibre, cuisine équipée, home cinéma, gardien. Parfaite pour séjour d'affaires ou familial. Ménage inclus.",
      price: 75_000, area_m2: 300, bedrooms: 4, bathrooms: 3,
      city: "Ouagadougou", lat: 12.349, lng: -1.526, deposit_pct: 30,
    },
    {
      type: "apartment", transaction_type: "rent_short", rent_period: "nightly", is_furnished: true,
      title: "Appartement standing meublé — Zone du Bois",
      description: "Appartement 2ch entièrement meublé, climatisé, Netflix, cuisine équipée, eau chaude, parking. Quartier sécurisé proche restaurants et hôtels.",
      price: 35_000, area_m2: 80, bedrooms: 2, bathrooms: 1,
      city: "Ouagadougou", lat: 12.366, lng: -1.537, deposit_pct: 30,
    },
    {
      type: "apartment", transaction_type: "rent_short", rent_period: "nightly", is_furnished: true,
      title: "Studio moderne tout équipé — Wemtenga",
      description: "Studio 1ch meublé, climatisé, WiFi, eau chaude, TV satellite. Propre et confortable, idéal voyage solo ou en couple. Check-in flexible.",
      price: 18_000, area_m2: 35, bedrooms: 1, bathrooms: 1,
      city: "Ouagadougou", lat: 12.372, lng: -1.498, deposit_pct: 30,
    },
    {
      type: "house", transaction_type: "rent_short", rent_period: "nightly", is_furnished: true,
      title: "Villa familiale 3 chambres — Bobo-Dioulasso",
      description: "Villa 3ch meublée, grand jardin, barbecue, WiFi, groupe électrogène, calme absolu. Idéale famille ou groupe. À 10 min du centre-ville de Bobo.",
      price: 45_000, area_m2: 200, bedrooms: 3, bathrooms: 2,
      city: "Bobo-Dioulasso", lat: 11.175, lng: -4.305, deposit_pct: 30,
    },
  ];

  for (const s of samples) {
    const owner = Math.random() < 0.5 ? seller : agency;
    const prop = await Property.create({
      ...s, owner_id: owner.id, country_code: "BF",
      deposit_pct: s.deposit_pct || 5,
      features: {},
    });
    await Property.publish(prop.id, owner.id, { skipFeeCheck: true });
  }

  console.log("Seed complete.");
  console.log(`  admin  : admin@immobf.africa / admin2026`);
  console.log(`  agence : agence@demo.bf / demo1234`);
  console.log(`  proprio: proprio@demo.bf / demo1234`);
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
