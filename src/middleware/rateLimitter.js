import rateLimit from "express-rate-limit";

export const rateLimitter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // each IP gets 20 requests per window - deliberately strict, since /analyze calls a paid LLM
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});
