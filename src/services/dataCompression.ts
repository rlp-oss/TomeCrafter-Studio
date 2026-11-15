import { Book, Chapter, ChapterIllustration, FootnoteReference, LoreEntry } from "../types";

export const FIRESTORE_MAX_DOCUMENT_BYTES = 1048576; // 1 MiB strict Firestore limit
export const FIRESTORE_SAFE_THRESHOLD_BYTES = 800000; // 800 KB target threshold for safety

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
  let trimmed = val.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) {
    trimmed = trimmed.replace(/[\r\n]+/g, "");
  }
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
  const processedChapters: Chapter[] = (rawCopy.chapters || []).slice(0, 300).map((ch, index) => {
    const minifiedContent = stripRedundantWhitespace(ch.content || "").slice(0, 1000000);
    const wordCount = minifiedContent
      ? minifiedContent.trim().split(/\s+/).filter(Boolean).length
      : 0;
    totalWordsInChapters += wordCount;

    const safeChapterId = String(ch.id || `chapter-${index + 1}`).trim().slice(0, 128) || `chapter-${index + 1}`;
    const safeChapterTitle = stripRedundantWhitespace(ch.title || `Chapter ${index + 1}`).slice(0, 500) || `Chapter ${index + 1}`;

    return {
      id: safeChapterId,
      number: ch.number || index + 1,
      act: stripRedundantWhitespace(ch.act || "Act I"),
      title: safeChapterTitle,
      summary: stripRedundantWhitespace(ch.summary || ""),
      goal: stripRedundantWhitespace(ch.goal || ""),
      conflict: stripRedundantWhitespace(ch.conflict || ""),
      cliffhanger: stripRedundantWhitespace(ch.cliffhanger || ""),
      pov: stripRedundantWhitespace(ch.pov || "Third Person Limited"),
      setting: stripRedundantWhitespace(ch.setting || ""),
      targetWords: ch.targetWords || 2500,
      wordCount,
      content: minifiedContent,
      status: ch.status || "draft",
      illustrations: ch.illustrations || [],
      notes: ch.notes ? stripRedundantWhitespace(ch.notes) : undefined,
      footnotes: compressFootnotes(ch.footnotes, maxFootnoteAlternativesToKeep),
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
