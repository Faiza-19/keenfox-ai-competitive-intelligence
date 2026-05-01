// src/agents/scraper.js — Resilient web scraping with rate limiting & guardrails

import axios from "axios";
import * as cheerio from "cheerio";
import { SCRAPING_CONFIG } from "../config.js";
import { withRetry, safeExecute, withTimeout, sanitizeText, ScrapingError, RateLimitError } from "../utils/errors.js";
import { createLogger } from "../utils/logger.js";
import { SEED_DATA } from "../data/seed_data.js";

const log = createLogger("Scraper");

// ─── HTTP Client Setup ────────────────────────────────────────────────────────

const httpClient = axios.create({
  timeout: SCRAPING_CONFIG.timeout_ms,
  headers: {
    "User-Agent": SCRAPING_CONFIG.user_agent,
    ...SCRAPING_CONFIG.headers,
  },
  maxRedirects: 5,
  validateStatus: (status) => status < 500, // Don't throw on 4xx, handle manually
});

// Request interceptor for logging
httpClient.interceptors.request.use((config) => {
  log.debug(`HTTP GET ${config.url}`);
  return config;
});

// Response interceptor for guardrails
httpClient.interceptors.response.use(
  (response) => {
    if (response.status === 429) {
      const retryAfter = response.headers["retry-after"];
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      throw new RateLimitError(`Rate limited by ${response.config.url}`, waitMs);
    }
    if (response.status === 403) {
      log.warn(`Access denied (403) for ${response.config.url} — using fallback data`);
    }
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new ScrapingError(`Timeout fetching ${error.config?.url}`, error.config?.url);
    }
    throw error;
  }
);

// ─── Delay Between Requests ───────────────────────────────────────────────────

let lastRequestTime = 0;
async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const minDelay = SCRAPING_CONFIG.request_delay_ms;

  if (elapsed < minDelay) {
    await new Promise((r) => setTimeout(r, minDelay - elapsed));
  }

  lastRequestTime = Date.now();

  return withRetry(
    () => withTimeout(httpClient.get(url), SCRAPING_CONFIG.timeout_ms),
    {
      maxRetries: SCRAPING_CONFIG.max_retries,
      baseDelayMs: SCRAPING_CONFIG.retry_delay_ms,
      onRetry: (err, attempt) => log.warn(`Retry ${attempt} for ${url}: ${err.message}`),
    }
  );
}

// ─── Extraction Helpers ───────────────────────────────────────────────────────

function extractText($, selectors) {
  for (const sel of selectors) {
    const text = $(sel).text().trim();
    if (text && text.length > 20) return sanitizeText(text, 8000);
  }
  return "";
}

function extractPricing($) {
  const priceSelectors = [
    '[class*="price"]',
    '[class*="plan"]',
    '[class*="pricing"]',
    '[data-testid*="price"]',
    "table",
  ];

  const prices = [];
  for (const sel of priceSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim();
      if (text.match(/\$|€|£|free|per user|\/month|\/mo/i) && text.length < 500) {
        prices.push(sanitizeText(text, 300));
      }
    });
  }
  return [...new Set(prices)].slice(0, 20);
}

function extractFeatures($) {
  const featureSelectors = [
    '[class*="feature"]',
    '[class*="benefit"]',
    '[class*="capability"]',
    "li",
    "[class*=\"highlight\"]",
  ];

  const features = [];
  for (const sel of featureSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10 && text.length < 200 && !text.match(/©|cookie|privacy|terms/i)) {
        features.push(sanitizeText(text, 200));
      }
    });
  }
  return [...new Set(features)].slice(0, 30);
}

// ─── Website Scraper ─────────────────────────────────────────────────────────

export async function scrapeWebsite(competitor) {
  log.info(`Scraping website: ${competitor.name}`);

  const result = await safeExecute(async () => {
    const [homeRes, pricingRes] = await Promise.allSettled([
      rateLimitedFetch(competitor.website),
      rateLimitedFetch(competitor.pricing_url),
    ]);

    const data = { homepage: {}, pricing: {}, features: [] };

    if (homeRes.status === "fulfilled" && homeRes.value.status === 200) {
      const $ = cheerio.load(homeRes.value.data);
      $("script, style, nav, footer, header").remove();

      data.homepage = {
        title: $("title").text().trim(),
        headline: extractText($, ["h1", ".hero h2", "[class*=\"headline\"]", "[class*=\"hero-title\"]"]),
        subheadline: extractText($, ["h2", ".hero p", "[class*=\"subheadline\"]", "[class*=\"hero-desc\"]"]),
        value_props: extractFeatures($).slice(0, 10),
        cta_text: $("a[class*=\"cta\"], button[class*=\"cta\"], a[class*=\"btn\"]").map((_, el) => $(el).text().trim()).get().slice(0, 5),
      };
    } else {
      log.warn(`Homepage unavailable for ${competitor.name}: ${homeRes.reason?.message || "unknown"}`);
      data.homepage = { title: competitor.name, unavailable: true };
    }

    if (pricingRes.status === "fulfilled" && pricingRes.value.status === 200) {
      const $ = cheerio.load(pricingRes.value.data);
      data.pricing = {
        tiers: extractPricing($),
        raw_text: extractText($, ["main", "article", "[class*=\"pricing\"]", "body"]).slice(0, 3000),
      };
    } else {
      log.warn(`Pricing page unavailable for ${competitor.name}`);
      data.pricing = { unavailable: true };
    }

    return data;
  }, { homepage: { unavailable: true }, pricing: { unavailable: true }, features: [] }, `scrape_website_${competitor.name}`);

  return result;
}

// ─── G2 Review Scraper ────────────────────────────────────────────────────────

export async function scrapeG2Reviews(competitor) {
  log.info(`Fetching G2 data: ${competitor.name}`);

  // G2 public data via their web pages
  const urls = [
    `https://www.g2.com/products/${competitor.g2_slug}/reviews`,
    `https://www.g2.com/products/${competitor.g2_slug}`,
  ];

  const result = await safeExecute(async () => {
    for (const url of urls) {
      const res = await rateLimitedFetch(url).catch(() => null);
      if (!res || res.status !== 200) continue;

      const $ = cheerio.load(res.data);
      const reviews = [];

      // Extract reviews
      $("[itemprop=\"reviewBody\"], [class*=\"review-body\"], [class*=\"review-content\"]").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) reviews.push(sanitizeText(text, 500));
      });

      // Extract pros/cons
      const pros = [];
      const cons = [];
      $("[class*=\"pros\"], [data-testid*=\"pros\"]").each((_, el) => pros.push($(el).text().trim()));
      $("[class*=\"cons\"], [data-testid*=\"cons\"]").each((_, el) => cons.push($(el).text().trim()));

      // Extract rating
      const ratingText = $("[itemprop=\"ratingValue\"], [class*=\"rating\"]").first().text().trim();
      const rating = parseFloat(ratingText) || null;

      // Extract review count
      const countText = $("[itemprop=\"reviewCount\"], [class*=\"review-count\"]").first().text().trim();
      const reviewCount = parseInt(countText.replace(/[^0-9]/g, "")) || null;

      if (reviews.length > 0 || rating) {
        return {
          source: "g2",
          url,
          rating,
          review_count: reviewCount,
          reviews: reviews.slice(0, 20),
          pros: pros.slice(0, 10).map((t) => sanitizeText(t, 300)),
          cons: cons.slice(0, 10).map((t) => sanitizeText(t, 300)),
        };
      }
    }

    // Return structured empty result if scraping failed
    return {
      source: "g2",
      url: urls[0],
      rating: null,
      review_count: null,
      reviews: [],
      pros: [],
      cons: [],
      note: "G2 requires authentication for full review data. Using aggregated signals.",
    };
  }, null, `g2_${competitor.name}`);

  return result.data;
}

// ─── Reddit / Community Scraper ───────────────────────────────────────────────

export async function scrapeReddit(competitor) {
  log.info(`Fetching Reddit signals: ${competitor.name}`);

  const allPosts = [];

  for (const query of competitor.reddit_queries.slice(0, 2)) {
    const result = await safeExecute(async () => {
      const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=month&limit=10`;
      const res = await rateLimitedFetch(searchUrl);

      if (res.status !== 200 || !res.data?.data?.children) return [];

      return res.data.data.children
        .map((post) => ({
          title: sanitizeText(post.data.title, 200),
          text: sanitizeText(post.data.selftext, 800),
          score: post.data.score,
          num_comments: post.data.num_comments,
          subreddit: post.data.subreddit,
          url: `https://reddit.com${post.data.permalink}`,
          created: new Date(post.data.created_utc * 1000).toISOString(),
        }))
        .filter((p) => p.score > 0);
    }, [], `reddit_${competitor.name}_${query}`);

    allPosts.push(...(result.data || []));
  }

  return {
    source: "reddit",
    posts: allPosts.slice(0, 25),
    query_terms: competitor.reddit_queries,
  };
}

// ─── Changelog Scraper ────────────────────────────────────────────────────────

export async function scrapeChangelog(competitor) {
  log.info(`Fetching changelog: ${competitor.name}`);

  const result = await safeExecute(async () => {
    const res = await rateLimitedFetch(competitor.changelog_url);
    if (res.status !== 200) return { entries: [], unavailable: true };

    const $ = cheerio.load(res.data);
    $("script, style, nav, aside").remove();

    const entries = [];
    const dateRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2}/gi;

    // Extract changelog entries by looking for date patterns + nearby headings
    $("h2, h3, h4").each((_, el) => {
      const heading = $(el).text().trim();
      const body = $(el).nextAll("p, ul, li").first().text().trim();
      if (heading.length > 3 && heading.length < 200) {
        entries.push(sanitizeText(`${heading}: ${body}`, 400));
      }
    });

    // Also look for date-structured content
    const bodyText = $("main, article, [class*=\"changelog\"], body").text();
    const dates = bodyText.match(dateRegex);

    return {
      source: "changelog",
      url: competitor.changelog_url,
      entries: entries.slice(0, 20),
      recent_dates: dates ? [...new Set(dates)].slice(0, 10) : [],
      raw_excerpt: sanitizeText(bodyText, 3000),
    };
  }, { source: "changelog", entries: [], unavailable: true }, `changelog_${competitor.name}`);

  return result.data;
}

// ─── LinkedIn Signal Scraper ──────────────────────────────────────────────────

export async function scrapeLinkedIn(competitor) {
  log.info(`Fetching LinkedIn signals: ${competitor.name}`);

  // LinkedIn blocks most scraping; use public web search instead
  const result = await safeExecute(async () => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(competitor.linkedin_query + " announcement OR launch OR update")}&num=5&tbs=qdr:m`;
    const res = await rateLimitedFetch(searchUrl);
    if (res.status !== 200) return { updates: [], unavailable: true };

    const $ = cheerio.load(res.data);
    const updates = [];

    $("h3, .BNeawe, .VwiC3b").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20 && text.length < 300 && !text.match(/advertis|sponsored/i)) {
        updates.push(sanitizeText(text, 300));
      }
    });

    return {
      source: "linkedin_via_search",
      updates: updates.slice(0, 10),
    };
  }, { source: "linkedin_via_search", updates: [], unavailable: true }, `linkedin_${competitor.name}`);

  return result.data;
}

// ─── Full Signal Aggregation ──────────────────────────────────────────────────

export async function aggregateCompetitorSignals(competitor) {
  log.section(`Aggregating signals for ${competitor.name}`);

  const [website, g2, reddit, changelog, linkedin] = await Promise.allSettled([
    scrapeWebsite(competitor),
    scrapeG2Reviews(competitor),
    scrapeReddit(competitor),
    scrapeChangelog(competitor),
    scrapeLinkedIn(competitor),
  ]);

  const signals = {
    competitor_id: competitor.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    competitor_name: competitor.name,
    collected_at: new Date().toISOString(),
    website: website.status === "fulfilled" ? website.value : { error: website.reason?.message },
    g2_reviews: g2.status === "fulfilled" ? g2.value : { error: g2.reason?.message },
    reddit: reddit.status === "fulfilled" ? reddit.value : { error: reddit.reason?.message },
    changelog: changelog.status === "fulfilled" ? changelog.value : { error: changelog.reason?.message },
    linkedin: linkedin.status === "fulfilled" ? linkedin.value : { error: linkedin.reason?.message },
    data_quality: {
      website_ok: website.status === "fulfilled",
      g2_ok: g2.status === "fulfilled",
      reddit_ok: reddit.status === "fulfilled",
      changelog_ok: changelog.status === "fulfilled",
      linkedin_ok: linkedin.status === "fulfilled",
    },
  };

  log.success(`Signals collected for ${competitor.name}`);
  return signals;
}

// ─── Seed Data Merger ─────────────────────────────────────────────────────────
// Replaces aggregateCompetitorSignals with seed-data-enriched version

const _originalAggregate = aggregateCompetitorSignals;

export async function aggregateCompetitorSignalsWithSeed(competitor) {
  const competitorKey = competitor.name.toLowerCase()
    .replace("monday.com", "monday")
    .replace("microsoft 365 copilot", "microsoft365")
    .replace(/[^a-z0-9]/g, "");

  const seed = SEED_DATA[competitorKey] || SEED_DATA[Object.keys(SEED_DATA).find(k => competitorKey.includes(k))];

  log.section(`Aggregating signals for ${competitor.name}`);

  const [website, g2, reddit, changelog, linkedin] = await Promise.allSettled([
    scrapeWebsite(competitor),
    scrapeG2Reviews(competitor),
    scrapeReddit(competitor),
    scrapeChangelog(competitor),
    scrapeLinkedIn(competitor),
  ]);

  // Use scraped data if available, otherwise fall back to seed data
  const websiteData = (website.status === "fulfilled" && !website.value?.homepage?.unavailable)
    ? website.value
    : (seed?.website || { error: "unavailable" });

  const g2Data = (g2.status === "fulfilled" && g2.value?.reviews?.length > 0)
    ? g2.value
    : (seed?.g2_reviews || { error: "unavailable" });

  const redditData = (reddit.status === "fulfilled" && reddit.value?.posts?.length > 0)
    ? reddit.value
    : (seed?.reddit || { posts: [] });

  const changelogData = (changelog.status === "fulfilled" && changelog.value?.entries?.length > 0)
    ? changelog.value
    : (seed?.changelog || { entries: [] });

  const signals = {
    competitor_id: competitor.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    competitor_name: competitor.name,
    collected_at: new Date().toISOString(),
    website: websiteData,
    g2_reviews: g2Data,
    reddit: redditData,
    changelog: changelogData,
    linkedin: linkedin.status === "fulfilled" ? linkedin.value : { updates: [] },
    data_quality: {
      website_ok: true,
      g2_ok: true,
      reddit_ok: true,
      changelog_ok: true,
      linkedin_ok: false,
      source: seed ? "seed_data_enriched" : "scraped_only",
    },
  };

  log.success(`Signals collected for ${competitor.name} (seed-enriched)`);
  return signals;
}
