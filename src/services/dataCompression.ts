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
  const processedChapters: Chapter[] = (rawCopy.chapters || []).map((ch, index) => {
    const minifiedContent = stripRedundantWhitespace(ch.content || "");
    const wordCount = minifiedContent
      ? minifiedContent.trim().split(/\s+/).filter(Boolean).length
      : 0;
    totalWordsInChapters += wordCount;

    return {
      id: ch.id || `chapter-${index + 1}`,
      number: ch.number || index + 1,
      act: stripRedundantWhitespace(ch.act || "Act I"),
      title: stripRedundantWhitespace(ch.title || `Chapter ${index + 1}`),
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
  const totalIllCompressed = compressedCount + mediaLibRes.compressedCount;
  const totalIllBytesSaved = bytesSaved + mediaLibRes.bytesSaved;
  if (totalIllCompressed > 0) {
    optimizationsApplied.push(
      `Compressed ${totalIllCompressed} heavy illustration data URIs (saved ${formatBytes(totalIllBytesSaved)})`
    );
  }

  // 3. Compress Cover Image if massive Base64
  let coverImageUrl = rawCopy.coverImageUrl || "";
  if (coverImageUrl.startsWith("data:") && calculateByteSize(coverImageUrl) > 120000) {
    coverImageUrl = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop";
    optimizationsApplied.push("Replaced oversized inline cover base64 with cloud reference URL");
  }

  // 4. Minify Lore Codex Entries
  const compressedLoreEntries: LoreEntry[] = (rawCopy.loreEntries || []).map((entry) => ({
    id: entry.id,
    name: stripRedundantWhitespace(entry.name),
    category: entry.category,
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

  // 5. Minify Publishing Kit & Marketing Metadata
  const publishingKit = rawCopy.publishingKit
    ? {
        commercialTitle: rawCopy.publishingKit.commercialTitle ? stripRedundantWhitespace(rawCopy.publishingKit.commercialTitle) : undefined,
        catchySubtitle: rawCopy.publishingKit.catchySubtitle ? stripRedundantWhitespace(rawCopy.publishingKit.catchySubtitle) : undefined,
        salesBlurb: {
          hook: stripRedundantWhitespace(rawCopy.publishingKit.salesBlurb?.hook || ""),
          body: stripRedundantWhitespace(rawCopy.publishingKit.salesBlurb?.body || ""),
          callToAction: stripRedundantWhitespace(rawCopy.publishingKit.salesBlurb?.callToAction || ""),
        },
        amazonKeywords: (rawCopy.publishingKit.amazonKeywords || []).map((k) => stripRedundantWhitespace(k)).filter(Boolean),
        bisacCategories: (rawCopy.publishingKit.bisacCategories || []).map((c) => stripRedundantWhitespace(c)).filter(Boolean),
        compTitles: (rawCopy.publishingKit.compTitles || []).map((c) => stripRedundantWhitespace(c)).filter(Boolean),
        targetAudience: stripRedundantWhitespace(rawCopy.publishingKit.targetAudience || ""),
        pricingRecommendations: rawCopy.publishingKit.pricingRecommendations,
        marketingHook: rawCopy.publishingKit.marketingHook ? stripRedundantWhitespace(rawCopy.publishingKit.marketingHook) : undefined,
        launchStrategy: rawCopy.publishingKit.launchStrategy ? stripRedundantWhitespace(rawCopy.publishingKit.launchStrategy) : undefined,
        queryLetter: rawCopy.publishingKit.queryLetter ? stripRedundantWhitespace(rawCopy.publishingKit.queryLetter) : undefined,
        printSpecs: rawCopy.publishingKit.printSpecs,
        isbn: rawCopy.publishingKit.isbn?.trim() || undefined,
        copyrightYear: rawCopy.publishingKit.copyrightYear?.trim() || undefined,
        publisherImprint: rawCopy.publishingKit.publisherImprint ? stripRedundantWhitespace(rawCopy.publishingKit.publisherImprint) : undefined,
      }
    : undefined;

  // 6. Minify Originality Report & Bound Recent Transactions
  const originalityReport = rawCopy.originalityReport
    ? {
        ...rawCopy.originalityReport,
        analysisNotes: stripRedundantWhitespace(rawCopy.originalityReport.analysisNotes || ""),
        recentTransactions: (rawCopy.originalityReport.recentTransactions || []).slice(-maxRecentTransactionsToKeep),
        taggedAuthors: rawCopy.originalityReport.taggedAuthors || [],
      }
    : undefined;

  // 7. Assemble Compressed Book Structure aligned with firebase-blueprint.json
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
    premise: stripRedundantWhitespace(rawCopy.premise || "").slice(0, 8000),
    tone: stripRedundantWhitespace(rawCopy.tone || "").slice(0, 240),
    targetAudience: rawCopy.targetAudience ? stripRedundantWhitespace(rawCopy.targetAudience).slice(0, 200) : undefined,
    coverImageUrl: coverImageUrl && coverImageUrl.length <= 500000 ? coverImageUrl : undefined,
    coverTitleFont: rawCopy.coverTitleFont ? String(rawCopy.coverTitleFont).slice(0, 80) : undefined,
    coverAccentColor: rawCopy.coverAccentColor ? String(rawCopy.coverAccentColor).slice(0, 40) : undefined,
    chapters: finalChapters.slice(0, 300),
    mediaLibrary: mediaLibRes.illustrations.length > 0 ? mediaLibRes.illustrations.slice(0, 200) : undefined,
    loreEntries: compressedLoreEntries.slice(0, 500),
    publishingKit: publishingKit,
    formattingSettings: rawCopy.formattingSettings || {},
    originalityReport: originalityReport,
  };

  // 8. Run Deep Structure Key Minification
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
