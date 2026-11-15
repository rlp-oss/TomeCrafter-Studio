import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  deleteField,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import {
  Book,
  Chapter,
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
  sanitizeSafeImageRef,
  findBookRuleViolations,
  summarizeBookPayload,
  FIRESTORE_MAX_DOCUMENT_BYTES,
  FIRESTORE_SAFE_THRESHOLD_BYTES,
  FIRESTORE_CHAPTER_SUBCOLLECTION_THRESHOLD_BYTES,
  SUBCOLLECTION_STUB_VERSION,
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

const ALLOWED_FIRESTORE_BOOK_KEYS = new Set([
  "id",
  "userId",
  "title",
  "subtitle",
  "author",
  "genre",
  "tone",
  "targetWordCount",
  "currentWordCount",
  "dailyWordCountGoal",
  "wordGoalMode",
  "dailyWordBaselineCount",
  "dailyWordBaselineDate",
  "premise",
  "targetAudience",
  "coverImageUrl",
  "coverImage",
  "frontCoverImage",
  "coverTitleFont",
  "coverAccentColor",
  "chapters",
  "mediaLibrary",
  "loreEntries",
  "publishingKit",
  "formattingSettings",
  "originalityReport",
  "isOffloadedToDrive",
  "offloadMetadata",
  "chapterOutlines",
  "loreSummaries",
  "_stubVersion",
  "createdAt",
  "updatedAt",
]);

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

  // Strip createdAt/updatedAt/id/userId from incoming mutable fields
  const mutableFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === "createdAt" || k === "updatedAt" || k === "id" || k === "userId") continue;
    if (v !== undefined) {
      mutableFields[k] = v;
    }
  }

  let existsInCloud = knownCloudBookIds.has(safeId);
  let existingData: Record<string, any> | null = null;
  let getDocOutcome = existsInCloud ? "known_in_session" : "not_checked";
  if (!existsInCloud) {
    try {
      const snap = await getDoc(docRef);
      existsInCloud = snap.exists();
      getDocOutcome = existsInCloud ? "exists_true" : "exists_false";
      if (existsInCloud) {
        knownCloudBookIds.add(safeId);
        existingData = snap.data() as Record<string, any>;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, path);
      }
      getDocOutcome = `getDoc_denied(${msg})`;
      existsInCloud = false;
    }
  }

  const REQUIRED_OR_IMMUTABLE_KEYS = new Set([
    "id",
    "userId",
    "createdAt",
    "updatedAt",
    "title",
    "author",
    "genre",
    "targetWordCount",
    "currentWordCount",
  ]);

  const buildUpdatePayload = (docData: Record<string, any> | null): Record<string, any> => {
    const payload: Record<string, any> = {
      ...mutableFields,
      updatedAt: serverTimestamp(),
    };
    if (docData) {
      if (!docData.id) {
        payload.id = safeId;
      }
      if (!docData.createdAt || typeof docData.createdAt?.toDate !== "function") {
        payload.createdAt = serverTimestamp();
      }
      // Clean any optional allowed field present on existing doc that is absent from mutableFields
      for (const existingKey of Object.keys(docData)) {
        if (
          ALLOWED_FIRESTORE_BOOK_KEYS.has(existingKey) &&
          !REQUIRED_OR_IMMUTABLE_KEYS.has(existingKey) &&
          !(existingKey in mutableFields)
        ) {
          payload[existingKey] = deleteField();
        }
      }
    }
    return payload;
  };

  if (!existsInCloud) {
    try {
      await setDoc(docRef, {
        ...mutableFields,
        id: safeId,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      knownCloudBookIds.add(safeId);
    } catch (err) {
      const candidate = { ...mutableFields, id: safeId, userId };
      const localIssues = findBookRuleViolations(
        candidate,
        safeId,
        ALLOWED_FIRESTORE_BOOK_KEYS
      );
      const summary = summarizeBookPayload(candidate);
      const baseMsg = err instanceof Error ? err.message : String(err);
      const uidMatch = userId === auth.currentUser?.uid;
      const enriched = new Error(
        `${baseMsg} [phase=initial_create, uidMatch=${String(uidMatch)}, getDoc=${getDocOutcome}, bytes=${calculateByteSize(mutableFields)}, issues=${JSON.stringify(localIssues)}, summary=${JSON.stringify(summary)}]`
      );
      handleFirestoreError(enriched, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(docRef, buildUpdatePayload(existingData));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let diagContext = `phase=updateDoc, bytes=${calculateByteSize(mutableFields)}`;

      if (msg.includes("Missing or insufficient permissions")) {
        let recoveryPhase = "getDoc";
        let existingIssues: string[] = [];
        let outgoingIssues: string[] = [];
        let existingKeys: string[] = [];
        let existingUserId: unknown = undefined;

        try {
          const freshSnap = await getDoc(docRef);
          if (!freshSnap.exists()) {
            recoveryPhase = "setDoc_missing";
            outgoingIssues = findBookRuleViolations(
              { ...mutableFields, id: safeId, userId },
              safeId,
              ALLOWED_FIRESTORE_BOOK_KEYS
            );
            await setDoc(docRef, {
              ...mutableFields,
              id: safeId,
              userId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            knownCloudBookIds.add(safeId);
            return;
          }

          const freshData = freshSnap.data() as Record<string, any>;
          existingKeys = Object.keys(freshData);
          existingUserId = freshData.userId;
          existingIssues = findBookRuleViolations(
            freshData,
            safeId,
            ALLOWED_FIRESTORE_BOOK_KEYS
          );
          const hasUnknownLegacyKeys = existingKeys.some(
            (k) => !ALLOWED_FIRESTORE_BOOK_KEYS.has(k)
          );
          const hasMismatchedId = Boolean(freshData.id && freshData.id !== safeId);
          const hasInvalidUserId = !/^[a-zA-Z0-9_-]{1,128}$/.test(String(freshData.userId || ""));

          let retryFailed = false;
          if (
            !hasUnknownLegacyKeys &&
            !hasMismatchedId &&
            !hasInvalidUserId &&
            existingData === null
          ) {
            recoveryPhase = "updateDoc_retry";
            try {
              await updateDoc(docRef, buildUpdatePayload(freshData));
              return;
            } catch {
              retryFailed = true;
            }
          }

          const candidate = { ...mutableFields, id: safeId, userId };
          outgoingIssues = findBookRuleViolations(
            candidate,
            safeId,
            ALLOWED_FIRESTORE_BOOK_KEYS
          );

          if (
            outgoingIssues.length === 0 &&
            (hasUnknownLegacyKeys || hasMismatchedId || hasInvalidUserId) &&
            (hasInvalidUserId || freshData.userId === userId)
          ) {
            recoveryPhase = "deleteDoc";
            await deleteDoc(docRef);
            recoveryPhase = "setDoc_replace";
            await setDoc(docRef, {
              ...mutableFields,
              id: safeId,
              userId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            knownCloudBookIds.add(safeId);
            return;
          }

          diagContext = `phase=recovery_skipped, bytes=${calculateByteSize(mutableFields)}, retryFailed=${String(retryFailed)}, existingIssues=${JSON.stringify(existingIssues)}, outgoingIssues=${JSON.stringify(outgoingIssues)}, uidMatch=${String(existingUserId === userId)}, existingKeys=${JSON.stringify(existingKeys)}, summary=${JSON.stringify(summarizeBookPayload(candidate))}`;
        } catch (recoveryErr) {
          const recMsg = recoveryErr instanceof Error ? recoveryErr.message : String(recoveryErr);
          const candidateSummary = summarizeBookPayload({ ...mutableFields, id: safeId, userId });
          const enriched = new Error(
            `${recMsg} [phase=${recoveryPhase}, bytes=${calculateByteSize(mutableFields)}, existingIssues=${JSON.stringify(existingIssues)}, outgoingIssues=${JSON.stringify(outgoingIssues)}, uidMatch=${String(existingUserId === userId)}, existingKeys=${JSON.stringify(existingKeys)}, summary=${JSON.stringify(candidateSummary)}]`
          );
          handleFirestoreError(enriched, OperationType.UPDATE, path);
        }
      }
      const enriched = new Error(`${msg} [${diagContext}]`);
      handleFirestoreError(enriched, OperationType.UPDATE, path);
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

function buildChapterOutlinesFromChapters(chapters: Chapter[]): ChapterOutlineStub[] {
  return (chapters || []).slice(0, 300).map((ch, idx) => ({
    id: sanitizeBookId(ch.id || `chapter-${idx + 1}`),
    number: ch.number || idx + 1,
    act: (ch.act || "Act I").slice(0, 200),
    title: (ch.title || `Chapter ${idx + 1}`).slice(0, 200),
    summary: (ch.summary || "").slice(0, 1000),
    goal: (ch.goal || "").slice(0, 500),
    conflict: (ch.conflict || "").slice(0, 500),
    cliffhanger: (ch.cliffhanger || "").slice(0, 500),
    pov: (ch.pov || "Third Person Limited").slice(0, 200),
    setting: (ch.setting || "").slice(0, 500),
    targetWords: ch.targetWords || 2500,
    wordCount: ch.wordCount || (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
    status: ch.status || "draft",
    hasIllustrations: Boolean(ch.illustrations && ch.illustrations.length > 0),
    illustrationCount: ch.illustrations?.length || 0,
    hasFootnotes: Boolean(ch.footnotes && ch.footnotes.length > 0),
    footnoteCount: ch.footnotes?.length || 0,
  }));
}

const CHAPTER_OPTIONAL_FIELDS = [
  "act",
  "summary",
  "goal",
  "conflict",
  "cliffhanger",
  "pov",
  "setting",
  "targetWords",
  "wordCount",
  "status",
  "illustrations",
  "notes",
  "footnotes",
] as const;

function buildFirestoreChapterPayload(ch: Chapter, index: number): Record<string, any> {
  const payload: Record<string, any> = {
    number: Number.isFinite(Number(ch.number)) ? Math.max(0, Math.min(10000, Math.round(Number(ch.number)))) : index + 1,
    act: String(ch.act || "Act I").slice(0, 200),
    title: String(ch.title || `Chapter ${index + 1}`).slice(0, 500),
    summary: String(ch.summary || "").slice(0, 8000),
    goal: String(ch.goal || "").slice(0, 2000),
    conflict: String(ch.conflict || "").slice(0, 2000),
    cliffhanger: String(ch.cliffhanger || "").slice(0, 2000),
    pov: String(ch.pov || "Third Person Limited").slice(0, 200),
    setting: String(ch.setting || "").slice(0, 500),
    targetWords: Number.isFinite(Number(ch.targetWords)) ? Math.max(0, Math.min(1000000, Math.round(Number(ch.targetWords)))) : 2500,
    wordCount: Number.isFinite(Number(ch.wordCount)) ? Math.max(0, Math.min(1000000, Math.round(Number(ch.wordCount)))) : 0,
    content: String(ch.content || "").slice(0, 1000000),
    status: ch.status === "review" || ch.status === "polished" || ch.status === "final" ? ch.status : "draft",
    illustrations: Array.isArray(ch.illustrations) ? ch.illustrations.slice(0, 50) : [],
  };
  if (typeof ch.notes === "string" && ch.notes.length > 0) {
    payload.notes = ch.notes.slice(0, 8000);
  }
  if (Array.isArray(ch.footnotes) && ch.footnotes.length > 0) {
    payload.footnotes = ch.footnotes.slice(0, 500);
  }
  return payload;
}

export async function fetchSubcollectionChapters(
  bookId: string,
  userId: string
): Promise<Chapter[]> {
  const safeBookId = sanitizeBookId(bookId);
  const effectiveUid = userId || auth.currentUser?.uid || "";
  if (!effectiveUid) return [];

  const path = `books/${safeBookId}/chapters`;
  try {
    const q = query(collection(db, "books", safeBookId, "chapters"), where("userId", "==", effectiveUid));
    const snap = await getDocs(q);
    const chapters: Chapter[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      chapters.push({
        id: d.id || docSnap.id,
        number: typeof d.number === "number" ? d.number : chapters.length + 1,
        act: d.act || "Act I",
        title: d.title || `Chapter ${chapters.length + 1}`,
        summary: d.summary || "",
        goal: d.goal || "",
        conflict: d.conflict || "",
        cliffhanger: d.cliffhanger || "",
        pov: d.pov || "Third Person Limited",
        setting: d.setting || "",
        targetWords: typeof d.targetWords === "number" ? d.targetWords : 2500,
        wordCount: typeof d.wordCount === "number" ? d.wordCount : 0,
        content: d.content || "",
        status: d.status || "draft",
        illustrations: Array.isArray(d.illustrations) ? d.illustrations : [],
        notes: typeof d.notes === "string" ? d.notes : undefined,
        footnotes: Array.isArray(d.footnotes) ? d.footnotes : [],
      });
    });
    return chapters.sort((a, b) => a.number - b.number);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

async function syncChaptersSubcollection(
  bookId: string,
  userId: string,
  chapters: Chapter[]
): Promise<void> {
  const safeBookId = sanitizeBookId(bookId);
  const collectionPath = `books/${safeBookId}/chapters`;
  const existingMap = new Map<string, Record<string, any>>();

  try {
    const existingSnap = await getDocs(
      query(collection(db, "books", safeBookId, "chapters"), where("userId", "==", userId))
    );
    existingSnap.forEach((docSnap) => {
      existingMap.set(docSnap.id, docSnap.data() as Record<string, any>);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionPath);
  }

  const desiredIds = new Set<string>();

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const safeChId = sanitizeBookId(ch.id || `chapter-${i + 1}`);
    desiredIds.add(safeChId);
    const chDocRef = doc(db, "books", safeBookId, "chapters", safeChId);
    const chPath = `${collectionPath}/${safeChId}`;
    const mutable = buildFirestoreChapterPayload(ch, i);
    const existingData = existingMap.get(safeChId);

    if (!existingData) {
      try {
        await setDoc(chDocRef, {
          ...mutable,
          id: safeChId,
          bookId: safeBookId,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, chPath);
      }
    } else {
      const updatePayload: Record<string, any> = {
        ...mutable,
        updatedAt: serverTimestamp(),
      };
      for (const optKey of CHAPTER_OPTIONAL_FIELDS) {
        if (optKey in existingData && !(optKey in mutable)) {
          updatePayload[optKey] = deleteField();
        }
      }
      try {
        await updateDoc(chDocRef, updatePayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, chPath);
      }
    }
  }

  for (const staleId of existingMap.keys()) {
    if (!desiredIds.has(staleId)) {
      const chPath = `${collectionPath}/${staleId}`;
      try {
        await deleteDoc(doc(db, "books", safeBookId, "chapters", staleId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, chPath);
      }
    }
  }
}

export async function deleteBookChaptersSubcollection(
  bookId: string,
  userId: string
): Promise<void> {
  const safeBookId = sanitizeBookId(bookId);
  const effectiveUid = userId || auth.currentUser?.uid || "";
  if (!effectiveUid) return;

  const collectionPath = `books/${safeBookId}/chapters`;
  let snap;
  try {
    snap = await getDocs(
      query(collection(db, "books", safeBookId, "chapters"), where("userId", "==", effectiveUid))
    );
  } catch {
    return;
  }

  for (const docSnap of snap.docs) {
    try {
      await deleteDoc(doc(db, "books", safeBookId, "chapters", docSnap.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionPath}/${docSnap.id}`);
    }
  }
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
  const chapterOutlines: ChapterOutlineStub[] = buildChapterOutlinesFromChapters(book.chapters || []);

  const loreSummaries: LoreSummaryStub[] = (book.loreEntries || []).slice(0, 500).map((lore) => ({
    id: lore.id,
    name: lore.name,
    category: lore.category,
    tagline: lore.tagline || "",
  }));

  const rawDriveLink = (driveFileInfo.webViewLink || "").trim().slice(0, 1024);
  const safeDriveLink = /^https?:\/\/.+/.test(rawDriveLink) ? rawDriveLink : undefined;

  const offloadMetadata: OffloadMetadata = {
    driveFileId: String(driveFileInfo.fileId || "drive-file").slice(0, 256),
    ...(safeDriveLink ? { driveWebViewLink: safeDriveLink } : {}),
    driveFileName: String(driveFileInfo.name || "archive.json").slice(0, 256),
    offloadedAt: new Date().toISOString(),
    originalSizeBytes: Math.max(0, Math.min(1000000000, Math.round(originalSizeBytes || 0))),
    originalSizeFormatted: formatBytes(originalSizeBytes).slice(0, 40),
    compressedSizeBytes: Math.max(0, Math.min(1000000000, Math.round(compressedSizeBytes || 0))),
    compressedSizeFormatted: formatBytes(compressedSizeBytes).slice(0, 40),
    chapterCount: Math.max(0, Math.min(1000, book.chapters?.length || 0)),
    loreCount: Math.max(0, Math.min(2000, book.loreEntries?.length || 0)),
    reason: "Document payload exceeded 1MB Firestore limit. Full lossless manuscript archived in Google Drive.",
  };

  const totalWords = chapterOutlines.reduce((sum, ch) => sum + ch.wordCount, 0);
  const safeStubCoverUrl = sanitizeSafeImageRef(book.coverImageUrl, 500000);

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
    coverImageUrl: safeStubCoverUrl !== undefined ? safeStubCoverUrl : undefined,
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
 * Automatically stores chapter prose in /books/{bookId}/chapters when a manuscript exceeds
 * the single-document threshold so large multi-chapter books stay fast and well under Firestore limits.
 */
export async function syncBookWithAutoDriveOffload(
  book: Book,
  userId: string,
  options?: { forceDriveOffload?: boolean }
): Promise<OffloadExecutionResult> {
  const detection = detectFirestoreOverflow(book);

  if (options?.forceDriveOffload) {
    return await executeGoogleDriveOffload(book, userId);
  }

  const compression = compressBookForFirestore(book);
  const compressedChapters = Array.isArray(compression.compressedBook.chapters)
    ? (compression.compressedBook.chapters as Chapter[])
    : [];

  if (
    compressedChapters.length > 0 &&
    compression.compressedBytes > FIRESTORE_CHAPTER_SUBCOLLECTION_THRESHOLD_BYTES
  ) {
    const parentCandidate: Record<string, any> = {
      ...compression.compressedBook,
      chapters: [],
      chapterOutlines: buildChapterOutlinesFromChapters(compressedChapters),
      _stubVersion: SUBCOLLECTION_STUB_VERSION,
      isOffloadedToDrive: false,
    };

    const parentValidation = validateFirestoreDocumentSize(parentCandidate);
    const maxChapterBytes = compressedChapters.reduce(
      (max, ch, idx) => Math.max(max, calculateByteSize(buildFirestoreChapterPayload(ch, idx))),
      0
    );

    if (
      parentValidation.valid &&
      parentValidation.sizeBytes < FIRESTORE_SAFE_THRESHOLD_BYTES &&
      maxChapterBytes < FIRESTORE_SAFE_THRESHOLD_BYTES
    ) {
      await persistBookRecord(book.id, userId, parentCandidate);
      await syncChaptersSubcollection(book.id, userId, compressedChapters);

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
        stubSizeBytes: parentValidation.sizeBytes,
        stubSizeFormatted: parentValidation.sizeFormatted,
        message: `Book saved across parent metadata (${parentValidation.sizeFormatted}) and ${compressedChapters.length} chapter subcollection documents.`,
      };
    }

    return await executeGoogleDriveOffload(book, userId);
  }

  if (detection.shouldOffload) {
    return await executeGoogleDriveOffload(book, userId);
  }

  const sizeValidation = validateFirestoreDocumentSize(compression.compressedBook);
  if (!sizeValidation.valid) {
    return await executeGoogleDriveOffload(book, userId);
  }

  await persistBookRecord(book.id, userId, {
    ...compression.compressedBook,
    isOffloadedToDrive: false,
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
 * Hydrates a Firestore book document, resolving subcollection chapters or Google Drive offloaded archives if needed.
 */
export function hydrateBookData(
  bookId: string,
  data: Record<string, any>,
  subcollectionChapters?: Chapter[]
): Book {
  if (data._stubVersion === SUBCOLLECTION_STUB_VERSION && !data.isOffloadedToDrive) {
    const baseBook = decompressBookFromFirestore(data);
    if (Array.isArray(subcollectionChapters) && subcollectionChapters.length > 0) {
      return {
        ...baseBook,
        chapters: subcollectionChapters,
      };
    }
    if (Array.isArray(data.chapterOutlines) && data.chapterOutlines.length > 0) {
      return {
        ...baseBook,
        chapters: data.chapterOutlines.map((co: ChapterOutlineStub, idx: number) => ({
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
          content: "",
          status: (
            co.status === "complete"
              ? "final"
              : co.status === "in-progress"
                ? "draft"
                : co.status || "draft"
          ) as "draft" | "review" | "polished" | "final",
          illustrations: [],
          footnotes: [],
        })),
      };
    }
    return baseBook;
  }
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

  if (data._stubVersion === SUBCOLLECTION_STUB_VERSION && !data.isOffloadedToDrive) {
    const subChapters = await fetchSubcollectionChapters(safeId, data.userId || auth.currentUser?.uid || "");
    return {
      book: hydrateBookData(safeId, data, subChapters),
      source: "firestore",
      isOffloaded: false,
    };
  }

  return {
    book: decompressBookFromFirestore(data),
    source: "firestore",
    isOffloaded: false,
  };
}
