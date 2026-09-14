import express from "express";

import {
  createContractsRouter,
  buildDefaultChain,
} from "./routes/contracts.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { requestLogger } from "./logger.js";

export function createApp({ chain = buildDefaultChain() } = {}) {
  const app = express();

  app.use(requestLogger);
  app.use(rateLimiter);
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/v1/contracts", createContractsRouter({ chain }));

  // 404 fallback for unhandled routes
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  app.use(errorHandler); // must be last, after all other middleware and routes

  return app;
}
