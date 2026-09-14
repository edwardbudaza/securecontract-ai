import { Router } from "express";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { config } from "../config.js";

const router = Router();

// Basic input validation — reject bad requests before they cost you an LLM call
const analyzeRequestSchema = z.object({
  contractText: z
    .string()
    .min(50, "contractText must be at least 50 characters")
    .max(20000, "contractText must be under 20,000 characters"),
});

const model = new ChatGoogleGenerativeAI({
  apiKey: config.gemini.apiKey,
  model: "gemini-3.5-flash-lite",
  temperature: 0.2, // low temperature: we want consistent, analytical output, not creativity
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

const chain = prompt.pipe(model).pipe(new StringOutputParser());

router.post("/analyze", async (req, res, next) => {
  try {
    const parsed = analyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const raw = await chain.invoke({ contractText: parsed.data.contractText });

    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch {
      // The model didn't return clean JSON — surface a controlled error,
      // never pass raw, unvalidated model output straight to the client as if it were trusted data.
      return res
        .status(502)
        .json({ error: "Analysis service returned an unexpected format" });
    }

    res.status(200).json(analysis);
  } catch (err) {
    next(err); // hand off to Express's default error handler for now — a real one arrives in Phase 2
  }
});

export default router;
