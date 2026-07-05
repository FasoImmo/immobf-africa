"use strict";

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const Property = require("../models/Property");
const { BadRequest, Forbidden } = require("../utils/errors");

// ─── Validation magic bytes ─────────────────────────────────────────────────
// On vérifie les vrais premiers octets du fichier, pas seulement le mimetype déclaré
// par le client (qui peut être falsifié).
function hasMagicBytes(buf) {
  if (buf.length < 12) return false;
  // JPEG : FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // PNG  : 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // GIF  : GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WebP : RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  // BMP  : BM
  if (buf[0] === 0x42 && buf[1] === 0x4D) return true;
  // HEIC/AVIF : ftyp à l'offset 4
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return true;
  // TIFF : II ou MM
  if (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2A) return true;
  if (buf[0] === 0x4D && buf[1] === 0x4D && buf[3] === 0x2A) return true;
  return false;
}

// Cloudinary configuré via variables d'environnement :
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max par fichier
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Seules les images sont acceptées (JPG, PNG, WebP, GIF)"));
  },
}).array("photos", 10); // champ "photos", max 10 fichiers

// Wrapper multer → Promise
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

// Uploader un buffer vers Cloudinary
function uploadToCloudinary(buffer, folder, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: filename, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function uploadPhotos(req, res) {
  // 1. Parser le multipart
  await runMulter(req, res);

  const propertyId = req.params.id;

  // 2. Vérifier que l'annonce appartient à l'utilisateur connecté
  const existing = await Property.findById(propertyId);
  if (!existing) throw BadRequest("Annonce introuvable");
  if (existing.owner_id !== req.user.id && req.user.role !== "admin") {
    throw Forbidden("Vous n'êtes pas propriétaire de cette annonce");
  }

  if (!req.files || req.files.length === 0) {
    return res.json({ photos: [] });
  }

  // 3. Valider les magic bytes de chaque fichier
  for (const file of req.files) {
    if (!hasMagicBytes(file.buffer)) {
      throw BadRequest(`Fichier rejeté : "${file.originalname}" n'est pas une vraie image.`);
    }
  }

  // 4. Upload chaque image vers Cloudinary
  const folder = `immobf/${propertyId}`;
  const uploaded = await Promise.all(
    req.files.map((file, i) => {
      const filename = `photo_${Date.now()}_${i}`;
      return uploadToCloudinary(file.buffer, folder, filename);
    })
  );

  // 5. Sauvegarder les URLs en base
  const photos = await Promise.all(
    uploaded.map((result, i) =>
      Property.addPhoto(propertyId, result.secure_url, { sort_order: i })
    )
  );

  res.status(201).json({ photos });
}

async function deletePhoto(req, res) {
  const { id: propertyId, photoId } = req.params;
  const { NotFound } = require("../utils/errors");

  const existing = await Property.findById(propertyId);
  if (!existing) throw BadRequest("Annonce introuvable");
  if (existing.owner_id !== req.user.id && req.user.role !== "admin") {
    throw Forbidden("Vous n'êtes pas propriétaire de cette annonce");
  }

  const deleted = await Property.deletePhoto(photoId, propertyId, req.user.id);
  if (!deleted) throw NotFound("Photo introuvable");
  res.json({ deleted: true });
}

module.exports = { uploadPhotos, deletePhoto };
