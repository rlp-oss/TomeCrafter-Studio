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
  try {
    const offloadResult = await syncBookWithAutoDriveOffload(book, userId);
    return {
      success: offloadResult.success,
      actionTaken: offloadResult.actionTaken,
      offloadResult,
      error: offloadResult.error,
    };
  } catch (err: any) {
    console.warn("Firestore book sync error:", err);
    return { success: false, error: err.message };
  }
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
export async function syncAllLocalBooksToCloud(
  books: Book[],
  userId: string
): Promise<{ syncedCount: number; failedCount: number }> {
  let syncedCount = 0;
  let failedCount = 0;

  for (const book of books) {
    const res = await saveBookToFirestore(book, userId);
    if (res.success) {
      syncedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  return { syncedCount, failedCount };
}
