"use strict";

const { Readable } = require("stream");

let _client = null;

function getClient() {
  if (_client) return _client;
  const { v2: cloudinary } = require("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
  _client = cloudinary;
  return _client;
}

async function uploadBuffer(buffer, opts) {
  const options = opts || {};
  const cloudinary = getClient();
  return new Promise(function(resolve, reject) {
    const stream = cloudinary.uploader.upload_stream(
      Object.assign({ folder: "immobf", resource_type: "auto" }, options),
      function(err, result) { return err ? reject(err) : resolve(result); }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}

module.exports = { uploadBuffer };
