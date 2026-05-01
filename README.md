🦊 KeenFox Competitive Intelligence System

> AI-powered competitive intelligence and campaign feedback loop for KeenFox's B2B SaaS marketing team.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Gemini](https://img.shields.io/badge/LLM-Gemini%202.5%20Flash-blue)](https://aistudio.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue)]()

---

 What It Does

This system replaces manual competitive research with an automated, AI-powered pipeline that:

1. Aggregates signals across 5 competitors (Notion, Asana, ClickUp, Monday.com, Microsoft 365 Copilot) from 5 data sources (websites, G2 reviews, Reddit, changelogs, LinkedIn)
2. Extracts strategic insights using Gemini — not just summaries, but analysis of what each signal means for KeenFox's positioning
3. Generates campaign recommendations across messaging, channel strategy, GTM refinements, copy suggestions, and battle cards
4. Tracks changes over time with a diff mode that highlights what's new since the last run
5. Answers questions via a natural language query interface against the competitive dataset

---

 Quick Start

 Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/)

 Installation

```bash
 Clone the repo
git clone https://github.com/your-org/keenfox-ci
cd keenfox-ci

 Install dependencies
npm install

 Configure environment
cp .env.example .env
 Edit .env and add your GEMINI_API_KEY
```

 Run the Pipeline

```bash
 Full pipeline run (scrape + analyze + recommend)
npm start run

 Run for specific competitors only
npm start run --competitors notion,asana,clickup

 Use cached scrape data (faster, no re-scraping)
npm start run --cache

 Run incremental update
npm start update
```

 Query the Data

```bash
 Interactive query mode
npm start query

 Single question
npm start query "What are customers complaining about in Asana reviews?"
npm start query "Where is KeenFox most vulnerable to Notion?"
npm start query "Which competitor has the highest churn signals?"
```

 Launch the Dashboard

```bash
npm run dashboard
 Opens at http://localhost:3000
```

 Run Tests

```bash
npm test
```

---

 System Architecture

```
Pipeline: Collect → Analyze → Recommend → Diff → Report

Phase 1: COLLECTION (Parallel across 5 sources)
  Website + Pricing → Cheerio scraper
  G2 Reviews        → Public page scraper
  Reddit            → Reddit JSON API
  Changelog         → Direct scraper
  LinkedIn          → Google search proxy

Phase 2: ANALYSIS (Gemini 2.5 Flash, per competitor)
  Raw signals → Structured intelligence JSON
  Fields: messaging, pricing, sentiment, gaps, threat level

Phase 3: SYNTHESIS (Google Gemini gemini-2.5-flash, cross-competitor)
  All analyses → Campaign recommendations
  Output: copy, channels, GTM, battle cards

Phase 4: DIFF (Optional, Gemini 2.5 Flash)
  Previous report + Current → What changed, urgency rating

Phase 5: REPORTING
  JSON report + Markdown report + Dashboard
```

See [`design_doc.md`](./design_doc.md) for full architecture documentation.

---

 Output

Each run generates:

```
outputs/
├── reports/
│   └── run_YYYYMMDD_HHMMSS_XXXX/
│       ├── report.json      Full structured data
│       └── report.md        Human-readable markdown
├── state/
│   ├── competitor_raw_*.json    Cached scrape data (24h TTL)
│   └── *.json                   Pipeline state
└── sample_report.md             Example output included in repo
```

 Sample Output Structure (JSON)

```json
{
  "run_id": "run_20240115_143022_A7F3",
  "generated_at": "2024-01-15T14:30:22Z",
  "competitor_analyses": [
    {
      "competitor": "Asana",
      "analysis_confidence": "High",
      "messaging_analysis": { "primary_positioning": "...", "key_messages": [] },
      "product_intelligence": { "recent_launches": [], "gaps_and_weaknesses": [] },
      "pricing_intelligence": { "model": "tiered", "price_range": "$0-$30.49/user/mo" },
      "customer_sentiment": { "overall_sentiment": "Mixed", "top_complaints": [] },
      "keenfox_opportunity": { "threat_level": "High", "exploitable_gaps": [] },
      "signals": [{ "type": "pricing_change", "title": "...", "confidence": "High" }]
    }
  ],
  "campaign_recommendations": {
    "messaging_positioning": { "copy_suggestions": { "homepage_headline": {} } },
    "channel_strategy": { "double_down": [], "pull_back": [], "new_opportunities": [] },
    "gtm_refinements": [{ "priority": 1, "recommendation": "..." }],
    "battle_cards": [{ "vs_competitor": "Asana", "talk_track": "..." }]
  },
  "diff_analysis": { "material_changes": [], "urgency": "High" }
}
```

---

 CLI Reference

```
Commands:
  run [options]        Run full competitive intelligence pipeline
  update               Run incremental update (reuses cached scrape data)
  query [question]     Ask a natural language question against competitive data
  list                 List recent intelligence reports
  competitors          List tracked competitors

Options for 'run':
  -c, --competitors <ids>   Comma-separated competitor IDs
                            Default: notion,asana,clickup,monday,microsoft365
  --cache                   Use cached scrape data (skip re-scraping)
  --no-diff                 Skip diff analysis
  --format <fmt>            Output format: markdown|json|both (default: both)
```

---

 Dashboard Features

The web dashboard (`npm run dashboard`) provides:

| Page | Description |
|------|-------------|
| Overview | Threat matrix, stats, top gaps |
| Competitors | Per-competitor drill-down with all intelligence fields |
| Signals | Filterable list of all detected signals |
| Campaign Recs | GTM priorities and channel strategy |
| Copy Suggestions | AI-generated copy for all channels |
| Battle Cards | Sales talk tracks per competitor |
| NL Query | Chat with your competitive data |
| What Changed | Diff analysis vs previous run |

---

 Adding a New Competitor

1. Add competitor config to `src/config.js`:

```javascript
export const COMPETITORS = {
  // ... existing competitors
  linear: {
    name: "Linear",
    website: "https://linear.app",
    pricing_url: "https://linear.app/pricing",
    g2_slug: "linear",
    capterra_slug: "linear-app",
    reddit_queries: ["linear app review", "linear vs asana", "linear problems"],
    linkedin_query: "Linear app site:linkedin.com/company",
    changelog_url: "https://linear.app/changelog",
    category: "Issue tracking / project management",
    primary_icp: "Engineering teams",
  },
};
```

2. Run: `npm start run --competitors linear`

---

 Guardrails & Error Handling

The system is designed for resilience:

- Scraping failures: Each data source fails independently. Partial data produces partial insights with flagged confidence levels.
- LLM failures: Retry with exponential backoff (3 attempts). Falls back to a structured "unavailable" response rather than crashing.
- Rate limiting: Respects `Retry-After` headers from both web servers and the gemini API.
- JSON parsing: Multiple fallback strategies (strip markdown fences, extract from mixed text).
- Input sanitization: All scraped content is sanitized before entering LLM prompts (prevents prompt injection, enforces length limits).
- Schema validation: LLM output is validated; missing fields are filled with defaults rather than throwing.

See [`src/utils/errors.js`](./src/utils/errors.js) for the full error handling implementation.

---

 Known Limitations

- G2/Capterra: Full review data requires API authentication. The scraper gets partial data from public pages. For production, use the official G2 API or a data vendor.
- LinkedIn: Blocks scraping. Current approach uses Google search proxy for signals. LinkedIn's Marketing API would improve this.
- JavaScript-rendered pages: Some changelogs are SPAs. Add Playwright/Puppeteer for full JS rendering support.
- Storage: Local JSON files. Production should use a proper database (PostgreSQL).
- Scheduling: No built-in cron. Use `node-cron` or a process manager for automated runs.

See [`design_doc.md`](./design_doc.md) for the full limitations analysis and roadmap.

---

 Project Structure

```
keenfox-ci/
├── src/
│   ├── index.js               CLI entry point
│   ├── pipeline.js            Main orchestrator
│   ├── config.js              Competitor configs, LLM settings
│   ├── agents/
│   │   ├── scraper.js         Web scraping (5 sources)
│   │   ├── analyzer.js        LLM analysis (gemini SDK)
│   │   └── reporter.js        Report generation
│   ├── prompts/
│   │   └── intelligence.js    All LLM prompts
│   └── utils/
│       ├── logger.js          Structured logging
│       ├── errors.js          Custom errors, retry logic
│       └── storage.js         File-based persistence
├── dashboard/
│   ├── server.js              Express API server
│   └── public/
│       └── index.html         Single-page dashboard
├── tests/
│   └── test_pipeline.js       Test suite
├── outputs/
│   └── sample_report.md       Example output
├── design_doc.md              Full technical design document
├── package.json
├── .env.example
└── README.md
```

---

 License

MIT
