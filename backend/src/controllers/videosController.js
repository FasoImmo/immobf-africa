"use strict";

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const Property = require("../models/Property");
const { BadRequest, Forbidden, NotFound } = require("../utils/errors");

// ─── Validation magic bytes vidéo ──────────────────────────────────────────
// On vérifie les vrais premiers octets du fichier pour rejeter les fichiers
// déguisés en vidéo. Formats acceptés : MP4, MOV, WebM, AVI, 3GP.
function hasVideoMagicBytes(buf) {
  if (buf.length < 12) return false;
  // MP4 / MOV / 3GP : ftyp à l'offset 4 (ex: ftyp, isom, mp41, M4V, qt)
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return true;
  // WebM / MKV : EBML header 1A 45 DF A3
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return true;
  // AVI : RIFF....AVI
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x41 && buf[9] === 0x56 && buf[10] === 0x49) return true;
  // MPEG : 00 00 01 Bx
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && (buf[3] & 0xF0) === 0xB0) return true;
  return false;
}

// Cloudinary configuré via variables d'environnement (partagé avec photos)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Max 3 vidéos par annonce, 200 MB par fichier
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) return cb(null, true);
    cb(new Error("Seuls les fichiers vidéo sont acceptés (MP4, MOV, WebM)"));
  },
}).single("video"); // un fichier à la fois

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

function uploadToCloudinary(buffer, folder, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: "video",
        // Cloudinary génère automatiquement les métadonnées (durée, codec, etc.)
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function uploadVideo(req, res) {
  // 1. Parser le multipart
  await runMulter(req, res);

  const propertyId = req.params.id;

  // 2. Vérifier ownership
  const existing = await Property.findById(propertyId);
  if (!existing) throw BadRequest("Annonce introuvable");
  if (existing.owner_id !== req.user.id && req.user.role !== "admin") {
    throw Forbidden("Vous n'êtes pas propriétaire de cette annonce");
  }

  // 3. Vérifier la limite (max 3 vidéos par annonce)
  const currentVideos = await Property.videosFor(propertyId);
  if (currentVideos.length >= 3) {
    throw BadRequest("Maximum 3 vidéos par annonce. Supprimez une vidéo existante avant d'en ajouter une nouvelle.");
  }

  if (!req.file) {
    return res.json({ video: null });
  }

  // 4. Valider les magic bytes
  if (!hasVideoMagicBytes(req.file.buffer)) {
    throw BadRequest(`Fichier rejeté : "${req.file.originalname}" n'est pas une vraie vidéo.`);
  }

  // 5. Upload vers Cloudinary (resource_type: video)
  const folder = `immobf/${propertyId}/videos`;
  const filename = `video_${Date.now()}`;
  const result = await uploadToCloudinary(req.file.buffer, folder, filename);

  // 6. Sauvegarder en base
  const video = await Property.addVideo(
    propertyId,
    result.secure_url,
    result.public_id,
    {
      duration_s: result.duration ? Math.round(result.duration) : null,
      sort_order: currentVideos.length,
    }
  );

  res.status(201).json({ video });
}

async function deleteVideo(req, res) {
  const { id: propertyId, videoId } = req.params;

  const existing = await Property.findById(propertyId);
  if (!existing) throw BadRequest("Annonce introuvable");
  if (existing.owner_id !== req.user.id && req.user.role !== "admin") {
    throw Forbidden("Vous n'êtes pas propriétaire de cette annonce");
  }

  // Récupérer le cloudinary_id avant suppression pour le détruire côté Cloudinary
  const videos = await Property.videosFor(propertyId);
  const target = videos.find((v) => v.id === videoId);
  if (!target) throw NotFound("Vidéo introuvable");

  // Supprimer de la base
  const deleted = await Property.deleteVideo(videoId, propertyId, req.user.id);
  if (!deleted) throw NotFound("Vidéo introuvable");

  // Supprimer de Cloudinary (non bloquant — ne pas faire échouer la requête si ça rate)
  if (target.cloudinary_id) {
    cloudinary.uploader.destroy(target.cloudinary_id, { resource_type: "video" }).catch((err) => {
      console.error("[videosController] Cloudinary destroy error:", err.message);
    });
  }

  res.json({ deleted: true });
}

async function listVideos(req, res) {
  const { id: propertyId } = req.params;
  const videos = await Property.videosFor(propertyId);
  res.json({ videos });
}

module.exports = { uploadVideo, deleteVideo, listVideos };
