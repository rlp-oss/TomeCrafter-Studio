// Zero-Cost Local Mode: Firestore & Drive cloud offload network calls removed.
import { Book, FirestoreBookMetadataStub } from "../types";
import {
  compressBookForFirestore,
  decompressBookFromFirestore,
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

export function markBookKnownInCloud(_bookId: string): void {}
export function clearKnownCloudBooks(): void {}

export function sanitizeBookId(id: string): string {
  const cleaned = String(id || `book-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : `book-${Date.now()}`;
}

export function detectFirestoreOverflow(book: Book): OffloadDetectionResult {
  const rawSizeBytes = calculateByteSize(book);
  const compressed = compressBookForFirestore(book);
  const minifiedSizeBytes = compressed.compressedBytes;
  const percentOfLimit = Math.round((minifiedSizeBytes / FIRESTORE_MAX_DOCUMENT_BYTES) * 100);

  return {
    shouldOffload: minifiedSizeBytes >= FIRESTORE_SAFE_THRESHOLD_BYTES,
    exceedsLimit: minifiedSizeBytes >= FIRESTORE_MAX_DOCUMENT_BYTES,
    rawSizeBytes,
    rawSizeFormatted: formatBytes(rawSizeBytes),
    minifiedSizeBytes,
    minifiedSizeFormatted: formatBytes(minifiedSizeBytes),
    maxLimitBytes: FIRESTORE_MAX_DOCUMENT_BYTES,
    percentOfLimit,
    reason: "Cloud Firestore sync is disabled in Zero-Cost Local Mode.",
  };
}

export async function executeGoogleDriveOffload(
  book: Book,
  _userId: string
): Promise<OffloadExecutionResult> {
  const rawSizeBytes = calculateByteSize(book);
  return {
    success: false,
    actionTaken: "failed",
    originalSizeBytes: rawSizeBytes,
    originalSizeFormatted: formatBytes(rawSizeBytes),
    message: "Cloud offload is disabled in Zero-Cost Local Mode.",
    error: "Cloud offload is disabled in Zero-Cost Local Mode.",
  };
}

export async function syncBookWithAutoDriveOffload(
  book: Book,
  _userId: string
): Promise<OffloadExecutionResult> {
  const rawSizeBytes = calculateByteSize(book);
  return {
    success: false,
    actionTaken: "failed",
    originalSizeBytes: rawSizeBytes,
    originalSizeFormatted: formatBytes(rawSizeBytes),
    message: "Firestore cloud sync is disabled in Zero-Cost Local Mode.",
    error: "Firestore cloud sync is disabled in Zero-Cost Local Mode.",
  };
}

export function hydrateBookData(
  _bookId: string,
  data: Record<string, any>
): Book {
  return decompressBookFromFirestore(data);
}

export async function loadBookWithDriveResolution(
  bookId: string
): Promise<{
  book: Book;
  source: "firestore" | "googledrive" | "stub_fallback";
  isOffloaded: boolean;
}> {
  throw new Error(
    `Cloud loading for "${bookId}" is disabled in Zero-Cost Local Mode.`
  );
}
