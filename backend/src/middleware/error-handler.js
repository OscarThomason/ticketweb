export function notFoundHandler(req, res) {
  res.status(404).json({ message: "Endpoint not found" });
}

export function errorHandler(error, req, res, next) {
  const status = error.statusCode || 500;
  const message = error.message || "Internal server error";
  const details = error.details || null;
  const payload = { message };

  if (details) payload.details = details;
  if (process.env.NODE_ENV !== "production" && error.stack) {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
}

