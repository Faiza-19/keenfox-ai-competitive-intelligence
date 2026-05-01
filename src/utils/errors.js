// src/utils/errors.js — Custom error types and resilient retry logic

import { createLogger } from "./logger.js";
const log = createLogger("ErrorHandler");

// ─── Custom Error Types ───────────────────────────────────────────────────────

export class ScrapingError extends Error {
  constructor(message, url, statusCode = null) {
    super(message);
    this.name = "ScrapingError";
    this.url = url;
    this.statusCode = statusCode;
  }
}

export class LLMError extends Error {
  constructor(message, prompt = null, cause = null) {
    super(message);
    this.name = "LLMError";
    this.prompt = prompt;
    this.cause = cause;
  }
}

export class DataValidationError extends Error {
  constructor(message, data = null) {
    super(message);
    this.name = "DataValidationError";
    this.data = data;
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfterMs = 60000) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Retry Logic ─────────────────────────────────────────────────────────────

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [ScrapingError, RateLimitError],
  onRetry: null,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(attempt, options) {
  const { baseDelayMs, maxDelayMs, backoffMultiplier, jitter } = options;
  let delay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
  delay = Math.min(delay, maxDelayMs);
  if (jitter) delay = delay * (0.5 + Math.random() * 0.5);
  return Math.floor(delay);
}

export async function withRetry(fn, options = {}) {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (err instanceof RateLimitError) {
        const waitMs = err.retryAfterMs || calculateDelay(attempt, opts);
        log.warn(`Rate limited. Waiting ${waitMs}ms before retry ${attempt + 1}/${opts.maxRetries}`);
        await sleep(waitMs);
        continue;
      }

      const isRetryable =
        opts.retryableErrors.some((ErrClass) => err instanceof ErrClass) ||
        (err.response?.status >= 500) ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.message?.includes("timeout");

      if (!isRetryable || attempt === opts.maxRetries) throw err;

      const delay = calculateDelay(attempt, opts);
      log.warn(`Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
      if (opts.onRetry) opts.onRetry(err, attempt + 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

// ─── Safe Executor ────────────────────────────────────────────────────────────

export async function safeExecute(fn, fallback = null, context = "unknown") {
  try {
    const result = await fn();
    return { success: true, data: result, error: null };
  } catch (err) {
    log.warn(`[${context}] Failed safely: ${err.message}`);
    return { success: false, data: fallback, error: err.message };
  }
}

// ─── JSON Parser with Gemini-specific handling ────────────────────────────────

export function safeParseJSON(text, fallback = null) {
  if (!text) return fallback;

  // Strategy 1: Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Strategy 2: Strip markdown code fences (```json ... ``` or ``` ... ```)
  try {
    const stripped = text
      .replace(/^```json\s*/im, "")
      .replace(/^```\s*/im, "")
      .replace(/```\s*$/im, "")
      .trim();
    return JSON.parse(stripped);
  } catch (_) {}

  // Strategy 3: Find the LARGEST JSON object in the text
  // Gemini sometimes adds preamble like "Here is the analysis:" before the JSON
  try {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = text.slice(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
    }
  } catch (_) {}

  // Strategy 4: Find JSON array
  try {
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const extracted = text.slice(firstBracket, lastBracket + 1);
      return JSON.parse(extracted);
    }
  } catch (_) {}

  // Strategy 5: Fix common Gemini JSON issues
  try {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      let json = text.slice(firstBrace, lastBrace + 1);
      // Fix trailing commas before } or ]
      json = json.replace(/,\s*([}\]])/g, "$1");
      // Fix single quotes used instead of double quotes
      json = json.replace(/'/g, '"');
      // Fix unquoted keys
      json = json.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      return JSON.parse(json);
    }
  } catch (_) {}

  log.warn("safeParseJSON: all strategies failed, returning fallback");
  return fallback;
}

// ─── Input Sanitizer ─────────────────────────────────────────────────────────

export function sanitizeText(text, maxLength = 50000) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// ─── Timeout Wrapper ─────────────────────────────────────────────────────────

export function withTimeout(promise, ms, errorMsg = "Operation timed out") {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${errorMsg} (${ms}ms)`)), ms)
  );
  return Promise.race([promise, timer]);
}
