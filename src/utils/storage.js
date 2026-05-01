// src/utils/storage.js — Persistent state management for diff tracking

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log = createLogger("Storage");

const STATE_DIR = path.join(__dirname, "../../outputs/state");
const REPORTS_DIR = path.join(__dirname, "../../outputs/reports");

await fs.ensureDir(STATE_DIR);
await fs.ensureDir(REPORTS_DIR);

// ─── State Persistence ────────────────────────────────────────────────────────

export async function saveState(key, data) {
  const filePath = path.join(STATE_DIR, `${key}.json`);
  await fs.writeJSON(filePath, {
    timestamp: new Date().toISOString(),
    run_id: data.run_id || generateRunId(),
    data,
  }, { spaces: 2 });
  log.debug(`State saved: ${key}`);
}

export async function loadState(key) {
  const filePath = path.join(STATE_DIR, `${key}.json`);
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readJSON(filePath);
    }
    return null;
  } catch (err) {
    log.warn(`Failed to load state for ${key}: ${err.message}`);
    return null;
  }
}

export async function listStates() {
  try {
    const files = await fs.readdir(STATE_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

// ─── Report Persistence ───────────────────────────────────────────────────────

export async function saveReport(runId, reportData) {
  const reportDir = path.join(REPORTS_DIR, runId);
  await fs.ensureDir(reportDir);

  // Save JSON version
  await fs.writeJSON(
    path.join(reportDir, "report.json"),
    reportData,
    { spaces: 2 }
  );

  // Save Markdown version
  if (reportData.markdown) {
    await fs.writeFile(
      path.join(reportDir, "report.md"),
      reportData.markdown,
      "utf-8"
    );
  }

  // Save latest symlink data
  await fs.writeJSON(
    path.join(REPORTS_DIR, "latest.json"),
    { run_id: runId, timestamp: reportData.generated_at, path: reportDir },
    { spaces: 2 }
  );

  log.info(`Report saved: ${reportDir}`);
  return reportDir;
}

export async function loadLatestReport() {
  const latestPath = path.join(REPORTS_DIR, "latest.json");
  if (!(await fs.pathExists(latestPath))) return null;

  const { path: reportDir } = await fs.readJSON(latestPath);
  const reportPath = path.join(reportDir, "report.json");

  if (await fs.pathExists(reportPath)) {
    return await fs.readJSON(reportPath);
  }
  return null;
}

export async function listReports() {
  try {
    const entries = await fs.readdir(REPORTS_DIR, { withFileTypes: true });
    const runs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse(); // newest first

    return runs.slice(0, 10); // last 10 runs
  } catch {
    return [];
  }
}

// ─── Competitor Data Cache ────────────────────────────────────────────────────

export async function cacheCompetitorData(competitorId, rawData) {
  await saveState(`competitor_raw_${competitorId}`, rawData);
}

export async function loadCompetitorCache(competitorId) {
  return loadState(`competitor_raw_${competitorId}`);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function generateRunId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `run_${datePart}_${timePart}_${rand}`;
}
