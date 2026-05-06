"use strict";

const { MongoClient } = require("mongodb");
const config = require("./index");

let client = null;
let db = null;

async function getMongo() {
  if (!config.mongo.url) return null;
  if (!client) {
    client = new MongoClient(config.mongo.url, { ignoreUndefined: true });
    await client.connect();
    db = client.db();
  }
  return db;
}

module.exports = { getMongo };
