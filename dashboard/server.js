// dashboard/server.js — Express server for the competitive intelligence dashboard

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { loadLatestReport, listReports } from "../src/utils/storage.js";
import { queryCompetitiveData } from "../src/agents/analyzer.js";
import { runFullPipeline } from "../src/pipeline.js";
import { createLogger } from "../src/utils/logger.js";
import fs from "fs-extra";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log = createLogger("Dashboard");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── API Routes ───────────────────────────────────────────────────────────────

// Get latest report
app.get("/api/report/latest", async (req, res) => {
  try {
    const report = await loadLatestReport();
    if (!report) {
      return res.status(404).json({ error: "No reports found. Run the pipeline first." });
    }
    res.json(report);
  } catch (err) {
    log.error(`GET /api/report/latest: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// List all reports
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await listReports();
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific report
app.get("/api/report/:runId", async (req, res) => {
  try {
    const reportPath = path.join(__dirname, "../outputs/reports", req.params.runId, "report.json");
    if (!(await fs.pathExists(reportPath))) {
      return res.status(404).json({ error: "Report not found" });
    }
    const report = await fs.readJSON(reportPath);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Natural language query
app.post("/api/query", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return res.status(400).json({ error: "Valid question required (min 3 chars)" });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: "Question too long (max 500 chars)" });
    }

    const report = await loadLatestReport();
    if (!report) {
      return res.status(404).json({ error: "No report data. Run the pipeline first." });
    }

    const answer = await queryCompetitiveData(question.trim(), report);
    res.json({ question, answer, report_timestamp: report.generated_at });
  } catch (err) {
    log.error(`POST /api/query: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Trigger pipeline run
app.post("/api/run", async (req, res) => {
  try {
    const { competitors, useCache } = req.body;

    // Validate competitors list
    const { COMPETITORS } = await import("../src/config.js");
    const validIds = Object.keys(COMPETITORS);
    const requestedIds = Array.isArray(competitors) ? competitors : validIds;
    const invalidIds = requestedIds.filter((id) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: `Invalid competitor IDs: ${invalidIds.join(", ")}`,
        valid_ids: validIds,
      });
    }

    // Start pipeline async
    res.json({
      status: "started",
      message: "Pipeline started. Check /api/report/latest after completion.",
      competitors: requestedIds,
    });

    // Run in background
    runFullPipeline({
      competitorIds: requestedIds,
      useCache: useCache === true,
    }).catch((err) => log.error(`Background pipeline failed: ${err.message}`));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    llm_provider: "Gemini",
    llm_configured: !!process.env.GEMINI_API_KEY,
  });
});
// ─── Serve Dashboard ──────────────────────────────────────────────────────────

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.DASHBOARD_PORT) || 3000;
const HOST = process.env.DASHBOARD_HOST || "localhost";

app.listen(PORT, HOST, () => {
  log.success(`Dashboard running at http://${HOST}:${PORT}`);
  console.log(`\n🦊 KeenFox Dashboard: http://${HOST}:${PORT}\n`);
});

export default app;
