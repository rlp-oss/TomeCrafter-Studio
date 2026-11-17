// Zero-Cost Local Mode: All Firebase SDK (Firestore, Auth, Storage, App Check) calls removed
// to prevent database/storage/network billing. Projects and studio settings persist locally in browser storage.

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
  tenantId?: string | null;
  photoURL?: string | null;
  providerData?: { providerId?: string | null; email?: string | null }[];
}

export type StorageReference = { fullPath: string };
export type UploadTask = { cancel: () => void };

export const appCheck = null;
export const ensureAppCheckReady = async (): Promise<null> => null;

export const auth: { currentUser: FirebaseUser | null } = {
  currentUser: null,
};
export const db: unknown = null;
export const storage: unknown = null;

export const storageRef = (_storage: unknown, path: string): StorageReference => ({
  fullPath: path,
});
export const uploadBytes = async () => {
  throw new Error("Cloud storage is disabled in Zero-Cost Local Mode.");
};
export const uploadBytesResumable = () => {
  throw new Error("Cloud storage is disabled in Zero-Cost Local Mode.");
};
export const getDownloadURL = async () => "";
export const deleteObject = async () => {};

let cachedGoogleAccessToken: string | null = null;

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: false,
      isAnonymous: false,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  throw new Error(JSON.stringify(errInfo));
}

export async function validateFirestoreConnection(): Promise<boolean> {
  return false;
}

export function getFriendlyAuthErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Cloud authentication is disabled in Zero-Cost Local Mode.";
}

export async function signInWithGoogle(): Promise<{ user: FirebaseUser; accessToken?: string }> {
  throw new Error(
    "Cloud sign-in and Firestore sync are disabled in Zero-Cost Local Mode. Manuscripts are saved locally in your browser."
  );
}

export async function connectGoogleDriveWithPopup(): Promise<{
  user: FirebaseUser;
  accessToken?: string;
}> {
  throw new Error(
    "Firebase OAuth popup is disabled in Zero-Cost Local Mode. Use local file exports (.JSON, .DOCX, .EPUB, .HTML, .ZIP) instead."
  );
}

export async function logOut(): Promise<void> {
  cachedGoogleAccessToken = null;
}

export function onAuthUserChanged(callback: (user: FirebaseUser | null) => void): () => void {
  callback(null);
  return () => {};
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

const LOCAL_PROFILE_KEY = "tomecrafter_local_profile_v1";

export async function fetchUserProfile(_uid: string): Promise<UserProfileRecord | null> {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfileRecord) : null;
  } catch {
    return null;
  }
}

export async function syncUserProfileToFirestore(
  user: FirebaseUser,
  updates?: { displayName?: string; preferredGenre?: string }
): Promise<void> {
  const record: UserProfileRecord = {
    id: user.uid,
    email: user.email || "",
    displayName: updates?.displayName?.trim() || user.displayName || "Author",
    preferredGenre: updates?.preferredGenre,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
}
