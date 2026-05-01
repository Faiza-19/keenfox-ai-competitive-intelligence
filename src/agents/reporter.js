// src/agents/reporter.js — Report generation in Markdown and JSON

import { KEENFOX_PROFILE } from "../config.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("Reporter");

// ─── Formatting Helpers ───────────────────────────────────────────────────────

const badge = (level) => {
  const map = {
    High: "🔴 HIGH",
    Medium: "🟡 MEDIUM",
    Low: "🟢 LOW",
    Positive: "✅ Positive",
    Mixed: "⚠️ Mixed",
    Negative: "❌ Negative",
    Unknown: "❓ Unknown",
  };
  return map[level] || level;
};

const confidenceBadge = (level) => {
  const map = { High: "▲", Medium: "◆", Low: "▽" };
  return map[level] || "◇";
};

function hr(char = "─", len = 60) {
  return char.repeat(len);
}

function bullet(items, indent = "") {
  if (!items || items.length === 0) return `${indent}*None identified*`;
  return items.map((item) => `${indent}- ${item}`).join("\n");
}

// ─── Section Renderers ────────────────────────────────────────────────────────

function renderCompetitorSection(analysis) {
  if (!analysis) return "";

  const m = analysis.messaging_analysis || {};
  const p = analysis.product_intelligence || {};
  const pr = analysis.pricing_intelligence || {};
  const cs = analysis.customer_sentiment || {};
  const ko = analysis.keenfox_opportunity || {};
  const signals = analysis.signals || [];

  return `
## ${analysis.competitor} ${confidenceBadge(analysis.analysis_confidence)}

> **Analysis Confidence:** ${analysis.analysis_confidence || "Unknown"} | **Data Coverage:** ${analysis.data_coverage || "Partial"}
${analysis._fallback ? "\n> ⚠️ *Fallback analysis — LLM analysis unavailable. Manual review recommended.*\n" : ""}

### 🎯 Messaging & Positioning
| Field | Value |
|-------|-------|
| **Positioning** | ${m.primary_positioning || "Unknown"} |
| **Tone** | ${m.tone || "Unknown"} |
| **ICP Target** | ${m.icp_targeting || "Unknown"} |
| **Messaging Shift** | ${m.notable_shifts || "None detected"} |

**Key Messages:**
${bullet(m.key_messages)}

### 🚀 Product Intelligence
| Field | Value |
|-------|-------|
| **AI Investment** | ${p.ai_investment_level || "Unknown"} |

**Recent Launches:**
${bullet(p.recent_launches)}

**Strategic Bets:**
${bullet(p.strategic_bets)}

**Gaps & Weaknesses:**
${bullet(p.gaps_and_weaknesses)}

### 💰 Pricing
| Field | Value |
|-------|-------|
| **Model** | ${pr.model || "Unknown"} |
| **Free Tier** | ${pr.free_tier === true ? "Yes" : pr.free_tier === false ? "No" : "Unknown"} |
| **Price Range** | ${pr.price_range || "Unknown"} |
| **Recent Changes** | ${pr.recent_changes || "None detected"} |

${pr.packaging_notes ? `**Packaging Notes:** ${pr.packaging_notes}` : ""}

### 💬 Customer Sentiment: ${badge(cs.overall_sentiment)}
| Field | Value |
|-------|-------|
| **NPS Proxy** | ${cs.net_promoter_proxy || "Unknown"} |

**Top Loves:**
${bullet(cs.top_loves)}

**Top Complaints:**
${bullet(cs.top_complaints)}

**Churn Signals:**
${bullet(cs.churn_signals)}

### ⚔️ KeenFox Opportunity
**Threat Level: ${badge(ko.threat_level)}**

${ko.threat_rationale || ""}

**Exploitable Gaps:**
${bullet(ko.exploitable_gaps)}

**Win Conditions:**
${bullet(ko.win_conditions)}

**Loss Conditions:**
${bullet(ko.loss_conditions)}

### 📡 Key Signals
${signals.length === 0 ? "*No signals extracted.*" : signals.map((s) => `
> **[${s.type?.toUpperCase() || "SIGNAL"}]** ${s.title || ""}  
> ${s.detail || ""}  
> *Source: ${s.source || "unknown"} | Confidence: ${s.confidence || "unknown"}*
`).join("\n")}
`;
}

function renderCampaignSection(campaign) {
  if (!campaign) return "*Campaign recommendations unavailable.*";

  const msg = campaign.messaging_positioning || {};
  const ch = campaign.channel_strategy || {};
  const gtm = campaign.gtm_refinements || [];
  const wh = campaign.market_whitespace || {};
  const bc = campaign.battle_cards || [];
  const copy = msg.copy_suggestions || {};

  return `
## 📢 Messaging & Positioning Recommendations

**Current Weaknesses vs Competition:**
${bullet(msg.current_weaknesses)}

**Underexploited Angles:**
${bullet(msg.underexploited_angles)}

**Recommended Positioning Shift:**
> ${msg.recommended_positioning_shift || "No shift recommended"}

**Competitive Differentiators to Emphasize:**
${bullet(msg.competitive_differentiators)}

---

### ✍️ Copy Suggestions

${copy.homepage_headline ? `**Homepage Headline**
- **Recommended:** *"${copy.homepage_headline.recommended}"*
- **Rationale:** ${copy.homepage_headline.rationale}
` : ""}

${copy.cold_email_subject ? `**Cold Email Subject**
- **Recommended:** *"${copy.cold_email_subject.recommended}"*
- **Rationale:** ${copy.cold_email_subject.rationale}
` : ""}

${copy.cold_email_opening ? `**Cold Email Opening**
> ${copy.cold_email_opening.recommended}
- **Rationale:** ${copy.cold_email_opening.rationale}
` : ""}

${copy.linkedin_ad_headline ? `**LinkedIn Ad**
- **Recommended:** *"${copy.linkedin_ad_headline.recommended}"*
- **Rationale:** ${copy.linkedin_ad_headline.rationale}
` : ""}

${copy.value_proposition_statement ? `**Core Value Proposition**
> **"${copy.value_proposition_statement.recommended}"**
- **Rationale:** ${copy.value_proposition_statement.rationale}
` : ""}

---

## 📡 Channel Strategy

### Double Down On:
${(ch.double_down || []).map((c) => `**${c.channel}**
- **Rationale:** ${c.rationale}
- **Tactics:** ${(c.tactics || []).join(" | ")}
`).join("\n")}

### Pull Back From:
${(ch.pull_back || []).map((c) => `**${c.channel}**
- **Rationale:** ${c.rationale}
- **Alternative:** ${c.alternative}
`).join("\n")}

### New Opportunities:
${(ch.new_opportunities || []).map((c) => `**${c.channel}** [${c.priority}]
- **Rationale:** ${c.rationale}
`).join("\n")}

---

## 🗺️ GTM Strategy Refinements

${gtm.map((r, i) => `### Priority ${r.priority || i + 1}: ${r.recommendation}

**Rationale:** ${r.rationale}

**Execution:** ${r.execution}

**Expected Impact:** ${r.expected_impact}

**Timeline:** ${r.timeline}

**Addresses:** ${(r.competitors_this_addresses || []).join(", ")}

`).join(hr("─", 40) + "\n")}

---

## 🔍 Market Whitespace

| Category | Opportunities |
|----------|---------------|
| **Underserved Segments** | ${(wh.underserved_segments || []).join("; ") || "None identified"} |
| **Feature Gaps** | ${(wh.feature_gaps || []).join("; ") || "None identified"} |
| **Messaging Gaps** | ${(wh.messaging_gaps || []).join("; ") || "None identified"} |
| **Channel Gaps** | ${(wh.channel_gaps || []).join("; ") || "None identified"} |

---

## 🃏 Battle Cards

${bc.map((b) => `### vs ${b.vs_competitor}
| | |
|---|---|
| **Our Position** | ${b.our_position} |
| **Their Weakness** | ${b.their_weakness} |
| **Our Proof Point** | ${b.our_proof_point} |

**Talk Track:**
> *"${b.talk_track}"*

`).join(hr("─", 40) + "\n")}

---

**Confidence:** ${campaign.confidence_summary || "Unknown"}

**Data Caveats:**
${bullet(campaign.data_caveats)}
`;
}

function renderDiffSection(diff) {
  if (!diff) return "";

  return `
## 🔄 Changes Since Last Run

**Urgency: ${badge(diff.urgency)}**

### Material Changes
${(diff.material_changes || []).map((c) => `**[${c.change_type?.toUpperCase()}] ${c.competitor}: ${c.description}**
- Significance: ${badge(c.significance)}
- KeenFox Implication: ${c.keenfox_implication}
`).join("\n")}

### New Threats
${bullet(diff.new_threats)}

### New Opportunities
${bullet(diff.new_opportunities)}

### Strategy Update
${diff.recommendations_update || "No update needed."}
`;
}

// ─── Full Report Builder ──────────────────────────────────────────────────────

export function generateMarkdownReport(reportData) {
  log.info("Generating markdown report...");

  const { run_id, generated_at, competitor_analyses, campaign_recommendations, diff_analysis } = reportData;

  const toc = (competitor_analyses || [])
    .map((a) => `  - [${a.competitor}](#${a.competitor.toLowerCase().replace(/[^a-z0-9]/g, "-")})`)
    .join("\n");

  const header = `# 🦊 KeenFox Competitive Intelligence Report

**Run ID:** \`${run_id}\`  
**Generated:** ${new Date(generated_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}  
**Competitors Analyzed:** ${(competitor_analyses || []).length}  
**KeenFox Profile:** ${KEENFOX_PROFILE.current_icp} | "${KEENFOX_PROFILE.current_positioning}"

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Competitor Analysis](#competitor-analysis)
${toc}
3. [Campaign Recommendations](#campaign-recommendations)
4. [Market Whitespace](#market-whitespace)
5. [Battle Cards](#battle-cards)
${diff_analysis ? "6. [What Changed](#what-changed)" : ""}

---

`;

  // Executive summary
  const allSignals = (competitor_analyses || []).flatMap((a) => a.signals || []);
  const highConfidenceSignals = allSignals.filter((s) => s.confidence === "High").slice(0, 5);
  const topThreats = (competitor_analyses || [])
    .filter((a) => a.keenfox_opportunity?.threat_level === "High")
    .map((a) => a.competitor);
  const topGaps = (competitor_analyses || [])
    .flatMap((a) => a.keenfox_opportunity?.exploitable_gaps || [])
    .slice(0, 5);

  const execSummary = `## Executive Summary

### Competitive Landscape Overview
| Competitor | Threat Level | Sentiment | AI Investment | Analysis Confidence |
|-----------|-------------|-----------|--------------|-------------------|
${(competitor_analyses || []).map((a) => `| **${a.competitor}** | ${badge(a.keenfox_opportunity?.threat_level)} | ${badge(a.customer_sentiment?.overall_sentiment)} | ${a.product_intelligence?.ai_investment_level || "?"} | ${a.analysis_confidence || "?"} |`).join("\n")}

### 🚨 Top Threats
${topThreats.length > 0 ? topThreats.map((t) => `- **${t}** poses a high threat to KeenFox`).join("\n") : "- No high-level threats identified in this run"}

### 🎯 Top Exploitable Gaps
${bullet(topGaps)}

### 📡 High-Confidence Signals This Run
${highConfidenceSignals.length > 0
    ? highConfidenceSignals.map((s) => `- **[${s.type}]** ${s.title}: ${s.detail}`).join("\n")
    : "- No high-confidence signals detected"}

---
`;

  const competitorSections = `## Competitor Analysis

${(competitor_analyses || []).map(renderCompetitorSection).join("\n" + hr("═", 60) + "\n")}`;

  const campaignSection = `## Campaign Recommendations

${renderCampaignSection(campaign_recommendations)}`;

  const diffSection = diff_analysis ? `## What Changed\n\n${renderDiffSection(diff_analysis)}` : "";

  const footer = `
---

*Report generated by KeenFox Competitive Intelligence Engine v1.0*  
*Run ID: ${run_id} | Do not distribute externally*
`;

  const markdown = [header, execSummary, competitorSections, campaignSection, diffSection, footer]
    .filter(Boolean)
    .join("\n");

  log.success("Markdown report generated");
  return markdown;
}

export function generateJSONReport(rawData) {
  return {
    ...rawData,
    _meta: {
      version: "1.0",
      generated_by: "KeenFox Competitive Intelligence Engine",
      schema_version: "2024.1",
    },
  };
}
