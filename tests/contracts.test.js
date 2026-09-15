import { describe, it, expect, vi } from "vitest";
import request from "supertest";

import { createApp } from "../src/app.js";

const sampleContractText =
  "This Agreement is entered into between Party A and Party B for the provision of consulting services, effective as of the date of signing.";

describe("POST /api/v1/contracts/analyze", () => {
  it("returns a structured analysis for valid input", async () => {
    const fakeChain = {
      invoke: vi.fn().mockResolvedValue({
        summary: "A consulting services agreement between two parties.",
        riskyClauses: [
          {
            clause: "no termination clause",
            concern: "either party could be locked in indefinitely",
          },
        ],
        missingProtections: ["limitation of liability"],
      }),
    };

    const app = createApp({ chain: fakeChain });
    const res = await request(app)
      .post("/api/v1/contracts/analyze")
      .send({ contractText: sampleContractText });

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(fakeChain.invoke).toHaveBeenCalledWith({
      contractText: sampleContractText,
    });
  });

  it("rejects contractText that is too short", async () => {
    const fakeChain = { invoke: vi.fn() };
    const app = createApp({ chain: fakeChain });

    const res = await request(app)
      .post("/api/v1/contracts/analyze")
      .send({ contractText: "too short" });

    expect(res.status).toBe(400);
    expect(fakeChain.invoke).not.toHaveBeenCalled(); // proves we validate BEFORE call the API
  });

  it("returns 502 when analysis service fails", async () => {
    const fakeChain = {
      invoke: vi.fn().mockRejectedValue(new Error("upstream timeout")),
    };
    const app = createApp({ chain: fakeChain });

    const res = await request(app)
      .post("/api/v1/contracts/analyze")
      .send({ contractText: sampleContractText });

    expect(res.status).toBe(502);
  });
});
