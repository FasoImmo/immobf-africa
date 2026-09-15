/**
 * Génère og-image.png (1200×630) pour ImmoBF Africa.
 * Usage : node generate_og_image.js
 * Sortie : ../frontend-web/public/og-image.png
 */

const { createCanvas, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "frontend-web", "public", "og-image.png");
const W = 1200, H = 630;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

// ── Fond dégradé vert ──────────────────────────────────────────────────────
const grad = ctx.createLinearGradient(0, 0, W, H);
grad.addColorStop(0, "#0E7C66");
grad.addColorStop(1, "#0a5c4d");
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);

// ── Motif de points décoratifs ─────────────────────────────────────────────
ctx.fillStyle = "rgba(255,255,255,0.04)";
for (let x = 0; x < W; x += 40) {
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Bande orange droite ────────────────────────────────────────────────────
ctx.fillStyle = "#E8780A";
ctx.fillRect(W - 8, 0, 8, H);

// ── Badge pays ────────────────────────────────────────────────────────────
const flags = ["🇧🇫", "🇨🇮", "🇸🇳", "🇲🇱", "🇹🇬"];
ctx.font = "36px serif";
flags.forEach((f, i) => ctx.fillText(f, 60 + i * 60, 100));

// ── Titre principal ────────────────────────────────────────────────────────
ctx.fillStyle = "#FFFFFF";
ctx.font = "bold 80px sans-serif";
ctx.fillText("ImmoBF Africa", 60, 230);

// ── Tagline ────────────────────────────────────────────────────────────────
ctx.fillStyle = "#F6AD55";
ctx.font = "bold 38px sans-serif";
ctx.fillText("Immobilier en Afrique de l'Ouest", 60, 300);

// ── Séparateur ────────────────────────────────────────────────────────────
ctx.strokeStyle = "rgba(255,255,255,0.25)";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(60, 330);
ctx.lineTo(W - 60, 330);
ctx.stroke();

// ── Bullet points ─────────────────────────────────────────────────────────
const items = [
  "🏠  Achat · Location · Vente",
  "📱  Orange Money · Moov Money · Wave",
  "🌍  Burkina Faso · Côte d'Ivoire · Sénégal & plus",
];
ctx.fillStyle = "#FFFFFF";
ctx.font = "28px sans-serif";
items.forEach((item, i) => ctx.fillText(item, 60, 390 + i * 60));

// ── URL ───────────────────────────────────────────────────────────────────
ctx.fillStyle = "rgba(255,255,255,0.6)";
ctx.font = "24px sans-serif";
ctx.fillText("www.immoafrica.online", 60, 590);

// ── Export ────────────────────────────────────────────────────────────────
const buf = canvas.toBuffer("image/png");
fs.writeFileSync(OUT, buf);
console.log(`✅ og-image.png généré → ${OUT}`);
