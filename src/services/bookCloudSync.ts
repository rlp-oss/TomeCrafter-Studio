import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
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
  hydrateBookData,
  markBookKnownInCloud,
  clearKnownCloudBooks,
  sanitizeBookId,
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
  book: Book,
  userId: string
): Promise<{
  success: boolean;
  actionTaken?: "saved_to_firestore" | "offloaded_to_drive" | "failed";
  compressionResult?: CompressionResult;
  sizeValidation?: DocumentSizeValidation;
  offloadResult?: OffloadExecutionResult;
  error?: string;
}> {
  const offloadResult = await syncBookWithAutoDriveOffload(book, userId);
  if (!offloadResult.success) {
    throw new Error(offloadResult.error || offloadResult.message || "Failed to save book to Firestore.");
  }
  return {
    success: true,
    actionTaken: offloadResult.actionTaken,
    offloadResult,
  };
}

export async function loadBookFromFirestore(bookId: string): Promise<Book | null> {
  try {
    const { book } = await loadBookWithDriveResolution(bookId);
    return book;
  } catch (err) {
    console.warn(`[CloudSync] Error loading book "${bookId}":`, err);
    return null;
  }
}

/**
 * Fetches all books belonging to the authenticated user from Firestore.
 */
export async function fetchUserBooksFromFirestore(userId: string): Promise<Book[]> {
  const path = "books";
  try {
    const q = query(collection(db, path), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const books: Book[] = [];
    snapshot.forEach((docSnap) => {
      markBookKnownInCloud(docSnap.id);
      books.push(hydrateBookData(docSnap.id, docSnap.data()));
    });
    return books.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Subscribes in real-time to all books owned by the authenticated user.
 */
export function subscribeToUserBooks(
  userId: string,
  onBooks: (books: Book[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = "books";
  const q = query(collection(db, path), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const cloudBooks: Book[] = [];
      snapshot.forEach((docSnap) => {
        markBookKnownInCloud(docSnap.id);
        cloudBooks.push(hydrateBookData(docSnap.id, docSnap.data()));
      });
      cloudBooks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onBooks(cloudBooks);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

/**
 * Deletes a book document from Firestore.
 */
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  const safeId = sanitizeBookId(bookId);
  const path = `books/${safeId}`;
  try {
    await deleteDoc(doc(db, "books", safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Syncs an array of local books to the user's Firestore account.
 */
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
  books: Book[],
  userId: string
): Promise<{ syncedCount: number; failedCount: number; syncedIds: string[] }> {
  const syncedIds: string[] = [];
  const failures: { bookId: string; title: string; error: string }[] = [];

  for (const book of books) {
    try {
      await saveBookToFirestore(book, userId);
      syncedIds.push(book.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[CloudSync] Failed syncing book "${book.title}" (${book.id}):`, err);
      failures.push({ bookId: book.id, title: book.title, error: msg });
    }
  }

  if (failures.length > 0) {
    throw new BatchCloudSyncError(
      `Failed to sync ${failures.length} of ${books.length} manuscript(s) to Firestore.`,
      syncedIds,
      failures
    );
  }

  return { syncedCount: syncedIds.length, failedCount: 0, syncedIds };
}
