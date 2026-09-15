import { AppError } from "../errors/AppError.js";

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    req.log?.warn({ err }, "handled application error");
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Unrecorgnized/unexpected error - log full details server-side,
  // but never leak stack traces or internal messages to the client.
  req.log?.error({ err }, "unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
}
