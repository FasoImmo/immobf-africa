"use strict";
/**
 * notify-testers.js — Envoie un email personnalisé à chaque testeur Alpha ImmoBF Africa
 *
 * Prérequis :
 *   1. Activer un "Mot de passe d'application" Gmail sur https://myaccount.google.com/apppasswords
 *      (compte Google > Sécurité > Validation en deux étapes > Mots de passe des applications)
 *   2. Installer nodemailer : npm install nodemailer (dans ce dossier ou à la racine)
 *   3. Remplacer GMAIL_APP_PASSWORD ci-dessous par le mot de passe généré (16 caractères)
 *
 * Lancement : node scripts/notify-testers.js
 */

const nodemailer = require("nodemailer");

// ── Configuration ──────────────────────────────────────────────────────────────
const GMAIL_USER = "kosmad.mk@gmail.com";
const GMAIL_APP_PASSWORD = "REMPLACER_PAR_MOT_DE_PASSE_APPLICATION"; // 16 caractères sans espaces

const TESTERS = [
  { name: "Amadou",    email: "sangar.amadou94@gmail.com" },
  { name: "Mary",      email: "marykeller9@gmail.com" },
  { name: "Cyrielle",  email: "crlrosange@gmail.com" },
  { name: "Djamila",   email: "djamilakoussoube05@gmail.com" },
  { name: "Mahuéna",   email: "mahuenahouedou@gmail.com" },
  { name: "Thierry",   email: "beliour@gmail.com" },
  { name: "Jacques",   email: "felixdjebou@gmail.com" },
  { name: "Hubert",    email: "hubsome2013@gmail.com" },
  { name: "Kosmad",    email: "kosmad.mk@gmail.com" },
  { name: "Yazid",     email: "yazidkouss@gmail.com" },
  { name: "Perpétue",  email: "teghwende@gmail.com" },
  { name: "Maria",     email: "mariaassan3@gmail.com" },
  { name: "Mamadou",   email: "mamadoudousangare10@gmail.com" },
  { name: "Carole",    email: "sotoucarole1997@gmail.com" },
  { name: "Ibrahim",   email: "iboukande333@gmail.com" },
  { name: "Aboubacar", email: "kousabou2@gmail.com" },
  { name: "Baba",      email: "kousabou3@gmail.com" },
  { name: "City Café", email: "citycafebarbershop@gmail.com" },
  { name: "Ira Market", email: "iramarket.bf@gmail.com" },
  { name: "Wayele",    email: "wayele.infos@gmail.com" },
];

// ── Template email ──────────────────────────────────────────────────────────────
function buildEmail(prenom) {
  return {
    subject: `[TEST BÊTA] ImmoBF Africa — Votre accès testeur`,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #0E7C66; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">🏠 ImmoBF Africa</h1>
    <p style="color: #d4f0ea; margin: 8px 0 0;">Programme Bêta — Tests Alpha</p>
  </div>

  <div style="padding: 32px 24px;">
    <p>Bonjour <strong>${prenom}</strong>,</p>

    <p>Je te contacte pour t'inviter à tester <strong>ImmoBF Africa</strong>, la plateforme immobilière que je développe pour le Burkina Faso et l'Afrique de l'Ouest. Ton aide est précieuse avant le lancement officiel sur le Play Store !</p>

    <h3 style="color: #0E7C66;">📱 Comment installer l'application</h3>
    <ol>
      <li>Tu vas recevoir séparément une <strong>invitation Google Play</strong> par email (depuis noreply@google.com) — accepte-la.</li>
      <li>Une fois acceptée, cherche <strong>"ImmoBF Africa"</strong> sur le Play Store ou utilise le lien dans l'invitation.</li>
      <li>Installe l'app et crée un compte avec cette adresse email.</li>
    </ol>

    <h3 style="color: #0E7C66;">✅ Ce que j'attends de toi</h3>
    <ul>
      <li><strong>Parcourir les annonces</strong> — recherche par ville, type de bien, prix</li>
      <li><strong>Tester la réservation</strong> — sélectionner des dates, simuler un paiement (en mode test, rien n'est débité)</li>
      <li><strong>Essayer la publication</strong> — publier une fausse annonce pour voir le parcours</li>
      <li><strong>Tester en anglais</strong> — changer la langue dans les paramètres si tu veux</li>
      <li><strong>Noter les bugs</strong> — tout ce qui ne fonctionne pas comme prévu, message d'erreur, bouton qui ne répond pas, etc.</li>
    </ul>

    <h3 style="color: #0E7C66;">💬 Comment me faire tes retours</h3>
    <p>Un simple message WhatsApp ou email suffit. Pas besoin d'un rapport détaillé — une phrase comme <em>"Le bouton X ne marche pas"</em> ou <em>"La page Y met trop de temps à charger"</em> est déjà très utile.</p>

    <div style="background: #f0faf7; border-left: 4px solid #0E7C66; padding: 16px; margin: 24px 0;">
      <p style="margin: 0;"><strong>Durée du test :</strong> 2 semaines<br>
      <strong>Plateforme :</strong> Android uniquement pour l'instant<br>
      <strong>Contact :</strong> <a href="mailto:kosmad.mk@gmail.com">kosmad.mk@gmail.com</a></p>
    </div>

    <p>Merci beaucoup pour ton soutien — ton retour compte vraiment pour améliorer l'app avant le lancement !</p>

    <p>Cordialement,<br>
    <strong>Kosmad</strong><br>
    ImmoBF Africa<br>
    <a href="https://immoafrica.online">immoafrica.online</a></p>
  </div>

  <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888;">
    ImmoBF Africa — Plateforme immobilière Burkina Faso &amp; Afrique de l'Ouest<br>
    <a href="https://immoafrica.online">immoafrica.online</a>
  </div>
</div>
    `.trim(),
  };
}

// ── Envoi ───────────────────────────────────────────────────────────────────────
async function main() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  console.log(`Envoi de ${TESTERS.length} emails depuis ${GMAIL_USER}...\n`);

  for (const tester of TESTERS) {
    const { subject, html } = buildEmail(tester.name);
    try {
      await transporter.sendMail({
        from: `"Kosmad — ImmoBF Africa" <${GMAIL_USER}>`,
        to: tester.email,
        subject,
        html,
      });
      console.log(`  ✅ Envoyé → ${tester.name} <${tester.email}>`);
    } catch (err) {
      console.error(`  ❌ Erreur → ${tester.email}: ${err.message}`);
    }

    // Pause 1s entre chaque envoi pour éviter le spam filter
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\nTerminé.");
}

main().catch(console.error);
