"use strict";

class AppError extends Error {
  constructor(message, status = 500, code = "internal_error", details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const BadRequest   = (msg, details) => new AppError(msg, 400, "bad_request", details);
const Unauthorized = (msg = "Unauthorized") => new AppError(msg, 401, "unauthorized");
const Forbidden    = (msg = "Forbidden") => new AppError(msg, 403, "forbidden");
const NotFound     = (msg = "Not found") => new AppError(msg, 404, "not_found");
const Conflict     = (msg) => new AppError(msg, 409, "conflict");

module.exports = { AppError, BadRequest, Unauthorized, Forbidden, NotFound, Conflict };
