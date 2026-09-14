# SecureContract AI

A REST API that analyzes contract text for risky clauses and missing protections, using [LangChain.js](https://js.langchain.com/) and Google Gemini. This is **Phase 1 (Beginner)** of a three-part build — a working, documented, containerized API with one real Gemini integration and no testing/auth/rate limiting yet (see [Roadmap](#roadmap)).

## What it does

Send contract text to the API, get back a structured analysis:

```json
{
  "summary": "A consulting services agreement between two parties.",
  "riskyClauses": [
    { "clause": "no termination clause", "concern": "either party could be locked in indefinitely" }
  ],
  "missingProtections": ["limitation of liability"]
}
```

## Architecture

```
                     ┌─────────────────────────────────────────┐
                     │              Docker container            │
                     │                                           │
  HTTP request       │   ┌───────────────┐     ┌──────────────┐  │      Google
 ───────────────────▶│──▶│  Express app  │────▶│  LangChain   │──┼─────▶ Gemini
  POST /api/v1/      │   │  (routes +    │     │  chain:      │  │      API
  contracts/analyze  │   │  middleware)  │     │  prompt →    │  │
                      │   └───────────────┘     │  model →     │  │
                     │           │              │  parser      │  │
                     │           │              └──────────────┘  │
                     │           ▼                                │
                     │   JSON response                            │
                     │   { summary, riskyClauses[], ... }          │
                     └─────────────────────────────────────────┘
```

```
securecontract-ai/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
├── package-lock.json
├── README.md
└── src/
    ├── server.js          # entrypoint — starts Express
    ├── app.js             # Express app config, routes wired in
    ├── config.js          # loads & validates env vars in one place
    └── routes/
        └── contracts.js   # POST /api/v1/contracts/analyze
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux)
- A Google AI Studio API key for Gemini — [ai.google.dev](https://ai.google.dev/)
- Node.js 20+ (only needed if you want to run commands outside Docker; the app itself runs in a container)

## Setup

```bash
git clone <your-repo-url>
cd securecontract-ai
cp .env.example .env
```

Open `.env` and add your real Gemini key:
```
PORT=3000
GEMINI_API_KEY=your-gemini-api-key-here
NODE_ENV=development
```

`.env` is git-ignored — never commit it.

Start the API:
```bash
docker compose up --build
```

## Usage

**Health check**
```bash
curl http://localhost:3000/health
```
```json
{ "status": "ok" }
```

**Analyze a contract**
```bash
curl -X POST http://localhost:3000/api/v1/contracts/analyze \
  -H "Content-Type: application/json" \
  -d '{"contractText": "This Agreement is made between Party A and Party B for the provision of consulting services, effective as of the date of signing..."}'
```

`contractText` must be between 50 and 20,000 characters. Shorter or longer input returns a `400`:
```json
{
  "error": "Invalid request",
  "details": { "contractText": ["contractText must be at least 50 characters"] }
}
```

If the Gemini response can't be parsed as valid JSON, the API returns a `502` rather than passing untrusted output through to the client.

## Design notes

- **`config.js` is the only place that reads `process.env`.** Missing environment variables cause the app to fail immediately at startup with a clear error, instead of failing confusingly mid-request.
- **`createApp()` is separate from `server.js`.** The Express app can be constructed without binding a network port — this is intentional groundwork for automated testing in Phase 2.
- **Input is validated before any Gemini call is made**, and capped at 20,000 characters, to avoid spending on requests that were never going to succeed.
- **Docker Compose bind-mounts `src/`** and runs `node --watch`, so local edits are picked up immediately without rebuilding the image.

## What's intentionally out of scope for this phase

This build is a milestone, not a finished product. Deliberately deferred to later phases:

- Automated tests
- Authentication / rate limiting
- Structured logging
- File upload support
- Production-hardened Docker image
- Deployment

## Roadmap

| Phase | Adds |
|---|---|
| 1 — Beginner *(this README)* | Core API, Docker for local dev, Gemini integration, input validation |
| 2 — Intermediate | Automated tests (Vitest + Supertest), centralized error handling, structured logging, rate limiting, file upload, CI |
| 3 — Senior | API key auth, secrets management, hardened production Docker image, job queue, observability, threat model, deployment |

## Git workflow

Work happens on `feature/*` branches off `develop`, merged with `--no-ff`, and released to `main` with a version tag. This phase is tagged `v0.1.0`.
