// src/pipeline.js — Main orchestration: collect → analyze → recommend → report

import pLimit from "p-limit";
import { COMPETITORS, SCRAPING_CONFIG } from "./config.js";
import { aggregateCompetitorSignalsWithSeed as aggregateCompetitorSignals } from "./agents/scraper.js";
import { analyzeCompetitor, generateCampaignRecommendations, analyzeDiff } from "./agents/analyzer.js";
import { generateMarkdownReport, generateJSONReport } from "./agents/reporter.js";
import {
  saveState,
  saveReport,
  loadLatestReport,
  cacheCompetitorData,
  loadCompetitorCache,
  generateRunId,
} from "./utils/storage.js";
import { createLogger } from "./utils/logger.js";
import { safeExecute } from "./utils/errors.js";

const log = createLogger("Pipeline");

// ─── Pipeline Configuration ───────────────────────────────────────────────────

const CONCURRENCY_LIMIT = pLimit(SCRAPING_CONFIG.max_concurrent);

// ─── Phase 1: Data Collection ─────────────────────────────────────────────────

async function collectSignals(competitors, useCache = false) {
  log.section("Phase 1: Collecting Competitor Signals");

  const results = await Promise.allSettled(
    competitors.map((competitor) =>
      CONCURRENCY_LIMIT(async () => {
        // Check cache first
        if (useCache) {
          const cached = await loadCompetitorCache(competitor.name);
          if (cached) {
            const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
            const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours
            if (cacheAge < cacheMaxAge) {
              log.info(`Using cached data for ${competitor.name} (${Math.round(cacheAge / 3600000)}h old)`);
              return cached.data;
            }
          }
        }

        const result = await safeExecute(
          () => aggregateCompetitorSignals(competitor),
          {
            competitor_name: competitor.name,
            competitor_id: competitor.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            collected_at: new Date().toISOString(),
            error: "Collection failed",
            data_quality: {
              website_ok: false,
              g2_ok: false,
              reddit_ok: false,
              changelog_ok: false,
              linkedin_ok: false,
            },
          },
          `collect_${competitor.name}`
        );

        const signals = result.data || result;

        // Cache the result
        await cacheCompetitorData(competitor.name, signals);
        return signals;
      })
    )
  );

  const collected = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    log.error(`Collection failed for competitor ${i}: ${r.reason?.message}`);
    return {
      competitor_name: competitors[i].name,
      error: r.reason?.message,
      data_quality: {},
    };
  });

  const successCount = collected.filter((c) => !c.error).length;
  log.success(`Collected signals for ${successCount}/${competitors.length} competitors`);

  return collected;
}

// ─── Phase 2: LLM Analysis ────────────────────────────────────────────────────

async function analyzeSignals(competitors, rawSignalsArray) {
  log.section("Phase 2: Analyzing Competitor Signals with AI");

  const analyses = await Promise.allSettled(
    competitors.map((competitor, i) =>
      CONCURRENCY_LIMIT(async () => {
        const signals = rawSignalsArray[i] || {};
        const result = await analyzeCompetitor(competitor, signals);
        return result;
      })
    )
  );

  const analyzed = analyses.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    log.error(`Analysis failed for ${competitors[i].name}: ${r.reason?.message}`);
    return {
      competitor: competitors[i].name,
      analysis_confidence: "Low",
      error: r.reason?.message,
      signals: [],
      keenfox_opportunity: { exploitable_gaps: [], threat_level: "Unknown" },
      customer_sentiment: { overall_sentiment: "Unknown", top_complaints: [], top_loves: [] },
      messaging_analysis: { primary_positioning: "Unknown" },
      product_intelligence: { gaps_and_weaknesses: [] },
    };
  });

  const successCount = analyzed.filter((a) => !a.error).length;
  log.success(`Analyzed ${successCount}/${competitors.length} competitors`);

  return analyzed;
}

// ─── Phase 3: Campaign Recommendations ───────────────────────────────────────

async function generateRecommendations(analyses) {
  log.section("Phase 3: Generating Campaign Recommendations");

  const result = await safeExecute(
    () => generateCampaignRecommendations(analyses),
    {
      messaging_positioning: {
        current_weaknesses: ["Unable to generate — LLM unavailable"],
        underexploited_angles: [],
        recommended_positioning_shift: "Manual analysis required",
        competitive_differentiators: [],
        copy_suggestions: {},
      },
      channel_strategy: { double_down: [], pull_back: [], new_opportunities: [] },
      gtm_refinements: [],
      market_whitespace: {},
      battle_cards: [],
      confidence_summary: "Low — generation failed",
      data_caveats: ["LLM unavailable for recommendation generation"],
    },
    "campaign_recommendations"
  );

  return result.data || result;
}

// ─── Phase 4: Diff Analysis ───────────────────────────────────────────────────

async function runDiffAnalysis(currentReport) {
  log.section("Phase 4: Diff Analysis vs Previous Run");

  const previousReport = await loadLatestReport();
  if (!previousReport) {
    log.info("No previous report found — skipping diff analysis");
    return null;
  }

  const result = await safeExecute(
    () => analyzeDiff(previousReport, currentReport),
    null,
    "diff_analysis"
  );

  if (result.success && result.data) {
    log.success("Diff analysis complete");
    return result.data;
  }

  return null;
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function runFullPipeline(options = {}) {
  const {
    competitorIds = Object.keys(COMPETITORS),
    useCache = false,
    includeDiff = true,
    outputFormats = ["markdown", "json"],
  } = options;

  const runId = generateRunId();
  const startTime = Date.now();

  log.section(`🦊 KeenFox Competitive Intelligence Pipeline — Run: ${runId}`);
  log.info(`Analyzing ${competitorIds.length} competitors: ${competitorIds.join(", ")}`);

  const competitors = competitorIds.map((id) => COMPETITORS[id]).filter(Boolean);

  if (competitors.length === 0) {
    throw new Error(`No valid competitors found. Available: ${Object.keys(COMPETITORS).join(", ")}`);
  }

  // Phase 1: Collect
  const rawSignals = await collectSignals(competitors, useCache);

  // Phase 2: Analyze
  const analyses = await analyzeSignals(competitors, rawSignals);

  // Phase 3: Recommend
  const recommendations = await generateRecommendations(analyses);

  // Build initial report for diff
  const report = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    duration_seconds: Math.round((Date.now() - startTime) / 1000),
    competitors_analyzed: competitors.map((c) => c.name),
    competitor_analyses: analyses,
    campaign_recommendations: recommendations,
    raw_signals: rawSignals,
    pipeline_metadata: {
      cache_used: useCache,
      data_sources: ["website", "g2", "reddit", "changelog", "linkedin"],
      success_rate: {
        collection: rawSignals.filter((s) => !s.error).length / competitors.length,
        analysis: analyses.filter((a) => !a.error).length / competitors.length,
      },
    },
  };

  // Phase 4: Diff (optional)
  if (includeDiff) {
    const diff = await runDiffAnalysis(report);
    report.diff_analysis = diff;
  }

  // Phase 5: Generate Reports
  log.section("Phase 5: Generating Reports");

  report.markdown = generateMarkdownReport(report);
  const jsonReport = generateJSONReport(report);

  // Save report
  const reportDir = await saveReport(runId, { ...jsonReport, markdown: report.markdown });

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  log.success(`Pipeline complete in ${elapsed}s — Report saved: ${reportDir}`);

  return {
    run_id: runId,
    report_dir: reportDir,
    report: jsonReport,
    markdown: report.markdown,
    elapsed_seconds: elapsed,
  };
}

// ─── Incremental Update ───────────────────────────────────────────────────────

export async function runIncrementalUpdate(options = {}) {
  log.info("Running incremental update using cached data...");
  return runFullPipeline({ ...options, useCache: true, includeDiff: true });
}
