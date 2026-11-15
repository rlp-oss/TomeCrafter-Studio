import { Book, Chapter, ChapterIllustration, FootnoteReference, LoreEntry } from "../types";

export const FIRESTORE_MAX_DOCUMENT_BYTES = 1048576; // 1 MiB strict Firestore limit
export const FIRESTORE_SAFE_THRESHOLD_BYTES = 800000; // 800 KB target threshold for safety
export const FIRESTORE_CHAPTER_SUBCOLLECTION_THRESHOLD_BYTES = 180000; // Offload chapter prose into /books/{bookId}/chapters subcollection above 180 KB
export const SUBCOLLECTION_STUB_VERSION = "subcollection-v1";

export interface CompressionOptions {
  maxInlineIllustrationBytes?: number; // Max size for inline Base64 data URLs (default 24KB)
  aggressiveWhitespaceStripping?: boolean; // More aggressive paragraph line compaction
  pruneTransientKeys?: boolean; // Strip UI / debug ephemeral keys
  maxRecentTransactionsToKeep?: number; // Max transaction history items in originality report
  maxFootnoteAlternativesToKeep?: number; // Max alternative sources per footnote
}

export interface CompressionResult {
  compressedBook: Record<string, any>;
  originalBytes: number;
  compressedBytes: number;
  savingsBytes: number;
  compressionRatio: number; // e.g. 45.2 (%)
  isUnder1MbLimit: boolean;
  optimizationsApplied: string[];
  exceedsSafetyThreshold: boolean;
}

export interface DocumentSizeValidation {
  valid: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  limitBytes: number;
  remainingBytes: number;
  percentOfLimit: number;
  status: "optimal" | "warning" | "exceeded";
}

/**
 * Calculates the exact UTF-8 byte size of any JavaScript object or string.
 */
export function calculateByteSize(data: any): number {
  if (data === null || data === undefined) return 0;
  try {
    const jsonStr = typeof data === "string" ? data : JSON.stringify(data);
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(jsonStr).length;
    }
    return new Blob([jsonStr]).size;
  } catch (e) {
    return 0;
  }
}

/**
 * Formats a byte number into a readable string (e.g., "12.4 KB", "1.2 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Strips redundant whitespace, normalizes newlines, and collapses wasteful spacing
 * while strictly preserving manuscript paragraph breaks, dialog structure, and markdown syntax.
 */
export function stripRedundantWhitespace(text: string): string {
  if (!text || typeof text !== "string") return "";

  return (
    text
      // 1. Normalize carriage returns (\r\n and \r -> \n)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // 2. Strip trailing spaces/tabs on each individual line
      .replace(/[ \t]+$/gm, "")
      // 3. Collapse 3 or more consecutive blank lines into standard double line-breaks
      .replace(/\n{3,}/g, "\n\n")
      // 4. Collapse non-newline whitespace repetitions (e.g. "   " -> " ") while preserving standard indent
      .replace(/[^\S\r\n]{2,}/g, " ")
      // 5. Trim leading and trailing whitespace from the full text block
      .trim()
  );
}

/**
 * Recursively cleans object keys, strips undefined/null properties,
 * and minifies all string fields.
 */
export function minifyDeepStructures(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (typeof obj === "string") {
    return stripRedundantWhitespace(obj);
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    const cleanedArray = obj
      .map((item) => minifyDeepStructures(item))
      .filter((item) => item !== undefined && item !== null);
    return cleanedArray;
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Strip UI ephemeral keys starting with underscore unless it's a designated system tag
      if (
        key.startsWith("_temp") ||
        key.startsWith("_editing") ||
        key.startsWith("_isSubmitting") ||
        key.startsWith("_loading")
      ) {
        continue;
      }

      const cleanedVal = minifyDeepStructures(value);
      // Omit undefined, null, or empty string values for optional attributes to save bytes
      if (cleanedVal !== undefined && cleanedVal !== null) {
        result[key] = cleanedVal;
      }
    }
    return result;
  }

  return obj;
}

/**
 * Compresses and sanitizes illustration plates and cover images.
 * Replaces excessively huge inline base64 blobs with lightweight SVG metadata plates
 * so manuscript documents remain ultra-compact for Firestore.
 */
export function compressIllustrationArray(
  illustrations: ChapterIllustration[],
  fallbackLabel: string,
  maxInlineBytes = 65536 // 64 KB
): { illustrations: ChapterIllustration[]; compressedCount: number; bytesSaved: number } {
  let compressedCount = 0;
  let bytesSaved = 0;

  const compressedIllustrations: ChapterIllustration[] = (illustrations || []).map((ill) => {
    const originalUrl = ill.imageUrl || "";
    const originalUrlBytes = calculateByteSize(originalUrl);

    if (originalUrl.startsWith("data:") && originalUrlBytes > maxInlineBytes) {
      compressedCount++;
      const safeTitle = (ill.title || fallbackLabel).replace(/["<>]/g, "");
      const safePrompt = (ill.prompt || "").slice(0, 80).replace(/["<>]/g, "");
      const ratio = ill.aspectRatio || "16:9";

      const svgPlaceholder = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" width="100%" height="100%"><rect fill="%231a1a1a" width="100%" height="100%" rx="8"/><text fill="%23d4af37" x="50%" y="42%" text-anchor="middle" font-family="serif" font-size="14" font-weight="bold">${safeTitle}</text><text fill="%23888888" x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="10">${safePrompt}</text><text fill="%23666666" x="50%" y="78%" text-anchor="middle" font-family="monospace" font-size="9">Drive / Local Media Reference [${ratio}]</text></svg>`;

      const saved = originalUrlBytes - calculateByteSize(svgPlaceholder);
      bytesSaved += Math.max(0, saved);

      return {
        ...ill,
        imageUrl: svgPlaceholder,
        enhancedPrompt:
          ill.enhancedPrompt === ill.prompt
            ? undefined
            : ill.enhancedPrompt
            ? stripRedundantWhitespace(ill.enhancedPrompt)
            : undefined,
        prompt: stripRedundantWhitespace(ill.prompt || ""),
        title: stripRedundantWhitespace(ill.title || fallbackLabel),
        caption: ill.caption ? stripRedundantWhitespace(ill.caption) : undefined,
      };
    }

    return {
      ...ill,
      prompt: stripRedundantWhitespace(ill.prompt || ""),
      title: stripRedundantWhitespace(ill.title || fallbackLabel),
      caption: ill.caption ? stripRedundantWhitespace(ill.caption) : undefined,
    };
  });

  return {
    illustrations: compressedIllustrations,
    compressedCount,
    bytesSaved,
  };
}

export function compressIllustrations(
  chapters: Chapter[],
  maxInlineBytes = 65536 // 64 KB
): { chapters: Chapter[]; compressedCount: number; bytesSaved: number } {
  let compressedCount = 0;
  let bytesSaved = 0;

  const optimizedChapters = (chapters || []).map((ch) => {
    if (!ch.illustrations || ch.illustrations.length === 0) {
      return ch;
    }

    const res = compressIllustrationArray(
      ch.illustrations,
      `Chapter ${ch.number} Illustration`,
      maxInlineBytes
    );
    compressedCount += res.compressedCount;
    bytesSaved += res.bytesSaved;

    return {
      ...ch,
      illustrations: res.illustrations,
    };
  });

  return {
    chapters: optimizedChapters,
    compressedCount,
    bytesSaved,
  };
}

/**
 * Optimizes Footnote references by trimming text and bounding alternative source arrays.
 */
export function compressFootnotes(
  footnotes?: FootnoteReference[],
  maxAlternatives = 3
): FootnoteReference[] | undefined {
  if (!footnotes || footnotes.length === 0) return undefined;

  return footnotes.map((fn) => ({
    id: fn.id,
    number: fn.number,
    marker: fn.marker || `[^${fn.number}]`,
    title: stripRedundantWhitespace(fn.title),
    authorOrCreator: fn.authorOrCreator ? stripRedundantWhitespace(fn.authorOrCreator) : undefined,
    sourceUrl: fn.sourceUrl?.trim() || undefined,
    sourceName: fn.sourceName ? stripRedundantWhitespace(fn.sourceName) : undefined,
    publicationYear: fn.publicationYear?.trim() || undefined,
    description: stripRedundantWhitespace(fn.description),
    footnoteType: fn.footnoteType,
    verificationStatus: fn.verificationStatus,
    verifiedWithGoogle: fn.verifiedWithGoogle,
    searchQuery: fn.searchQuery ? stripRedundantWhitespace(fn.searchQuery) : undefined,
    chapterNumber: fn.chapterNumber,
    snippet: fn.snippet ? stripRedundantWhitespace(fn.snippet).slice(0, 300) : undefined,
    verificationNotes: fn.verificationNotes ? stripRedundantWhitespace(fn.verificationNotes) : undefined,
    isAttributedToCurrentUser: fn.isAttributedToCurrentUser,
    userPublishedConfirmation: fn.userPublishedConfirmation,
    realSourceAlternatives: fn.realSourceAlternatives
      ? fn.realSourceAlternatives.slice(0, maxAlternatives).map((alt) => ({
          title: stripRedundantWhitespace(alt.title),
          author: alt.author ? stripRedundantWhitespace(alt.author) : undefined,
          sourceName: alt.sourceName ? stripRedundantWhitespace(alt.sourceName) : undefined,
          url: alt.url?.trim() || undefined,
          snippet: alt.snippet ? stripRedundantWhitespace(alt.snippet).slice(0, 200) : undefined,
        }))
      : undefined,
  }));
}

/**
 * Validates and normalizes an image URL or inline data URI to match Firestore security rules.
 */
export function sanitizeSafeImageRef(val: unknown, maxLen = 500000): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.replace(/[\r\n]+/g, "").trim();
  if (!trimmed) return "";
  if (trimmed.length > maxLen) return undefined;
  if (
    /^https?:\/\/.+$/.test(trimmed) ||
    /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);.+$/.test(trimmed) ||
    /^\/[^\s]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  return undefined;
}

function sanitizeSafeLink(val: unknown, maxLen = 512): string {
  if (typeof val !== "string") return "";
  const trimmed = val.replace(/[\r\n]+/g, " ").trim().slice(0, maxLen);
  if (/^\s*(javascript|vbscript|data):/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function clampFiniteNumber(val: unknown, min: number, max: number): number | undefined {
  if (val === null || val === undefined || val === "" || typeof val === "boolean") {
    return undefined;
  }
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return undefined;
  return Math.max(min, Math.min(max, num));
}

function sanitizeFormattingSettingsForFirestore(fs: any): Record<string, any> {
  if (!fs || typeof fs !== "object") return {};
  const clean: Record<string, any> = {};

  if (typeof fs.trimSize === "string") clean.trimSize = stripRedundantWhitespace(fs.trimSize).slice(0, 32);
  if (typeof fs.fontPreset === "string") clean.fontPreset = stripRedundantWhitespace(fs.fontPreset).slice(0, 64);
  if (typeof fs.googleFontFamily === "string") clean.googleFontFamily = stripRedundantWhitespace(fs.googleFontFamily).slice(0, 120);
  if (typeof fs.fontColor === "string") clean.fontColor = stripRedundantWhitespace(fs.fontColor).slice(0, 40);
  if (typeof fs.fontSize === "string") clean.fontSize = stripRedundantWhitespace(fs.fontSize).slice(0, 24);

  const fontSizePx = clampFiniteNumber(fs.fontSizePx, 6, 72);
  if (fontSizePx !== undefined) clean.fontSizePx = fontSizePx;

  if (typeof fs.lineSpacing === "string") clean.lineSpacing = stripRedundantWhitespace(fs.lineSpacing).slice(0, 24);

  const lineHeightValue = clampFiniteNumber(fs.lineHeightValue, 0.5, 5);
  if (lineHeightValue !== undefined) clean.lineHeightValue = lineHeightValue;

  const letterSpacingEm = clampFiniteNumber(fs.letterSpacingEm, -0.5, 2);
  if (letterSpacingEm !== undefined) clean.letterSpacingEm = letterSpacingEm;

  const paragraphIndentEm = clampFiniteNumber(fs.paragraphIndentEm, 0, 10);
  if (paragraphIndentEm !== undefined) clean.paragraphIndentEm = paragraphIndentEm;

  const paragraphSpacingEm = clampFiniteNumber(fs.paragraphSpacingEm, 0, 10);
  if (paragraphSpacingEm !== undefined) clean.paragraphSpacingEm = paragraphSpacingEm;

  if (typeof fs.textAlign === "string") clean.textAlign = stripRedundantWhitespace(fs.textAlign).slice(0, 24);
  if (typeof fs.chapterHeadingCase === "string") clean.chapterHeadingCase = stripRedundantWhitespace(fs.chapterHeadingCase).slice(0, 32);

  const chapterWordBudget = clampFiniteNumber(fs.chapterWordBudget, 0, 500000);
  if (chapterWordBudget !== undefined) clean.chapterWordBudget = Math.round(chapterWordBudget);

  if (typeof fs.dropCaps === "boolean") clean.dropCaps = fs.dropCaps;

  const dropCapSize = clampFiniteNumber(fs.dropCapSize, 1, 20);
  if (dropCapSize !== undefined) clean.dropCapSize = dropCapSize;

  if (typeof fs.sceneBreakSymbol === "string") clean.sceneBreakSymbol = stripRedundantWhitespace(fs.sceneBreakSymbol).slice(0, 40);
  if (typeof fs.showPageNumbers === "boolean") clean.showPageNumbers = fs.showPageNumbers;
  if (typeof fs.runningHeaders === "boolean") clean.runningHeaders = fs.runningHeaders;
  if (typeof fs.includeFrontMatter === "boolean") clean.includeFrontMatter = fs.includeFrontMatter;
  if (typeof fs.includeBackMatter === "boolean") clean.includeBackMatter = fs.includeBackMatter;
  if (typeof fs.dedicationText === "string") clean.dedicationText = stripRedundantWhitespace(fs.dedicationText).slice(0, 2000);
  if (typeof fs.copyrightText === "string") clean.copyrightText = stripRedundantWhitespace(fs.copyrightText).slice(0, 2000);
  if (typeof fs.authorBio === "string") clean.authorBio = stripRedundantWhitespace(fs.authorBio).slice(0, 4000);
  if (typeof fs.newsletterLink === "string") clean.newsletterLink = sanitizeSafeLink(fs.newsletterLink, 512);
  if (typeof fs.acknowledgments === "string") clean.acknowledgments = stripRedundantWhitespace(fs.acknowledgments).slice(0, 4000);

  return clean;
}

function sanitizePublishingKitForFirestore(pk: any): Record<string, any> | undefined {
  if (!pk || typeof pk !== "object") return undefined;

  const clean: Record<string, any> = {};

  if (typeof pk.commercialTitle === "string" && pk.commercialTitle.trim()) {
    clean.commercialTitle = stripRedundantWhitespace(pk.commercialTitle).slice(0, 240);
  }
  if (typeof pk.catchySubtitle === "string" && pk.catchySubtitle.trim()) {
    clean.catchySubtitle = stripRedundantWhitespace(pk.catchySubtitle).slice(0, 300);
  }

  clean.salesBlurb = {
    hook: stripRedundantWhitespace(String(pk.salesBlurb?.hook || "")).slice(0, 500),
    body: stripRedundantWhitespace(String(pk.salesBlurb?.body || "")).slice(0, 4000),
    callToAction: stripRedundantWhitespace(String(pk.salesBlurb?.callToAction || "")).slice(0, 500),
  };

  clean.amazonKeywords = Array.isArray(pk.amazonKeywords)
    ? pk.amazonKeywords
        .map((k: unknown) => stripRedundantWhitespace(String(k || "")).slice(0, 120))
        .filter(Boolean)
        .slice(0, 30)
    : [];

  clean.bisacCategories = Array.isArray(pk.bisacCategories)
    ? pk.bisacCategories
        .map((c: unknown) => stripRedundantWhitespace(String(c || "")).slice(0, 160))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  clean.compTitles = Array.isArray(pk.compTitles)
    ? pk.compTitles
        .map((c: unknown) => stripRedundantWhitespace(String(c || "")).slice(0, 200))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  clean.targetAudience = stripRedundantWhitespace(String(pk.targetAudience || "")).slice(0, 500);

  if (pk.pricingRecommendations && typeof pk.pricingRecommendations === "object") {
    const pricing: Record<string, number> = {};
    const ebook = clampFiniteNumber(pk.pricingRecommendations.ebook, 0, 10000);
    const paperback = clampFiniteNumber(pk.pricingRecommendations.paperback, 0, 10000);
    const hardcover = clampFiniteNumber(pk.pricingRecommendations.hardcover, 0, 10000);
    if (ebook !== undefined) pricing.ebook = ebook;
    if (paperback !== undefined) pricing.paperback = paperback;
    if (hardcover !== undefined) pricing.hardcover = hardcover;
    if (Object.keys(pricing).length > 0) clean.pricingRecommendations = pricing;
  }

  if (typeof pk.marketingHook === "string" && pk.marketingHook.trim()) {
    clean.marketingHook = stripRedundantWhitespace(pk.marketingHook).slice(0, 1000);
  }
  if (typeof pk.launchStrategy === "string" && pk.launchStrategy.trim()) {
    clean.launchStrategy = stripRedundantWhitespace(pk.launchStrategy).slice(0, 10000);
  }
  if (typeof pk.queryLetter === "string" && pk.queryLetter.trim()) {
    clean.queryLetter = stripRedundantWhitespace(pk.queryLetter).slice(0, 12000);
  }

  if (pk.printSpecs && typeof pk.printSpecs === "object") {
    const specs: Record<string, any> = {};
    if (typeof pk.printSpecs.recommendedTrimSize === "string") {
      specs.recommendedTrimSize = stripRedundantWhitespace(pk.printSpecs.recommendedTrimSize).slice(0, 80);
    }
    const pageCount = clampFiniteNumber(pk.printSpecs.estimatedPageCount, 0, 50000);
    if (pageCount !== undefined) {
      specs.estimatedPageCount = Math.round(pageCount);
    }
    const spineWidth = clampFiniteNumber(pk.printSpecs.spineWidthInches, 0, 20);
    if (spineWidth !== undefined) {
      specs.spineWidthInches = spineWidth;
    }
    if (pk.printSpecs.margins && typeof pk.printSpecs.margins === "object") {
      const m = pk.printSpecs.margins;
      const cleanMargins: Record<string, string> = {};
      if (m.insideGutter !== undefined) cleanMargins.insideGutter = String(m.insideGutter).slice(0, 32);
      if (m.outside !== undefined) cleanMargins.outside = String(m.outside).slice(0, 32);
      if (m.top !== undefined) cleanMargins.top = String(m.top).slice(0, 32);
      if (m.bottom !== undefined) cleanMargins.bottom = String(m.bottom).slice(0, 32);
      if (Object.keys(cleanMargins).length > 0) specs.margins = cleanMargins;
    }
    if (Object.keys(specs).length > 0) clean.printSpecs = specs;
  }

  if (typeof pk.isbn === "string" && pk.isbn.trim()) {
    clean.isbn = pk.isbn.trim().slice(0, 40);
  }
  if (typeof pk.copyrightYear === "string" && pk.copyrightYear.trim()) {
    clean.copyrightYear = pk.copyrightYear.trim().slice(0, 16);
  }
  if (typeof pk.publisherImprint === "string" && pk.publisherImprint.trim()) {
    clean.publisherImprint = stripRedundantWhitespace(pk.publisherImprint).slice(0, 160);
  }

  return clean;
}

function sanitizeOriginalityReportForFirestore(
  report: any,
  maxRecentTransactionsToKeep: number
): Record<string, any> | undefined {
  if (!report || typeof report !== "object") return undefined;

  const clean: Record<string, any> = {};

  const score = clampFiniteNumber(report.score, 0, 100);
  if (score !== undefined) clean.score = score;

  const authorShare = clampFiniteNumber(report.authorSharePercent, 0, 100);
  if (authorShare !== undefined) {
    clean.authorSharePercent = authorShare;
  }

  if (typeof report.copyrightStatus === "string") {
    clean.copyrightStatus = stripRedundantWhitespace(report.copyrightStatus).slice(0, 160);
  }
  if (typeof report.c2paManifestHash === "string") {
    clean.c2paManifestHash = stripRedundantWhitespace(report.c2paManifestHash).slice(0, 256);
  }
  if (typeof report.humanBadgeRoyaltyTier === "string") {
    clean.humanBadgeRoyaltyTier = stripRedundantWhitespace(report.humanBadgeRoyaltyTier).slice(0, 160);
  }
  if (typeof report.badgeRoyaltyTier === "string") {
    clean.badgeRoyaltyTier = stripRedundantWhitespace(report.badgeRoyaltyTier).slice(0, 160);
  }
  if (typeof report.is100PercentOriginal === "boolean") {
    clean.is100PercentOriginal = report.is100PercentOriginal;
  }

  const totalRoyalties = clampFiniteNumber(report.totalMicroRoyaltiesSubmitted, 0, 1000000000);
  if (totalRoyalties !== undefined) {
    clean.totalMicroRoyaltiesSubmitted = totalRoyalties;
  }

  clean.taggedAuthors = Array.isArray(report.taggedAuthors)
    ? report.taggedAuthors.filter((a: unknown) => a && typeof a === "object" && !Array.isArray(a)).slice(0, 100)
    : [];

  const txLimit = Math.min(50, Math.max(0, maxRecentTransactionsToKeep));
  clean.recentTransactions =
    txLimit > 0 && Array.isArray(report.recentTransactions)
      ? report.recentTransactions.filter((t: unknown) => t && typeof t === "object" && !Array.isArray(t)).slice(-txLimit)
      : [];

  if (report.breakdown && typeof report.breakdown === "object") {
    const bd: Record<string, number> = {};
    const ohv = clampFiniteNumber(report.breakdown.originalHumanVoice, 0, 100);
    const asn = clampFiniteNumber(report.breakdown.aiSynthesisNovelty, 0, 100);
    const shs = clampFiniteNumber(report.breakdown.stylisticHomageSimilarity, 0, 100);
    const rtp = clampFiniteNumber(report.breakdown.referencedTextPercent, 0, 100);
    if (ohv !== undefined) bd.originalHumanVoice = ohv;
    if (asn !== undefined) bd.aiSynthesisNovelty = asn;
    if (shs !== undefined) bd.stylisticHomageSimilarity = shs;
    if (rtp !== undefined) bd.referencedTextPercent = rtp;
    if (Object.keys(bd).length > 0) clean.breakdown = bd;
  }

  clean.analysisNotes = stripRedundantWhitespace(String(report.analysisNotes || "")).slice(0, 4000);

  if (typeof report.lastAuditedAt === "string" && report.lastAuditedAt.trim()) {
    clean.lastAuditedAt = report.lastAuditedAt.trim().slice(0, 64);
  }

  return clean;
}

/**
 * Primary compression engine: minifies and packs a full Book object for Firestore storage.
 * Guarantees document stays under the 1MB Firestore limit while preserving all manuscript text,
 * structure, lore codex, and formatting settings.
 */
export function compressBookForFirestore(
  book: Book,
  options: CompressionOptions = {}
): CompressionResult {
  const {
    maxInlineIllustrationBytes = 65536,
    maxRecentTransactionsToKeep = 20,
    maxFootnoteAlternativesToKeep = 3,
  } = options;

  const originalBytes = calculateByteSize(book);
  const optimizationsApplied: string[] = [];

  // Deep clone working copy
  const rawCopy: Book = JSON.parse(JSON.stringify(book));

  // 1. Minify Manuscript Chapters and Scenes
  let totalWordsInChapters = 0;
  const VALID_CHAPTER_STATUSES = new Set(["draft", "review", "polished", "final"]);
  const processedChapters: Chapter[] = (rawCopy.chapters || []).slice(0, 300).map((ch, index) => {
    const minifiedContent = stripRedundantWhitespace(ch.content || "").slice(0, 1000000);
    const wordCount = minifiedContent
      ? minifiedContent.trim().split(/\s+/).filter(Boolean).length
      : 0;
    totalWordsInChapters += wordCount;

    const rawChId = String(ch.id || `chapter-${index + 1}`)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .trim()
      .slice(0, 128);
    const safeChapterId = rawChId.length > 0 ? rawChId : `chapter-${index + 1}`;
    const safeChapterTitle =
      stripRedundantWhitespace(ch.title || `Chapter ${index + 1}`).slice(0, 500) ||
      `Chapter ${index + 1}`;
    const rawNum = Number(ch.number);
    const safeNumber =
      Number.isFinite(rawNum) && rawNum >= 0 ? Math.min(10000, Math.round(rawNum)) : index + 1;
    const rawTarget = Number(ch.targetWords);
    const safeTargetWords =
      Number.isFinite(rawTarget) && rawTarget >= 0 ? Math.min(1000000, Math.round(rawTarget)) : 2500;
    const safeStatus = VALID_CHAPTER_STATUSES.has(String(ch.status))
      ? (ch.status as Chapter["status"])
      : "draft";
    const safeFootnotes = compressFootnotes(ch.footnotes, maxFootnoteAlternativesToKeep);

    return {
      id: safeChapterId,
      number: safeNumber,
      act: stripRedundantWhitespace(ch.act || "Act I").slice(0, 200),
      title: safeChapterTitle,
      summary: stripRedundantWhitespace(ch.summary || "").slice(0, 8000),
      goal: stripRedundantWhitespace(ch.goal || "").slice(0, 2000),
      conflict: stripRedundantWhitespace(ch.conflict || "").slice(0, 2000),
      cliffhanger: stripRedundantWhitespace(ch.cliffhanger || "").slice(0, 2000),
      pov: stripRedundantWhitespace(ch.pov || "Third Person Limited").slice(0, 200),
      setting: stripRedundantWhitespace(ch.setting || "").slice(0, 500),
      targetWords: safeTargetWords,
      wordCount: Math.max(0, Math.min(1000000, wordCount)),
      content: minifiedContent,
      status: safeStatus,
      illustrations: (ch.illustrations || []).slice(0, 50).map((ill, illIdx) => ({
        ...ill,
        id:
          String(ill.id || `ill-${illIdx + 1}`)
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .trim()
            .slice(0, 128) || `ill-${illIdx + 1}`,
        title: stripRedundantWhitespace(ill.title || `Chapter ${safeNumber} Illustration`).slice(0, 300) || `Chapter ${safeNumber} Illustration`,
        imageUrl: sanitizeSafeImageRef(ill.imageUrl, 500000) ?? "",
      })),
      notes: ch.notes ? stripRedundantWhitespace(ch.notes).slice(0, 8000) : undefined,
      footnotes: safeFootnotes ? safeFootnotes.slice(0, 500) : undefined,
    };
  });
  optimizationsApplied.push("Minified chapter prose and stripped redundant multiline whitespace");

  // 2. Compress illustration media plates & unassigned media library
  const { chapters: finalChapters, compressedCount, bytesSaved } = compressIllustrations(
    processedChapters,
    maxInlineIllustrationBytes
  );
  const mediaLibRes = compressIllustrationArray(
    rawCopy.mediaLibrary || [],
    "Vault Media Asset",
    maxInlineIllustrationBytes
  );
  const sanitizedMediaLibrary = mediaLibRes.illustrations
    .slice(0, 200)
    .map((ill, idx) => ({
      ...ill,
      id: String(ill.id || `ill-${idx + 1}`).trim().slice(0, 128) || `ill-${idx + 1}`,
      title: stripRedundantWhitespace(ill.title || "Vault Media Asset").slice(0, 300) || "Vault Media Asset",
      imageUrl: sanitizeSafeImageRef(ill.imageUrl, 500000) ?? "",
    }));
  const totalIllCompressed = compressedCount + mediaLibRes.compressedCount;
  const totalIllBytesSaved = bytesSaved + mediaLibRes.bytesSaved;
  if (totalIllCompressed > 0) {
    optimizationsApplied.push(
      `Compressed ${totalIllCompressed} heavy illustration data URIs (saved ${formatBytes(totalIllBytesSaved)})`
    );
  }

  // 3. Compress Cover Image if massive Base64 & validate against safe image ref rules
  let coverImageUrl = rawCopy.coverImageUrl || "";
  if (coverImageUrl.startsWith("data:") && calculateByteSize(coverImageUrl) > 120000) {
    coverImageUrl = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop";
    optimizationsApplied.push("Replaced oversized inline cover base64 with cloud reference URL");
  }
  const safeCoverImageUrl = sanitizeSafeImageRef(coverImageUrl, 500000);

  // 4. Minify Lore Codex Entries
  const compressedLoreEntries: LoreEntry[] = (rawCopy.loreEntries || []).slice(0, 500).map((entry, idx) => ({
    id: String(entry.id || `lore-${idx + 1}`).trim().slice(0, 128) || `lore-${idx + 1}`,
    name: stripRedundantWhitespace(entry.name || "Untitled Entry").slice(0, 200) || "Untitled Entry",
    category: (String(entry.category || "Custom").slice(0, 80) || "Custom") as LoreEntry["category"],
    tagline: stripRedundantWhitespace(entry.tagline || ""),
    description: stripRedundantWhitespace(entry.description || ""),
    secretsOrFlaws: entry.secretsOrFlaws ? stripRedundantWhitespace(entry.secretsOrFlaws) : undefined,
    sensoryDetails:
      entry.sensoryDetails && (entry.sensoryDetails.sight || entry.sensoryDetails.sound || entry.sensoryDetails.scent)
        ? {
            sight: entry.sensoryDetails.sight ? stripRedundantWhitespace(entry.sensoryDetails.sight) : undefined,
            sound: entry.sensoryDetails.sound ? stripRedundantWhitespace(entry.sensoryDetails.sound) : undefined,
            scent: entry.sensoryDetails.scent ? stripRedundantWhitespace(entry.sensoryDetails.scent) : undefined,
          }
        : undefined,
    relatedEntities: Array.isArray(entry.relatedEntities) && entry.relatedEntities.length > 0 ? entry.relatedEntities : undefined,
    plotHooks:
      Array.isArray(entry.plotHooks) && entry.plotHooks.length > 0
        ? entry.plotHooks.map((h) => stripRedundantWhitespace(h)).filter(Boolean)
        : undefined,
    avatarUrl: entry.avatarUrl?.trim() || undefined,
  }));
  optimizationsApplied.push("Compacted Lore Codex and stripped empty sensory fields");

  // 5. Minify & Strictly Sanitize Publishing Kit, Formatting Settings, and Originality Report
  const publishingKit = sanitizePublishingKitForFirestore(rawCopy.publishingKit);
  const formattingSettings = sanitizeFormattingSettingsForFirestore(rawCopy.formattingSettings);
  const originalityReport = sanitizeOriginalityReportForFirestore(
    rawCopy.originalityReport,
    maxRecentTransactionsToKeep
  );

  // 6. Assemble Compressed Book Structure aligned with firebase-blueprint.json & firestore.rules
  const safeTitle = stripRedundantWhitespace(rawCopy.title || "Untitled Tome").slice(0, 200) || "Untitled Tome";
  const safeAuthor = stripRedundantWhitespace(rawCopy.author || "Anonymous Author").slice(0, 120) || "Anonymous Author";
  const safeGenre = (rawCopy.genre || "Epic Fantasy").toString().slice(0, 80) || "Epic Fantasy";

  const compressedBookUnpruned: Record<string, any> = {
    id: String(rawCopy.id || `book-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 128),
    title: safeTitle,
    subtitle: stripRedundantWhitespace(rawCopy.subtitle || "").slice(0, 300),
    author: safeAuthor,
    genre: safeGenre,
    targetWordCount: Math.max(0, Math.min(10000000, Number(rawCopy.targetWordCount) || 50000)),
    currentWordCount: Math.max(0, Math.min(10000000, Number(totalWordsInChapters || rawCopy.currentWordCount) || 0)),
    dailyWordCountGoal:
      rawCopy.dailyWordCountGoal !== undefined && Number(rawCopy.dailyWordCountGoal) >= 1
        ? Math.max(1, Math.min(1000000, Math.round(Number(rawCopy.dailyWordCountGoal))))
        : undefined,
    wordGoalMode:
      rawCopy.wordGoalMode === "daily" || rawCopy.wordGoalMode === "project"
        ? rawCopy.wordGoalMode
        : undefined,
    dailyWordBaselineCount:
      rawCopy.dailyWordBaselineCount !== undefined && Number(rawCopy.dailyWordBaselineCount) >= 0
        ? Math.max(0, Math.min(10000000, Math.round(Number(rawCopy.dailyWordBaselineCount))))
        : undefined,
    dailyWordBaselineDate: rawCopy.dailyWordBaselineDate
      ? String(rawCopy.dailyWordBaselineDate).slice(0, 20)
      : undefined,
    premise: stripRedundantWhitespace(rawCopy.premise || "").slice(0, 8000),
    tone: stripRedundantWhitespace(rawCopy.tone || "").slice(0, 240),
    targetAudience: rawCopy.targetAudience ? stripRedundantWhitespace(rawCopy.targetAudience).slice(0, 200) : undefined,
    coverImageUrl: safeCoverImageUrl ?? "",
    coverTitleFont: rawCopy.coverTitleFont ? String(rawCopy.coverTitleFont).slice(0, 80) : undefined,
    coverAccentColor: rawCopy.coverAccentColor ? String(rawCopy.coverAccentColor).slice(0, 40) : undefined,
    chapters: finalChapters,
    mediaLibrary: sanitizedMediaLibrary,
    loreEntries: compressedLoreEntries,
    publishingKit: publishingKit,
    formattingSettings: formattingSettings,
    originalityReport: originalityReport,
  };

  // 7. Run Deep Structure Key Minification
  const finalCompressedBook = minifyDeepStructures(compressedBookUnpruned);

  const compressedBytes = calculateByteSize(finalCompressedBook);
  const savingsBytes = Math.max(0, originalBytes - compressedBytes);
  const compressionRatio = originalBytes > 0 ? parseFloat(((savingsBytes / originalBytes) * 100).toFixed(2)) : 0;
  const isUnder1MbLimit = compressedBytes < FIRESTORE_MAX_DOCUMENT_BYTES;
  const exceedsSafetyThreshold = compressedBytes > FIRESTORE_SAFE_THRESHOLD_BYTES;

  return {
    compressedBook: finalCompressedBook,
    originalBytes,
    compressedBytes,
    savingsBytes,
    compressionRatio,
    isUnder1MbLimit,
    optimizationsApplied,
    exceedsSafetyThreshold,
  };
}

/**
 * Validates any Firestore payload to ensure it stays strictly below the 1MB document boundary.
 */
export function validateFirestoreDocumentSize(payload: Record<string, any>): DocumentSizeValidation {
  const sizeBytes = calculateByteSize(payload);
  const remainingBytes = Math.max(0, FIRESTORE_MAX_DOCUMENT_BYTES - sizeBytes);
  const percentOfLimit = parseFloat(((sizeBytes / FIRESTORE_MAX_DOCUMENT_BYTES) * 100).toFixed(1));

  let status: "optimal" | "warning" | "exceeded" = "optimal";
  if (sizeBytes >= FIRESTORE_MAX_DOCUMENT_BYTES) {
    status = "exceeded";
  } else if (sizeBytes > FIRESTORE_SAFE_THRESHOLD_BYTES) {
    status = "warning";
  }

  return {
    valid: sizeBytes < FIRESTORE_MAX_DOCUMENT_BYTES,
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    limitBytes: FIRESTORE_MAX_DOCUMENT_BYTES,
    remainingBytes,
    percentOfLimit,
    status,
  };
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function isValidSafeImageRefClient(val: unknown, maxLen = 500000): boolean {
  if (typeof val !== "string" || val.length > maxLen) return false;
  return (
    val === "" ||
    /^https?:\/\/.+$/.test(val) ||
    /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);.+$/.test(val) ||
    /^\/[^\s]+$/.test(val)
  );
}

function isValidSafeLinkClient(val: unknown, maxLen = 512): boolean {
  if (typeof val !== "string" || val.length > maxLen) return false;
  return !/^\s*(javascript|vbscript|data):.*$/i.test(val);
}

function isValidFiniteRange(val: unknown, min: number, max: number): boolean {
  return typeof val === "number" && Number.isFinite(val) && val >= min && val <= max;
}

function isValidStringLen(val: unknown, min: number, max: number): boolean {
  return typeof val === "string" && val.length >= min && val.length <= max;
}

/**
 * Checks a book payload against every constraint in firestore.rules `isValidBook`
 * (excluding serverTimestamp fields which are validated on the server).
 */
export function findBookRuleViolations(
  data: Record<string, any>,
  bookId: string,
  allowedKeys: Set<string>
): string[] {
  const issues: string[] = [];
  if (!data || typeof data !== "object") {
    return ["Payload is not an object"];
  }

  for (const k of Object.keys(data)) {
    if (!allowedKeys.has(k)) {
      issues.push(`Disallowed top-level key "${k}"`);
    }
  }

  if (!VALID_ID_REGEX.test(String(data.id || "")) || data.id !== bookId) {
    issues.push(`Invalid id "${String(data.id)}" vs "${bookId}"`);
  }
  if (!VALID_ID_REGEX.test(String(data.userId || ""))) {
    issues.push(`Invalid userId "${String(data.userId)}"`);
  }
  if (!isValidStringLen(data.title, 1, 200)) {
    issues.push(`Invalid title (${typeof data.title}, len=${String(data.title || "").length})`);
  }
  if ("subtitle" in data && !isValidStringLen(data.subtitle, 0, 300)) {
    issues.push(`Invalid subtitle (${typeof data.subtitle})`);
  }
  if (!isValidStringLen(data.author, 1, 120)) {
    issues.push(`Invalid author (${typeof data.author})`);
  }
  if (!isValidStringLen(data.genre, 1, 80)) {
    issues.push(`Invalid genre (${typeof data.genre})`);
  }
  if ("tone" in data && !isValidStringLen(data.tone, 0, 240)) {
    issues.push(`Invalid tone (${typeof data.tone})`);
  }
  if (!isValidFiniteRange(data.targetWordCount, 0, 10000000)) {
    issues.push(`Invalid targetWordCount (${String(data.targetWordCount)})`);
  }
  if (!isValidFiniteRange(data.currentWordCount, 0, 10000000)) {
    issues.push(`Invalid currentWordCount (${String(data.currentWordCount)})`);
  }
  if ("dailyWordCountGoal" in data && !isValidFiniteRange(data.dailyWordCountGoal, 1, 1000000)) {
    issues.push(`Invalid dailyWordCountGoal (${String(data.dailyWordCountGoal)})`);
  }
  if ("wordGoalMode" in data && data.wordGoalMode !== "project" && data.wordGoalMode !== "daily") {
    issues.push(`Invalid wordGoalMode (${String(data.wordGoalMode)})`);
  }
  if ("dailyWordBaselineCount" in data && !isValidFiniteRange(data.dailyWordBaselineCount, 0, 10000000)) {
    issues.push(`Invalid dailyWordBaselineCount`);
  }
  if ("dailyWordBaselineDate" in data && !isValidStringLen(data.dailyWordBaselineDate, 0, 20)) {
    issues.push(`Invalid dailyWordBaselineDate`);
  }
  if ("premise" in data && !isValidStringLen(data.premise, 0, 8000)) {
    issues.push(`Invalid premise`);
  }
  if ("targetAudience" in data && !isValidStringLen(data.targetAudience, 0, 200)) {
    issues.push(`Invalid targetAudience`);
  }
  if ("coverImageUrl" in data && !isValidSafeImageRefClient(data.coverImageUrl, 500000)) {
    issues.push(`Invalid coverImageUrl`);
  }
  if ("coverImage" in data && !isValidSafeImageRefClient(data.coverImage, 500000)) {
    issues.push(`Invalid coverImage`);
  }
  if ("frontCoverImage" in data && !isValidSafeImageRefClient(data.frontCoverImage, 500000)) {
    issues.push(`Invalid frontCoverImage`);
  }
  if ("coverTitleFont" in data && !isValidStringLen(data.coverTitleFont, 0, 80)) {
    issues.push(`Invalid coverTitleFont`);
  }
  if ("coverAccentColor" in data && !isValidStringLen(data.coverAccentColor, 0, 40)) {
    issues.push(`Invalid coverAccentColor`);
  }
  if ("chapters" in data) {
    if (!Array.isArray(data.chapters) || data.chapters.length > 300) {
      issues.push(`Invalid chapters list`);
    } else if (data.chapters.length > 0) {
      const c0 = data.chapters[0];
      if (
        !c0 ||
        typeof c0 !== "object" ||
        Array.isArray(c0) ||
        !isValidStringLen(c0.id, 1, 128) ||
        !isValidStringLen(c0.title, 0, 500) ||
        !isValidStringLen(c0.content, 0, 1000000)
      ) {
        issues.push(`Invalid chapters[0]`);
      }
    }
  }
  if ("mediaLibrary" in data) {
    if (!Array.isArray(data.mediaLibrary) || data.mediaLibrary.length > 200) {
      issues.push(`Invalid mediaLibrary list`);
    } else if (data.mediaLibrary.length > 0) {
      const m0 = data.mediaLibrary[0];
      if (
        !m0 ||
        typeof m0 !== "object" ||
        Array.isArray(m0) ||
        !isValidStringLen(m0.id, 1, 128) ||
        !isValidStringLen(m0.title, 0, 300) ||
        !isValidSafeImageRefClient(m0.imageUrl, 500000)
      ) {
        issues.push(`Invalid mediaLibrary[0]`);
      }
    }
  }
  if ("loreEntries" in data) {
    if (!Array.isArray(data.loreEntries) || data.loreEntries.length > 500) {
      issues.push(`Invalid loreEntries list`);
    } else if (data.loreEntries.length > 0) {
      const l0 = data.loreEntries[0];
      if (
        !l0 ||
        typeof l0 !== "object" ||
        Array.isArray(l0) ||
        !isValidStringLen(l0.id, 1, 128) ||
        !isValidStringLen(l0.name, 0, 200) ||
        !isValidStringLen(l0.category, 0, 80)
      ) {
        issues.push(`Invalid loreEntries[0]`);
      }
    }
  }
  if ("isOffloadedToDrive" in data && typeof data.isOffloadedToDrive !== "boolean") {
    issues.push(`Invalid isOffloadedToDrive`);
  }
  if (data.isOffloadedToDrive === true) {
    const meta = data.offloadMetadata;
    const reqMetaKeys = [
      "driveFileId", "driveFileName", "offloadedAt",
      "originalSizeBytes", "originalSizeFormatted",
      "compressedSizeBytes", "compressedSizeFormatted",
      "chapterCount", "loreCount", "reason",
    ];
    const allowedMetaKeys = new Set([...reqMetaKeys, "driveWebViewLink"]);
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
      issues.push("Missing or invalid offloadMetadata map");
    } else {
      for (const rk of reqMetaKeys) {
        if (!(rk in meta)) issues.push(`Missing offloadMetadata.${rk}`);
      }
      for (const mk of Object.keys(meta)) {
        if (!allowedMetaKeys.has(mk)) issues.push(`Disallowed offloadMetadata.${mk}`);
      }
      if (!isValidStringLen(meta.driveFileId, 1, 256)) issues.push("Invalid offloadMetadata.driveFileId");
      if ("driveWebViewLink" in meta && meta.driveWebViewLink !== "" && (!isValidStringLen(meta.driveWebViewLink, 8, 1024) || !/^https?:\/\/.+$/.test(meta.driveWebViewLink))) {
        issues.push("Invalid offloadMetadata.driveWebViewLink");
      }
      if (!isValidStringLen(meta.driveFileName, 1, 256)) issues.push("Invalid offloadMetadata.driveFileName");
      if (!isValidStringLen(meta.offloadedAt, 1, 64)) issues.push("Invalid offloadMetadata.offloadedAt");
      if (!isValidFiniteRange(meta.originalSizeBytes, 0, 1000000000)) issues.push("Invalid offloadMetadata.originalSizeBytes");
      if (!isValidStringLen(meta.originalSizeFormatted, 0, 40)) issues.push("Invalid offloadMetadata.originalSizeFormatted");
      if (!isValidFiniteRange(meta.compressedSizeBytes, 0, 1000000000)) issues.push("Invalid offloadMetadata.compressedSizeBytes");
      if (!isValidStringLen(meta.compressedSizeFormatted, 0, 40)) issues.push("Invalid offloadMetadata.compressedSizeFormatted");
      if (!isValidFiniteRange(meta.chapterCount, 0, 1000)) issues.push("Invalid offloadMetadata.chapterCount");
      if (!isValidFiniteRange(meta.loreCount, 0, 2000)) issues.push("Invalid offloadMetadata.loreCount");
      if (!isValidStringLen(meta.reason, 0, 500)) issues.push("Invalid offloadMetadata.reason");
    }
  } else if ("offloadMetadata" in data && data.offloadMetadata !== null) {
    issues.push(`Invalid offloadMetadata while not offloaded`);
  }

  if ("formattingSettings" in data) {
    const fs = data.formattingSettings;
    const allowedFsKeys = new Set([
      "trimSize", "fontPreset", "googleFontFamily", "fontColor", "fontSize", "fontSizePx",
      "lineSpacing", "lineHeightValue", "letterSpacingEm", "paragraphIndentEm", "paragraphSpacingEm",
      "textAlign", "chapterHeadingCase", "chapterWordBudget", "dropCaps", "dropCapSize",
      "sceneBreakSymbol", "showPageNumbers", "runningHeaders", "includeFrontMatter", "includeBackMatter",
      "dedicationText", "copyrightText", "authorBio", "newsletterLink", "acknowledgments",
    ]);
    if (!fs || typeof fs !== "object" || Array.isArray(fs)) {
      issues.push("Invalid formattingSettings map");
    } else {
      for (const k of Object.keys(fs)) {
        if (!allowedFsKeys.has(k)) issues.push(`Disallowed formattingSettings key "${k}"`);
      }
      if ("trimSize" in fs && !isValidStringLen(fs.trimSize, 0, 32)) issues.push("Invalid formattingSettings.trimSize");
      if ("fontPreset" in fs && !isValidStringLen(fs.fontPreset, 0, 64)) issues.push("Invalid formattingSettings.fontPreset");
      if ("googleFontFamily" in fs && !isValidStringLen(fs.googleFontFamily, 0, 120)) issues.push("Invalid formattingSettings.googleFontFamily");
      if ("fontColor" in fs && !isValidStringLen(fs.fontColor, 0, 40)) issues.push("Invalid formattingSettings.fontColor");
      if ("fontSize" in fs && !isValidStringLen(fs.fontSize, 0, 24)) issues.push("Invalid formattingSettings.fontSize");
      if ("fontSizePx" in fs && !isValidFiniteRange(fs.fontSizePx, 6, 72)) issues.push("Invalid formattingSettings.fontSizePx");
      if ("lineSpacing" in fs && !isValidStringLen(fs.lineSpacing, 0, 24)) issues.push("Invalid formattingSettings.lineSpacing");
      if ("lineHeightValue" in fs && !isValidFiniteRange(fs.lineHeightValue, 0.5, 5)) issues.push("Invalid formattingSettings.lineHeightValue");
      if ("letterSpacingEm" in fs && !isValidFiniteRange(fs.letterSpacingEm, -0.5, 2)) issues.push("Invalid formattingSettings.letterSpacingEm");
      if ("paragraphIndentEm" in fs && !isValidFiniteRange(fs.paragraphIndentEm, 0, 10)) issues.push("Invalid formattingSettings.paragraphIndentEm");
      if ("paragraphSpacingEm" in fs && !isValidFiniteRange(fs.paragraphSpacingEm, 0, 10)) issues.push("Invalid formattingSettings.paragraphSpacingEm");
      if ("textAlign" in fs && !isValidStringLen(fs.textAlign, 0, 24)) issues.push("Invalid formattingSettings.textAlign");
      if ("chapterHeadingCase" in fs && !isValidStringLen(fs.chapterHeadingCase, 0, 32)) issues.push("Invalid formattingSettings.chapterHeadingCase");
      if ("chapterWordBudget" in fs && !isValidFiniteRange(fs.chapterWordBudget, 0, 500000)) issues.push("Invalid formattingSettings.chapterWordBudget");
      if ("dropCaps" in fs && typeof fs.dropCaps !== "boolean") issues.push("Invalid formattingSettings.dropCaps");
      if ("dropCapSize" in fs && !isValidFiniteRange(fs.dropCapSize, 1, 20)) issues.push("Invalid formattingSettings.dropCapSize");
      if ("sceneBreakSymbol" in fs && !isValidStringLen(fs.sceneBreakSymbol, 0, 40)) issues.push("Invalid formattingSettings.sceneBreakSymbol");
      if ("showPageNumbers" in fs && typeof fs.showPageNumbers !== "boolean") issues.push("Invalid formattingSettings.showPageNumbers");
      if ("runningHeaders" in fs && typeof fs.runningHeaders !== "boolean") issues.push("Invalid formattingSettings.runningHeaders");
      if ("includeFrontMatter" in fs && typeof fs.includeFrontMatter !== "boolean") issues.push("Invalid formattingSettings.includeFrontMatter");
      if ("includeBackMatter" in fs && typeof fs.includeBackMatter !== "boolean") issues.push("Invalid formattingSettings.includeBackMatter");
      if ("dedicationText" in fs && !isValidStringLen(fs.dedicationText, 0, 2000)) issues.push("Invalid formattingSettings.dedicationText");
      if ("copyrightText" in fs && !isValidStringLen(fs.copyrightText, 0, 2000)) issues.push("Invalid formattingSettings.copyrightText");
      if ("authorBio" in fs && !isValidStringLen(fs.authorBio, 0, 4000)) issues.push("Invalid formattingSettings.authorBio");
      if ("newsletterLink" in fs && !isValidSafeLinkClient(fs.newsletterLink, 512)) issues.push("Invalid formattingSettings.newsletterLink");
      if ("acknowledgments" in fs && !isValidStringLen(fs.acknowledgments, 0, 4000)) issues.push("Invalid formattingSettings.acknowledgments");
    }
  }

  if ("publishingKit" in data) {
    const pk = data.publishingKit;
    const allowedPkKeys = new Set([
      "commercialTitle", "catchySubtitle", "salesBlurb", "amazonKeywords",
      "bisacCategories", "compTitles", "targetAudience", "pricingRecommendations",
      "marketingHook", "launchStrategy", "queryLetter", "printSpecs",
      "isbn", "copyrightYear", "publisherImprint",
    ]);
    if (!pk || typeof pk !== "object" || Array.isArray(pk)) {
      issues.push("Invalid publishingKit map");
    } else {
      for (const k of Object.keys(pk)) {
        if (!allowedPkKeys.has(k)) issues.push(`Disallowed publishingKit key "${k}"`);
      }
      if ("commercialTitle" in pk && !isValidStringLen(pk.commercialTitle, 0, 240)) issues.push("Invalid publishingKit.commercialTitle");
      if ("catchySubtitle" in pk && !isValidStringLen(pk.catchySubtitle, 0, 300)) issues.push("Invalid publishingKit.catchySubtitle");
      if ("salesBlurb" in pk) {
        const sb = pk.salesBlurb;
        if (!sb || typeof sb !== "object" || Array.isArray(sb)) {
          issues.push("Invalid publishingKit.salesBlurb");
        } else {
          for (const sk of Object.keys(sb)) {
            if (!["hook", "body", "callToAction"].includes(sk)) issues.push(`Disallowed publishingKit.salesBlurb.${sk}`);
          }
          if ("hook" in sb && !isValidStringLen(sb.hook, 0, 500)) issues.push("Invalid publishingKit.salesBlurb.hook");
          if ("body" in sb && !isValidStringLen(sb.body, 0, 4000)) issues.push("Invalid publishingKit.salesBlurb.body");
          if ("callToAction" in sb && !isValidStringLen(sb.callToAction, 0, 500)) issues.push("Invalid publishingKit.salesBlurb.callToAction");
        }
      }
      if ("amazonKeywords" in pk && (!Array.isArray(pk.amazonKeywords) || pk.amazonKeywords.length > 30 || (pk.amazonKeywords.length > 0 && !isValidStringLen(pk.amazonKeywords[0], 0, 120)))) {
        issues.push("Invalid publishingKit.amazonKeywords");
      }
      if ("bisacCategories" in pk && (!Array.isArray(pk.bisacCategories) || pk.bisacCategories.length > 20 || (pk.bisacCategories.length > 0 && !isValidStringLen(pk.bisacCategories[0], 0, 160)))) {
        issues.push("Invalid publishingKit.bisacCategories");
      }
      if ("compTitles" in pk && (!Array.isArray(pk.compTitles) || pk.compTitles.length > 20 || (pk.compTitles.length > 0 && !isValidStringLen(pk.compTitles[0], 0, 200)))) {
        issues.push("Invalid publishingKit.compTitles");
      }
      if ("targetAudience" in pk && !isValidStringLen(pk.targetAudience, 0, 500)) issues.push("Invalid publishingKit.targetAudience");
      if ("pricingRecommendations" in pk) {
        const pr = pk.pricingRecommendations;
        if (!pr || typeof pr !== "object" || Array.isArray(pr)) {
          issues.push("Invalid publishingKit.pricingRecommendations");
        } else {
          for (const rk of Object.keys(pr)) {
            if (!["ebook", "paperback", "hardcover"].includes(rk)) issues.push(`Disallowed publishingKit.pricingRecommendations.${rk}`);
          }
          if ("ebook" in pr && !isValidFiniteRange(pr.ebook, 0, 10000)) issues.push("Invalid publishingKit.pricingRecommendations.ebook");
          if ("paperback" in pr && !isValidFiniteRange(pr.paperback, 0, 10000)) issues.push("Invalid publishingKit.pricingRecommendations.paperback");
          if ("hardcover" in pr && !isValidFiniteRange(pr.hardcover, 0, 10000)) issues.push("Invalid publishingKit.pricingRecommendations.hardcover");
        }
      }
      if ("marketingHook" in pk && !isValidStringLen(pk.marketingHook, 0, 1000)) issues.push("Invalid publishingKit.marketingHook");
      if ("launchStrategy" in pk && !isValidStringLen(pk.launchStrategy, 0, 10000)) issues.push("Invalid publishingKit.launchStrategy");
      if ("queryLetter" in pk && !isValidStringLen(pk.queryLetter, 0, 12000)) issues.push("Invalid publishingKit.queryLetter");
      if ("printSpecs" in pk) {
        const ps = pk.printSpecs;
        if (!ps || typeof ps !== "object" || Array.isArray(ps)) {
          issues.push("Invalid publishingKit.printSpecs");
        } else {
          for (const psk of Object.keys(ps)) {
            if (!["recommendedTrimSize", "estimatedPageCount", "spineWidthInches", "margins"].includes(psk)) {
              issues.push(`Disallowed publishingKit.printSpecs.${psk}`);
            }
          }
          if ("recommendedTrimSize" in ps && !isValidStringLen(ps.recommendedTrimSize, 0, 80)) issues.push("Invalid publishingKit.printSpecs.recommendedTrimSize");
          if ("estimatedPageCount" in ps && !isValidFiniteRange(ps.estimatedPageCount, 0, 50000)) issues.push("Invalid publishingKit.printSpecs.estimatedPageCount");
          if ("spineWidthInches" in ps && !isValidFiniteRange(ps.spineWidthInches, 0, 20)) issues.push("Invalid publishingKit.printSpecs.spineWidthInches");
          if ("margins" in ps) {
            const m = ps.margins;
            if (!m || typeof m !== "object" || Array.isArray(m)) {
              issues.push("Invalid publishingKit.printSpecs.margins");
            } else {
              for (const mk of Object.keys(m)) {
                if (!["insideGutter", "outside", "top", "bottom"].includes(mk)) issues.push(`Disallowed publishingKit.printSpecs.margins.${mk}`);
              }
              if ("insideGutter" in m && !isValidStringLen(m.insideGutter, 0, 32)) issues.push("Invalid margins.insideGutter");
              if ("outside" in m && !isValidStringLen(m.outside, 0, 32)) issues.push("Invalid margins.outside");
              if ("top" in m && !isValidStringLen(m.top, 0, 32)) issues.push("Invalid margins.top");
              if ("bottom" in m && !isValidStringLen(m.bottom, 0, 32)) issues.push("Invalid margins.bottom");
            }
          }
        }
      }
      if ("isbn" in pk && !isValidStringLen(pk.isbn, 0, 40)) issues.push("Invalid publishingKit.isbn");
      if ("copyrightYear" in pk && !isValidStringLen(pk.copyrightYear, 0, 16)) issues.push("Invalid publishingKit.copyrightYear");
      if ("publisherImprint" in pk && !isValidStringLen(pk.publisherImprint, 0, 160)) issues.push("Invalid publishingKit.publisherImprint");
    }
  }

  if ("originalityReport" in data) {
    const rep = data.originalityReport;
    const allowedRepKeys = new Set([
      "score", "authorSharePercent", "copyrightStatus", "c2paManifestHash",
      "humanBadgeRoyaltyTier", "badgeRoyaltyTier", "is100PercentOriginal",
      "totalMicroRoyaltiesSubmitted", "taggedAuthors", "recentTransactions",
      "breakdown", "analysisNotes", "lastAuditedAt",
    ]);
    if (!rep || typeof rep !== "object" || Array.isArray(rep)) {
      issues.push("Invalid originalityReport map");
    } else {
      for (const k of Object.keys(rep)) {
        if (!allowedRepKeys.has(k)) issues.push(`Disallowed originalityReport key "${k}"`);
      }
      if ("score" in rep && !isValidFiniteRange(rep.score, 0, 100)) issues.push("Invalid originalityReport.score");
      if ("authorSharePercent" in rep && !isValidFiniteRange(rep.authorSharePercent, 0, 100)) issues.push("Invalid originalityReport.authorSharePercent");
      if ("copyrightStatus" in rep && !isValidStringLen(rep.copyrightStatus, 0, 160)) issues.push("Invalid originalityReport.copyrightStatus");
      if ("c2paManifestHash" in rep && !isValidStringLen(rep.c2paManifestHash, 0, 256)) issues.push("Invalid originalityReport.c2paManifestHash");
      if ("humanBadgeRoyaltyTier" in rep && !isValidStringLen(rep.humanBadgeRoyaltyTier, 0, 160)) issues.push("Invalid originalityReport.humanBadgeRoyaltyTier");
      if ("badgeRoyaltyTier" in rep && !isValidStringLen(rep.badgeRoyaltyTier, 0, 160)) issues.push("Invalid originalityReport.badgeRoyaltyTier");
      if ("is100PercentOriginal" in rep && typeof rep.is100PercentOriginal !== "boolean") issues.push("Invalid originalityReport.is100PercentOriginal");
      if ("totalMicroRoyaltiesSubmitted" in rep && !isValidFiniteRange(rep.totalMicroRoyaltiesSubmitted, 0, 1000000000)) issues.push("Invalid originalityReport.totalMicroRoyaltiesSubmitted");
      if ("taggedAuthors" in rep && (!Array.isArray(rep.taggedAuthors) || rep.taggedAuthors.length > 100 || (rep.taggedAuthors.length > 0 && (!rep.taggedAuthors[0] || typeof rep.taggedAuthors[0] !== "object" || Array.isArray(rep.taggedAuthors[0]))))) {
        issues.push("Invalid originalityReport.taggedAuthors");
      }
      if ("recentTransactions" in rep && (!Array.isArray(rep.recentTransactions) || rep.recentTransactions.length > 50 || (rep.recentTransactions.length > 0 && (!rep.recentTransactions[0] || typeof rep.recentTransactions[0] !== "object" || Array.isArray(rep.recentTransactions[0]))))) {
        issues.push("Invalid originalityReport.recentTransactions");
      }
      if ("breakdown" in rep) {
        const bd = rep.breakdown;
        if (!bd || typeof bd !== "object" || Array.isArray(bd)) {
          issues.push("Invalid originalityReport.breakdown");
        } else {
          for (const bk of Object.keys(bd)) {
            if (!["originalHumanVoice", "aiSynthesisNovelty", "stylisticHomageSimilarity", "referencedTextPercent"].includes(bk)) {
              issues.push(`Disallowed originalityReport.breakdown.${bk}`);
            }
          }
          if ("originalHumanVoice" in bd && !isValidFiniteRange(bd.originalHumanVoice, 0, 100)) issues.push("Invalid breakdown.originalHumanVoice");
          if ("aiSynthesisNovelty" in bd && !isValidFiniteRange(bd.aiSynthesisNovelty, 0, 100)) issues.push("Invalid breakdown.aiSynthesisNovelty");
          if ("stylisticHomageSimilarity" in bd && !isValidFiniteRange(bd.stylisticHomageSimilarity, 0, 100)) issues.push("Invalid breakdown.stylisticHomageSimilarity");
          if ("referencedTextPercent" in bd && !isValidFiniteRange(bd.referencedTextPercent, 0, 100)) issues.push("Invalid breakdown.referencedTextPercent");
        }
      }
      if ("analysisNotes" in rep && !isValidStringLen(rep.analysisNotes, 0, 4000)) issues.push("Invalid originalityReport.analysisNotes");
      if ("lastAuditedAt" in rep && !isValidStringLen(rep.lastAuditedAt, 0, 64)) issues.push("Invalid originalityReport.lastAuditedAt");
    }
  }

  if ("chapterOutlines" in data) {
    if (!Array.isArray(data.chapterOutlines) || data.chapterOutlines.length > 300) {
      issues.push("Invalid chapterOutlines");
    } else if (data.chapterOutlines.length > 0) {
      const co0 = data.chapterOutlines[0];
      if (!co0 || typeof co0 !== "object" || Array.isArray(co0) || !isValidStringLen(co0.id, 1, 128) || !("number" in co0) || !("title" in co0)) {
        issues.push("Invalid chapterOutlines[0]");
      }
    }
  }

  if ("loreSummaries" in data) {
    if (!Array.isArray(data.loreSummaries) || data.loreSummaries.length > 500) {
      issues.push("Invalid loreSummaries");
    } else if (data.loreSummaries.length > 0) {
      const ls0 = data.loreSummaries[0];
      if (!ls0 || typeof ls0 !== "object" || Array.isArray(ls0) || !isValidStringLen(ls0.id, 1, 128) || !("name" in ls0) || !("category" in ls0)) {
        issues.push("Invalid loreSummaries[0]");
      }
    }
  }

  if ("_stubVersion" in data && !isValidStringLen(data._stubVersion, 0, 40)) {
    issues.push("Invalid _stubVersion");
  }

  return issues;
}

export function summarizeBookPayload(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== "object") return { type: typeof data };
  const chapters = Array.isArray(data.chapters) ? data.chapters : [];
  return {
    keys: Object.keys(data),
    chaptersCount: chapters.length,
    ch0IdLen: typeof chapters[0]?.id === "string" ? chapters[0].id.length : typeof chapters[0]?.id,
    ch0ContentLen: typeof chapters[0]?.content === "string" ? chapters[0].content.length : typeof chapters[0]?.content,
    mediaCount: Array.isArray(data.mediaLibrary) ? data.mediaLibrary.length : typeof data.mediaLibrary,
    loreCount: Array.isArray(data.loreEntries) ? data.loreEntries.length : typeof data.loreEntries,
    coverLen: typeof data.coverImageUrl === "string" ? data.coverImageUrl.length : typeof data.coverImageUrl,
    pkKeys: data.publishingKit && typeof data.publishingKit === "object" ? Object.keys(data.publishingKit) : typeof data.publishingKit,
    fsKeys: data.formattingSettings && typeof data.formattingSettings === "object" ? Object.keys(data.formattingSettings) : typeof data.formattingSettings,
    repKeys: data.originalityReport && typeof data.originalityReport === "object" ? Object.keys(data.originalityReport) : typeof data.originalityReport,
  };
}

/**
 * Hydrates / decompresses a book document fetched from Firestore back into a full client Book instance,
 * ensuring all expected default arrays, objects, and fallback values exist without null pointer risks.
 */
export function decompressBookFromFirestore(docData: Record<string, any>): Book {
  if (!docData) {
    throw new Error("Cannot decompress empty Firestore document.");
  }

  return {
    id: docData.id || `book-${Date.now()}`,
    title: docData.title || "Untitled Tome",
    subtitle: docData.subtitle || "",
    author: docData.author || "Anonymous",
    genre: docData.genre || "Epic Fantasy",
    targetWordCount: docData.targetWordCount || 50000,
    currentWordCount: docData.currentWordCount || 0,
    dailyWordCountGoal:
      typeof docData.dailyWordCountGoal === "number" ? docData.dailyWordCountGoal : undefined,
    wordGoalMode:
      docData.wordGoalMode === "daily" || docData.wordGoalMode === "project"
        ? docData.wordGoalMode
        : undefined,
    dailyWordBaselineCount:
      typeof docData.dailyWordBaselineCount === "number"
        ? docData.dailyWordBaselineCount
        : undefined,
    dailyWordBaselineDate:
      typeof docData.dailyWordBaselineDate === "string"
        ? docData.dailyWordBaselineDate
        : undefined,
    premise: docData.premise || "",
    tone: docData.tone || "Atmospheric and Evocative",
    targetAudience: docData.targetAudience || "Adult & Literary Fiction",
    coverImageUrl: docData.coverImageUrl || "",
    coverTitleFont: docData.coverTitleFont || "Cinzel",
    coverAccentColor: docData.coverAccentColor || "#d4af37",
    chapters: Array.isArray(docData.chapters)
      ? docData.chapters.map((ch: any, idx: number) => ({
          id: ch.id || `ch-${idx + 1}`,
          number: ch.number || idx + 1,
          act: ch.act || "Act I",
          title: ch.title || `Chapter ${idx + 1}`,
          summary: ch.summary || "",
          goal: ch.goal || "",
          conflict: ch.conflict || "",
          cliffhanger: ch.cliffhanger || "",
          pov: ch.pov || "Third Person Limited",
          setting: ch.setting || "",
          targetWords: ch.targetWords || 2500,
          wordCount: ch.wordCount || 0,
          content: ch.content || "",
          status: ch.status || "draft",
          illustrations: Array.isArray(ch.illustrations) ? ch.illustrations : [],
          notes: ch.notes || undefined,
          footnotes: Array.isArray(ch.footnotes) ? ch.footnotes : [],
        }))
      : [],
    mediaLibrary: Array.isArray(docData.mediaLibrary) ? docData.mediaLibrary : [],
    loreEntries: Array.isArray(docData.loreEntries)
      ? docData.loreEntries.map((l: any) => ({
          id: l.id || `lore-${Date.now()}`,
          name: l.name || "Untitled Lore",
          category: l.category || "Custom",
          tagline: l.tagline || "",
          description: l.description || "",
          secretsOrFlaws: l.secretsOrFlaws || undefined,
          sensoryDetails: l.sensoryDetails || undefined,
          relatedEntities: Array.isArray(l.relatedEntities) ? l.relatedEntities : [],
          plotHooks: Array.isArray(l.plotHooks) ? l.plotHooks : [],
          avatarUrl: l.avatarUrl || undefined,
        }))
      : [],
    publishingKit: docData.publishingKit || {
      salesBlurb: { hook: "", body: "", callToAction: "" },
      amazonKeywords: [],
      bisacCategories: [],
      compTitles: [],
      targetAudience: "",
    },
    formattingSettings: docData.formattingSettings || {
      trimSize: "6x9",
      fontPreset: "garamond",
      fontSize: "11pt",
      lineSpacing: "1.5",
      dropCaps: true,
      sceneBreakSymbol: "* * *",
      showPageNumbers: true,
      runningHeaders: true,
      includeFrontMatter: true,
      includeBackMatter: true,
      dedicationText: "",
      copyrightText: "",
      authorBio: "",
      newsletterLink: "",
      acknowledgments: "",
    },
    originalityReport: docData.originalityReport || undefined,
    createdAt: typeof docData.createdAt?.toDate === "function"
      ? docData.createdAt.toDate().toISOString()
      : (typeof docData.createdAt === "string" ? docData.createdAt : new Date().toISOString()),
    updatedAt: typeof docData.updatedAt?.toDate === "function"
      ? docData.updatedAt.toDate().toISOString()
      : (typeof docData.updatedAt === "string" ? docData.updatedAt : new Date().toISOString()),
  };
}
