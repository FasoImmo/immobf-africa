"use strict";

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const Property = require("../models/Property");
const { BadRequest, Forbidden } = require("../utils/errors");

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

  // 3. Upload chaque image vers Cloudinary
  const folder = `immobf/${propertyId}`;
  const uploaded = await Promise.all(
    req.files.map((file, i) => {
      const filename = `photo_${Date.now()}_${i}`;
      return uploadToCloudinary(file.buffer, folder, filename);
    })
  );

  // 4. Sauvegarder les URLs en base
  const photos = await Promise.all(
    uploaded.map((result, i) =>
      Property.addPhoto(propertyId, result.secure_url, { sort_order: i })
    )
  );

  res.status(201).json({ photos });
}

module.exports = { uploadPhotos };
