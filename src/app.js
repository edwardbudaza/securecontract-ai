import express from "express";

import contractRouter from "./routes/contracts.js";

export function createApp() {
  const app = express();

  // Parse incoming JSON bodies, cap size to reduce abuse surface
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/v1/contracts", contractRouter);

  // 404 fallback for unhandled routes
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return app;
}
