"use strict";

const { Resend } = require("resend");
const config = require("../config");
const logger = require("../utils/logger");

const resend = config.email.resendKey ? new Resend(config.email.resendKey) : null;
const FROM = config.email.from || "ImmoBF Africa <noreply@immoafrica.online>";

// ─── Envoi générique ──────────────────────────────────────────────────────────
async function send({ to, subject, html, text }) {
  if (!to || !to.includes("@")) return; // pas d'email valide

  if (!resend) {
    logger.info({ to, subject }, "[EMAIL STUB] Would send email");
    return;
  }

  try {
    // CORRECTIF (30/06/2026) : le SDK Resend ne lève PAS d'exception pour les
    // erreurs API (domaine non vérifié, clé invalide, destinataire rejeté...)
    // — il résout la promesse avec { data: null, error: {...} }. Le code
    // précédent ignorait totalement `result.error` : un échec d'envoi
    // (ex. domaine immoafrica.online non vérifié côté Resend) passait donc
    // pour un succès ("Email sent via Resend" loggé même en échec), ce qui
    // rendait le bug "reçu jamais reçu" indétectable dans les logs.
    const result = await resend.emails.send({ from: FROM, to, subject, html, text });
    if (result?.error) {
      logger.error({ err: result.error, to, subject, from: FROM }, "Resend a refusé l'envoi (voir result.error)");
      return;
    }
    logger.info({ to, subject, id: result?.data?.id }, "Email sent via Resend");
  } catch (e) {
    logger.error({ err: e.message, to, subject, from: FROM }, "Resend send failed (exception)");
  }
}

// ─── Template de base ─────────────────────────────────────────────────────────
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: white; max-width: 560px; margin: 0 auto; border-radius: 8px;
          overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #0E7C66; color: white; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; }
  .body { padding: 28px; color: #333; line-height: 1.6; }
  .btn { display: inline-block; background: #0E7C66; color: white; padding: 12px 28px;
         border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0; }
  .footer { background: #f9f9f9; padding: 16px; text-align: center; font-size: 12px; color: #999; }
  .amount { font-size: 28px; font-weight: bold; color: #0E7C66; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px;
           background: #e8f5e9; color: #2e7d32; font-size: 13px; }
</style>
</head>
<body>
<div class="card">
  <div class="header"><h1>🏠 ImmoBF Africa</h1></div>
  <div class="body">${content}</div>
  <div class="footer">
    © 2026 ImmoBF Africa — <a href="https://immoafrica.online">immoafrica.online</a><br>
    Vous recevez cet email car vous êtes inscrit sur ImmoBF Africa.
  </div>
</div>
</body></html>`;
}

// ─── 1. OTP / Code de vérification ───────────────────────────────────────────
async function sendOtpEmail(email, code, purpose = "verification") {
  const isReset = purpose === "reset";
  const subject = isReset
    ? "Code de réinitialisation — ImmoBF Africa"
    : "Votre code de vérification — ImmoBF Africa";

  const html = baseTemplate(`
    <h2>${isReset ? "Réinitialisation de mot de passe" : "Code de vérification"}</h2>
    <p>Voici votre code :</p>
    <div style="text-align:center; margin: 24px 0;">
      <span style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#0E7C66;">${code}</span>
    </div>
    <p>Ce code est valide pendant <strong>5 minutes</strong>.</p>
    <p style="color:#999; font-size:13px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
  `);

  await send({ to: email, subject, html, text: `Votre code ImmoBF Africa : ${code}. Valide 5 minutes.` });
}

// ─── 2. Reçu de paiement ─────────────────────────────────────────────────────
async function sendPaymentReceipt(email, { amount, currency = "XOF", reference, purpose, propertyTitle, months }) {
  const subject = "Reçu de paiement — ImmoBF Africa";
  const purposeLabel = purpose === "listing_fee"
    ? `Abonnement annonce (${months || 1} mois)`
    : purpose === "deposit" ? "Acompte immobilier"
    : "Paiement ImmoBF Africa";

  const html = baseTemplate(`
    <h2>✅ Paiement confirmé</h2>
    <p>Bonjour,</p>
    <p>Votre paiement a bien été reçu.</p>
    <div style="background:#f0f9f7; border-radius:8px; padding:20px; margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Référence :</strong> ${reference}</p>
      <p style="margin:0 0 8px;"><strong>Objet :</strong> ${purposeLabel}</p>
      ${propertyTitle ? `<p style="margin:0 0 8px;"><strong>Annonce :</strong> ${propertyTitle}</p>` : ""}
      <p style="margin:0;"><strong>Montant :</strong>
        <span class="amount">${Number(amount).toLocaleString("fr-FR")} ${currency}</span>
      </p>
    </div>
    ${purpose === "listing_fee" ? `
      <p>Votre annonce est maintenant <span class="badge">✓ Publiée</span> et visible pendant <strong>${(months || 1) * 30} jours</strong>.</p>
      <a href="https://immoafrica.online/account" class="btn">Voir mes annonces</a>
    ` : ""}
    <p style="color:#999; font-size:12px;">Conservez cet email comme justificatif de paiement.</p>
  `);

  await send({ to: email, subject, html, text: `Paiement reçu : ${amount} ${currency} — ${purposeLabel}. Ref: ${reference}` });
}

// ─── 2bis. Copie facture annonceur (commission de réservation) ──────────────
// Quand un client paie la commission ImmoBF pour réserver une location,
// l'annonceur doit recevoir, en même temps que le client, une copie de cette
// facture — c'est lui qui encaissera ensuite directement le loyer/séjour en
// mobile money, il doit donc savoir qu'une réservation a été confirmée et
// combien ImmoBF a perçu.
async function sendOwnerCommissionReceipt(email, {
  amount, currency = "XOF", reference, propertyTitle, buyerPhone, units, periodLabel, totalAmount,
}) {
  const subject = `📄 Copie facture — réservation sur "${propertyTitle}"`;

  const html = baseTemplate(`
    <h2>📄 Copie de facture — commission de réservation</h2>
    <p>Bonjour,</p>
    <p>Un client a réservé votre annonce <strong>"${propertyTitle}"</strong> et a réglé la
      commission ImmoBF Africa correspondante.</p>
    <div style="background:#f0f9f7; border-radius:8px; padding:20px; margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Référence :</strong> ${reference}</p>
      <p style="margin:0 0 8px;"><strong>Annonce :</strong> ${propertyTitle}</p>
      ${units ? `<p style="margin:0 0 8px;"><strong>Durée réservée :</strong> ${units} ${periodLabel || ""}</p>` : ""}
      ${totalAmount ? `<p style="margin:0 0 8px;"><strong>Montant du séjour/loyer (à percevoir directement) :</strong> ${Number(totalAmount).toLocaleString("fr-FR")} ${currency}</p>` : ""}
      <p style="margin:0;"><strong>Commission ImmoBF perçue :</strong>
        <span class="amount">${Number(amount).toLocaleString("fr-FR")} ${currency}</span>
      </p>
    </div>
    <p><strong>Important :</strong> le client doit désormais vous régler directement le montant
      du séjour/loyer en mobile money${buyerPhone ? ` (numéro client : ${buyerPhone})` : ""}.
      ImmoBF Africa n'encaisse que sa commission, jamais le loyer lui-même.</p>
    <p style="color:#999; font-size:12px;">Conservez cet email comme justificatif.</p>
  `);

  await send({
    to: email, subject, html,
    text: `Réservation confirmée sur "${propertyTitle}". Commission ImmoBF perçue : ${amount} ${currency} (réf. ${reference}). Le client vous règle directement le loyer/séjour en mobile money.`,
  });
}

// ─── 3. Alerte expiration annonce ─────────────────────────────────────────────
async function sendExpiryAlert(email, { propertyTitle, propertyId, daysLeft, expiresAt }) {
  const isUrgent = daysLeft <= 1;
  const subject = isUrgent
    ? `⚠️ Votre annonce expire aujourd'hui — ImmoBF Africa`
    : `📅 Votre annonce expire dans ${daysLeft} jours — ImmoBF Africa`;

  const html = baseTemplate(`
    <h2>${isUrgent ? "⚠️ Annonce sur le point d'expirer" : `📅 Expiration dans ${daysLeft} jours`}</h2>
    <p>Bonjour,</p>
    <p>Votre annonce <strong>"${propertyTitle}"</strong> expire le
      <strong>${new Date(expiresAt).toLocaleDateString("fr-FR")}</strong>.</p>
    ${isUrgent
      ? `<p style="color:#d32f2f;"><strong>Si vous ne renouvelez pas aujourd'hui, votre annonce sera masquée des recherches.</strong></p>`
      : `<p>Renouvelez maintenant pour maintenir votre visibilité sur ImmoBF Africa.</p>`
    }
    <div style="background:#fff3e0; border-radius:8px; padding:16px; margin:16px 0;">
      <p style="margin:0;"><strong>Tarifs de renouvellement :</strong></p>
      <p style="margin:8px 0 0;">1 mois — 2 000 FCFA · 3 mois — 5 500 FCFA · 6 mois — 10 000 FCFA · 12 mois — 18 000 FCFA</p>
    </div>
    <a href="https://immoafrica.online/account" class="btn">Renouveler mon annonce</a>
  `);

  await send({ to: email, subject, html,
    text: `Votre annonce "${propertyTitle}" expire dans ${daysLeft} jour(s). Renouvelez sur immoafrica.online/account` });
}

// ─── 4. Notification contact WhatsApp ────────────────────────────────────────
async function sendWhatsAppNotification(email, { propertyTitle, propertyId, visitorCountry }) {
  const subject = `💬 Quelqu'un s'intéresse à votre annonce — ImmoBF Africa`;

  const html = baseTemplate(`
    <h2>💬 Nouveau contact sur votre annonce</h2>
    <p>Bonjour,</p>
    <p>Un visiteur${visitorCountry ? ` depuis <strong>${visitorCountry}</strong>` : ""} vient de cliquer sur
      <strong>"Contacter sur WhatsApp"</strong> pour votre annonce :</p>
    <div style="background:#f0f9f7; border-radius:8px; padding:16px; margin:16px 0;">
      <strong>${propertyTitle}</strong>
    </div>
    <p>Vérifiez vos messages WhatsApp et répondez rapidement pour maximiser vos chances.</p>
    <a href="https://immoafrica.online/properties/${propertyId}" class="btn">Voir l'annonce</a>
    <p style="color:#999; font-size:12px;">Conseil : répondre dans les 30 minutes augmente de 60% vos chances de conclure.</p>
  `);

  await send({ to: email, subject, html,
    text: `Nouveau contact WhatsApp sur votre annonce "${propertyTitle}". Vérifiez vos messages.` });
}

// ─── 5. Confirmation d'inscription newsletter ─────────────────────────────────
async function sendNewsletterConfirmation(email) {
  const subject = "Bienvenue sur ImmoBF Africa 🏠";

  const html = baseTemplate(`
    <h2>Bienvenue sur ImmoBF Africa !</h2>
    <p>Merci de votre intérêt pour la plateforme immobilière africaine.</p>
    <p>Vous recevrez en avant-première :</p>
    <ul>
      <li>🏠 Les nouvelles annonces correspondant à vos critères</li>
      <li>📈 Les tendances du marché immobilier en Afrique de l'Ouest</li>
      <li>💡 Conseils pour acheter, louer ou investir en toute sécurité</li>
      <li>🎁 Offres exclusives pour les premiers inscrits</li>
    </ul>
    <a href="https://immoafrica.online/properties" class="btn">Parcourir les annonces</a>
    <p style="color:#999; font-size:12px;">
      Pour vous désinscrire, répondez à cet email avec "STOP".
    </p>
  `);

  await send({ to: email, subject, html,
    text: "Bienvenue sur ImmoBF Africa ! Retrouvez toutes les annonces sur immoafrica.online" });
}

/**
 * Email automatique à l'annonceur quand l'admin prolonge son annonce.
 */
async function sendListingExtended(email, { propertyTitle, propertyId, newExpiryDate, addedDays }) {
  const dateStr = new Date(newExpiryDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return send({
    to: email,
    subject: `✅ Votre annonce a été prolongée — ImmoBF Africa`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0E7C66;padding:24px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">🏠 ImmoBF Africa</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <h2 style="color:#0E7C66">Bonne nouvelle : votre annonce a été prolongée !</h2>
          <p>L'équipe ImmoBF Africa a prolongé votre annonce de <strong>${addedDays} jour(s)</strong> :</p>
          <div style="background:#e8f5e9;border-left:4px solid #0E7C66;padding:12px 16px;border-radius:4px;margin:16px 0">
            <strong>${propertyTitle}</strong><br/>
            <span style="color:#555">Nouvelle date d'expiration : <strong>${dateStr}</strong></span>
          </div>
          <p>Votre annonce reste visible sur la plateforme jusqu'à cette date.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="https://immoafrica.online/properties/${propertyId}" style="background:#0E7C66;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Voir mon annonce</a>
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#888;font-size:12px;text-align:center">© 2026 ImmoBF Africa — <a href="https://immoafrica.online">immoafrica.online</a></p>
        </div>
      </div>`,
  });
}

/**
 * Email automatique à l'annonceur quand l'admin suspend son annonce.
 */
async function sendListingSuspended(email, { propertyTitle, propertyId, reason }) {
  return send({
    to: email,
    subject: `⚠️ Votre annonce a été suspendue — ImmoBF Africa`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0E7C66;padding:24px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">🏠 ImmoBF Africa</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <h2 style="color:#c62828">⚠️ Annonce temporairement suspendue</h2>
          <p>Votre annonce <strong>${propertyTitle}</strong> a été temporairement suspendue par notre équipe de modération.</p>
          ${reason ? `<div style="background:#fff3e0;border-left:4px solid #f57c00;padding:12px 16px;border-radius:4px;margin:16px 0"><strong>Motif :</strong> ${reason}</div>` : ""}
          <p>Pour toute question, répondez à cet email ou contactez-nous à <a href="mailto:contact@immoafrica.online">contact@immoafrica.online</a>.</p>
          <p>Une fois les éventuelles corrections apportées, notre équipe réactivera votre annonce.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#888;font-size:12px;text-align:center">© 2026 ImmoBF Africa — <a href="https://immoafrica.online">immoafrica.online</a></p>
        </div>
      </div>`,
  });
}

/**
 * Email automatique à l'annonceur quand l'admin réactive son annonce.
 */
async function sendListingRestored(email, { propertyTitle, propertyId }) {
  return send({
    to: email,
    subject: `✅ Votre annonce est de nouveau en ligne — ImmoBF Africa`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0E7C66;padding:24px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">🏠 ImmoBF Africa</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <h2 style="color:#0E7C66">✅ Votre annonce est de nouveau visible !</h2>
          <p>Bonne nouvelle : votre annonce <strong>${propertyTitle}</strong> a été réactivée et est de nouveau visible par les visiteurs.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="https://immoafrica.online/properties/${propertyId}" style="background:#0E7C66;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Voir mon annonce</a>
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#888;font-size:12px;text-align:center">© 2026 ImmoBF Africa — <a href="https://immoafrica.online">immoafrica.online</a></p>
        </div>
      </div>`,
  });
}

module.exports = {
  send,
  sendOtpEmail,
  sendPaymentReceipt,
  sendOwnerCommissionReceipt,
  sendExpiryAlert,
  sendWhatsAppNotification,
  sendNewsletterConfirmation,
  sendListingExtended,
  sendListingSuspended,
  sendListingRestored,
};
