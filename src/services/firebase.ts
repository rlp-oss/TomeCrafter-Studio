import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  StorageReference,
  UploadTask,
} from "firebase/storage";
import firebaseConfigJson from "../../firebase-applet-config.json";
import {
  initializeFirebaseAppCheck,
  ensureFirebaseAppCheckInitialized,
} from "./appCheckConfig";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfigJson);

// Synchronously initialize Firebase App Check if a valid build-time site key is configured
export const appCheck = initializeFirebaseAppCheck(app);

// Async fallback for runtime-injected VITE_FIREBASE_APP_CHECK_SITE_KEY secrets
export const ensureAppCheckReady = () => ensureFirebaseAppCheckInitialized(app);

export const auth = getAuth(app);
const databaseId = (firebaseConfigJson as any).firestoreDatabaseId || "(default)";
export const db = getFirestore(app, databaseId === "(default)" ? undefined : databaseId);
export const storage = getStorage(app);

// Export storage helpers
export {
  storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
};
export type { StorageReference, UploadTask };

// Standard Google Auth Provider for user sign-in
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Separate Google Auth Provider requesting Drive access only when explicitly needed
export const googleDriveProvider = new GoogleAuthProvider();
googleDriveProvider.addScope("https://www.googleapis.com/auth/drive.file");
googleDriveProvider.setCustomParameters({
  prompt: "select_account",
});

// In-memory Drive access token cache (never persisted to localStorage)
let cachedGoogleAccessToken: string | null = null;

// Firestore Error Handling per Firebase Integration Specification
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Firestore connection on boot
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration: client is offline.");
      return false;
    }
    // A permission-denied response still confirms server reachability
    return true;
  }
}

// Human-friendly Firebase Auth error translator
export function getFriendlyAuthErrorMessage(error: unknown): string {
  const code = (error as any)?.code || "";
  const msg = (error as any)?.message || "";

  switch (code) {
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before completing. Click Sign In whenever you're ready.";
    case "auth/cancelled-popup-request":
      return "Sign-in was superseded by another request. Please try again.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connection and retry.";
    case "auth/unauthorized-domain":
      return "This domain is not yet authorized in Firebase Authentication settings.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    default:
      return msg || "Unable to complete sign-in. Please try again.";
  }
}

// Standard Google Sign-In
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; accessToken?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: credential?.accessToken };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

// Explicit Google Drive OAuth connection via popup
export async function connectGoogleDriveWithPopup(): Promise<{ user: FirebaseUser; accessToken?: string }> {
  try {
    const result = await signInWithPopup(auth, googleDriveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: credential?.accessToken };
  } catch (error) {
    console.error("Error connecting Google Drive:", error);
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function logOut(): Promise<void> {
  cachedGoogleAccessToken = null;
  await signOut(auth);
}

export function onAuthUserChanged(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedGoogleAccessToken = null;
    }
    callback(user);
  });
}

export function getStoredGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export interface UserProfileRecord {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferredGenre?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchUserProfile(uid: string): Promise<UserProfileRecord | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: data.id,
      email: data.email,
      displayName: data.displayName || "",
      photoURL: data.photoURL,
      preferredGenre: data.preferredGenre,
      createdAt: typeof data.createdAt?.toDate === "function" ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: typeof data.updatedAt?.toDate === "function" ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncUserProfileToFirestore(
  user: FirebaseUser,
  updates?: { displayName?: string; preferredGenre?: string }
): Promise<void> {
  if (!user.email) return;
  const path = `users/${user.uid}`;
  const docRef = doc(db, "users", user.uid);
  const safeDisplayName = (
    updates?.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email.split("@")[0] ||
    "Author"
  ).slice(0, 120);
  const rawPhotoUrl = (user.photoURL || "").trim().slice(0, 2048);
  const safePhotoUrl = /^https?:\/\/.+/i.test(rawPhotoUrl) ? rawPhotoUrl : "";

  try {
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      const createPayload: Record<string, any> = {
        id: user.uid,
        email: user.email,
        displayName: safeDisplayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (safePhotoUrl) createPayload.photoURL = safePhotoUrl;
      if (updates?.preferredGenre) createPayload.preferredGenre = updates.preferredGenre.slice(0, 80);
      await setDoc(docRef, createPayload);
    } else {
      const updatePayload: Record<string, any> = {
        displayName: safeDisplayName,
        updatedAt: serverTimestamp(),
      };
      if (safePhotoUrl) updatePayload.photoURL = safePhotoUrl;
      if (updates?.preferredGenre !== undefined) {
        updatePayload.preferredGenre = updates.preferredGenre.slice(0, 80);
      }
      await updateDoc(docRef, updatePayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
