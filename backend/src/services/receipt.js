"use strict";

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const config = require("../config");

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

/**
 * Génère un reçu PDF pour une transaction et renvoie son chemin public.
 */
async function generateReceipt(transaction, { buyer = null, property = null } = {}) {
  const dir = path.join(process.cwd(), config.storage.localDir, "receipts");
  ensureDir(dir);
  const filename = `receipt-${transaction.reference}.pdf`;
  const filepath = path.join(dir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(22).text("ImmoBF Africa", { align: "center" });
    doc.fontSize(10).fillColor("#666").text("Reçu de transaction", { align: "center" });
    doc.moveDown();
    doc.fillColor("#000");

    const lines = [
      ["Référence", transaction.reference],
      ["Statut", transaction.status],
      ["Motif", transaction.purpose],
      ["Montant", `${Number(transaction.amount).toLocaleString("fr-FR")} ${transaction.currency}`],
      ["Opérateur", transaction.provider],
      ["Date", new Date(transaction.updated_at || transaction.created_at).toLocaleString("fr-FR")],
    ];
    if (buyer) lines.push(["Payeur", `${buyer.full_name || ""} (${buyer.phone})`]);
    if (property) {
      lines.push(["Annonce", property.title]);
      lines.push(["Localisation", `${property.city}, ${property.country_code}`]);
    }

    doc.fontSize(12);
    for (const [k, v] of lines) {
      doc.font("Helvetica-Bold").text(`${k}:`, { continued: true });
      doc.font("Helvetica").text(` ${v}`);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#888").text(
      "Ce reçu est généré automatiquement. En cas de litige, contacter support@immobf.africa.",
      { align: "center" }
    );

    doc.end();
    stream.on("finish", () => resolve({ path: filepath, filename }));
    stream.on("error", reject);
  });
}

module.exports = { generateReceipt };
