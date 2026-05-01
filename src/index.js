#!/usr/bin/env node
// src/index.js — CLI entry point for KeenFox Competitive Intelligence System

import "dotenv/config";
import { program } from "commander";
import chalk from "chalk";
import { runFullPipeline, runIncrementalUpdate } from "./pipeline.js";
import { queryCompetitiveData } from "./agents/analyzer.js";
import { loadLatestReport, listReports } from "./utils/storage.js";
import { createLogger } from "./utils/logger.js";
import { COMPETITORS } from "./config.js";
import readline from "readline";

const log = createLogger("CLI");

// ─── CLI Banner ───────────────────────────────────────────────────────────────

function printBanner() {
  console.log(chalk.hex("#FF6B35").bold(`
╔═══════════════════════════════════════════════════════════╗
║   🦊  KeenFox Competitive Intelligence Engine  v1.0       ║
║       AI-Powered · B2B SaaS · Campaign Feedback Loop      ║
╚═══════════════════════════════════════════════════════════╝
`));
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEnvironment() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(chalk.red("\n❌ Error: ANTHROPIC_API_KEY is not set."));
    console.error(chalk.yellow("   Copy .env.example to .env and add your API key.\n"));
    process.exit(1);
  }
  log.info("Environment validated ✓");
}

// ─── Commands ─────────────────────────────────────────────────────────────────

program
  .name("keenfox-ci")
  .description("KeenFox Competitive Intelligence & Campaign Feedback System")
  .version("1.0.0");

// Full pipeline run
program
  .command("run")
  .description("Run full competitive intelligence pipeline")
  .option("-c, --competitors <ids>", "Comma-separated competitor IDs", Object.keys(COMPETITORS).join(","))
  .option("--cache", "Use cached scrape data (skips re-scraping)", false)
  .option("--no-diff", "Skip diff analysis against previous run")
  .option("--format <fmt>", "Output format: markdown|json|both", "both")
  .action(async (opts) => {
    printBanner();
    validateEnvironment();

    const competitorIds = opts.competitors.split(",").map((s) => s.trim());
    const invalidIds = competitorIds.filter((id) => !COMPETITORS[id]);
    if (invalidIds.length > 0) {
      console.error(chalk.red(`\n❌ Unknown competitor IDs: ${invalidIds.join(", ")}`));
      console.error(chalk.yellow(`   Available: ${Object.keys(COMPETITORS).join(", ")}\n`));
      process.exit(1);
    }

    try {
      const result = await runFullPipeline({
        competitorIds,
        useCache: opts.cache,
        includeDiff: opts.diff,
        outputFormats: opts.format === "both" ? ["markdown", "json"] : [opts.format],
      });

      console.log(chalk.green.bold(`\n✅ Pipeline complete!`));
      console.log(chalk.white(`   Run ID:     ${result.run_id}`));
      console.log(chalk.white(`   Report:     ${result.report_dir}`));
      console.log(chalk.white(`   Duration:   ${result.elapsed_seconds}s`));
      console.log(chalk.yellow(`\n📄 Reports saved to: ${result.report_dir}\n`));
    } catch (err) {
      console.error(chalk.red(`\n❌ Pipeline failed: ${err.message}`));
      if (process.env.LOG_LEVEL === "DEBUG") {
        console.error(err.stack);
      }
      process.exit(1);
    }
  });

// Incremental update
program
  .command("update")
  .description("Run incremental update (reuses cached scrape data, re-runs AI analysis)")
  .action(async () => {
    printBanner();
    validateEnvironment();

    try {
      const result = await runIncrementalUpdate();
      console.log(chalk.green.bold(`\n✅ Update complete! Run ID: ${result.run_id}`));
      console.log(chalk.white(`   Report: ${result.report_dir}\n`));
    } catch (err) {
      console.error(chalk.red(`\n❌ Update failed: ${err.message}`));
      process.exit(1);
    }
  });

// Interactive query
program
  .command("query [question]")
  .description("Ask a natural language question against the latest competitive data")
  .action(async (question) => {
    printBanner();
    validateEnvironment();

    const report = await loadLatestReport();
    if (!report) {
      console.error(chalk.red("\n❌ No reports found. Run 'keenfox-ci run' first.\n"));
      process.exit(1);
    }

    if (!question) {
      // Interactive mode
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      console.log(chalk.cyan(`\n📊 Loaded report from: ${report.generated_at}`));
      console.log(chalk.gray("Type your question and press Enter. Type 'exit' to quit.\n"));

      const ask = () => {
        rl.question(chalk.yellow("❓ Query: "), async (q) => {
          if (q.toLowerCase() === "exit") {
            rl.close();
            return;
          }
          if (!q.trim()) {
            ask();
            return;
          }
          try {
            console.log(chalk.gray("\n⟳ Analyzing...\n"));
            const answer = await queryCompetitiveData(q, report);
            console.log(chalk.white("\n" + answer + "\n"));
            console.log(chalk.gray(hr()));
          } catch (err) {
            console.error(chalk.red(`Error: ${err.message}`));
          }
          ask();
        });
      };
      ask();
    } else {
      try {
        const answer = await queryCompetitiveData(question, report);
        console.log("\n" + answer + "\n");
      } catch (err) {
        console.error(chalk.red(`\n❌ Query failed: ${err.message}`));
        process.exit(1);
      }
    }
  });

// List reports
program
  .command("list")
  .description("List recent intelligence reports")
  .action(async () => {
    const reports = await listReports();
    if (reports.length === 0) {
      console.log(chalk.yellow("\nNo reports found. Run the pipeline first.\n"));
      return;
    }
    console.log(chalk.bold("\n📋 Recent Reports:\n"));
    reports.forEach((r, i) => {
      console.log(chalk.white(`  ${i + 1}. ${r}`));
    });
    console.log("");
  });

// Competitor list
program
  .command("competitors")
  .description("List tracked competitors")
  .action(() => {
    console.log(chalk.bold("\n🏢 Tracked Competitors:\n"));
    Object.entries(COMPETITORS).forEach(([id, c]) => {
      console.log(chalk.white(`  ${id.padEnd(15)} → ${c.name} (${c.category})`));
    });
    console.log("");
  });

function hr() {
  return "─".repeat(60);
}

// ─── Default: help ────────────────────────────────────────────────────────────

if (process.argv.length <= 2) {
  printBanner();
  program.help();
}

program.parse(process.argv);
