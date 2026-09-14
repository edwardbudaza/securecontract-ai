import { Router } from "express";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";

import { config } from "../config.js";
import { AppError } from "../errors/AppError.js";

const analyzeRequestSchema = z.object({
  contractText: z
    .string()
    .min(50, "contractText must be at least 50 characters")
    .max(20000, "contractText must be under 20,000 characters"),
});

const analyzeResultSchema = z.object({
  summary: z.string(),
  riskyClauses: z.array(
    z.object({
      clause: z.string(),
      concern: z.string(),
    }),
  ),
  missingProtections: z.array(z.string()),
});

const prompt = PromptTemplate.fromTemplate(
  `You are a contract review assistant. Analyze the following contract text.

Return ONLY valid JSON in this exact shape, no extra commentary:
{{
  "summary": "2-3 sentence plain-English summary",
  "riskyClauses": [
    {{ "clause": "short quote or reference", "concern": "why this is risky" }}
  ],
  "missingProtections": ["list of standard protections this contract appears to lack"]
}}

Contract:
---
{contractText}
---`,
);

// Real chain, build from real config - used when the app runs for real.
export function buildDefaultChain() {
  const model = new ChatGoogleGenerativeAI({
    apiKey: config.gemini.apiKey,
    model: "gemini-3.5-flash-lite",
    temperature: 0.2, // low temperature: we want consistent, analytical output, not creativity
  }).withStructuredOutput(analyzeResultSchema); // ask LangChain to enforce the schema, not just hope

  return prompt.pipe(model);
}

// The router now ACCEPTS its chain instead of building one itself.
// In production, app.js passes buildDefaultChain(). In tests, we pass a fake.

export function createContractsRouter({ chain }) {
  const router = Router();

  router.post("/analyze", async (req, res, next) => {
    const parsed = analyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(
          400,
          "Invalid request",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }

    try {
      const analysis = await chain.invoke({
        contractText: parsed.data.contractText,
      });
      res.status(200).json(analysis);
    } catch (err) {
      next(
        new AppError(502, "Analysis service failed", { cause: err.message }),
      );
    }
  });

  return router;
}
