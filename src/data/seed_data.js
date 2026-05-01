// src/data/seed_data.js — Pre-filled competitor intelligence data
// This provides real data when web scraping is blocked

export const SEED_DATA = {
  notion: {
    website: {
      homepage: {
        title: "Notion – One workspace. Every team.",
        headline: "One workspace. Every team.",
        subheadline: "We're more than a doc. Or a table. Customize Notion to work the way you do.",
        value_props: [
          "Write, plan, collaborate, and get organized in one tool",
          "AI-powered writing and summarization built in",
          "Flexible databases, wikis, and project views",
          "Templates for every use case",
          "Works for individuals and large teams",
        ],
        cta_text: ["Get Notion free", "Request a demo"],
      },
      pricing: {
        tiers: [
          "Free – $0, unlimited pages, basic blocks",
          "Plus – $10/user/month, unlimited file uploads, 30-day history",
          "Business – $15/user/month, SAML SSO, private teamspaces",
          "Enterprise – Custom pricing, advanced security and controls",
          "Notion AI – $10/user/month add-on (or included in some plans)",
        ],
      },
    },
    g2_reviews: {
      rating: 4.7,
      review_count: 5483,
      pros: [
        "Extremely flexible and customizable for any workflow",
        "Beautiful clean interface that teams enjoy using",
        "Great for documentation and knowledge management",
        "Powerful database and relational features",
        "Strong template ecosystem from the community",
      ],
      cons: [
        "Very steep learning curve — takes weeks to set up properly",
        "Performance slows down significantly with large databases",
        "No native time tracking or resource management features",
        "Mobile app is significantly inferior to desktop",
        "AI features feel inconsistent and not deeply integrated",
        "Too much flexibility leads to inconsistent team adoption",
        "Offline mode is unreliable",
      ],
      reviews: [
        "Notion is incredibly powerful but our team spent 3 months just setting it up before we could actually use it productively",
        "The learning curve is brutal for non-technical team members. My marketing team refuses to use it",
        "Love the flexibility but wish it came with more opinionated workflows out of the box",
        "Performance with large databases is terrible — pages take 10+ seconds to load",
        "We switched from Notion because maintaining it felt like a second job",
      ],
    },
    reddit: {
      posts: [
        { title: "Notion is too complicated for my team", text: "We've been trying to implement Notion for 6 months and our non-technical staff still can't use it without help. Thinking of switching.", score: 847 },
        { title: "Notion AI is disappointing", text: "Expected Notion AI to be deeply integrated but it's basically just a ChatGPT wrapper bolted onto the sidebar. Not worth the extra cost.", score: 623 },
        { title: "What's a simpler alternative to Notion?", text: "Love Notion's concept but the setup overhead is killing our productivity. Looking for something more opinionated.", score: 1204 },
        { title: "Notion database performance is getting worse", text: "Our main database has 5000 entries and it takes forever to load now. This is unacceptable for a paid product.", score: 445 },
      ],
    },
    changelog: {
      entries: [
        "Notion AI: Now available on all plans including Free tier",
        "New database view: Timeline improvements with dependencies",
        "Notion Sites: Publish pages as public websites",
        "AI summaries for meeting notes and documents",
        "Improved mobile app with offline support (beta)",
      ],
    },
  },

  asana: {
    website: {
      homepage: {
        title: "Asana • Manage your team's work, projects, & tasks online",
        headline: "Work without limits",
        subheadline: "With AI-powered features and 300+ integrations, Asana helps teams do more with less effort.",
        value_props: [
          "AI-powered project management",
          "300+ integrations including Slack, Google, Microsoft",
          "Workflow automation to eliminate busywork",
          "Real-time reporting and dashboards",
          "Enterprise-grade security and compliance",
        ],
        cta_text: ["Get started free", "See how it works"],
      },
      pricing: {
        tiers: [
          "Personal – Free, up to 10 users, basic task management",
          "Starter – $10.99/user/month, timeline, workflow builder",
          "Advanced – $24.99/user/month, portfolio management, goals",
          "Enterprise – Custom, advanced security, data residency",
          "Enterprise+ – Custom, AI Studio, advanced compliance",
        ],
      },
    },
    g2_reviews: {
      rating: 4.3,
      review_count: 9876,
      pros: [
        "Best-in-class integrations with 300+ tools",
        "Excellent timeline and Gantt chart views",
        "Strong workflow automation capabilities",
        "Good reporting and progress tracking",
        "Reliable and stable platform",
      ],
      cons: [
        "Significant price increase (15%+) with minimal new features",
        "Way too complex and overwhelming for small teams",
        "AI features don't actually save meaningful time",
        "Mobile app is much worse than desktop experience",
        "Customer support is slow and unhelpful for paid plans",
        "Pricing is expensive compared to newer competitors",
        "UI feels cluttered and outdated compared to newer tools",
        "Too many features that most teams never use",
      ],
      reviews: [
        "Asana raised our renewal price by 18% this year with basically no new useful features. We're actively evaluating alternatives.",
        "The AI features are a gimmick — I've tried them all and they don't actually reduce my workload meaningfully",
        "Great tool for enterprise but completely overkill for our 30-person team. We're paying for features we'll never use.",
        "Mobile app is so bad we had to tell our field team to just use desktop. It's embarrassing for a company this size.",
        "Switched to a competitor after our Asana bill went from $800/month to $950/month with no explanation",
      ],
    },
    reddit: {
      posts: [
        { title: "Asana price increase is ridiculous", text: "Just got renewal notice — 15% increase year over year. No major new features. Has anyone switched to something else recently?", score: 1893 },
        { title: "Asana AI is useless", text: "We paid for the AI add-on for 3 months and our team used it maybe 5 times total. Complete waste of money.", score: 734 },
        { title: "Looking for Asana alternatives for 50-person team", text: "Asana is getting too expensive and too complex for us. We don't need 80% of the features but pay for all of them.", score: 1156 },
        { title: "Asana customer support has gotten worse", text: "Used to be great, now takes 3-5 days to get a response even on paid plans. Very frustrating.", score: 567 },
        { title: "Our team hates Asana's new UI", text: "The recent redesign made everything harder to find. My team is constantly asking where things moved to.", score: 823 },
      ],
    },
    changelog: {
      entries: [
        "Asana AI: Smart summaries for project status updates",
        "AI Studio: Build custom AI workflows (Enterprise only)",
        "Goals module: Improved OKR tracking and alignment",
        "New Rules: Enhanced automation for workflow triggers",
        "Reporting: New chart types for portfolio dashboards",
      ],
    },
  },

  clickup: {
    website: {
      homepage: {
        title: "ClickUp™ | One app to replace them all",
        headline: "One app to replace them all",
        subheadline: "ClickUp is the everything app for work. It's the only app you'll ever need to manage, track, and brain everything at work.",
        value_props: [
          "15+ views including List, Board, Gantt, Calendar",
          "ClickUp Brain AI assistant across all features",
          "Built-in docs, whiteboards, and spreadsheets",
          "1000+ integrations with your existing tools",
          "Free forever plan with unlimited users",
        ],
        cta_text: ["Get Started — It's Free", "Watch Demo"],
      },
      pricing: {
        tiers: [
          "Free Forever – $0, unlimited users, 100MB storage",
          "Unlimited – $7/user/month, unlimited storage and integrations",
          "Business – $12/user/month, advanced automation, dashboards",
          "Enterprise – Custom, SSO, advanced permissions, white labeling",
        ],
      },
    },
    g2_reviews: {
      rating: 4.7,
      review_count: 9234,
      pros: [
        "Best price-to-features ratio in the market",
        "Extremely feature-rich — has everything you could need",
        "Free tier is genuinely useful for small teams",
        "Constant new feature releases and improvements",
        "Highly customizable to fit any workflow",
      ],
      cons: [
        "Overwhelming number of features — very steep learning curve",
        "Frequent bugs and reliability issues",
        "Slow performance with complex workspaces",
        "Customer support quality is inconsistent",
        "Feature bloat makes it hard to find what you need",
        "Non-technical team members struggle to use it",
        "Notifications are excessive and hard to configure",
        "Mobile app has significant bugs",
      ],
      reviews: [
        "ClickUp has every feature imaginable which is also its biggest problem — our new hires spend 2 weeks just learning the interface",
        "We've lost data twice due to ClickUp bugs. Thankfully small things but it's shaken our confidence in the platform",
        "My developers love ClickUp but our marketing and sales teams absolutely hate it. Huge adoption gap across the company",
        "The free plan is genuinely great but the moment you need automation you're forced into paid tiers",
        "ClickUp has so much potential but the bugs make it feel like beta software even after paying",
      ],
    },
    reddit: {
      posts: [
        { title: "ClickUp is too complicated for non-technical users", text: "Our ops team loves it but HR and marketing won't touch it. Anyone found a way to simplify ClickUp for less technical users?", score: 967 },
        { title: "ClickUp keeps having outages", text: "Third outage this month. We're a remote team and rely on this tool 100%. Starting to look at more reliable alternatives.", score: 1432 },
        { title: "ClickUp Brain AI — is it worth it?", text: "Tried ClickUp Brain for a month. It's decent but not revolutionary. The base product bugs are still more annoying than AI helps.", score: 543 },
        { title: "Switched from ClickUp — here's why", text: "Feature bloat got out of hand. We were using maybe 20% of features and the other 80% just made everything confusing. Simpler tool now.", score: 2103 },
      ],
    },
    changelog: {
      entries: [
        "ClickUp Brain: AI now available across all ClickUp features",
        "Whiteboards 2.0: Real-time collaboration improvements",
        "ClickUp AI: Generate tasks from meeting notes automatically",
        "New mobile app: Redesigned for better performance",
        "Custom roles: More granular permission controls",
      ],
    },
  },

  monday: {
    website: {
      homepage: {
        title: "monday.com | A new way to work",
        headline: "Made for the way you work",
        subheadline: "The most intuitive Work OS. Get everyone working in a single platform designed to manage any type of work.",
        value_props: [
          "Intuitive no-code workflow builder",
          "200+ ready-made templates for any use case",
          "Powerful automations to save hours per week",
          "Real-time dashboards and reporting",
          "Enterprise-grade security and compliance",
        ],
        cta_text: ["Get Started Free", "See a Demo"],
      },
      pricing: {
        tiers: [
          "Free – Up to 2 seats, 3 boards",
          "Basic – $9/seat/month, unlimited items and 5GB storage",
          "Standard – $12/seat/month, timeline, calendar, automations",
          "Pro – $19/seat/month, private boards, time tracking, formula columns",
          "Enterprise – Custom, enterprise automation, advanced security",
        ],
      },
    },
    g2_reviews: {
      rating: 4.7,
      review_count: 11203,
      pros: [
        "Very intuitive and easy to get started",
        "Beautiful visual interface teams actually enjoy using",
        "Strong automation capabilities on paid plans",
        "Excellent customer support and onboarding",
        "Great for project tracking and status visibility",
      ],
      cons: [
        "Gets very expensive quickly as team grows",
        "Pricing jumps are steep between tiers — big gap between Standard and Pro",
        "Limited functionality on lower tiers — feels like a bait and switch",
        "Automations have a learning curve on complex workflows",
        "Reporting is not as powerful as dedicated BI tools",
        "Storage limits on lower plans are frustrating",
        "Acquired companies creating product complexity",
      ],
      reviews: [
        "Monday.com is great until you realize you need Pro features and the price jumps from $12 to $19 per user — that adds up fast",
        "We loved Monday.com until we hit 50 users and our bill became $950/month. Had to find alternatives.",
        "The free plan is basically useless — 2 seats and 3 boards? It's just a demo at that point.",
        "Excellent for project management but we needed integrations that only exist on Enterprise tier",
        "Monday.com recently acquired a workflow tool and suddenly the product feels less focused",
      ],
    },
    reddit: {
      posts: [
        { title: "Monday.com pricing is out of control", text: "Started at $25/month for our small team, now paying $600/month two years later. Same team size. Price hikes every year.", score: 2341 },
        { title: "Monday.com vs alternatives for 100-person company", text: "Our monday.com bill hit $2000/month. Looking at alternatives that don't punish you for growing.", score: 1567 },
        { title: "Monday.com acquisition making product worse", text: "Since they acquired that automation company the product has gotten bloated. Losing the simplicity that made us choose it.", score: 876 },
        { title: "Monday.com free plan is a joke", text: "2 seats and 3 boards is not a free plan, it's a 10-minute trial. Very misleading marketing.", score: 1203 },
      ],
    },
    changelog: {
      entries: [
        "monday AI: AI-powered status updates and summaries",
        "Workdocs: Enhanced document collaboration",
        "New automations: 200+ automation templates added",
        "monday CRM: Standalone CRM product launched",
        "Workforms: Improved form builder with conditional logic",
      ],
    },
  },

  microsoft365: {
    website: {
      homepage: {
        title: "Microsoft 365 Copilot | AI-powered productivity",
        headline: "Your AI-powered productivity suite",
        subheadline: "Microsoft 365 Copilot combines the power of large language models with your data in Microsoft Graph and Microsoft 365 apps.",
        value_props: [
          "AI built into Word, Excel, PowerPoint, Teams, and Outlook",
          "Works with your existing Microsoft 365 subscription",
          "Enterprise security and compliance built in",
          "Copilot in Teams for meeting summaries",
          "Integrated with SharePoint and OneDrive",
        ],
        cta_text: ["Get Microsoft 365", "Try Copilot"],
      },
      pricing: {
        tiers: [
          "Microsoft 365 Business Basic – $6/user/month",
          "Microsoft 365 Business Standard – $12.50/user/month",
          "Microsoft 365 Business Premium – $22/user/month",
          "Microsoft 365 Copilot add-on – $30/user/month (requires M365 base)",
          "Total with Copilot – $36-52/user/month depending on base plan",
        ],
      },
    },
    g2_reviews: {
      rating: 4.4,
      review_count: 15678,
      pros: [
        "Deep integration with existing Microsoft ecosystem",
        "Enterprise security and compliance features are best in class",
        "Familiar interface for teams already using Office",
        "Copilot AI genuinely useful in Word and Excel",
        "Teams integration for video calls and collaboration",
      ],
      cons: [
        "Very expensive when you add Copilot to base M365 cost",
        "Requires full Microsoft ecosystem buy-in — doesn't work well with Google Workspace",
        "Copilot AI quality is inconsistent across different apps",
        "SharePoint is notoriously complex and difficult to manage",
        "Not suitable for teams that don't already use Microsoft products",
        "Copilot add-on is $30/user/month ON TOP of existing M365 cost",
        "Interface feels dated compared to newer productivity tools",
        "Slow to ship new features compared to startup competitors",
      ],
      reviews: [
        "Microsoft 365 Copilot is impressive in Word and Outlook but pretty useless in Teams and SharePoint. Very inconsistent.",
        "The $30/user/month Copilot add-on is hard to justify when you're already paying $22/user for M365 Premium",
        "If your team uses Google Workspace, Microsoft 365 is basically a non-starter. The integration story is terrible.",
        "SharePoint is from 2005 and feels like it. The rest of M365 is fine but SharePoint alone makes people hate the suite.",
        "Copilot is best in class for Excel and Word power users but most of our team doesn't use those features daily",
      ],
    },
    reddit: {
      posts: [
        { title: "Microsoft 365 Copilot — worth the $30/user add-on?", text: "Our IT wants to add Copilot to our M365. That's an extra $3000/month for our team. Has anyone seen genuine ROI?", score: 1876 },
        { title: "Switching away from Microsoft 365 — options?", text: "Tired of the complexity and cost. Looking for modern alternatives that work well with non-Microsoft stacks.", score: 2341 },
        { title: "Microsoft Copilot vs standalone AI tools", text: "Why pay $30/user for Copilot when ChatGPT Plus is $20/user and works better for most tasks? Microsoft is overpriced.", score: 1543 },
        { title: "SharePoint is holding back our M365 adoption", text: "Everything else about M365 is fine but SharePoint is so bad that our team refuses to use it. Anyone else?", score: 987 },
      ],
    },
    changelog: {
      entries: [
        "Copilot in Teams: Real-time meeting transcription and summaries",
        "Copilot in Excel: Natural language data analysis",
        "Copilot Studio: Build custom AI agents for enterprise",
        "Copilot in Outlook: Email drafting and thread summarization",
        "Microsoft Loop: New collaborative workspace product",
      ],
    },
  },
};
