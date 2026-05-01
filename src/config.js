// src/config.js — Central configuration and constants

export const COMPETITORS = {
  notion: {
    name: "Notion",
    website: "https://www.notion.so",
    pricing_url: "https://www.notion.so/pricing",
    g2_slug: "notion",
    capterra_slug: "notion",
    reddit_queries: ["notion app review", "notion vs", "notion problems"],
    linkedin_query: "Notion site:linkedin.com/company",
    changelog_url: "https://www.notion.so/releases",
    category: "All-in-one workspace",
    primary_icp: "Startup teams, knowledge workers",
  },
  asana: {
    name: "Asana",
    website: "https://asana.com",
    pricing_url: "https://asana.com/pricing",
    g2_slug: "asana",
    capterra_slug: "asana",
    reddit_queries: ["asana review 2024", "asana problems", "asana vs"],
    linkedin_query: "Asana site:linkedin.com/company",
    changelog_url: "https://asana.com/guide/help/api/changelog",
    category: "Project management",
    primary_icp: "Mid-market teams, operations",
  },
  clickup: {
    name: "ClickUp",
    website: "https://clickup.com",
    pricing_url: "https://clickup.com/pricing",
    g2_slug: "clickup",
    capterra_slug: "clickup",
    reddit_queries: ["clickup review", "clickup issues", "clickup vs"],
    linkedin_query: "ClickUp site:linkedin.com/company",
    changelog_url: "https://clickup.com/changelog",
    category: "Project management / productivity",
    primary_icp: "SMBs, agencies, remote teams",
  },
  monday: {
    name: "Monday.com",
    website: "https://monday.com",
    pricing_url: "https://monday.com/pricing",
    g2_slug: "monday-com",
    capterra_slug: "monday-com",
    reddit_queries: ["monday.com review", "monday.com problems", "monday vs"],
    linkedin_query: "Monday.com site:linkedin.com/company",
    changelog_url: "https://support.monday.com/hc/en-us/categories/360001669760-What-s-New",
    category: "Work OS / project management",
    primary_icp: "Enterprise, marketing teams",
  },
  microsoft365: {
    name: "Microsoft 365 Copilot",
    website: "https://www.microsoft.com/en-us/microsoft-365/copilot",
    pricing_url: "https://www.microsoft.com/en-us/microsoft-365/business/compare-all-plans",
    g2_slug: "microsoft-365",
    capterra_slug: "microsoft-365-business",
    reddit_queries: ["Microsoft 365 Copilot review", "M365 Copilot problems", "copilot productivity"],
    linkedin_query: "Microsoft 365 Copilot site:linkedin.com/company",
    changelog_url: "https://learn.microsoft.com/en-us/microsoft-365/admin/misc/microsoft-365-copilot-changelog",
    category: "AI-enhanced productivity suite",
    primary_icp: "Enterprise, existing Microsoft shops",
  },
};

export const KEENFOX_PROFILE = {
  name: "KeenFox",
  description: "B2B SaaS productivity platform",
  current_icp: "Mid-market B2B teams (50–500 employees)",
  current_positioning: "Smart team productivity that doesn't require a PhD to set up",
  channels: ["LinkedIn", "Google Ads", "Email/Cold Outreach", "Content/SEO", "Product-led growth"],
  strengths: ["Ease of onboarding", "AI-native design", "Cross-team visibility"],
  known_gaps: ["Brand awareness vs incumbents", "Enterprise feature depth", "Integrations breadth"],
};

export const SIGNAL_CATEGORIES = [
  "feature_launch",
  "pricing_change",
  "messaging_shift",
  "customer_sentiment_positive",
  "customer_sentiment_negative",
  "market_gap",
  "competitive_threat",
  "partnership",
  "funding",
];

export const LLM_CONFIG = {
  model: "gemini-2.0-flash-001",
  max_tokens: 4096,
  temperature: 0.3,
  timeout_ms: 120000,
};

export const SCRAPING_CONFIG = {
  timeout_ms: parseInt(process.env.SCRAPE_TIMEOUT_MS) || 15000,
  max_retries: parseInt(process.env.MAX_RETRIES) || 3,
  retry_delay_ms: parseInt(process.env.RETRY_DELAY_MS) || 5000,
  max_concurrent: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 3,
  request_delay_ms: parseInt(process.env.REQUEST_DELAY_MS) || 2000,
  user_agent: process.env.USER_AGENT || "Mozilla/5.0 (compatible; KeenFoxResearch/1.0)",
  headers: {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Cache-Control": "no-cache",
  },
};
