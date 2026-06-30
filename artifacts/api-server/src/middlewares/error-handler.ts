import type { ErrorRequestHandler } from "express";
import { logger } from "../lib/logger";

export const jsonErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error reached the global error handler");

  if (res.headersSent) {
    return;
  }

  const status =
    typeof err?.status === "number"
      ? err.status
      : typeof err?.statusCode === "number"
        ? err.statusCode
        : 500;

  const message =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err?.message || "Internal server error";

  res.status(status).json({ error: message });
};
