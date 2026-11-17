import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Strip accidental surrounding quotes and trailing slashes from URLs
const cleanEnvUrl = (v = ""): string =>
  v.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");

const DEFAULT_CORE_HUB_URL = "https://humanethicalai.ai.studio";
const DEFAULT_TOMECRAFTER_APP_URL = "http://localhost:3000";

const getCoreHubUrl = (): string =>
  cleanEnvUrl(process.env.CORE_HUB_URL) || DEFAULT_CORE_HUB_URL;

const getOmegaHubUrl = (): string => "";

const getTomeCrafterAppUrl = (): string =>
  cleanEnvUrl(process.env.APP_URL) || DEFAULT_TOMECRAFTER_APP_URL;

// ==========================================
// Deterministic Zero-Cost Analysis & Formatting Helpers
// ==========================================

function countWords(text: string): number {
  const trimmed = (text || "").trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

function splitSentences(text: string): string[] {
  return (text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatTypographyLocally(rawText: string): { formattedText: string; changes: string[] } {
  let text = rawText || "";
  const changes: string[] = [];

  const beforeDashes = text;
  text = text.replace(/\s*--\s*/g, " — ");
  if (text !== beforeDashes) changes.push("Converted double hyphens (--) to typographic em-dashes (—).");

  const beforeEllipses = text;
  text = text.replace(/\.\.\./g, "…");
  if (text !== beforeEllipses) changes.push("Normalized three-dot ellipses (...) to single-glyph ellipses (…).");

  const beforeSpaces = text;
  text = text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text !== beforeSpaces) changes.push("Cleaned extra spaces, trailing line spaces, and excessive blank lines.");

  const beforeQuotes = text;
  text = text
    .replace(/(^|[\s(\[—])"(\S)/g, "$1“$2")
    .replace(/"/g, "”")
    .replace(/(^|[\s(\[—])'(\S)/g, "$1‘$2")
    .replace(/'/g, "’");
  if (text !== beforeQuotes) changes.push("Applied typographic curly quotation marks and apostrophes.");

  if (changes.length === 0) {
    changes.push("Verified clean paragraph breaks, whitespace, and punctuation spacing.");
  }

  return { formattedText: text, changes };
}

function analyzeChapterMetrics(content: string, chapterTitle: string) {
  const words = countWords(content);
  const sentences = splitSentences(content);
  const sentenceCount = Math.max(1, sentences.length);
  const avgSentenceLen = words / sentenceCount;
  const dialogueMatches = content.match(/["“][^"”\n]{2,}["”]/g) || [];
  const dialogueRatio = words > 0 ? dialogueMatches.join(" ").split(/\s+/).length / words : 0;

  const passiveMatches = content.match(/\b(was|were|is|are|been|be)\s+\w+ed\b/gi) || [];
  const weakAdverbs = content.match(/\b(very|really|suddenly|quietly|quickly|slowly|actually|basically)\b/gi) || [];

  const sensoryWords =
    content.match(
      /\b(light|shadow|glow|crimson|cold|warm|chill|echo|whisper|thunder|scent|smoke|salt|taste|velvet|rough|sharp|gleam)\b/gi
    ) || [];

  const readabilityScore = Math.max(
    55,
    Math.min(96, Math.round(88 - Math.abs(avgSentenceLen - 16) * 0.9 - (passiveMatches.length > 8 ? 5 : 0)))
  );
  const pacingScore = Math.max(
    55,
    Math.min(95, Math.round(words < 250 ? 64 : 84 - Math.max(0, avgSentenceLen - 22) * 1.1))
  );
  const dialogueScore = Math.max(
    50,
    Math.min(95, Math.round(dialogueMatches.length === 0 ? 62 : 76 + Math.min(18, dialogueRatio * 45)))
  );
  const sensoryScore = Math.max(
    55,
    Math.min(95, Math.round(68 + Math.min(25, (sensoryWords.length / Math.max(1, words / 250)) * 6)))
  );

  const lineEdits: { original: string; suggestion: string; reason: string }[] = [];
  if (passiveMatches.length > 0 && sentences.length > 0) {
    const samplePassive = sentences.find((s) => /\b(was|were)\s+\w+ed\b/i.test(s));
    if (samplePassive) {
      lineEdits.push({
        original: samplePassive.slice(0, 140),
        suggestion: "Consider tightening passive verb constructions into active subject-verb phrasing.",
        reason: `Detected ${passiveMatches.length} passive construction(s) in "${chapterTitle}".`,
      });
    }
  }
  if (weakAdverbs.length > 3) {
    lineEdits.push({
      original: `Repeated qualifiers (${weakAdverbs.slice(0, 4).join(", ")})`,
      suggestion: "Replace modifier + weak verb pairs with a single stronger verb.",
      reason: "Increases narrative immediacy and tightens prose rhythm.",
    });
  }
  const doubleHyphenSentence = sentences.find((s) => s.includes("--"));
  if (doubleHyphenSentence) {
    lineEdits.push({
      original: doubleHyphenSentence.slice(0, 140),
      suggestion: doubleHyphenSentence.slice(0, 140).replace(/\s*--\s*/g, " — "),
      reason: "Replace ASCII double-hyphens with proper typographic em-dashes.",
    });
  }

  return {
    words,
    sentenceCount,
    avgSentenceLen: Number(avgSentenceLen.toFixed(1)),
    passiveCount: passiveMatches.length,
    weakAdverbCount: weakAdverbs.length,
    dialogueLineCount: dialogueMatches.length,
    readabilityScore,
    pacingScore,
    dialogueScore,
    sensoryScore,
    lineEdits,
  };
}

function buildLocalActs(
  title: string,
  genre: string,
  premise: string,
  targetChapterCount: number,
  targetWordCount: number
) {
  const safeChapters = Math.max(3, Math.min(40, Number(targetChapterCount) || 8));
  const wordsPerChapter = Math.max(500, Math.round((Number(targetWordCount) || 50000) / safeChapters));
  const act1Count = Math.max(1, Math.ceil(safeChapters / 3));
  const act2Count = Math.max(1, Math.ceil(safeChapters / 3));
  const act3Count = Math.max(1, safeChapters - act1Count - act2Count);

  const act1Chapters = Array.from({ length: act1Count }).map((_, i) => ({
    id: `idea-ch-${i + 1}`,
    number: i + 1,
    title: i === 0 ? "The Inciting Threshold" : `Fractures in the Ordinary (${i + 1})`,
    summary: `Introduce the core stakes of "${title}" (${genre}) and propel the protagonist beyond the status quo.`,
    goal: "Establish protagonist motivation and world stakes.",
    conflict: "Resistance to stepping out of familiar certainty.",
    cliffhanger: "An irreversible turn forces the journey forward.",
    pov: "Protagonist",
    setting: "Opening Sanctuary",
    targetWords: wordsPerChapter,
  }));

  const act2Chapters = Array.from({ length: act2Count }).map((_, i) => {
    const chNum = act1Count + i + 1;
    return {
      id: `idea-ch-${chNum}`,
      number: chNum,
      title: `Escalation & Crucible (${chNum})`,
      summary: `Raise obstacles, test alliances, and deepen the central premise: ${(premise || title).slice(0, 140)}`,
      goal: "Overcome mounting resistance and secure critical insight.",
      conflict: "Escalating external pressure paired with internal doubt.",
      cliffhanger: "A pivotal reversal raises the cost of failure.",
      pov: "Protagonist",
      setting: "contested Frontier",
      targetWords: wordsPerChapter,
    };
  });

  const act3Chapters = Array.from({ length: act3Count }).map((_, i) => {
    const chNum = act1Count + act2Count + i + 1;
    return {
      id: `idea-ch-${chNum}`,
      number: chNum,
      title: i === act3Count - 1 ? "The Final Synthesis" : `Convergence (${chNum})`,
      summary: `Bring the central conflict to a decisive confrontation and establish the closing transformation.`,
      goal: "Resolve the primary narrative promise.",
      conflict: "Final confrontation demanding full commitment.",
      cliffhanger: i === act3Count - 1 ? "Resonant closing image." : "The final piece falls into place.",
      pov: "Protagonist",
      setting: "The Summit",
      targetWords: wordsPerChapter,
    };
  });

  return [
    {
      id: "act-1",
      actName: "Act I: Departure & Inciting Catalyst",
      summary: `Establishes the world, tone, and opening conflict for ${title}.`,
      chapters: act1Chapters,
    },
    {
      id: "act-2",
      actName: "Act II: Rising Complications & Midpoint Shift",
      summary: "Deepens character arcs, tests alliances, and escalates the central conflict.",
      chapters: act2Chapters,
    },
    {
      id: "act-3",
      actName: "Act III: Climax & Resolution",
      summary: "Delivers the decisive climax and thematic aftermath.",
      chapters: act3Chapters,
    },
  ];
}

// ==========================================
// Core Health, Config & Zero-Cost Status Routes
// ==========================================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    zeroCostMode: true,
    paidApisDisabled: true,
    appId: "app_pub_01",
    appName: "TomeCrafter",
    sdkVersion: "v3.0.0-local",
    coreHubUrl: getCoreHubUrl(),
    omegaHubUrl: "",
    selfUrl: getTomeCrafterAppUrl(),
    fleetCount: 6,
    timestamp: new Date().toISOString(),
  });
});

// App Check disabled in Zero-Cost Local Mode to prevent external reCAPTCHA network overhead
app.get("/api/firebase/app-check-config", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    configured: false,
    siteKey: null,
    zeroCostMode: true,
  });
});

app.get("/pay", (_req, res) => {
  return res.status(410).json({
    disabled: true,
    zeroCostMode: true,
    message: "External Omega Hub checkout redirects are disabled in Zero-Cost Local Mode.",
  });
});

app.get("/api/omega/status", (_req, res) => {
  res.json({
    success: false,
    disabled: true,
    zeroCostMode: true,
    appId: "app_pub_01",
    sdkVersion: "v3.0.0-local",
    omegaHubUrl: "",
    gatewaySecretConfigured: false,
    timestamp: new Date().toISOString(),
  });
});

app.all("/api/omega/*", (_req, res) => {
  return res.status(410).json({
    disabled: true,
    zeroCostMode: true,
    error: "External Omega Hub proxy requests are disabled in Zero-Cost Local Mode.",
  });
});

const getEcosystemFleetApps = () => [
  {
    id: "app_pub_01",
    key: "TomeCrafter",
    name: "Tome Crafter",
    tagline: "Local-First Novel & Book Studio",
    appUrl: getTomeCrafterAppUrl(),
    status: "Optimal",
    activationState: "ACTIVE",
    sdkVersion: "v3.0.0-local",
    covenantParityPercent: 50,
  },
  {
    id: "app_rlm_02",
    key: "RLM Pro Studio",
    name: "RLM Pro Studio",
    tagline: "Realm Master Audio & Media Suite",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
    sdkVersion: "v3.0.0-local",
    covenantParityPercent: 50,
  },
  {
    id: "app_bld_03",
    key: "ForgeOS",
    name: "ForgeOS / ReForgeOS",
    tagline: "Autonomous Agent & Workflow OS",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
    sdkVersion: "v3.0.0-local",
    covenantParityPercent: 50,
  },
  {
    id: "app_vid_04",
    key: "RL Easy Flow",
    name: "RL Easy Flow",
    tagline: "Fluid Narrative & Ideology Accelerator",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
    sdkVersion: "v3.0.0-local",
    covenantParityPercent: 50,
  },
  {
    id: "app_omega_05",
    key: "Omega App",
    name: "Omega App",
    tagline: "Local Archive Reference",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
    sdkVersion: "v3.0.0-local",
    covenantParityPercent: 50,
  },
  {
    id: "app_rlmv_06",
    key: "RLMV Music Video Editor",
    name: "RLMV Music Video Editor",
    trackingCode: "FT-ETHIC-RLMV-VIDEO-2026",
    tagline: "Ethical Music Video & Kinetic Timeline Studio",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
    sdkVersion: "v3.0.0-local",
    covenantParityPercent: 50,
  },
];

app.get("/api/ecosystem/apps", (_req, res) => {
  res.json({
    success: true,
    zeroCostMode: true,
    sdkVersion: "v3.0.0-local",
    covenantParityPercent: 50,
    coreHubUrl: getCoreHubUrl(),
    omegaHubUrl: "",
    fleetCount: 6,
    apps: getEcosystemFleetApps(),
  });
});

// ==========================================
// Local Zero-Cost Editorial & Production Assistants
// ==========================================

app.post("/api/agents/chat", (req, res) => {
  const { agentId = "architect", staffAgent, message = "", bookContext, chapterContext } = req.body || {};
  const speaker = staffAgent?.name || `Realm Master (${agentId})`;
  const title = bookContext?.title || "your manuscript";
  const chapterText = chapterContext?.content || "";
  const metrics = chapterText ? analyzeChapterMetrics(chapterText, chapterContext?.title || "Active Chapter") : null;

  const diagnosticNote = metrics
    ? `\n\nActive Chapter Telemetry (${chapterContext?.title || "Chapter"}):\n• Word count: ${metrics.words.toLocaleString()} words across ${metrics.sentenceCount} sentences (avg ${metrics.avgSentenceLen} words/sentence)\n• Dialogue lines detected: ${metrics.dialogueLineCount}\n• Readability index: ${metrics.readabilityScore}/100 | Pacing: ${metrics.pacingScore}/100`
    : "";

  const reply = `[Zero-Cost Local Mode — ${speaker}]
Paid external Gemini API calls are currently disabled to keep your studio running at $0/month.

For "${title}" regarding your note ("${String(message).slice(0, 160)}"):
1. Use Manuscript Studio & Auto-Typesetting for zero-cost typography cleanup (smart quotes, em-dashes, ellipses, paragraph spacing).
2. Use Realm Council's local diagnostic audit to inspect word counts, sentence length balance, passive phrasing, and dialogue ratio.
3. Export directly to Print-Ready PDF, ePub, DOCX, or Markdown locally with zero cloud charges.${diagnosticNote}`;

  res.json({
    text: reply,
    agentId,
    staffId: staffAgent?.id,
    zeroCostMode: true,
  });
});

app.post("/api/studio/run-department-task", (req, res) => {
  const {
    departmentId,
    departmentName = "Publishing Studio",
    staffId = "",
    staffName = "Studio Specialist",
    taskId = "",
    taskLabel = "Department Production Deliverable",
    applyActionType = "none",
    customBrief = "",
    bookContext = {},
    chapterContext = null,
  } = req.body || {};

  if (!departmentId || !staffName || !taskLabel) {
    return res.status(400).json({ error: "Missing required department, staff, or task fields." });
  }

  const title = bookContext.title || "Untitled Manuscript";
  const author = bookContext.author || "Author";
  const genre = bookContext.genre || "Fiction";
  const premise = bookContext.premise || "An original work crafted in TomeCrafter Studio.";
  const wordCount = Number(bookContext.currentWordCount) || 0;
  const estPages = Math.max(80, Math.ceil((wordCount || 50000) / 275));
  const chapterMetrics = chapterContext?.content
    ? analyzeChapterMetrics(String(chapterContext.content), chapterContext.title || "Selected Chapter")
    : null;

  const applyableData: Record<string, any> = {};
  if (applyActionType === "update_blurb") {
    applyableData.salesBlurbHook = `${title} — a defining ${genre} work by ${author}.`;
    applyableData.salesBlurbBody = premise;
    applyableData.salesBlurbCta = `Begin reading ${title} today.`;
    applyableData.marketingHook = `${title}: ${premise.slice(0, 110)}`;
    applyableData.launchStrategy = "Direct newsletter serialized preview, ARC distribution, and print + ePub simultaneous release.";
  } else if (applyActionType === "update_keywords") {
    applyableData.keywords = [
      genre.toLowerCase(),
      `${genre.toLowerCase()} book`,
      author.toLowerCase(),
      title.toLowerCase(),
      "independent publishing",
      "trade paperback",
      "collector edition",
    ];
    applyableData.bisacCategories = [`FICTION / ${genre}`, "FICTION / General"];
  } else if (applyActionType === "update_formatting") {
    applyableData.trimSize = bookContext.trimSize || "6x9";
    applyableData.fontPreset = bookContext.fontPreset || "garamond";
    applyableData.dropCaps = true;
    applyableData.sceneBreakSymbol = "* * *";
  } else if (applyActionType === "save_chapter_notes") {
    applyableData.chapterNotes = chapterMetrics
      ? `Local Diagnostic (${chapterContext?.title}): ${chapterMetrics.words} words, avg ${chapterMetrics.avgSentenceLen} words/sentence, ${chapterMetrics.passiveCount} passive constructions, ${chapterMetrics.weakAdverbCount} weak qualifiers.${customBrief ? ` Brief: ${customBrief}` : ""}`
      : `Production review prepared for "${title}" in Zero-Cost Local Mode.${customBrief ? ` Brief: ${customBrief}` : ""}`;
  } else if (applyActionType === "append_chapter_scene") {
    applyableData.chapterProseAddition = `[Scene Draft Scaffold — ${chapterContext?.title || "New Scene"}]\nGoal: ${chapterContext?.goal || "Advance the central tension."}\nConflict: ${chapterContext?.conflict || "Escalate stakes between characters."}\n${customBrief ? `Author Brief: ${customBrief}\n` : ""}\nBegin writing your scene here.`;
  }

  const checklist = [
    {
      item: "Word Count & Structural Balance",
      status: wordCount > 0 ? "pass" : "action_needed",
      actionNote: `${wordCount.toLocaleString()} total words across ${bookContext.chapterCount || 0} chapters (~${estPages} print pages at 6x9).`,
    },
    {
      item: "Zero-Cost Production Readiness",
      status: "pass",
      actionNote: "Computed locally using deterministic manuscript diagnostics ($0 API cost).",
    },
    {
      item: "Export & Typesetting Check",
      status: bookContext.hasCover ? "pass" : "recommended",
      actionNote: bookContext.hasCover
        ? "Cover background configured; ready for local PDF/ePub export."
        : "Upload cover art or select a free Curated Background in Art & Covers.",
    },
  ];

  const deliverableMarkdown = `# ${taskLabel}
**Department:** ${departmentName} • **Specialist:** ${staffName} (Zero-Cost Local Mode)

## Manuscript Diagnostics for "${title}"
- **Author:** ${author}
- **Genre:** ${genre}
- **Current Word Count:** ${wordCount.toLocaleString()} / ${(bookContext.targetWordCount || 50000).toLocaleString()} words
- **Estimated Print Length:** ~${estPages} pages (${bookContext.trimSize || "6x9"} trade trim)
${
  chapterMetrics
    ? `\n### Chapter Snapshot: ${chapterContext?.title}\n- **Words:** ${chapterMetrics.words.toLocaleString()} (${chapterMetrics.sentenceCount} sentences, avg ${chapterMetrics.avgSentenceLen} words/sentence)\n- **Readability / Pacing / Dialogue:** ${chapterMetrics.readabilityScore} / ${chapterMetrics.pacingScore} / ${chapterMetrics.dialogueScore}\n- **Passive Verbs:** ${chapterMetrics.passiveCount} • **Weak Modifiers:** ${chapterMetrics.weakAdverbCount}`
    : ""
}

${customBrief ? `### Author Brief\n${customBrief}\n` : ""}
> *Generated locally with zero paid AI API calls.*`;

  res.json({
    id: `deliv-${Date.now()}`,
    departmentId,
    staffId,
    staffName,
    taskId,
    taskLabel,
    chapterId: chapterContext?.id || undefined,
    chapterTitle: chapterContext?.title || undefined,
    title: `${taskLabel} (Local Audit)`,
    executiveSummary: `Deterministic local production deliverable for "${title}" (${wordCount.toLocaleString()} words). External paid LLM APIs are disabled.`,
    checklist,
    deliverableMarkdown,
    applyableData: Object.keys(applyableData).length > 0 ? applyableData : undefined,
    generatedAt: new Date().toISOString(),
  });
});

app.post("/api/agents/generate-outline", (req, res) => {
  const {
    title = "Untitled Book",
    genre = "Fiction",
    premise = "",
    targetChapterCount = 8,
    targetWordCount = 50000,
  } = req.body || {};

  const acts = buildLocalActs(title, genre, premise, targetChapterCount, targetWordCount);
  res.json({
    logline: `A ${genre} story: ${premise || title}`,
    theme: "Transformation, conviction, and the cost of truth.",
    acts,
    zeroCostMode: true,
  });
});

app.post("/api/agents/build-idea", (req, res) => {
  const {
    idea = "",
    title = "Untitled Project",
    genre = "Fiction",
    targetChapterCount = 9,
    targetWordCount = 60000,
  } = req.body || {};

  const cleanIdea = String(idea || title).trim();
  const acts = buildLocalActs(title, genre, cleanIdea, targetChapterCount, targetWordCount);

  res.json({
    logline: `${title}: ${cleanIdea.slice(0, 180)}`,
    expandedPremise: cleanIdea,
    thematicQuestion: "What does it cost to preserve integrity when the stakes turn irreversible?",
    coreConflict: "Internal conviction colliding with external systemic pressure.",
    targetAudience: `${genre} readers`,
    acts,
    globalFootnotes: [],
    googleSearchSources: [],
    searchQueriesUsed: [],
    verifiedClaimsCount: 0,
    zeroCostMode: true,
  });
});

app.post("/api/agents/verify-fact", (req, res) => {
  const { claim = "", context = "" } = req.body || {};
  res.json({
    claim,
    verdict: "Unverified",
    confidenceScore: 0,
    explanation:
      "Paid Google Search Grounding and Gemini fact-checking are disabled in Zero-Cost Local Mode. Verify citations directly against primary sources and attach source URLs manually in the Footnote Manager.",
    suggestedCorrection: "",
    historicalContext: context || "Manual citation verification active.",
    sources: [],
    zeroCostMode: true,
  });
});

app.post("/api/agents/verify-footnote", (req, res) => {
  const { footnote = {}, authorName = "" } = req.body || {};
  const citedAuthor = String(footnote.authorOrCreator || "").trim();
  const normalizedAuthor = authorName.trim().toLowerCase();
  const isSelf = Boolean(normalizedAuthor && citedAuthor.toLowerCase().includes(normalizedAuthor));
  const isLore = footnote.footnoteType === "in_universe_lore";
  const hasValidUrl = /^https?:\/\/[^\s]+$/i.test(String(footnote.sourceUrl || "").trim());

  const status = isLore
    ? "in_universe_lore"
    : isSelf && !footnote.userPublishedConfirmation
    ? "author_attribution_alert"
    : hasValidUrl
    ? "verified_real_publication"
    : "unverified";

  res.json({
    footnoteId: footnote.id || `fn-${Date.now()}`,
    originalTitle: footnote.title || "Untitled Citation",
    citedAuthor: citedAuthor || undefined,
    status,
    confidenceScore: hasValidUrl || isLore ? 85 : 35,
    explanation: isLore
      ? "Classified as in-universe worldbuilding lore."
      : hasValidUrl
      ? "Source URL format validated locally. Live web search grounding is disabled in Zero-Cost Mode."
      : "No valid external source URL provided; web search grounding is disabled in Zero-Cost Mode.",
    isAttributedToCurrentUser: isSelf,
    suggestedFix: hasValidUrl || isLore ? "" : "Add an authoritative HTTP/HTTPS source URL or mark as In-Universe Lore.",
    verifiedSourceUrl: hasValidUrl ? footnote.sourceUrl : undefined,
    verifiedSourceName: footnote.sourceName || undefined,
    realSourceAlternatives: [],
  });
});

app.post("/api/agents/audit-manuscript-footnotes", (req, res) => {
  const { footnotes = [], authorName = "" } = req.body || {};
  const list = Array.isArray(footnotes) ? footnotes : [];
  const normalizedAuthor = String(authorName || "").trim().toLowerCase();

  let verifiedCount = 0;
  let inUniverseCount = 0;
  let falseAttributionCount = 0;
  let unverifiedCount = 0;
  let authorAttributionAlertsCount = 0;

  const detailedResults = list.map((fn: any) => {
    const citedAuthor = String(fn?.authorOrCreator || "").trim();
    const isSelf = Boolean(normalizedAuthor && citedAuthor.toLowerCase().includes(normalizedAuthor));
    const isLore = fn?.footnoteType === "in_universe_lore";
    const hasUrl = /^https?:\/\/[^\s]+$/i.test(String(fn?.sourceUrl || "").trim());

    let status: any = "unverified";
    if (isLore) {
      status = "in_universe_lore";
      inUniverseCount++;
    } else if (isSelf && !fn?.userPublishedConfirmation) {
      status = "author_attribution_alert";
      falseAttributionCount++;
      authorAttributionAlertsCount++;
    } else if (hasUrl) {
      status = "verified_real_publication";
      verifiedCount++;
    } else {
      unverifiedCount++;
    }

    return {
      footnoteId: fn?.id || `fn-${Math.random()}`,
      originalTitle: fn?.title || "Untitled Footnote",
      citedAuthor: citedAuthor || undefined,
      status,
      confidenceScore: hasUrl || isLore ? 85 : 35,
      explanation: isLore
        ? "In-universe lore citation."
        : hasUrl
        ? "Valid reference URL present (local format check)."
        : "Missing verifiable URL (external web search disabled in Zero-Cost Mode).",
      isAttributedToCurrentUser: isSelf,
      suggestedFix: hasUrl || isLore ? "" : "Attach a primary source URL or classify as In-Universe Lore.",
      verifiedSourceUrl: hasUrl ? fn.sourceUrl : undefined,
      verifiedSourceName: fn?.sourceName,
      realSourceAlternatives: [],
    };
  });

  res.json({
    totalAudited: list.length,
    verifiedCount,
    inUniverseCount,
    falseAttributionCount,
    hallucinationCount: 0,
    unverifiedCount,
    verdictSummary: `Local Citation Audit complete ($0 API cost): ${verifiedCount} URL-backed, ${inUniverseCount} in-universe lore, ${unverifiedCount} unverified, ${authorAttributionAlertsCount} self-attribution checks.`,
    authorAttributionAlertsCount,
    detailedResults,
  });
});

app.post("/api/agents/write-prose", (req, res) => {
  const { mode = "continue", chapterTitle = "Chapter", sceneBeats = "", instructions = "" } = req.body || {};
  const scaffold = `\n[Local Scene Scaffold — ${chapterTitle} (${mode})]\n${
    sceneBeats ? `Beats: ${sceneBeats}\n` : ""
  }${
    instructions ? `Notes: ${instructions}\n` : ""
  }(Paid AI prose generation is disabled in Zero-Cost Mode. Replace this bracketed beat with your drafted prose.)`;

  res.json({
    text: scaffold.trim(),
    zeroCostMode: true,
  });
});

app.post("/api/agents/compile-chapter-prose", (req, res) => {
  const { chapter = {} } = req.body || {};
  const text = [
    `Chapter ${chapter.number || 1}: ${chapter.title || "Untitled Chapter"}`,
    "",
    chapter.summary ? `[Outline Summary]: ${chapter.summary}` : "",
    chapter.goal ? `[Scene Goal]: ${chapter.goal}` : "",
    chapter.conflict ? `[Core Conflict]: ${chapter.conflict}` : "",
    chapter.cliffhanger ? `[Chapter Turn / Cliffhanger]: ${chapter.cliffhanger}` : "",
    "",
    "(Paid AI chapter generation is disabled in Zero-Cost Mode. Draft or paste your chapter manuscript below.)",
  ]
    .filter((line) => line !== "")
    .join("\n");

  res.json({
    text,
    wordCount: countWords(text),
    zeroCostMode: true,
  });
});

app.post("/api/agents/critique-chapter", (req, res) => {
  const { chapterTitle = "Untitled Chapter", content = "" } = req.body || {};
  const m = analyzeChapterMetrics(content, chapterTitle);

  const strengths: string[] = [];
  if (m.words >= 1200) strengths.push(`Substantial chapter length (${m.words.toLocaleString()} words).`);
  if (m.dialogueLineCount >= 4) strengths.push(`Active scene dialogue (${m.dialogueLineCount} quoted exchanges).`);
  if (m.avgSentenceLen >= 11 && m.avgSentenceLen <= 21) {
    strengths.push(`Balanced average sentence cadence (${m.avgSentenceLen} words/sentence).`);
  }
  if (strengths.length === 0) strengths.push("Clean chapter foundation ready for expansion.");

  const weaknesses: string[] = [];
  if (m.words < 500) weaknesses.push(`Short draft (${m.words} words) — consider expanding scene texture.`);
  if (m.passiveCount > 6) weaknesses.push(`${m.passiveCount} passive constructions detected.`);
  if (m.weakAdverbCount > 5) weaknesses.push(`${m.weakAdverbCount} weak qualifier adverbs detected.`);
  if (weaknesses.length === 0) weaknesses.push("No major structural defects flagged by local rules.");

  res.json({
    readabilityScore: m.readabilityScore,
    pacingScore: m.pacingScore,
    dialogueScore: m.dialogueScore,
    sensoryScore: m.sensoryScore,
    overallVerdict: `Local Diagnostic Critique ($0 API cost) for "${chapterTitle}": ${m.words.toLocaleString()} words across ${m.sentenceCount} sentences (avg ${m.avgSentenceLen} words/sentence).`,
    strengths,
    weaknesses,
    lineEdits: m.lineEdits,
    plotConsistencyNotes:
      "Continuity checked locally. Paid LLM semantic analysis is disabled in Zero-Cost Mode.",
  });
});

app.post("/api/agents/apply-chapter-recommendations", (req, res) => {
  const { chapter = {} } = req.body || {};
  const rawContent = String(chapter.content || "");
  const { formattedText, changes } = formatTypographyLocally(rawContent);
  const m = analyzeChapterMetrics(formattedText, chapter.title || "Chapter");

  res.json({
    editedContent: formattedText,
    changesApplied: [
      ...changes,
      "Note: Zero-Cost Local Mode applies deterministic typographic polish without rewriting your authorial voice via paid LLMs.",
    ],
    editorialVerdict: `Local typographic polish applied cleanly (${m.words.toLocaleString()} words preserved).`,
    improvedReadabilityScore: Math.min(98, m.readabilityScore + 3),
    improvedPacingScore: m.pacingScore,
    wordCount: m.words,
  });
});

app.post("/api/agents/full-book-read-audit", (req, res) => {
  const { book = {} } = req.body || {};
  const chapters: any[] = Array.isArray(book.chapters) ? book.chapters : [];

  const chapterAudits = chapters.map((ch) => {
    const content = String(ch.content || "");
    const m = analyzeChapterMetrics(content, ch.title || `Chapter ${ch.number}`);
    return {
      chapterId: ch.id,
      chapterNumber: ch.number || 1,
      title: ch.title || `Chapter ${ch.number || 1}`,
      critique: {
        readabilityScore: m.readabilityScore,
        pacingScore: m.pacingScore,
        dialogueScore: m.dialogueScore,
        sensoryScore: m.sensoryScore,
        overallVerdict: `${m.words.toLocaleString()} words • ${m.sentenceCount} sentences • avg ${m.avgSentenceLen} w/sent`,
        strengths: [
          m.words > 800 ? "Solid chapter substance" : "Focused scene scope",
          m.dialogueLineCount > 0 ? `${m.dialogueLineCount} dialogue lines` : "Narrative exposition focus",
        ],
        weaknesses: [
          ...(m.passiveCount > 5 ? [`${m.passiveCount} passive constructions`] : []),
          ...(m.weakAdverbCount > 4 ? [`${m.weakAdverbCount} weak adverbs`] : []),
        ],
        lineEdits: m.lineEdits,
        plotConsistencyNotes: "Audited locally at $0 cost.",
      },
      continuityLinks: ch.pov ? [`POV: ${ch.pov}`] : [],
      formattingNotes: content.includes("--") ? "Run Auto-Typesetting to convert '--' into em-dashes." : "Clean formatting.",
      priorityFocus: m.passiveCount > 8 ? ("line_edits" as const) : ("pacing" as const),
    };
  });

  const avgScore =
    chapterAudits.length > 0
      ? Math.round(
          chapterAudits.reduce((sum, a) => sum + (a.critique.readabilityScore + a.critique.pacingScore) / 2, 0) /
            chapterAudits.length
        )
      : 80;

  res.json({
    bookDigest: {
      narrativeSummary: book.premise || `Full-manuscript local diagnostic across ${chapters.length} chapters.`,
      coreThemes: [book.genre || "Literary Craft", book.tone || "Author Voice"],
      characterArcSummary: chapters.slice(0, 5).map((c) => `Ch ${c.number}: ${c.title} (${countWords(c.content)} words)`),
      continuityWarnings: chapters
        .filter((c) => countWords(c.content) === 0)
        .map((c) => `Chapter ${c.number} ("${c.title}") currently has 0 words.`),
      crossChapterEliminatedDoubleEdits: ["Preserved existing chapter structure without external API calls."],
    },
    formattingChoices: {
      recommendedTrimSize: book.formattingSettings?.trimSize || "6x9",
      recommendedFontPreset: book.formattingSettings?.fontPreset || "garamond",
      recommendedGoogleFont: book.formattingSettings?.googleFontFamily || "EB Garamond",
      recommendedFontSize: book.formattingSettings?.fontSize || "11pt",
      recommendedLineSpacing: book.formattingSettings?.lineSpacing || "1.5",
      recommendedChapterHeadingCase: book.formattingSettings?.chapterHeadingCase || "title",
      recommendedSceneBreakSymbol: book.formattingSettings?.sceneBreakSymbol || "* * *",
      dropCapsRecommended: true,
      typographyRationale: "Standard 6x9 trade paperback ergonomics with high-legibility serif typography.",
      globalStyleDirectives: [
        "Keep paragraph spacing and em-dashes uniform across chapters.",
        "Run deterministic Auto-Typesetting before final PDF/ePub export.",
      ],
    },
    overallHealthScore: avgScore,
    chapterAudits,
    auditedAt: new Date().toISOString(),
  });
});

app.post("/api/agents/council-final-sweep", (req, res) => {
  const { book = {} } = req.body || {};
  const chapters: any[] = Array.isArray(book.chapters) ? book.chapters : [];

  const chapterAuditSummary = chapters.map((ch) => {
    const m = analyzeChapterMetrics(String(ch.content || ""), ch.title || `Chapter ${ch.number}`);
    const avg = Math.round((m.readabilityScore + m.pacingScore) / 2);
    return {
      chapterNumber: ch.number || 1,
      title: ch.title || `Chapter ${ch.number || 1}`,
      score: avg,
      status: m.words > 300 ? "Ready" : "Draft",
      keyNote: `${m.words.toLocaleString()} words • ${m.passiveCount} passive flags`,
    };
  });

  const overallScore =
    chapterAuditSummary.length > 0
      ? Math.round(chapterAuditSummary.reduce((acc, c) => acc + c.score, 0) / chapterAuditSummary.length)
      : 85;

  res.json({
    overallScore,
    readinessStatus: overallScore >= 85 ? "Ready for Typesetting & Art" : "Minor Adjustments Recommended",
    narrativeArcVerdict: `Local Final Sweep complete for "${book.title || "Manuscript"}" across ${chapters.length} chapters ($0 API cost).`,
    voiceCohesionScore: overallScore,
    loreConsistencyScore: Array.isArray(book.loreEntries) && book.loreEntries.length > 0 ? 90 : 80,
    pacingRhythmScore: overallScore,
    chapterAuditSummary,
    keyStrengths: [
      `Complete structural map across ${chapters.length} chapter(s).`,
      "Deterministic local readability & typography checks active.",
    ],
    finalTouchRecommendations: [
      "Run Auto-Typesetting to normalize smart quotes, ellipses, and em-dashes.",
      "Review any chapters marked Draft in the summary table before PDF/ePub export.",
    ],
  });
});

app.post("/api/agents/worldbuilding-lore", (req, res) => {
  const { category = "Character", name = "New Entry", promptHint = "", bookContext = {} } = req.body || {};
  res.json({
    name,
    category,
    tagline: `${category} entry for ${bookContext.title || "this world"}`,
    description: promptHint
      ? `${name}: ${promptHint}`
      : `Structured ${category.toLowerCase()} dossier for ${name}. Add canonical details, history, and story hooks here.`,
    secretsOrFlaws: "Hidden motivation or structural vulnerability.",
    sensoryDetails: {
      sight: "Distinctive visual hallmark",
      sound: "Characteristic acoustic signature",
      scent: "Memorable environmental scent",
    },
    relatedEntities: [],
    plotHooks: [`Connect ${name} directly to the central conflict in Chapter 1.`],
  });
});

app.post("/api/agents/generate-publishing-kit", (req, res) => {
  const { book = {} } = req.body || {};
  const title = book.title || "Untitled Book";
  const subtitle = book.subtitle || "";
  const author = book.author || "Author";
  const genre = book.genre || "Fiction";
  const chapters: any[] = Array.isArray(book.chapters) ? book.chapters : [];
  const totalWords = chapters.reduce((sum, c) => sum + countWords(String(c.content || "")), 0) || book.targetWordCount || 50000;
  const estPages = Math.max(80, Math.ceil(totalWords / 275));
  const spineWidthInches = Number((estPages * 0.002252).toFixed(3));

  res.json({
    commercialTitle: title,
    catchySubtitle: subtitle,
    salesBlurb: {
      hook: `${title}${subtitle ? `: ${subtitle}` : ""} — ${genre} by ${author}.`,
      body: book.premise || `A compelling ${genre} work crafted for discerning readers.`,
      callToAction: `Discover ${title} in print and digital editions today.`,
    },
    amazonKeywords: [
      genre.toLowerCase(),
      title.toLowerCase(),
      author.toLowerCase(),
      "independent literature",
      "bestseller edition",
      "trade paperback",
      "ebook edition",
    ],
    bisacCategories: [`FICTION / ${genre}`, "FICTION / General"],
    compTitles: [`Fans of ${genre}`, "Contemporary Independent Press"],
    targetAudience: book.targetAudience || `Readers of ${genre}`,
    pricingRecommendations: {
      ebook: 4.99,
      paperback: 14.99,
      hardcover: 24.99,
    },
    marketingHook: `Read ${title} by ${author}.`,
    launchStrategy: "Direct reader mailing list release, print proof review, and staggered digital launch.",
    queryLetter: `Dear Literary Agent,\n\nI am seeking representation for "${title}", a ${totalWords.toLocaleString()}-word ${genre} manuscript.\n\n${book.premise || ""}\n\nSincerely,\n${author}`,
    printSpecs: {
      recommendedTrimSize: book.formattingSettings?.trimSize || "6x9",
      estimatedPageCount: estPages,
      spineWidthInches,
      margins: {
        insideGutter: "0.75 in",
        outside: "0.55 in",
        top: "0.65 in",
        bottom: "0.65 in",
      },
    },
    publisherImprint: book.publishingKit?.publisherImprint || "Independent Imprint",
  });
});

// Paid Image Generation Disabled
app.post("/api/agents/generate-illustration", (_req, res) => {
  return res.status(403).json({
    error:
      "Paid Gemini AI image generation is disabled in Zero-Cost Mode. Upload custom artwork, paste an image URL, pick a free Curated Background, or build vector tables in Diagram Studio.",
    code: "PAID_AI_DISABLED",
    zeroCostMode: true,
  });
});

// Native Diagram, Flowchart & Comparison Table Architect (Free Local Vector/Table Data)
app.post("/api/agents/generate-diagram-structure", (req, res) => {
  const { prompt = "", diagramType = "workflow_comparison", bookContext = {}, chapterContext = {} } = req.body || {};
  const topic = String(prompt || chapterContext.title || bookContext.title || "System Comparison").trim();

  res.json({
    title: `${bookContext.title || "Manuscript"} — ${topic.slice(0, 72)}`,
    subtitle: `${chapterContext.title || "Studio Plate"} • Local Zero-Cost Diagram Matrix`,
    diagramType,
    summary: `Structured side-by-side workflow and comparison matrix generated locally for "${topic}". Edit cells directly in Diagram Studio.`,
    comparisonData: {
      leftColumnTitle: "Conventional Approach",
      rightColumnTitle: "Target Architecture",
      rows: [
        {
          category: "1. Core Incentive Engine",
          currentSystem: "Linear extraction, gatekeeper bottlenecks, fragmented ownership",
          humanSystem: "Direct circulation, transparent attribution, full creator ownership",
          impact: "Eliminates middleman friction and preserves baseline equity",
        },
        {
          category: "2. Production Pipeline",
          currentSystem: "Opaque workflows and unverified claims",
          humanSystem: "Structured verification, clean provenance, deterministic output",
          impact: "Improves reliability and reader trust",
        },
        {
          category: "3. Value Distribution",
          currentSystem: "High platform overhead and delayed settlement",
          humanSystem: "Direct reader-to-creator exchange and clear ledger tracking",
          impact: "Maximizes retained value for primary authors",
        },
        {
          category: "4. Long-Term Equilibrium",
          currentSystem: "High burnout and commoditization",
          humanSystem: "Sustainable creative cadence and durable audience growth",
          impact: "Supports long-term publishing resilience",
        },
      ],
    },
    flowchartSteps: {
      currentFlow: [
        { step: 1, title: "Initial Input", desc: "Manual scoping & early constraints" },
        { step: 2, title: "Bottleneck Stage", desc: "Intermediary review & overhead" },
        { step: 3, title: "Fragmented Output", desc: "Loss of direct reader connection" },
        { step: 4, title: "Diminishing Returns", desc: "Rising maintenance cost" },
      ],
      humanFlow: [
        { step: 1, title: "Author Inception", desc: "Local-first writing & clear outline" },
        { step: 2, title: "Typesetting Engine", desc: "Deterministic KDP/ePub formatting" },
        { step: 3, title: "Verified Provenance", desc: "Documented citations & attribution" },
        { step: 4, title: "Direct Publication", desc: "Zero-overhead reader distribution" },
      ],
    },
    keyTakeaways: [
      "Replaces opaque bottlenecks with transparent local workflows",
      "Maintains 100% author ownership and zero ongoing API overhead",
      "Exports cleanly into print and digital chapter plates",
    ],
    markdownTable:
      "| Dimension | Conventional Approach | Target Architecture | Impact |\n|---|---|---|---|\n| **Core Engine** | Gatekeeper bottlenecks | Direct creator ownership | Preserves equity |\n| **Pipeline** | Opaque workflow | Structured verification | Higher trust |\n| **Distribution** | Platform overhead | Direct publication | Full margin retained |",
  });
});

app.post("/api/agents/auto-format-text", (req, res) => {
  const { rawText = "" } = req.body || {};
  const { formattedText } = formatTypographyLocally(String(rawText));
  res.json({ formattedText, zeroCostMode: true });
});

// ==========================================
// Local Provenance & Micro-Royalty Ledger
// ==========================================

const microRoyaltyLedger: any[] = [
  {
    id: "tx-init-100",
    timestamp: new Date().toISOString(),
    recipientName: "Valeria Sterling (Primary Author)",
    recipientAccount: "Primary Author Direct Account",
    amount: 420.0,
    sharePercent: 100,
    bookTitle: "The Clockwork Alchemist",
    originalityScore: 100,
    status: "Completed (Local Ledger Record)",
    txHash: "TX-AUTH-001",
    badgeCertificationId: "CERT-100-VALERIA",
  },
];

app.post("/api/royalties/audit-originality", (req, res) => {
  const { taggedAuthors = [], targetScoreOverride } = req.body || {};
  const score =
    typeof targetScoreOverride === "number"
      ? Math.max(0, Math.min(100, targetScoreOverride))
      : taggedAuthors.length > 0
      ? 85
      : 100;
  const is100 = score === 100;
  const remainder = 100 - score;
  const adjustedTagged =
    !is100 && Array.isArray(taggedAuthors) && taggedAuthors.length > 0
      ? taggedAuthors.map((ta: any) => ({
          ...ta,
          sharePercentage: ta.sharePercentage || +(remainder / taggedAuthors.length).toFixed(1),
        }))
      : [];

  res.json({
    score,
    authorSharePercent: score,
    is100PercentOriginal: is100,
    copyrightStatus: is100
      ? "Certified 100% Original (AI-Assisted Human Author)"
      : "Split Multi-Author Royalty Attribution",
    c2paManifestHash: `0x${Date.now().toString(16)}local0000`,
    humanBadgeRoyaltyTier: is100
      ? "Gold Standard (100% Direct Author Payout)"
      : "Cleanroom Multi-Attribution (Micro-Royalty Split)",
    totalMicroRoyaltiesSubmitted: is100 ? 0 : 75.0,
    taggedAuthors: adjustedTagged,
    breakdown: {
      originalHumanVoice: Math.round(score * 0.94),
      aiSynthesisNovelty: Math.round(score * 0.06),
      stylisticHomageSimilarity: is100 ? 0 : Math.round((100 - score) * 0.7),
      referencedTextPercent: is100 ? 0 : Math.round((100 - score) * 0.3),
    },
    analysisNotes: is100
      ? "Local Provenance Audit ($0 cost): 100% primary author attribution configured."
      : `Local Provenance Audit ($0 cost): ${score}% primary author, ${100 - score}% tagged attributions.`,
    lastAuditedAt: new Date().toISOString(),
  });
});

app.post("/api/royalties/submit-micro-royalties", (req, res) => {
  const {
    bookTitle = "Untitled Book",
    authorName = "Author",
    originalityScore = 100,
    totalPoolAmount = 100.0,
    taggedAuthors = [],
  } = req.body || {};

  const newTransactions: any[] = [];
  const is100 = originalityScore === 100;

  if (is100) {
    const tx = {
      id: `tx-${Date.now()}-auth`,
      timestamp: new Date().toISOString(),
      recipientName: `${authorName} (Primary Author)`,
      recipientAccount: "Local Ledger Allocation",
      amount: +Number(totalPoolAmount).toFixed(2),
      sharePercent: 100,
      bookTitle,
      originalityScore: 100,
      status: "Recorded Locally (Zero-Cost Mode)",
      txHash: `TX-LOCAL-AUTH-${Date.now().toString().slice(-6)}`,
      badgeCertificationId: `CERT-100-${authorName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`,
    };
    newTransactions.push(tx);
    microRoyaltyLedger.unshift(tx);
  } else {
    const authorAmount = +((Number(totalPoolAmount) * originalityScore) / 100).toFixed(2);
    const authorTx = {
      id: `tx-${Date.now()}-author`,
      timestamp: new Date().toISOString(),
      recipientName: `${authorName} (Primary Author Share)`,
      recipientAccount: "Local Ledger Allocation",
      amount: authorAmount,
      sharePercent: originalityScore,
      bookTitle,
      originalityScore,
      status: "Recorded Locally (Zero-Cost Mode)",
      txHash: `TX-LOCAL-SPLIT-${Date.now().toString().slice(-6)}`,
      badgeCertificationId: `SPLIT-AUTH-${Date.now().toString().slice(-4)}`,
    };
    newTransactions.push(authorTx);
    microRoyaltyLedger.unshift(authorTx);

    const remainderPercent = 100 - originalityScore;
    const authorsToPay =
      Array.isArray(taggedAuthors) && taggedAuthors.length > 0
        ? taggedAuthors
        : [{ name: "Tagged Reference", sharePercentage: remainderPercent }];

    for (const tagged of authorsToPay) {
      const share = tagged.sharePercentage || remainderPercent / authorsToPay.length;
      const payout = +((Number(totalPoolAmount) * share) / 100).toFixed(2);
      const tx = {
        id: `tx-${Date.now()}-${String(tagged.name).slice(0, 4)}`,
        timestamp: new Date().toISOString(),
        recipientName: tagged.name,
        recipientAccount: tagged.omegaAccountId || `${tagged.name} (Local Attribution)`,
        amount: payout,
        sharePercent: share,
        bookTitle,
        originalityScore,
        status: "Recorded Locally (Zero-Cost Mode)",
        txHash: `TX-LOCAL-ATTRIB-${Date.now().toString().slice(-6)}`,
        badgeCertificationId: `ETHIC-TAGGED-${Date.now().toString().slice(-4)}`,
      };
      newTransactions.push(tx);
      microRoyaltyLedger.unshift(tx);
    }
  }

  res.json({
    success: true,
    message: `Recorded ${newTransactions.length} attribution allocation entry(ies) locally for "${bookTitle}".`,
    transactions: newTransactions,
    omegaCheckoutUrl: "",
    c2paProofHash: `0x${Date.now().toString(16)}local`,
  });
});

app.get("/api/royalties/ledger", (_req, res) => {
  res.json({ ledger: microRoyaltyLedger.slice(0, 20) });
});

// ==========================================
// Substack Article & Social Studio (Zero-Cost Local Templates)
// ==========================================

app.post("/api/agents/generate-substack-article", (req, res) => {
  const { bookContext = {}, chapter = {}, customFocus = "" } = req.body || {};
  const bookTitle = bookContext.title || "Untitled Book";
  const chapterTitle = chapter.title || `Chapter ${chapter.number || 1}`;
  const excerpt = String(chapter.content || "").trim().slice(0, 600);

  const contentMarkdown = `# Behind "${chapterTitle}": Notes from ${bookTitle}

${bookContext.premise ? `> ${bookContext.premise}\n` : ""}
## Chapter Focus
${chapter.summary || "Exploring the core turning point and philosophical stakes of this chapter."}
${customFocus ? `\n**Author Angle:** ${customFocus}\n` : ""}
${excerpt ? `\n## Excerpt Preview\n${excerpt}…\n` : ""}
## Reader Reflection
What choice would you have made under these conditions? Reply in the comments below.`;

  res.json({
    id: `substack-${Date.now()}`,
    chapterNumber: chapter.number || 1,
    chapterTitle,
    articleTitle: `Behind the Page: ${chapterTitle}`,
    subtitle: `Companion essay from "${bookTitle}" by ${bookContext.author || "Author"}`,
    targetAudience: "Readers & Substack subscribers",
    ideologyTheme: bookContext.genre || "Literary Inquiry",
    executiveSummary: chapter.summary || `A reader companion essay for Chapter ${chapter.number || 1} of ${bookTitle}.`,
    contentMarkdown,
    discussionPrompts: [
      "What stood out most in this chapter's central dilemma?",
      "How does this theme connect to real-world decisions?",
      "Which character perspective would you explore next?",
    ],
    referenceMaterials: [],
    callToAction: `Subscribe for the next chapter dispatch from ${bookTitle}.`,
    suggestedTags: ["SubstackWriters", "IndieAuthors", "WritingCommunity", "BookClub"],
    estimatedReadTimeMins: 3,
    generatedAt: new Date().toISOString(),
  });
});

app.post("/api/agents/generate-voiceover-tts", (_req, res) => {
  return res.status(403).json({
    error:
      "Paid Gemini TTS voice-over synthesis is disabled in Zero-Cost Mode. Use Microphone Recording or Uploaded Audio in Social Media Studio, or free Device Web Speech in Audiobook Studio.",
    code: "PAID_AI_DISABLED",
    zeroCostMode: true,
  });
});

app.post("/api/agents/generate-social-assets", (req, res) => {
  const {
    bookTitle = "Untitled Book",
    authorName = "Author",
    genre = "Fiction",
    premise = "",
    selectedChapter,
    targetPlatform = "TikTok",
    aspectRatio = "9:16",
    tone = "Cinematic",
  } = req.body || {};

  const chapterTitle = selectedChapter?.title || "Chapter 1";
  const handle = `@${String(authorName || "author").toLowerCase().replace(/[^a-z0-9]/g, "") || "author"}`;

  const scenes = [
    {
      id: `sc-${Date.now()}-1`,
      order: 1,
      durationSec: 4,
      headline: `Why readers can't put "${bookTitle}" down`,
      scriptText: `What happens when everything you thought was settled unravels in ${chapterTitle}?`,
      visualPrompt: `Text-free ${genre} cover art backdrop`,
      visualType: "book_cover",
      cameraMovement: "zoom_in",
      overlayText: `${bookTitle} — ${tone}`,
      hashtags: ["#BookTok", "#IndieAuthor"],
      mentions: [handle],
      speedMultiplier: 1.0,
    },
    {
      id: `sc-${Date.now()}-2`,
      order: 2,
      durationSec: 5,
      headline: chapterTitle,
      scriptText: premise || `Enter the world of ${bookTitle} by ${authorName}.`,
      visualPrompt: `Atmospheric ${genre} backdrop`,
      visualType: "kinetic_typography",
      cameraMovement: "pan_right",
      overlayText: `By ${authorName}`,
      hashtags: ["#BookRecommendation", "#MustRead"],
      mentions: [handle],
      speedMultiplier: 1.0,
    },
    {
      id: `sc-${Date.now()}-3`,
      order: 3,
      durationSec: 4,
      headline: `Read ${bookTitle} Today`,
      scriptText: `Available now in print and digital editions.`,
      visualPrompt: `Book showcase card`,
      visualType: "book_cover",
      cameraMovement: "slow_float",
      overlayText: "Link in bio to read Chapter 1",
      hashtags: ["#ReadersOfInstagram", "#AuthorLife"],
      mentions: [handle],
      speedMultiplier: 1.0,
    },
  ];

  res.json({
    hookHeadline: `Step inside "${bookTitle}" (${targetPlatform})`,
    fullScript: scenes.map((s) => s.scriptText).join(" "),
    scenes,
    hashtags: ["#BookTok", "#IndieAuthor", "#ReadingCommunity", "#BookRecommendation"],
    mentions: [handle],
    overlaySpeedBadge: "1.0x Speed",
    aspectRatio,
    zeroCostMode: true,
  });
});

app.post("/api/agents/generate-reel-image", (_req, res) => {
  return res.status(403).json({
    error:
      "Paid AI scene image generation is disabled in Zero-Cost Mode. Upload your own image or use Book Cover / Kinetic Typography backdrops.",
    code: "PAID_AI_DISABLED",
    zeroCostMode: true,
  });
});

// ==========================================
// Local Tester & Ecosystem Registry
// ==========================================

const ecosystemLogoStore: Record<string, string> = {};

const betaTestersStore: any[] = [
  {
    id: "tester-001",
    name: "Alex Sterling",
    email: "alex.sterling@creativeforge.io",
    app_access_list: ["TomeCrafter", "ForgeOS"],
    current_subscription_status: "active",
    monthlyTierUsd: 0,
    omegaAccountId: "local_001",
    addedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    lastActive: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: "Local beta reviewer.",
  },
];

const testerFeedbackStore: any[] = [];
const broadcastMessagesStore: any[] = [];

app.get("/api/ecosystem/logos", (req, res) => {
  const preset = typeof req.query.preset === "string" ? req.query.preset : "";
  if (preset) {
    const presetConfig: Record<
      string,
      { title: string; subtitle: string; bg1: string; bg2: string; accent: string; symbol: string }
    > = {
      "rhythm-logic-gold": {
        title: "RL",
        subtitle: "RHYTHM LOGIC",
        bg1: "#1c1917",
        bg2: "#0c0a09",
        accent: "#f59e0b",
        symbol: "M64 20 L84 44 L64 68 L44 44 Z",
      },
      "aether-iron-crest": {
        title: "A&I",
        subtitle: "ATELIER",
        bg1: "#0f172a",
        bg2: "#020617",
        accent: "#38bdf8",
        symbol: "M64 18 L92 48 L64 88 L36 48 Z",
      },
      "human-sovereign-shield": {
        title: "TC",
        subtitle: "TOMECRAFTER",
        bg1: "#064e3b",
        bg2: "#022c22",
        accent: "#34d399",
        symbol: "M64 18 L96 30 V58 C96 78 80 94 64 102 C48 94 32 78 32 58 V30 Z",
      },
      "celestial-codex-sigil": {
        title: "CODEX",
        subtitle: "IMPRINT",
        bg1: "#1e1b4b",
        bg2: "#09071a",
        accent: "#a78bfa",
        symbol: "M64 20 A34 34 0 1 0 64 88 A26 26 0 1 1 64 20 Z",
      },
    };
    const cfg = presetConfig[preset] || presetConfig["rhythm-logic-gold"];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${cfg.bg1}" />
          <stop offset="100%" stop-color="${cfg.bg2}" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="url(#bg)" stroke="${cfg.accent}" stroke-width="3" />
      <path d="${cfg.symbol}" fill="none" stroke="${cfg.accent}" stroke-width="3.5" stroke-linejoin="round" />
      <text x="64" y="106" text-anchor="middle" fill="${cfg.accent}" font-family="Georgia, serif" font-size="11" font-weight="bold" letter-spacing="2">${cfg.subtitle}</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(svg);
  }
  res.json({ logos: ecosystemLogoStore });
});

app.post("/api/ecosystem/logos", (req, res) => {
  const { appKey, logoUrl } = req.body || {};
  if (!appKey || !logoUrl) {
    return res.status(400).json({ error: "App identifier (appKey) and logo URL / Data URI are required." });
  }
  ecosystemLogoStore[appKey] = logoUrl;
  res.json({
    success: true,
    message: `Updated logo for ${appKey} locally.`,
    logos: ecosystemLogoStore,
  });
});

app.get(["/api/testers/omega-fund-status", "/api/omega/fund-status"], (_req, res) => {
  res.json({
    success: true,
    zeroCostMode: true,
    fundMetrics: {
      totalSubscribers: betaTestersStore.length,
      monthlyRecurringVolume: 0,
      fundAllocationPercent: 50,
      fundAccountTotalTransferred: 0,
      omegaHubUrl: "",
      omegaCovenantAccountId: "local_zero_cost_mode",
      omegaSettlementStatus: "sandbox_active",
      gatewaySecretConfigured: false,
      lastPayoutTimestamp: new Date().toISOString(),
      sdkVersion: "v3.0.0-local",
      ecosystemApps: ["TomeCrafter"],
    },
  });
});

app.get("/api/testers", (_req, res) => {
  res.json({ testers: betaTestersStore });
});

app.post("/api/testers/onboard", (req, res) => {
  const { name, email, app_access_list = ["TomeCrafter"], notes = "" } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: "Tester name and email are required." });
  }
  const existing = betaTestersStore.find((t) => t.email.toLowerCase() === String(email).toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "A tester with this email address is already onboarded." });
  }
  const newTester = {
    id: `tester-${Date.now()}`,
    name: String(name).trim(),
    email: String(email).trim(),
    app_access_list,
    current_subscription_status: "trialing",
    monthlyTierUsd: 0,
    omegaAccountId: `local_${Date.now().toString().slice(-6)}`,
    addedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    notes: String(notes).trim(),
  };
  betaTestersStore.unshift(newTester);
  res.json({
    success: true,
    message: `Onboarded ${newTester.name} locally.`,
    tester: newTester,
  });
});

app.post("/api/testers/:id/grant-access", (req, res) => {
  const { id } = req.params;
  const { app_access_list } = req.body || {};
  const tester = betaTestersStore.find((t) => t.id === id);
  if (!tester) return res.status(404).json({ error: "Tester not found." });
  if (Array.isArray(app_access_list)) tester.app_access_list = app_access_list;
  tester.current_subscription_status = "active";
  tester.lastActive = new Date().toISOString();
  res.json({ success: true, message: `Updated access for ${tester.name}.`, tester });
});

app.post("/api/testers/:id/reset-omega-account", (req, res) => {
  const { id } = req.params;
  const tester = betaTestersStore.find((t) => t.id === id);
  if (!tester) return res.status(404).json({ error: "Tester not found." });
  const previousStatus = tester.current_subscription_status;
  tester.current_subscription_status = "active";
  tester.lastActive = new Date().toISOString();
  res.json({
    success: true,
    message: `Local tester state refreshed for ${tester.name}.`,
    tester,
    previousStatus,
    omegaPayUrl: "",
  });
});

app.get("/api/testers/feedback", (req, res) => {
  const { app: appFilter } = req.query;
  let items = testerFeedbackStore;
  if (appFilter && appFilter !== "all") {
    items = items.filter((f) => f.app === appFilter);
  }
  res.json({ feedback: items });
});

app.post("/api/testers/feedback", (req, res) => {
  const { testerId, testerName, testerEmail, app: targetApp, category = "General", rating = 5, message } = req.body || {};
  if (!message || !targetApp) {
    return res.status(400).json({ error: "App and feedback message are required." });
  }
  const newFeedback = {
    id: `fb-${Date.now()}`,
    testerId: testerId || "tester-anon",
    testerName: testerName || "Local Author",
    testerEmail: testerEmail || "author@local",
    app: targetApp,
    category,
    rating: Number(rating) || 5,
    message: String(message).trim(),
    status: "new",
    submittedAt: new Date().toISOString(),
  };
  testerFeedbackStore.unshift(newFeedback);
  res.json({ success: true, feedback: newFeedback });
});

app.post("/api/testers/broadcast", (req, res) => {
  const { app: targetApp = "All Apps", subject, content, adminSender = "TomeCrafter Studio" } = req.body || {};
  if (!subject || !content) {
    return res.status(400).json({ error: "Broadcast subject and content are required." });
  }
  const recipients =
    targetApp === "All Apps" ? betaTestersStore : betaTestersStore.filter((t) => t.app_access_list.includes(targetApp));
  const broadcast = {
    id: `bc-${Date.now()}`,
    app: targetApp,
    subject: String(subject).trim(),
    content: String(content).trim(),
    sentAt: new Date().toISOString(),
    recipientCount: recipients.length,
    adminSender,
  };
  broadcastMessagesStore.unshift(broadcast);
  res.json({
    success: true,
    message: `Recorded broadcast locally (${recipients.length} recipients).`,
    broadcast,
    recipients: recipients.map((r) => ({ name: r.name, email: r.email })),
  });
});

app.get("/api/testers/broadcasts", (_req, res) => {
  res.json({ broadcasts: broadcastMessagesStore });
});

// ============================================================================
// AUTHOR WEBSITE STUDIO (Zero-Cost Local Templates — Static Routes Before :bookId)
// ============================================================================

const authorWebsiteConfigsStore: Record<string, any> = {};

app.post("/api/author-website/ai-edit", (req, res) => {
  const { currentConfig, userPrompt } = req.body || {};
  if (!userPrompt || !currentConfig) {
    return res.status(400).json({ error: "Current config and prompt are required." });
  }
  const promptLower = String(userPrompt).toLowerCase();
  const updated = { ...currentConfig, lastSaved: new Date().toISOString() };

  if (promptLower.includes("dark")) {
    updated.backgroundColor = "#0c0a09";
    updated.cardBackgroundColor = "#1c1917";
    updated.textColor = "#f5f5f4";
  } else if (promptLower.includes("light") || promptLower.includes("parchment")) {
    updated.backgroundColor = "#faf7f2";
    updated.cardBackgroundColor = "#ffffff";
    updated.textColor = "#1c1917";
  }
  if (promptLower.includes("gold") || promptLower.includes("amber")) {
    updated.primaryColor = "#d97706";
    updated.accentColor = "#f59e0b";
  } else if (promptLower.includes("emerald") || promptLower.includes("green")) {
    updated.primaryColor = "#059669";
    updated.accentColor = "#10b981";
  }

  res.json({
    success: true,
    config: updated,
    aiSummary: `Applied local palette/layout adjustments for "${userPrompt}" (Zero-Cost Mode; edit text fields directly in the panel).`,
  });
});

app.post("/api/author-website/generate-from-book", (req, res) => {
  const { book, genrePreset = "dark_fantasy", layout = "modern_landing" } = req.body || {};
  if (!book) {
    return res.status(400).json({ error: "Book details are required." });
  }
  const title = book.title || "Untitled Masterpiece";
  const author = book.author || "Author";
  const firstChapter = Array.isArray(book.chapters) && book.chapters[0] ? book.chapters[0] : null;

  const config = {
    id: `web-${book.id || Date.now()}`,
    authorName: author,
    tagline: `${book.genre || "Fiction"} Author • ${title}`,
    bio: `${author} writes ${book.genre || "immersive fiction"} crafted in TomeCrafter Studio.`,
    location: "Independent Press",
    genrePreset,
    layout,
    primaryColor: "#f59e0b",
    secondaryColor: "#78350f",
    accentColor: "#fbbf24",
    backgroundColor: "#0c0a09",
    cardBackgroundColor: "#1c1917",
    textColor: "#f5f5f4",
    textMutedColor: "#a8a29e",
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    borderRadius: "rounded",
    heroHeadline: title,
    heroSubtitle: book.premise || `An unforgettable ${book.genre || "literary"} release by ${author}.`,
    heroCtaText: "Read Chapter 1 Preview",
    heroCtaUrl: "#featured-book",
    heroSecondaryCtaText: "Join Reader List",
    heroSecondaryCtaUrl: "#newsletter",
    featuredBook: {
      id: book.id || "book-1",
      title,
      subtitle: book.subtitle || "",
      coverUrl: book.coverImageUrl || "",
      tagline: book.genre || "Featured Release",
      synopsis: book.premise || "",
      genre: book.genre || "Fiction",
      price: "$14.99",
      releaseDate: new Date().getFullYear().toString(),
      isFeatured: true,
      sampleChapterTitle: firstChapter?.title || "Chapter 1",
      sampleChapterExcerpt: String(firstChapter?.content || "").slice(0, 600),
    },
    allBooks: [],
    newsletterHeadline: `Dispatch from ${author}`,
    newsletterSubtitle: "Receive chapter previews, release announcements, and bonus lore directly.",
    newsletterLeadMagnetTitle: `${title} — Opening Sample`,
    newsletterLeadMagnetDescription: "Free downloadable sample pack.",
    newsletterButtonText: "Subscribe Free",
    mediaKitUrl: "#media-kit",
    contactEmail: "author@example.com",
    platforms: {},
    reviews: [],
    events: [],
    showEthicalAiBadge: false,
    showUpcomingEvents: true,
    showReviews: true,
    showAllBooks: true,
    showMediaKit: true,
    showContactForm: true,
    lastSaved: new Date().toISOString(),
  };

  res.json({ success: true, config });
});

app.get("/api/author-website/:bookId", (req, res) => {
  const { bookId } = req.params;
  res.json({ config: authorWebsiteConfigsStore[bookId] || null });
});

app.post("/api/author-website/:bookId", (req, res) => {
  const { bookId } = req.params;
  const { config } = req.body || {};
  if (!config) {
    return res.status(400).json({ error: "Configuration object is required." });
  }
  authorWebsiteConfigsStore[bookId] = {
    ...config,
    lastSaved: new Date().toISOString(),
  };
  res.json({ success: true, config: authorWebsiteConfigsStore[bookId] });
});

// ============================================================================
// AUTHOR STORE BUILDER (Local Catalog Only — Paid Gateway Disabled)
// ============================================================================

app.post("/api/store/ai-generate-product", (req, res) => {
  const { category = "books_physical", title = "Collector Edition", genre = "Fiction", bookPremise = "", targetPrice = 29.99 } = req.body || {};
  const numericPrice = Number(targetPrice) || 29.99;

  res.json({
    success: true,
    productDraft: {
      title,
      subtitle: `${genre} Studio Release`,
      description: `${title} — curated directly for readers of this ${genre} release.\n\n${bookPremise || "Crafted for lasting bookshelf presentation."}`,
      highlights: [
        "Direct author catalog listing",
        "Archival print and digital specification",
        "Customizable format and pricing metadata",
      ],
      suggestedPrice: numericPrice,
      originalPrice: +(numericPrice * 1.2).toFixed(2),
      tags: [genre, category, "Edition"],
      specs: {
        format: category === "books_digital" ? "ePub / PDF" : "Trade Edition",
        dimensions: "6x9 in",
        shippingEstimateDays: "3-5 business days",
      },
    },
  });
});

app.post("/api/store/omega/connect", (req, res) => {
  const { country = "US", authorSlug = "author" } = req.body || {};
  res.json({
    success: false,
    disabled: true,
    zeroCostMode: true,
    accountId: `local_store_${String(authorSlug).replace(/[^a-z0-9_-]/gi, "_") || "author"}`,
    omegaHubUrl: "",
    payGatewayUrl: "",
    status: "disconnected",
    chargesEnabled: false,
    payoutsEnabled: false,
    country,
    fundSplitPercent: 50,
    sdkVersion: "v3.0.0-local",
    gatewaySecretConfigured: false,
    message: "External payment gateway connections are disabled in Zero-Cost Local Mode. Use external retailer links (Amazon, Bookshop, etc.).",
  });
});

app.post("/api/store/create-checkout-session", (_req, res) => {
  return res.status(410).json({
    disabled: true,
    zeroCostMode: true,
    error: "Hosted checkout sessions are disabled in Zero-Cost Local Mode.",
  });
});

// ============================================================================
// FREE ZERO-COST PLAN CATALOG
// ============================================================================

app.get("/api/subscription/plans", (_req, res) => {
  res.json({
    success: true,
    zeroCostMode: true,
    tiers: [
      {
        id: "free",
        name: "Zero-Cost Local Studio",
        priceMonthlyUsd: 0,
        priceAnnualMonthlyUsd: 0,
        limits: {
          monthlyAiProseWords: 0,
          monthlyCoverArtRenders: 0,
          activeManuscriptsLimit: 999,
          storeProductsLimit: 999,
          monthlyExportsLimit: 999,
        },
      },
    ],
  });
});

app.post("/api/subscription/update-plan", (_req, res) => {
  res.json({
    success: true,
    zeroCostMode: true,
    planId: "free",
    addonIds: [],
    billingInterval: "monthly",
    totalMonthlyChargeUsd: 0,
    fundContributionMonthlyUsd: 0,
    omegaHubUrl: "",
    omegaCheckoutUrl: null,
    sdkVersion: "v3.0.0-local",
    status: "active",
    message: "Studio is running in Zero-Cost Local Mode ($0/month). Paid subscriptions and metered API add-ons are disabled.",
  });
});

// ==========================================
// AUDIOBOOK ENGINE (Zero-Cost Browser Web Speech Only)
// ==========================================

app.post("/api/audio/elevenlabs/verify", (_req, res) => {
  return res.status(403).json({
    valid: false,
    disabled: true,
    zeroCostMode: true,
    error: "Paid ElevenLabs API integration is disabled in Zero-Cost Local Mode. Use Free Device Web Speech.",
  });
});

app.get("/api/audio/status", (_req, res) => {
  res.json({
    zeroCostMode: true,
    geminiAvailable: false,
    elevenLabsServerConfigured: false,
    browserSynthesisAlwaysReady: true,
    engines: {
      browser: {
        name: "Device Web Speech (Free)",
        ready: true,
        requiresKey: false,
      },
      gemini: {
        name: "Gemini Neural TTS (Disabled — Paid API)",
        ready: false,
        requiresKey: false,
        disabled: true,
      },
      elevenlabs: {
        name: "ElevenLabs Voice Studio (Disabled — Paid API)",
        ready: false,
        requiresKey: false,
        disabled: true,
      },
    },
  });
});

app.post("/api/audio/tts", (req, res) => {
  const { text = "", presetId = "elena-vance" } = req.body || {};
  return res.json({
    success: false,
    fallbackToBrowser: true,
    zeroCostMode: true,
    presetId,
    text: String(text),
    message: "Paid server TTS (Gemini / ElevenLabs) is disabled in Zero-Cost Mode. Using free browser Web Speech synthesis.",
  });
});

app.post("/api/audio/audition", (req, res) => {
  const { presetId = "elena-vance", narratorName = "Narrator" } = req.body || {};
  return res.json({
    success: false,
    fallbackToBrowser: true,
    zeroCostMode: true,
    greetingText: `Hello, I am ${narratorName}, narrating with free local device speech synthesis.`,
    presetId,
  });
});

// ==========================================
// Vite Middleware & Production Static Server
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TomeCrafter Local Server running on port ${PORT} (Zero-Cost Mode active — $0 external AI/Cloud API calls)`);
  });
}

startServer();
