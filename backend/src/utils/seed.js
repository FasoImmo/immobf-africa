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
    { type: "house", title: "Villa moderne 4 chambres à Ouaga 2000",
      description: "Belle villa 4ch, jardin, piscine, quartier résidentiel Ouaga 2000. Titre foncier disponible.",
      price: 85_000_000, area_m2: 320, bedrooms: 4, bathrooms: 3, city: "Ouagadougou",
      lat: 12.346, lng: -1.522 },
    { type: "apartment", title: "Appartement F3 Zone du Bois, meublé",
      description: "F3 meublé, climatisé, sécurité 24/7, proche ambassades.",
      price: 250_000, area_m2: 90, bedrooms: 2, bathrooms: 1, city: "Ouagadougou",
      lat: 12.365, lng: -1.535 },
    { type: "land", title: "Parcelle 600m² titrée à Saaba",
      description: "Parcelle 600m² avec titre foncier, proche route bitumée, eau ONEA raccordable.",
      price: 6_500_000, area_m2: 600, city: "Saaba", lat: 12.371, lng: -1.418 },
    { type: "house", title: "Maison familiale 3 chambres à Bobo-Dioulasso",
      description: "Maison 3ch avec grand salon et cour, quartier Colsama.",
      price: 32_000_000, area_m2: 220, bedrooms: 3, bathrooms: 2, city: "Bobo-Dioulasso",
      lat: 11.178, lng: -4.298 },
    { type: "office", title: "Bureau 80m² Ouaga centre",
      description: "Plateau bureau 80m², ascenseur, parking, idéal startup.",
      price: 450_000, area_m2: 80, city: "Ouagadougou", lat: 12.372, lng: -1.516 },
  ];

  for (const s of samples) {
    const owner = Math.random() < 0.5 ? seller : agency;
    const prop = await Property.create({
      ...s, owner_id: owner.id, country_code: "BF", deposit_pct: 5,
    });
    await Property.publish(prop.id, owner.id);
  }

  console.log("Seed complete.");
  console.log(`  admin : admin@immobf.africa / admin2026 (${admin.id})`);
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
