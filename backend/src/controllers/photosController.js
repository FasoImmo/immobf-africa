"use strict";

const multer = require("multer");
const Property = require("../models/Property");
const cloudinarySvc = require("../services/cloudinary");
const { BadRequest, Forbidden, NotFound } = require("../utils/errors");

const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function(_req, file, cb) {
    if (ALLOWED.indexOf(file.mimetype) >= 0) {
      cb(null, true);
    } else {
      cb(new Error("Type non supporte: " + file.mimetype));
    }
  }
}).array("files", 10);

async function addPhotos(req, res) {
  const prop = await Property.findById(req.params.id);
  if (!prop) throw NotFound("Annonce introuvable");
  if (prop.owner_id !== req.user.id) throw Forbidden("Non autorise");

  if (!req.files || req.files.length === 0) {
    throw BadRequest("Aucun fichier fourni");
  }

  const photos = [];
  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const isVideo = file.mimetype.indexOf("video") === 0;
    const result = await cloudinarySvc.uploadBuffer(file.buffer, {
      resource_type: isVideo ? "video" : "image"
    });
    const photo = await Property.addPhoto(prop.id, result.secure_url, {
      is_360: false,
      sort_order: i
    });
    photos.push(photo);
  }

  res.status(201).json({ photos: photos });
}

module.exports = { upload: upload, addPhotos: addPhotos };
