import {
  SubscriptionTier,
  ModularTabAddon,
  UserSubscriptionState,
  SubscriptionPlanId,
} from "../types";

export const SUBSCRIPTION_STATE_KEY = "tomecrafter_user_subscription_v1";

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "free",
    name: "Novice Scribe",
    tagline: "Essential story drafting and chapter structuring for emerging authors.",
    priceMonthlyUsd: 0,
    priceAnnualMonthlyUsd: 0,
    badgeLabel: "Free Forever",
    isPopular: false,
    omegaPlanId: "omega_free_tier",
    fundContributionMonthlyUsd: 0,
    limits: {
      monthlyAiProseWords: 5000,
      monthlyCoverArtRenders: 3,
      activeManuscriptsLimit: 1,
      storeProductsLimit: 3,
      monthlyExportsLimit: 5,
      allowedExportFormats: ["markdown", "docx", "pdf_basic"],
      platformFeePercent: 5,
    },
    includedTabs: [
      "outline",
      "editor",
      "dictation",
      "typography",
      "codex",
      "store",
    ],
    features: [
      "5,000 AI prose & brainstorming words / month",
      "3 AI cover art & illustration renders / month",
      "1 Active book manuscript project",
      "Core Chapter Builder & Manuscript Editor",
      "World Codex (up to 10 lore entries)",
      "Basic Author Storefront (up to 3 products, 5% fee)",
      "Standard Export (PDF, Word DOCX, Markdown)",
      "Community Discord & Documentation Access",
    ],
  },
  {
    id: "author_pro",
    name: "Author Pro",
    tagline: "The complete literary workstation for dedicated indie authors & series creators.",
    priceMonthlyUsd: 29,
    priceAnnualMonthlyUsd: 24,
    badgeLabel: "Most Popular",
    isPopular: true,
    omegaPlanId: "omega_author_pro_monthly",
    fundContributionMonthlyUsd: 14.50, // Exactly 50%
    limits: {
      monthlyAiProseWords: 60000,
      monthlyCoverArtRenders: 30,
      activeManuscriptsLimit: 5,
      storeProductsLimit: 25,
      monthlyExportsLimit: 50,
      allowedExportFormats: ["markdown", "docx", "pdf_basic", "pdf_kdp_300dpi", "epub"],
      platformFeePercent: 0,
    },
    includedTabs: [
      "outline",
      "editor",
      "dictation",
      "typography",
      "council",
      "codex",
      "art",
      "typesetting",
      "publishing",
      "website",
      "store",
    ],
    features: [
      "60,000 AI prose words / month (competitive & high quality)",
      "30 High-Resolution AI cover art & chapter headers / month",
      "5 Active manuscript projects with series linking",
      "Realm Council (All 6 AI Master Editors & Line-by-Line Audits)",
      "KDP 300 DPI Print-Ready Typesetting & ePub formatting",
      "Full Author Website Studio with SEO & lead magnets",
      "Full Store & Merch Builder (0% platform fee, Omega Pay)",
      "Google Drive Cloud Sync & Auto-Save",
      "🛡️ 50% ($14.50/mo) routed directly to Creator Fund",
    ],
  },
  {
    id: "guild_master",
    name: "Guild Master Studio",
    tagline: "Elite multi-modal production power across all 4 ecosystem applications.",
    priceMonthlyUsd: 59,
    priceAnnualMonthlyUsd: 49,
    badgeLabel: "Full Ecosystem",
    isPopular: false,
    omegaPlanId: "omega_guild_master_monthly",
    fundContributionMonthlyUsd: 29.50, // Exactly 50%
    limits: {
      monthlyAiProseWords: 200000, // Competitive, expanded but strictly capped for reliability
      monthlyCoverArtRenders: 100,
      activeManuscriptsLimit: 50,
      storeProductsLimit: 999,
      monthlyExportsLimit: 500,
      allowedExportFormats: ["markdown", "docx", "pdf_basic", "pdf_kdp_300dpi", "epub", "audio_master"],
      platformFeePercent: 0,
    },
    includedTabs: [
      "outline",
      "editor",
      "dictation",
      "typography",
      "council",
      "codex",
      "art",
      "typesetting",
      "publishing",
      "website",
      "social",
      "testers",
      "store",
    ],
    features: [
      "200,000 AI prose words / month (expanded competitive quota)",
      "100 4K Cover Art, Merch Mockups & Scene Illustrations / month",
      "Unlimited active manuscripts & omnibuses",
      "All 4 Ecosystem Apps Unlocked (TomeCrafter, ForgeOS, RLM Pro, RL Easy Flow)",
      "Social Media Video Studio (TikTok/Reels storyboard generator)",
      "RLM Pro Voice Cloning & Audiobook Master Suite",
      "Beta Tester Console & Automated CRM Sandbox",
      "Priority Ultra-Fast Model Inference & C2PA Provenance Seal",
      "🛡️ 50% ($29.50/mo) routed directly to Creator Fund",
    ],
  },
];

export const MODULAR_TAB_ADDONS: ModularTabAddon[] = [
  {
    id: "addon-rlm-audio",
    tabKey: "testers", // or RLM audio suite
    name: "RLM Pro Audio Master & Voice Cloning Tab",
    iconName: "Mic",
    category: "Creation Suite",
    monthlyPriceUsd: 12,
    tagline: "Full-cast neural narration, chapter audio mastering, and voice cloning engine.",
    description: "Adds full multi-voice audiobook synthesis, studio equalizer curves, and master M4B/MP3 audiobook packaging directly inside your workspace.",
    unlocksFeatures: [
      "Neural voice cloning and 5 pre-configured master character voices",
      "Studio grade loudness normalization (-23 LUFS / -18 LUFS)",
      "Direct chapter-to-speech rendering pipeline",
    ],
    isIncludedInMaster: true,
  },
  {
    id: "addon-social-reels",
    tabKey: "social",
    name: "Social Media Studio & Video Reels Tab",
    iconName: "Video",
    category: "Publishing & Reach",
    monthlyPriceUsd: 10,
    tagline: "Generate viral TikToks, BookTok reels, and Substack video trailers in seconds.",
    description: "Transforms your chapter hooks and dramatic moments into 9:16 vertical video storyboards with kinetic typography and audio tracks.",
    unlocksFeatures: [
      "Automated scene breakdown & pacing hooks",
      "Kinetic text animations & camera movements",
      "Exportable video cue sheets with trending hashtag recommendations",
    ],
    isIncludedInMaster: true,
  },
  {
    id: "addon-custom-domain",
    tabKey: "website",
    name: "Author Website Custom Domain & DNS Tab",
    iconName: "Globe",
    category: "Publishing & Reach",
    monthlyPriceUsd: 8,
    tagline: "Connect your own .com / .org domain with automated SSL certificate provisioning.",
    description: "Enables point-and-click custom domain routing for both your Author Website and your Book & Merchandise Storefront.",
    unlocksFeatures: [
      "Custom apex and subdomain support (e.g. www.authorname.com)",
      "Automated Cloudflare SSL / TLS encryption",
      "White-label removal of TomeCrafter badge",
    ],
    isIncludedInMaster: true,
  },
  {
    id: "addon-extra-words-50k",
    tabKey: "boost-words",
    name: "Extra 50,000 AI Prose Words Pack",
    iconName: "Zap",
    category: "Generation Boosters",
    monthlyPriceUsd: 9,
    tagline: "Immediate instant burst words quota added to your active monthly cycle.",
    description: "Adds 50,000 high-accuracy prose words to your account immediately. Stacks with any plan and rolls over into your current billing period.",
    unlocksFeatures: [
      "+50,000 AI prose generation words",
      "High-speed multi-agent council reviews",
    ],
    extraWordQuota: 50000,
    isIncludedInMaster: false,
  },
  {
    id: "addon-extra-art-25",
    tabKey: "boost-art",
    name: "Extra 25 Art & Cover Generator Pack",
    iconName: "Sparkles",
    category: "Generation Boosters",
    monthlyPriceUsd: 7,
    tagline: "25 additional high-resolution book cover and merch artwork renders.",
    description: "Expands your visual studio with 25 extra 300 DPI illustration credits for book covers, character portraits, or product mockups.",
    unlocksFeatures: [
      "+25 HD cover art and merchandise renders",
      "4:5, 3:4, 1:1, and 9:16 aspect ratio unlocked",
    ],
    extraArtQuota: 25,
    isIncludedInMaster: false,
  },
];

export const DEFAULT_USER_SUBSCRIPTION: UserSubscriptionState = {
  currentPlanId: "author_pro",
  status: "active",
  activeAddonTabIds: [],
  billingInterval: "monthly",
  totalMonthlyChargeUsd: 29.00,
  fundContributionMonthlyUsd: 14.50, // 50%
  omegaMemberId: "omega_member_cody032",
  omegaSubscriptionId: "omega_sub_authorpro_9918",
  currentPeriodEnd: "2026-09-21T00:00:00Z",
  usage: {
    aiProseWordsUsed: 14850,
    aiProseWordsLimit: 60000,
    coverArtRendersUsed: 8,
    coverArtRendersLimit: 30,
    storeProductsListed: 6,
    storeProductsLimit: 25,
    exportsUsedThisMonth: 12,
    exportsLimitThisMonth: 50,
    billingCycleResetDate: "2026-09-21T00:00:00Z",
  },
  unlockedTabs: [
    "outline",
    "editor",
    "dictation",
    "typography",
    "council",
    "codex",
    "art",
    "typesetting",
    "publishing",
    "website",
    "store",
  ],
};

export function getStoredUserSubscription(): UserSubscriptionState {
  try {
    const saved = localStorage.getItem(SUBSCRIPTION_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading user subscription:", e);
  }
  return DEFAULT_USER_SUBSCRIPTION;
}

export function saveStoredUserSubscription(state: UserSubscriptionState): void {
  try {
    // Recalculate unlocked tabs based on plan + add-on tabs
    const plan = SUBSCRIPTION_TIERS.find((t) => t.id === state.currentPlanId) || SUBSCRIPTION_TIERS[0];
    const unlockedSet = new Set<string>(plan.includedTabs);

    // Calculate extra word and art quotas from active add-ons
    let extraWords = 0;
    let extraArt = 0;
    let addonsTotalUsd = 0;

    state.activeAddonTabIds.forEach((addonId) => {
      const addon = MODULAR_TAB_ADDONS.find((a) => a.id === addonId);
      if (addon) {
        addonsTotalUsd += addon.monthlyPriceUsd;
        if (addon.tabKey && !addon.tabKey.startsWith("boost-")) {
          unlockedSet.add(addon.tabKey);
        }
        if (addon.extraWordQuota) extraWords += addon.extraWordQuota;
        if (addon.extraArtQuota) extraArt += addon.extraArtQuota;
      }
    });

    state.unlockedTabs = Array.from(unlockedSet);
    const basePlanPrice = state.billingInterval === "annual" ? plan.priceAnnualMonthlyUsd : plan.priceMonthlyUsd;
    state.totalMonthlyChargeUsd = basePlanPrice + addonsTotalUsd;
    state.fundContributionMonthlyUsd = +(state.totalMonthlyChargeUsd * 0.5).toFixed(2); // Exactly 50%

    // Update limits with extra quotas
    state.usage.aiProseWordsLimit = plan.limits.monthlyAiProseWords + extraWords;
    state.usage.coverArtRendersLimit = plan.limits.monthlyCoverArtRenders + extraArt;
    state.usage.storeProductsLimit = plan.limits.storeProductsLimit;
    state.usage.exportsLimitThisMonth = plan.limits.monthlyExportsLimit;

    localStorage.setItem(SUBSCRIPTION_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error saving user subscription:", e);
  }
}

export function recordUsageEvent(
  type: "words" | "art" | "export" | "store_product",
  amount: number = 1
): { allowed: boolean; remaining: number; limit: number; error?: string } {
  const sub = getStoredUserSubscription();
  
  if (type === "words") {
    if (sub.usage.aiProseWordsUsed + amount > sub.usage.aiProseWordsLimit) {
      return {
        allowed: false,
        remaining: Math.max(0, sub.usage.aiProseWordsLimit - sub.usage.aiProseWordsUsed),
        limit: sub.usage.aiProseWordsLimit,
        error: `Monthly AI prose generation limit reached (${sub.usage.aiProseWordsUsed.toLocaleString()} / ${sub.usage.aiProseWordsLimit.toLocaleString()} words). Please upgrade your tier or add a 50k Word Pack.`,
      };
    }
    sub.usage.aiProseWordsUsed += amount;
    saveStoredUserSubscription(sub);
    return {
      allowed: true,
      remaining: sub.usage.aiProseWordsLimit - sub.usage.aiProseWordsUsed,
      limit: sub.usage.aiProseWordsLimit,
    };
  }

  if (type === "art") {
    if (sub.usage.coverArtRendersUsed + amount > sub.usage.coverArtRendersLimit) {
      return {
        allowed: false,
        remaining: Math.max(0, sub.usage.coverArtRendersLimit - sub.usage.coverArtRendersUsed),
        limit: sub.usage.coverArtRendersLimit,
        error: `Monthly Cover Art render limit reached (${sub.usage.coverArtRendersUsed} / ${sub.usage.coverArtRendersLimit} renders). Please upgrade to Author Pro or Guild Master.`,
      };
    }
    sub.usage.coverArtRendersUsed += amount;
    saveStoredUserSubscription(sub);
    return {
      allowed: true,
      remaining: sub.usage.coverArtRendersLimit - sub.usage.coverArtRendersUsed,
      limit: sub.usage.coverArtRendersLimit,
    };
  }

  if (type === "export") {
    if (sub.usage.exportsUsedThisMonth + amount > sub.usage.exportsLimitThisMonth) {
      return {
        allowed: false,
        remaining: 0,
        limit: sub.usage.exportsLimitThisMonth,
        error: `Monthly export limit reached. Please upgrade to a higher tier.`,
      };
    }
    sub.usage.exportsUsedThisMonth += amount;
    saveStoredUserSubscription(sub);
    return {
      allowed: true,
      remaining: sub.usage.exportsLimitThisMonth - sub.usage.exportsUsedThisMonth,
      limit: sub.usage.exportsLimitThisMonth,
    };
  }

  return { allowed: true, remaining: 999, limit: 999 };
}
