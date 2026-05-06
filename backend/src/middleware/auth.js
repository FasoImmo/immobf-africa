"use strict";

const jwt = require("jsonwebtoken");
const config = require("../config");
const { Unauthorized, Forbidden } = require("../utils/errors");

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, agency_id: user.agency_id || null },
    config.auth.jwtSecret,
    { expiresIn: config.auth.accessTtl }
  );
}

function signRefresh(user, jti) {
  return jwt.sign(
    { sub: user.id, jti, kind: "refresh" },
    config.auth.jwtSecret,
    { expiresIn: config.auth.refreshTtl }
  );
}

function verify(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return next(Unauthorized("Missing bearer token"));
  try {
    const payload = verify(m[1]);
    if (payload.kind === "refresh") return next(Unauthorized("Wrong token type"));
    req.user = {
      id: payload.sub,
      role: payload.role,
      agency_id: payload.agency_id,
    };
    next();
  } catch (_e) {
    next(Unauthorized("Invalid or expired token"));
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) return next(Forbidden());
    next();
  };
}

module.exports = { signAccess, signRefresh, verify, requireAuth, requireRole };
