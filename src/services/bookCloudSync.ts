// Zero-Cost Local Mode: Firestore subscriptions, batch syncs, and cloud reads/writes removed.
import { Book } from "../types";
import {
  compressBookForFirestore,
  decompressBookFromFirestore,
  validateFirestoreDocumentSize,
  calculateByteSize,
  formatBytes,
  CompressionResult,
  DocumentSizeValidation,
  FIRESTORE_MAX_DOCUMENT_BYTES,
  FIRESTORE_SAFE_THRESHOLD_BYTES,
} from "./dataCompression";
import {
  detectFirestoreOverflow,
  executeGoogleDriveOffload,
  syncBookWithAutoDriveOffload,
  loadBookWithDriveResolution,
  clearKnownCloudBooks,
  OffloadDetectionResult,
  OffloadExecutionResult,
} from "./driveOffloadService";

export {
  compressBookForFirestore,
  decompressBookFromFirestore,
  validateFirestoreDocumentSize,
  calculateByteSize,
  formatBytes,
  detectFirestoreOverflow,
  executeGoogleDriveOffload,
  syncBookWithAutoDriveOffload,
  loadBookWithDriveResolution,
  clearKnownCloudBooks,
  FIRESTORE_MAX_DOCUMENT_BYTES,
  FIRESTORE_SAFE_THRESHOLD_BYTES,
};

export type {
  CompressionResult,
  DocumentSizeValidation,
  OffloadDetectionResult,
  OffloadExecutionResult,
};

export function prepareBookForFirestore(book: Book): Record<string, any> {
  const result = compressBookForFirestore(book);
  return result.compressedBook;
}

export async function saveBookToFirestore(
  _book: Book,
  _userId: string
): Promise<{
  success: boolean;
  actionTaken?: "saved_to_firestore" | "offloaded_to_drive" | "failed";
  compressionResult?: CompressionResult;
  sizeValidation?: DocumentSizeValidation;
  offloadResult?: OffloadExecutionResult;
  error?: string;
}> {
  return {
    success: false,
    actionTaken: "failed",
    error: "Firestore cloud sync is disabled in Zero-Cost Local Mode.",
  };
}

export async function loadBookFromFirestore(_bookId: string): Promise<Book | null> {
  return null;
}

export async function fetchUserBooksFromFirestore(_userId: string): Promise<Book[]> {
  return [];
}

export function subscribeToUserBooks(
  _userId: string,
  onBooks: (books: Book[]) => void,
  _onError?: (err: Error) => void
): () => void {
  onBooks([]);
  return () => {};
}

export async function deleteBookFromFirestore(_bookId: string): Promise<void> {}

export class BatchCloudSyncError extends Error {
  syncedCount: number;
  failedCount: number;
  syncedIds: string[];
  failures: { bookId: string; title: string; error: string }[];

  constructor(
    message: string,
    syncedIds: string[],
    failures: { bookId: string; title: string; error: string }[]
  ) {
    super(message);
    this.name = "BatchCloudSyncError";
    this.syncedCount = syncedIds.length;
    this.failedCount = failures.length;
    this.syncedIds = syncedIds;
    this.failures = failures;
  }
}

export async function syncAllLocalBooksToCloud(
  _books: Book[],
  _userId: string
): Promise<{ syncedCount: number; failedCount: number; syncedIds: string[] }> {
  return { syncedCount: 0, failedCount: 0, syncedIds: [] };
}
