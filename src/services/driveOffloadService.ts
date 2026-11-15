import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import {
  Book,
  FirestoreBookMetadataStub,
  OffloadMetadata,
  ChapterOutlineStub,
  LoreSummaryStub,
} from "../types";
import {
  saveBookArchiveToGoogleDrive,
  loadBookFromGoogleDrive,
  isGoogleDriveAutoSyncEnabled,
} from "./googleDrive";
import {
  compressBookForFirestore,
  decompressBookFromFirestore,
  validateFirestoreDocumentSize,
  calculateByteSize,
  formatBytes,
  FIRESTORE_MAX_DOCUMENT_BYTES,
  FIRESTORE_SAFE_THRESHOLD_BYTES,
} from "./dataCompression";

export interface OffloadDetectionResult {
  shouldOffload: boolean;
  exceedsLimit: boolean;
  rawSizeBytes: number;
  rawSizeFormatted: string;
  minifiedSizeBytes: number;
  minifiedSizeFormatted: string;
  maxLimitBytes: number;
  percentOfLimit: number;
  reason?: string;
}

export interface OffloadExecutionResult {
  success: boolean;
  actionTaken: "saved_to_firestore" | "offloaded_to_drive" | "failed";
  driveFileId?: string;
  driveWebViewLink?: string;
  driveFileName?: string;
  originalSizeBytes: number;
  originalSizeFormatted: string;
  stubSizeBytes?: number;
  stubSizeFormatted?: string;
  message: string;
  error?: string;
  metadataStub?: FirestoreBookMetadataStub;
}

// Track book IDs verified to exist in Firestore during this session to ensure clean create vs update
const knownCloudBookIds = new Set<string>();

export function markBookKnownInCloud(bookId: string): void {
  knownCloudBookIds.add(bookId);
}

export function clearKnownCloudBooks(): void {
  knownCloudBookIds.clear();
}

export function sanitizeBookId(id: string): string {
  const cleaned = String(id || `book-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 128);
  return cleaned.length > 0 ? cleaned : `book-${Date.now()}`;
}

/**
 * Strips undefined/null values and enforces blueprint-compliant create vs update writes
 * with Firestore serverTimestamp() for createdAt/updatedAt temporal integrity.
 */
async function persistBookRecord(
  bookId: string,
  userId: string,
  fields: Record<string, any>
): Promise<void> {
  const safeId = sanitizeBookId(bookId);
  const path = `books/${safeId}`;
  const docRef = doc(db, "books", safeId);

  // Strip createdAt/updatedAt from incoming fields so serverTimestamp() is authoritative
  const cleanFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === "createdAt" || k === "updatedAt") continue;
    if (v !== undefined) {
      cleanFields[k] = v;
    }
  }
  cleanFields.id = safeId;
  cleanFields.userId = userId;

  let existsInCloud = knownCloudBookIds.has(safeId);
  if (!existsInCloud) {
    try {
      const snap = await getDoc(docRef);
      existsInCloud = snap.exists();
      if (existsInCloud) {
        knownCloudBookIds.add(safeId);
      }
    } catch (err) {
      // If getDoc fails due to not-found or permissions on non-existent doc, check safely
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, path);
      }
      existsInCloud = false;
    }
  }

  if (!existsInCloud) {
    try {
      await setDoc(docRef, {
        ...cleanFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      knownCloudBookIds.add(safeId);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(docRef, {
        ...cleanFields,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }
}

/**
 * Evaluates whether a manuscript exceeds Firestore's 1MB document limit,
 * taking into account both raw and minified structural footprints.
 */
export function detectFirestoreOverflow(
  book: Book,
  thresholdBytes = FIRESTORE_MAX_DOCUMENT_BYTES
): OffloadDetectionResult {
  const rawSizeBytes = calculateByteSize(book);
  const compression = compressBookForFirestore(book);
  const minifiedSizeBytes = compression.compressedBytes;
  const percentOfLimit = parseFloat(((minifiedSizeBytes / FIRESTORE_MAX_DOCUMENT_BYTES) * 100).toFixed(1));
  const exceedsLimit = minifiedSizeBytes >= thresholdBytes;

  let reason: string | undefined = undefined;
  if (exceedsLimit) {
    reason = `Minified payload (${formatBytes(minifiedSizeBytes)}) exceeds Firestore's 1MB limit (${formatBytes(thresholdBytes)}).`;
  } else if (rawSizeBytes >= FIRESTORE_MAX_DOCUMENT_BYTES && minifiedSizeBytes > FIRESTORE_SAFE_THRESHOLD_BYTES) {
    reason = `Raw book (${formatBytes(rawSizeBytes)}) exceeds 1MB and minified footprint (${formatBytes(minifiedSizeBytes)}) is near safe threshold.`;
  }

  return {
    shouldOffload: exceedsLimit,
    exceedsLimit,
    rawSizeBytes,
    rawSizeFormatted: formatBytes(rawSizeBytes),
    minifiedSizeBytes,
    minifiedSizeFormatted: formatBytes(minifiedSizeBytes),
    maxLimitBytes: thresholdBytes,
    percentOfLimit,
    reason,
  };
}

/**
 * Builds a lean, queryable Metadata Stub to store in Firestore.
 */
export function createFirestoreMetadataStub(
  book: Book,
  driveFileInfo: { fileId: string; webViewLink?: string; name: string },
  originalSizeBytes: number,
  compressedSizeBytes: number,
  userId?: string
): FirestoreBookMetadataStub {
  const chapterOutlines: ChapterOutlineStub[] = (book.chapters || []).slice(0, 300).map((ch, idx) => ({
    id: ch.id || `chapter-${idx + 1}`,
    number: ch.number || idx + 1,
    act: ch.act || "Act I",
    title: (ch.title || `Chapter ${idx + 1}`).slice(0, 200),
    summary: ch.summary || "",
    goal: ch.goal || "",
    conflict: ch.conflict || "",
    cliffhanger: ch.cliffhanger || "",
    pov: ch.pov || "Third Person Limited",
    setting: ch.setting || "",
    targetWords: ch.targetWords || 2500,
    wordCount: ch.wordCount || (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
    status: ch.status || "draft",
    hasIllustrations: Boolean(ch.illustrations && ch.illustrations.length > 0),
    illustrationCount: ch.illustrations?.length || 0,
    hasFootnotes: Boolean(ch.footnotes && ch.footnotes.length > 0),
    footnoteCount: ch.footnotes?.length || 0,
  }));

  const loreSummaries: LoreSummaryStub[] = (book.loreEntries || []).slice(0, 500).map((lore) => ({
    id: lore.id,
    name: lore.name,
    category: lore.category,
    tagline: lore.tagline || "",
  }));

  const offloadMetadata: OffloadMetadata = {
    driveFileId: driveFileInfo.fileId,
    driveWebViewLink: driveFileInfo.webViewLink,
    driveFileName: driveFileInfo.name,
    offloadedAt: new Date().toISOString(),
    originalSizeBytes,
    originalSizeFormatted: formatBytes(originalSizeBytes),
    compressedSizeBytes,
    compressedSizeFormatted: formatBytes(compressedSizeBytes),
    chapterCount: book.chapters?.length || 0,
    loreCount: book.loreEntries?.length || 0,
    reason: "Document payload exceeded 1MB Firestore limit. Full lossless manuscript archived in Google Drive.",
  };

  const totalWords = chapterOutlines.reduce((sum, ch) => sum + ch.wordCount, 0);

  return {
    id: sanitizeBookId(book.id),
    userId: userId || "",
    title: (book.title || "Untitled Tome").slice(0, 200),
    subtitle: (book.subtitle || "").slice(0, 300),
    author: (book.author || "Anonymous Author").slice(0, 120),
    genre: (book.genre || "Epic Fantasy") as any,
    targetWordCount: Math.max(0, Math.min(10000000, book.targetWordCount || 50000)),
    currentWordCount: Math.max(0, Math.min(10000000, totalWords || book.currentWordCount || 0)),
    dailyWordCountGoal:
      book.dailyWordCountGoal !== undefined && Number(book.dailyWordCountGoal) >= 1
        ? Math.max(1, Math.min(1000000, Math.round(Number(book.dailyWordCountGoal))))
        : undefined,
    wordGoalMode:
      book.wordGoalMode === "daily" || book.wordGoalMode === "project"
        ? book.wordGoalMode
        : undefined,
    dailyWordBaselineCount:
      book.dailyWordBaselineCount !== undefined && Number(book.dailyWordBaselineCount) >= 0
        ? Math.max(0, Math.min(10000000, Math.round(Number(book.dailyWordBaselineCount))))
        : undefined,
    dailyWordBaselineDate: book.dailyWordBaselineDate
      ? String(book.dailyWordBaselineDate).slice(0, 20)
      : undefined,
    premise: (book.premise || "").slice(0, 8000),
    tone: (book.tone || "Atmospheric and Evocative").slice(0, 240),
    targetAudience: (book.targetAudience || "Adult & Literary Fiction").slice(0, 200),
    coverImageUrl: book.coverImageUrl && book.coverImageUrl.length <= 500000 ? book.coverImageUrl : undefined,
    coverTitleFont: book.coverTitleFont ? book.coverTitleFont.slice(0, 80) : undefined,
    coverAccentColor: book.coverAccentColor ? book.coverAccentColor.slice(0, 40) : undefined,
    isOffloadedToDrive: true,
    offloadMetadata,
    chapterOutlines,
    loreSummaries,
    createdAt: book.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _stubVersion: "2.0.0",
  };
}

/**
 * Explicitly triggers an offload to Google Drive and writes the metadata stub to Firestore.
 */
export async function executeGoogleDriveOffload(
  book: Book,
  userId: string
): Promise<OffloadExecutionResult> {
  const originalBytes = calculateByteSize(book);
  const compression = compressBookForFirestore(book);

  const driveUpload = await saveBookArchiveToGoogleDrive(book);
  const stub = createFirestoreMetadataStub(
    book,
    driveUpload,
    originalBytes,
    compression.compressedBytes,
    userId
  );
  const stubBytes = calculateByteSize(stub);

  await persistBookRecord(book.id, userId, stub as unknown as Record<string, any>);

  return {
    success: true,
    actionTaken: "offloaded_to_drive",
    driveFileId: driveUpload.fileId,
    driveWebViewLink: driveUpload.webViewLink,
    driveFileName: driveUpload.name,
    originalSizeBytes: originalBytes,
    originalSizeFormatted: formatBytes(originalBytes),
    stubSizeBytes: stubBytes,
    stubSizeFormatted: formatBytes(stubBytes),
    metadataStub: stub,
    message: `Payload offloaded to Google Drive (${driveUpload.name}) and metadata stub saved in Firestore.`,
  };
}

/**
 * Unified Sync Engine: Compresses, validates < 1MB, and persists Book to Firestore.
 */
export async function syncBookWithAutoDriveOffload(
  book: Book,
  userId: string,
  options?: { forceDriveOffload?: boolean }
): Promise<OffloadExecutionResult> {
  const detection = detectFirestoreOverflow(book);

  if (detection.shouldOffload || options?.forceDriveOffload) {
    return await executeGoogleDriveOffload(book, userId);
  }

  const compression = compressBookForFirestore(book);
  const sizeValidation = validateFirestoreDocumentSize(compression.compressedBook);

  if (!sizeValidation.valid) {
    return await executeGoogleDriveOffload(book, userId);
  }

  await persistBookRecord(book.id, userId, {
    ...compression.compressedBook,
    isOffloadedToDrive: false,
    offloadMetadata: null,
  });

  if (isGoogleDriveAutoSyncEnabled()) {
    saveBookArchiveToGoogleDrive(book).catch((driveErr) => {
      console.warn("[CloudSync] Background Google Drive mirror skipped:", driveErr);
    });
  }

  return {
    success: true,
    actionTaken: "saved_to_firestore",
    originalSizeBytes: detection.rawSizeBytes,
    originalSizeFormatted: detection.rawSizeFormatted,
    stubSizeBytes: compression.compressedBytes,
    stubSizeFormatted: formatBytes(compression.compressedBytes),
    message: `Book minified (${formatBytes(compression.compressedBytes)}) and saved directly to Firestore.`,
  };
}

/**
 * Hydrates a Firestore book document, resolving Google Drive offloaded archives if needed.
 */
export function hydrateBookData(bookId: string, data: Record<string, any>): Book {
  if (data.isOffloadedToDrive && data.offloadMetadata) {
    return {
      id: data.id || bookId,
      title: data.title || "Offloaded Tome",
      subtitle: data.subtitle || "",
      author: data.author || "Anonymous",
      genre: data.genre || "Epic Fantasy",
      targetWordCount: data.targetWordCount || 50000,
      currentWordCount: data.currentWordCount || 0,
      dailyWordCountGoal:
        typeof data.dailyWordCountGoal === "number" ? data.dailyWordCountGoal : undefined,
      wordGoalMode:
        data.wordGoalMode === "daily" || data.wordGoalMode === "project"
          ? data.wordGoalMode
          : undefined,
      dailyWordBaselineCount:
        typeof data.dailyWordBaselineCount === "number"
          ? data.dailyWordBaselineCount
          : undefined,
      dailyWordBaselineDate:
        typeof data.dailyWordBaselineDate === "string"
          ? data.dailyWordBaselineDate
          : undefined,
      premise: data.premise || "",
      tone: data.tone || "Atmospheric and Evocative",
      targetAudience: data.targetAudience || "Adult & Literary Fiction",
      coverImageUrl: data.coverImageUrl || "",
      coverTitleFont: data.coverTitleFont,
      coverAccentColor: data.coverAccentColor,
      chapters: Array.isArray(data.chapterOutlines)
        ? data.chapterOutlines.map((co: ChapterOutlineStub, idx: number) => ({
            id: co.id || `chapter-${idx + 1}`,
            number: co.number || idx + 1,
            act: co.act || "Act I",
            title: co.title || `Chapter ${idx + 1}`,
            summary: co.summary || "",
            goal: co.goal || "",
            conflict: co.conflict || "",
            cliffhanger: co.cliffhanger || "",
            pov: co.pov || "Third Person Limited",
            setting: co.setting || "",
            targetWords: co.targetWords || 2500,
            wordCount: co.wordCount || 0,
            content: `*Note: This manuscript is securely archived in Google Drive (${data.offloadMetadata?.driveFileName || "archive"}). Connect Google Drive to load the full prose text.*`,
            status: (
              co.status === "complete"
                ? "final"
                : co.status === "in-progress"
                  ? "draft"
                  : co.status || "draft"
            ) as "draft" | "review" | "polished" | "final",
            illustrations: [],
            footnotes: [],
          }))
        : [],
      loreEntries: Array.isArray(data.loreSummaries)
        ? data.loreSummaries.map((ls: LoreSummaryStub) => ({
            id: ls.id,
            name: ls.name,
            category: (ls.category as Book["loreEntries"][number]["category"]) || "Custom",
            tagline: ls.tagline,
            description: "Archived in Google Drive project archive.",
          }))
        : [],
      publishingKit: {
        salesBlurb: { hook: "", body: "", callToAction: "" },
        amazonKeywords: [],
        bisacCategories: [],
        compTitles: [],
        targetAudience: data.targetAudience || "",
      },
      formattingSettings: {
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
        copyrightText: `© ${new Date().getFullYear()} ${data.author || "Author"}. All rights reserved.`,
        authorBio: "",
        newsletterLink: "",
        acknowledgments: "",
      },
      isOffloadedToDrive: true,
      offloadMetadata: data.offloadMetadata,
      createdAt:
        typeof data.createdAt?.toDate === "function"
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date().toISOString(),
      updatedAt:
        typeof data.updatedAt?.toDate === "function"
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt || new Date().toISOString(),
    };
  }
  return decompressBookFromFirestore(data);
}

/**
 * Loads a book from Firestore, automatically resolving Drive offload if applicable.
 */
export async function loadBookWithDriveResolution(
  bookId: string
): Promise<{ book: Book; source: "firestore" | "googledrive" | "stub_fallback"; isOffloaded: boolean }> {
  const safeId = sanitizeBookId(bookId);
  const path = `books/${safeId}`;
  let snap;
  try {
    snap = await getDoc(doc(db, "books", safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  if (!snap.exists()) {
    throw new Error(`Book with ID "${safeId}" not found in Firestore.`);
  }

  knownCloudBookIds.add(safeId);
  const data = snap.data();

  if (data.isOffloadedToDrive && data.offloadMetadata?.driveFileId) {
    try {
      const driveBook = await loadBookFromGoogleDrive(data.offloadMetadata.driveFileId);
      return {
        book: {
          ...driveBook,
          isOffloadedToDrive: true,
          offloadMetadata: data.offloadMetadata,
        },
        source: "googledrive",
        isOffloaded: true,
      };
    } catch {
      return {
        book: hydrateBookData(safeId, data),
        source: "stub_fallback",
        isOffloaded: true,
      };
    }
  }

  return {
    book: decompressBookFromFirestore(data),
    source: "firestore",
    isOffloaded: false,
  };
}
