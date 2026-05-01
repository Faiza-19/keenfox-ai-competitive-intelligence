// src/utils/logger.js — Structured logging with levels and file output

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const COLORS = {
  DEBUG: "\x1b[36m",  // Cyan
  INFO: "\x1b[32m",   // Green
  WARN: "\x1b[33m",   // Yellow
  ERROR: "\x1b[31m",  // Red
  RESET: "\x1b[0m",
  DIM: "\x1b[2m",
  BOLD: "\x1b[1m",
};

class Logger {
  constructor(name, level = "INFO") {
    this.name = name;
    this.level = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
    this.logFile = path.join(__dirname, "../../outputs/run.log");
    this._ensureLogDir();
  }

  _ensureLogDir() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _write(level, msg, data = null) {
    if (LOG_LEVELS[level] < this.level) return;
    const ts = new Date().toISOString();
    const prefix = `[${ts}] [${level}] [${this.name}]`;
    const line = data ? `${prefix} ${msg} ${JSON.stringify(data)}` : `${prefix} ${msg}`;
    
    // Console output with colors
    const color = COLORS[level] || COLORS.RESET;
    const consoleMsg = data 
      ? `${color}${prefix}${COLORS.RESET} ${msg} ${COLORS.DIM}${JSON.stringify(data, null, 0)}${COLORS.RESET}`
      : `${color}${prefix}${COLORS.RESET} ${msg}`;
    console.log(consoleMsg);
    
    // File output
    try {
      fs.appendFileSync(this.logFile, line + "\n");
    } catch (_) { /* non-fatal */ }
  }

  debug(msg, data) { this._write("DEBUG", msg, data); }
  info(msg, data) { this._write("INFO", msg, data); }
  warn(msg, data) { this._write("WARN", msg, data); }
  error(msg, data) { this._write("ERROR", msg, data); }

  section(title) {
    const line = "─".repeat(60);
    console.log(`\n${COLORS.BOLD}${line}\n  ${title}\n${line}${COLORS.RESET}\n`);
  }

  success(msg) {
    console.log(`${COLORS.INFO}✓${COLORS.RESET} ${COLORS.BOLD}${msg}${COLORS.RESET}`);
  }

  progress(msg) {
    process.stdout.write(`${COLORS.DIM}⟳ ${msg}...${COLORS.RESET}\r`);
  }
}

export const createLogger = (name) => new Logger(name, process.env.LOG_LEVEL || "INFO");
export default Logger;
