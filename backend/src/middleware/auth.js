"use strict";

const jwt = require("jsonwebtoken");
const config = require("../config");
const { Unauthorized, Forbidden } = require("../utils/errors");
const { query } = require("../config/db");

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, agency_id: user.agency_id || null, tv: user.token_version || 0 },
    config.auth.jwtSecret,
    { expiresIn: config.auth.accessTtl }
  );
}

function signRefresh(user, jti) {
  return jwt.sign(
    { sub: user.id, jti, kind: "refresh", tv: user.token_version || 0 },
    config.auth.jwtSecret,
    { expiresIn: config.auth.refreshTtl }
  );
}

function verify(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

// CORRECTIF (30/06/2026) : un blocage ou une déconnexion forcée décidée par
// l'admin doit prendre effet immédiatement, pas seulement à l'expiration de
// l'access token. On vérifie donc à chaque requête authentifiée que le
// compte n'est pas bloqué et que la version de token embarquée dans le JWT
// (`tv`) correspond toujours à `token_version` en base — celle-ci est
// incrémentée par l'admin pour invalider tous les tokens déjà émis, sans
// avoir besoin d'une table de sessions séparée.
async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return next(Unauthorized("Missing bearer token"));
  try {
    const payload = verify(m[1]);
    if (payload.kind === "refresh") return next(Unauthorized("Wrong token type"));

    const { rows } = await query(
      "SELECT role, agency_id, is_blocked, token_version FROM users WHERE id = $1",
      [payload.sub]
    );
    const dbUser = rows[0];
    if (!dbUser) return next(Unauthorized("Utilisateur introuvable"));
    if (dbUser.is_blocked) return next(Forbidden("Compte bloqué par l'administrateur"));
    if ((payload.tv || 0) !== (dbUser.token_version || 0)) {
      return next(Unauthorized("Session invalidée — merci de vous reconnecter"));
    }

    req.user = {
      id: payload.sub,
      role: dbUser.role,
      agency_id: dbUser.agency_id,
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
