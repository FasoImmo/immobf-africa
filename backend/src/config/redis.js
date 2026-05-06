"use strict";

const Redis = require("ioredis");
const config = require("./index");

let client = null;

function getRedis() {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    client.on("error", (e) => console.warn("Redis error:", e.message));
  }
  return client;
}

module.exports = { getRedis };
