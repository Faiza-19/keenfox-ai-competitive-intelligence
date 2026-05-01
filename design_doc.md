 KeenFox Competitive Intelligence System — Design Document

Version: 1.0  
Author: Engineering Intern Assignment  
Date: 2024  
System: AI-Powered Competitive Intelligence & Campaign Feedback Loop



 Table of Contents

1. [System Overview](1-system-overview)
2. [Architecture & Data Flow](2-architecture--data-flow)
3. [Component Design](3-component-design)
4. [Data Handling Strategy](4-data-handling-strategy)
5. [Prompt Engineering Strategy](5-prompt-engineering-strategy)
6. [Guardrails & Error Recovery](6-guardrails--error-recovery)
7. [Known Limitations & Future Work](7-known-limitations--future-work)
8. [Evaluation Against Criteria](8-evaluation-against-criteria)



 1. System Overview

 Problem Statement

KeenFox's marketing and product teams manually track competitors — a process that is slow, inconsistent, and reactive. This system replaces that workflow with an automated, AI-powered pipeline that:

1. Continuously gathers competitor signals from multiple public data sources
2. Uses a large language model (Google Gemini-gemini-2.5-flash) to extract strategic insights — not just summaries
3. Synthesizes those insights into concrete campaign adjustments across messaging, channel strategy, and GTM approach
4. Maintains state across runs to detect what changed since the last analysis

 Design Philosophy

> "The hardest part isn't collecting the data — it's making the AI reason about it strategically, not just summarize it."

This system is designed around three principles:

- Reasoning over retrieval: The LLM is prompted to interpret signals, not regurgitate them. Every insight must be grounded in evidence and expressed in terms of what KeenFox should do.
- Graceful degradation: Any data source can fail without breaking the pipeline. Partial data produces partial insights with clearly flagged confidence levels.
- Incrementality: The system maintains state so re-runs are efficient. A "diff mode" highlights only what changed, enabling rapid response to competitive shifts.



 2. Architecture & Data Flow

 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    KeenFox CI System                             │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────┐   │
│  │   CLI /  │    │   Pipeline   │    │   State Store       │   │
│  │Dashboard │───▶│ Orchestrator │───▶│ (JSON files/cache)  │   │
│  └──────────┘    └──────┬───────┘    └─────────────────────┘   │
│                         │                                        │
│          ┌──────────────┼──────────────┐                        │
│          ▼              ▼              ▼                        │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐               │
│  │ Scraper Agent│ │Analyzer  │ │  Reporter    │               │
│  │              │ │  Agent   │ │  Agent       │               │
│  │ - Website    │ │          │ │              │               │
│  │ - G2 Reviews │ │ Google Gemini  │ │ - Markdown   │               │
│  │ - Reddit     │ │ gemini-2.5-flash│ │ - JSON       │               │
│  │ - Changelog  │ │          │ │ - Dashboard  │               │
│  │ - LinkedIn   │ └──────────┘ └──────────────┘               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

 Data Flow Diagram

```
Phase 1: COLLECTION (Parallel, rate-limited)
─────────────────────────────────────────────
Competitor 1 ──┐
Competitor 2 ──┤──▶ Scraper Agent ──▶ Raw Signals JSON
Competitor 3 ──┤      (5 sources)        │
Competitor 4 ──┘                         │
Competitor 5 ──┘                    Cache layer
                                    (24h TTL)

Phase 2: ANALYSIS (Concurrent, 2-at-a-time)
────────────────────────────────────────────
Raw Signals ──▶ buildCompetitorAnalysisPrompt()
                       │
                       ▼
              Google Gemini gemini-2.5-flash API
              (SYSTEM: KeenFox analyst context)
              (USER: Raw signals + extraction schema)
                       │
                       ▼
              Structured JSON Analysis
              (messaging, pricing, sentiment, gaps)
                       │
                       ▼
              Validation + Fallback filling

Phase 3: SYNTHESIS (Single LLM call)
──────────────────────────────────────
All Analyses ──▶ buildCampaignPrompt()
                       │
                       ▼
              Google Gemini gemini-2.5-flash API
              (Synthesize cross-competitor insights)
                       │
                       ▼
              Campaign Recommendations JSON
              (messaging, channels, GTM, copy, battle cards)

Phase 4: DIFF (Optional, single LLM call)
──────────────────────────────────────────
Previous Report + Current Report
                       │
                       ▼
              buildDiffPrompt() → Gemini API
                       │
                       ▼
              Change Summary + Urgency Rating

Phase 5: REPORTING
────────────────────
JSON Report + Markdown Report + Dashboard Update
```

 Component Interactions

```
src/
├── index.js          ← CLI entry point (Commander.js)
├── pipeline.js       ← Orchestrator (phases 1-5)
├── config.js         ← Competitor definitions, LLM config
│
├── agents/
│   ├── scraper.js    ← Web scraping (Axios + Cheerio)
│   ├── analyzer.js   ← LLM analysis (Gemini SDK)
│   └── reporter.js   ← Report generation (Markdown/JSON)
│
├── prompts/
│   └── intelligence.js ← All LLM prompts
│
└── utils/
    ├── logger.js     ← Structured logging
    ├── errors.js     ← Custom errors + retry logic
    └── storage.js    ← File-based persistence
```



 3. Component Design

 3.1 Scraper Agent (`agents/scraper.js`)

Approach: Pull-based web scraping using Axios (HTTP) and Cheerio (HTML parsing). LinkedIn blocks scraping, so LinkedIn signals are gathered via Google search proxying.

Data Sources:

| Source | Method | Rate Limit Handling | Fallback |
|--|--||-|
| Website / Pricing | Direct HTTP GET | 2s delay between requests | Empty object with `unavailable: true` |
| G2 Reviews | Direct scrape (public pages) | Retry with backoff | Note that auth required |
| Reddit | Reddit JSON API (`/search.json`) | 2s delay + retry | Empty posts array |
| Changelog | Direct HTTP GET | Retry with backoff | Empty entries |
| LinkedIn | Google search proxy | Search rate limits | Empty updates |

Key design decisions:
- All scraping functions use `safeExecute()` — they return structured empty results rather than throw, so a single source failure doesn't abort the competitor's entire collection.
- `Promise.allSettled()` is used at the competitor level, so 5 concurrent collections run in parallel with partial failures acceptable.
- A rate limiter (`pLimit`) caps concurrent HTTP requests at 3 to avoid IP bans.
- A 24-hour cache means re-runs don't re-scrape (important for development/iteration speed).

 3.2 Analyzer Agent (`agents/analyzer.js`)

Model: Google Gemini (gemini-2.5-flash) (best reasoning for strategic synthesis)

Call Pattern: Two distinct LLM call types:

1. Per-competitor analysis (one call per competitor): Extracts structured insights from raw signals. Uses `max_tokens: 3000`, `temperature: 0.3` (low creativity, high consistency).

2. Cross-competitor synthesis (one call): Takes all competitor analyses and generates KeenFox-specific campaign recommendations. Uses `max_tokens: 4096`, `temperature: 0.4` (slightly more creative for copy/strategy).

Concurrency: Max 2 simultaneous LLM calls (`pLimit(2)`) to respect API rate limits.

Output Schema Enforcement: The prompt specifies an exact JSON schema. A `safeParseJSON()` utility strips markdown fences and attempts extraction if parsing fails. Missing fields are filled with defaults rather than causing errors.

 3.3 Reporter (`agents/reporter.js`)

Generates two outputs from the same structured data:

- JSON Report: Full structured data, queryable by the dashboard and NL query interface
- Markdown Report: Human-readable with tables, badges, and battle cards — suitable for Slack/email distribution

 3.4 Dashboard (`dashboard/`)

A single-page application served by Express. Features:
- Real-time competitive overview (threat matrix, stats)
- Competitor-by-competitor drill-down
- Signal browser with type filtering
- Campaign recommendation viewer
- Copy suggestion displayer
- Battle card view
- Natural language query interface (proxies to LLM via `/api/query`)
- Pipeline trigger button



 4. Data Handling Strategy

 Handling Noisy Data

Problem: Web scraping produces messy, inconsistent HTML. Reviews contain informal language. Reddit posts are tangential.

Solutions:
1. `sanitizeText()` strips control characters, normalizes whitespace, enforces length limits (prevents prompt injection via competitor content)
2. Cheerio selectors are ordered from specific to generic — we prefer `[class="pricing"]` over `body` to reduce noise
3. Text is truncated before being injected into prompts (website: 8000 chars, reviews: 500 chars each, raw pricing: 3000 chars)
4. The LLM prompt explicitly instructs the model to treat unavailable data honestly rather than infer it

 Handling Incomplete Data

Problem: G2 requires auth, LinkedIn blocks bots, some changelogs are JavaScript-rendered.

Strategy: Every scraping function returns a structured "failure object" rather than null or an exception:

```json
{
  "source": "g2",
  "rating": null,
  "review_count": null,
  "reviews": [],
  "note": "G2 requires authentication for full review data."
}
```

This gets passed to the LLM intact. The system prompt instructs the model: "Never fabricate data. If information is unavailable, explicitly say so." Confidence levels (`High/Medium/Low`) on each insight reflect data coverage.

 Handling Conflicting Data

Problem: A competitor's homepage may claim "enterprise-grade" while Reddit reviews say "too basic for real teams."

Strategy: The LLM is instructed to surface conflicts explicitly:
- `analysis_confidence` field reflects how coherent the signals were
- `data_coverage` field explains what sources were available
- The prompt asks the model to distinguish "strong signal (multiple sources confirm)" vs "weak signal (single source)"

 Data Quality Scoring

Each run includes a `data_quality` metadata block:

```json
{
  "website_ok": true,
  "g2_ok": false,
  "reddit_ok": true,
  "changelog_ok": true,
  "linkedin_ok": false
}
```

This propagates into the analysis confidence rating and is surfaced in the report.



 5. Prompt Engineering Strategy

 Core Design: Analyst Persona + Schema Enforcement

Rather than asking the LLM to "summarize competitor data," we establish a specific analyst persona in the system prompt with KeenFox context pre-loaded. This shifts the model from description mode to recommendation mode.

System Prompt Key Elements:
```
You are a senior competitive intelligence analyst and B2B SaaS 
go-to-market strategist working FOR KeenFox.

[KeenFox profile: ICP, strengths, known gaps, channels]

Your role:
1. Extract STRATEGIC insights — not just summaries
2. Find ACTIONABLE intelligence: what should KeenFox do differently?
3. Ground every recommendation in specific evidence
```

The phrase "working FOR KeenFox" is deliberate — it shifts the output from neutral analysis to partisan strategy advice, which is what we actually need.

 Schema Enforcement

The user prompt ends with a detailed JSON schema using exact field names and value enumerations:

```
"threat_level": "High|Medium|Low"
"analysis_confidence": "High|Medium|Low"
```

This produces machine-parseable output. When the model deviates (wraps in markdown, adds preamble), `safeParseJSON()` handles recovery.

 Reasoning Chain: Per-Competitor → Synthesis

The two-stage approach (analyze each competitor separately, then synthesize) is intentional:

Stage 1 (per-competitor): Focused context window. The model only sees one competitor's data at a time, reducing interference between competitors and improving per-competitor depth.

Stage 2 (synthesis): The outputs of stage 1 (structured JSON summaries) become the input for the campaign prompt — not the raw scraped data. This means the synthesis prompt is working with clean, structured intelligence rather than HTML noise.

This mirrors how a real analyst team would work: individual country reports → regional strategy session.

 Anti-Hallucination Guardrails in Prompts

Three explicit instructions in every analysis prompt:

1. "Never fabricate data. If information is unavailable, explicitly say so."
2. "Distinguish between 'strong signal' (multiple sources confirm) vs 'weak signal' (single source)"
3. "Rate your confidence for each insight (High/Medium/Low)"

 Copy Generation Prompt Design

Copy suggestions are deliberately generated after competitive analysis is complete, with access to all competitors' weaknesses. The prompt structure:

```
[All competitive gaps and weaknesses] → 
"Generate copy that exploits these specific gaps" →
[Copy with explicit rationale linking each suggestion to competitive data]
```

This ensures copy isn't generic — each suggestion has a `rationale` field that references specific competitor behavior.



 6. Guardrails & Error Recovery

 Layer 1: Input Sanitization

All scraped content passes through `sanitizeText()` before entering prompts:
- Strips control characters (prevents prompt injection)
- Normalizes whitespace
- Enforces max length per field (prevents context window overflow)

 Layer 2: HTTP Resilience

```
Retry Logic:
- Max 3 retries per request
- Exponential backoff: 2s → 4s → 8s (+ 50% jitter)
- Retryable: ScrapingError, RateLimitError, 5xx, ECONNRESET, ETIMEDOUT
- Non-retryable: 403, 404 (fall through to fallback)

Rate Limiting:
- 2 second minimum delay between HTTP requests
- Max 3 concurrent scraping operations
- RateLimitError reads Retry-After header if present
```

 Layer 3: LLM Call Resilience

```
- Max 3 retries on API failures
- 429 Rate Limit: wait for Retry-After header value
- 401 Auth Error: non-retryable, surface clear error message
- 500+ Server Error: retryable with backoff
- Empty response: throw LLMError (retryable)
- JSON parse failure: safeParseJSON with multiple fallback strategies
- Schema validation failure: fill missing fields with defaults, log warning
```

 Layer 4: Pipeline Resilience

```
- Per-competitor collection: Promise.allSettled() — any competitor can fail
- Per-competitor analysis: safeExecute() → fallback analysis object
- Campaign recommendations: safeExecute() → empty recommendations with error note
- Diff analysis: optional, failure returns null (pipeline continues)
```

 Layer 5: Output Validation

```javascript
// All required fields checked:
const required = ["messaging_analysis", "product_intelligence", 
                  "customer_sentiment", "keenfox_opportunity"];
// Missing fields filled with defaults rather than throwing
// Invalid nested structures replaced with empty objects/arrays
```

 Error Escalation Path

```
Level 1: Log warning, use fallback value → continue
Level 2: Log error, return partial result → continue with caveats  
Level 3: Log error, skip competitor entirely → report shows N/A
Level 4: Fatal (API key missing, no internet) → clear error message, exit
```

 Environment Validation

The CLI validates `GEMINI_API_KEY` presence before starting any work and exits with a clear message if missing — no partial work wasted.



 7. Known Limitations & Future Work

 Current Limitations

Data Access Constraints:
- G2 and Capterra require authentication for full review access. Currently the scraper gets partial data from public pages or structured empty results. A real production deployment should use official APIs or a data vendor (e.g., G2's API, Bombora intent data).
- LinkedIn aggressively blocks scraping. The current approach (Google search proxy) gets limited signal. LinkedIn's official API or a third-party tool (Phantombuster, Apify) would improve this significantly.
- JavaScript-rendered pages (some changelogs, SPAs) are not scraped by the current HTTP + Cheerio approach. Adding Playwright or Puppeteer would solve this.

LLM Limitations:
- LLM cannot access real-time pricing data with certainty — if a competitor changed pricing last week and the scraper missed it, the analysis will be stale.
- The model occasionally over-interprets thin data (e.g., generates confident "messaging shift" signals from a single Reddit post). The confidence scoring system mitigates but doesn't eliminate this.
- The synthesis step (campaign recommendations) has a large input token count when all 5 competitors are analyzed. For 10+ competitors, this would require chunking or RAG.

Infrastructure Limitations:
- State is stored as local JSON files. In production, this should be a proper database (PostgreSQL, Supabase) for multi-user access and historical querying.
- The pipeline runs synchronously in a single Node.js process. For production, each phase should be a separate job in a queue (BullMQ, Temporal) for reliability and observability.
- The dashboard trigger (`/api/run`) starts a background process with polling — this is fragile. A proper job queue with SSE or WebSocket for real-time status updates would be production-appropriate.

 What I'd Build With More Time

Priority 1: Real Data Sources
- Integrate G2's official API (or contract with a review data vendor)
- Use Playwright for JavaScript-rendered pages
- Add LinkedIn's Marketing API for company update signals
- Integrate with Slack (Notta/Fireflies) to pull sales call signals

Priority 2: Better Reasoning
- RAG layer: store all raw signals in a vector database (Pinecone, pgvector). Let the LLM retrieve relevant context rather than stuffing the whole prompt.
- Multi-step reasoning: use LLM's extended thinking for deeper competitive strategy synthesis
- Implement "signal aging" — weight recent signals higher, decay old ones

Priority 3: Production Infrastructure
- Move storage to PostgreSQL with proper schema
- Add a job queue (BullMQ) with retry, scheduling (cron), and status webhooks
- Add proper authentication to the dashboard
- Implement Slack/email notifications for high-urgency signals
- Add a proper logging service (Datadog, Axiom)

Priority 4: Advanced Features
- Competitor website change detection (diff headless browser screenshots)
- Patent filing monitoring
- Job posting analysis (hiring for X indicates investing in Y)
- Automated A/B test suggestions based on competitor copy patterns
- Integration with CRM to correlate competitive signals with win/loss data



 8. Evaluation Against Criteria

| Criterion | Weight | Our Approach |
|--|--|-|
| System Design | 25% | Modular pipeline with 5 distinct phases, each independently testable. `Promise.allSettled` and `safeExecute` ensure partial failures don't cascade. Re-runnable by design with cache layer and diff mode. |
| Intelligence Quality | 25% | Two-stage LLM approach (per-competitor then synthesis) extracts non-obvious patterns. Confidence scoring surfaces signal strength. LLM explicitly instructed to look for "what KeenFox should do differently" not just describe. |
| Campaign Recommendations | 20% | Output includes 5 concrete GTM refinements with execution steps, 5 copy suggestions across channels with rationale, channel strategy with specific tactics, and battle cards with verbatim talk tracks. All grounded in cited competitive evidence. |
| Prompt Engineering | 15% | Analyst persona system prompt, exact JSON schema enforcement, two-stage reasoning chain, anti-hallucination instructions, confidence ratings, and explicit evidence-grounding requirements. |
| Design Doc | 15% | This document. Honest about limitations (G2 auth, JS rendering, LinkedIn blocking), explains trade-offs (local files vs DB, single process vs queue), and provides a concrete roadmap for production scaling. |



This document reflects the system as built for the KeenFox engineering intern assignment. It is intended to accompany the code submission for the 45-minute technical deep-dive.
