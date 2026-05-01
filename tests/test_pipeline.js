// tests/test_pipeline.js — Test suite for the KeenFox CI system

import "dotenv/config";
import { safeParseJSON, sanitizeText, withRetry, ScrapingError } from "../src/utils/errors.js";
import { generateRunId } from "../src/utils/storage.js";
import { generateMarkdownReport } from "../src/agents/reporter.js";
import { COMPETITORS } from "../src/config.js";
import chalk from "chalk";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(chalk.green(`  ✓ ${name}`));
    passed++;
  } catch (e) {
    console.log(chalk.red(`  ✗ ${name}: ${e.message}`));
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(chalk.green(`  ✓ ${name}`));
    passed++;
  } catch (e) {
    console.log(chalk.red(`  ✗ ${name}: ${e.message}`));
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

console.log(chalk.bold("\n🧪 KeenFox CI Test Suite\n"));

// ─── Config Tests ─────────────────────────────────────────────────────────────
console.log(chalk.bold("Config & Setup:"));

test("COMPETITORS has required fields", () => {
  const required = ["name", "website", "pricing_url", "g2_slug", "reddit_queries", "changelog_url"];
  for (const [id, comp] of Object.entries(COMPETITORS)) {
    for (const field of required) {
      assert(comp[field], `${id} missing ${field}`);
    }
    assert(Array.isArray(comp.reddit_queries), `${id}.reddit_queries should be array`);
  }
});

test("At least 4 competitors configured", () => {
  assert(Object.keys(COMPETITORS).length >= 4, "Need at least 4 competitors");
});

test("Run ID generation", () => {
  const id = generateRunId();
  assert(typeof id === "string", "Run ID should be a string");
  assert(id.startsWith("run_"), "Run ID should start with run_");
  assert(id.length > 10, "Run ID should be reasonably long");
});

// ─── Error Handling Tests ─────────────────────────────────────────────────────
console.log(chalk.bold("\nError Handling:"));

test("safeParseJSON — valid JSON", () => {
  const result = safeParseJSON('{"a": 1}');
  assert(result?.a === 1, "Should parse valid JSON");
});

test("safeParseJSON — JSON with markdown fences", () => {
  const result = safeParseJSON("```json\n{\"a\": 1}\n```");
  assert(result?.a === 1, "Should strip markdown fences");
});

test("safeParseJSON — invalid JSON returns fallback", () => {
  const result = safeParseJSON("not json", { fallback: true });
  assert(result?.fallback === true, "Should return fallback on invalid JSON");
});

test("safeParseJSON — extracts JSON from mixed text", () => {
  const result = safeParseJSON('Here is the result: {"status": "ok"} and more text');
  assert(result?.status === "ok", "Should extract JSON from mixed text");
});

test("sanitizeText — removes control characters", () => {
  const result = sanitizeText("hello\x00world\x1F!");
  assert(!result.includes("\x00"), "Should remove null bytes");
});

test("sanitizeText — truncates to max length", () => {
  const long = "a".repeat(100000);
  const result = sanitizeText(long, 1000);
  assert(result.length <= 1000, "Should truncate");
});

test("sanitizeText — handles null/undefined", () => {
  assert(sanitizeText(null) === "", "null returns empty string");
  assert(sanitizeText(undefined) === "", "undefined returns empty string");
});

await asyncTest("withRetry — succeeds on first try", async () => {
  let calls = 0;
  const result = await withRetry(() => {
    calls++;
    return Promise.resolve("success");
  });
  assert(result === "success", "Should return success");
  assert(calls === 1, "Should only call once");
});

await asyncTest("withRetry — retries on retryable error", async () => {
  let calls = 0;
  const result = await withRetry(
    () => {
      calls++;
      if (calls < 3) throw new ScrapingError("temp error", "http://example.com");
      return Promise.resolve("success");
    },
    { maxRetries: 3, baseDelayMs: 10, retryableErrors: [ScrapingError] }
  );
  assert(result === "success", "Should eventually succeed");
  assert(calls === 3, "Should have retried twice");
});

await asyncTest("withRetry — throws after max retries", async () => {
  let threw = false;
  await withRetry(
    () => { throw new ScrapingError("always fails", "http://example.com"); },
    { maxRetries: 2, baseDelayMs: 10, retryableErrors: [ScrapingError] }
  ).catch(() => { threw = true; });
  assert(threw, "Should throw after max retries");
});

// ─── Reporter Tests ───────────────────────────────────────────────────────────
console.log(chalk.bold("\nReporter:"));

test("generateMarkdownReport — produces valid markdown", () => {
  const mockReport = {
    run_id: "run_test_123",
    generated_at: new Date().toISOString(),
    competitors_analyzed: ["Notion", "Asana"],
    competitor_analyses: [
      {
        competitor: "Notion",
        analysis_confidence: "Medium",
        data_coverage: "Partial",
        messaging_analysis: {
          primary_positioning: "All-in-one workspace",
          key_messages: ["Flexibility", "Templates"],
          tone: "Startup-casual",
          icp_targeting: "Knowledge workers",
          notable_shifts: "None",
        },
        product_intelligence: {
          recent_launches: ["AI features"],
          strategic_bets: ["AI"],
          gaps_and_weaknesses: ["Complex setup"],
          ai_investment_level: "High",
        },
        pricing_intelligence: {
          model: "freemium",
          free_tier: true,
          price_range: "$0-$16/user/month",
          packaging_notes: "Free tier generous",
          recent_changes: "None",
        },
        customer_sentiment: {
          overall_sentiment: "Mixed",
          net_promoter_proxy: "Medium",
          top_loves: ["Flexibility"],
          top_complaints: ["Learning curve"],
          churn_signals: ["Too complex"],
          key_quotes: [],
        },
        keenfox_opportunity: {
          exploitable_gaps: ["Onboarding complexity"],
          threat_level: "Medium",
          threat_rationale: "Strong brand but complex",
          win_conditions: ["Simpler setup"],
          loss_conditions: ["Deep integrations"],
        },
        signals: [
          {
            type: "feature_launch",
            title: "AI features launch",
            detail: "Launched AI writing assistant",
            confidence: "High",
            source: "changelog",
          },
        ],
      },
    ],
    campaign_recommendations: {
      messaging_positioning: {
        current_weaknesses: ["Low brand awareness"],
        underexploited_angles: ["Setup speed"],
        recommended_positioning_shift: "Focus on 5-minute setup",
        competitive_differentiators: ["Fast onboarding"],
        copy_suggestions: {
          homepage_headline: {
            recommended: "Get your team productive in 5 minutes",
            rationale: "Exploits Notion complexity gap",
          },
        },
      },
      channel_strategy: { double_down: [], pull_back: [], new_opportunities: [] },
      gtm_refinements: [
        {
          priority: 1,
          recommendation: "Lead with onboarding speed",
          rationale: "Competitors are complex",
          execution: "Update homepage hero",
          expected_impact: "Higher conversion",
          timeline: "Immediate (0-30d)",
          competitors_this_addresses: ["Notion", "ClickUp"],
        },
      ],
      market_whitespace: {},
      battle_cards: [],
    },
    diff_analysis: null,
  };

  const markdown = generateMarkdownReport(mockReport);
  assert(typeof markdown === "string", "Should return a string");
  assert(markdown.includes("KeenFox"), "Should include brand name");
  assert(markdown.includes("Notion"), "Should include competitor name");
  assert(markdown.includes("run_test_123"), "Should include run ID");
  assert(markdown.length > 500, "Should produce substantial output");
});

// ─── Results ──────────────────────────────────────────────────────────────────
console.log(`\n${chalk.bold("Results:")} ${chalk.green(`${passed} passed`)} · ${failed > 0 ? chalk.red(`${failed} failed`) : chalk.gray("0 failed")}\n`);

if (failed > 0) process.exit(1);
