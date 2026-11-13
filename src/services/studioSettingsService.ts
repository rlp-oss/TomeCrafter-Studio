import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { StudioSettings, StudioLogoMeta } from "../types";

// Primary authorized studio administrator email
export const PRIMARY_ADMIN_EMAIL = "codygermain032@gmail.com";

export const PRESET_STUDIO_LOGOS: { id: string; name: string; url: string; category: string }[] = [
  {
    id: "rhythm-logic-gold",
    name: "Rhythm Logic Publishing Colophon",
    category: "Official Imprint",
    url: "/api/ecosystem/logos?preset=rhythm-logic-gold",
  },
  {
    id: "aether-iron-crest",
    name: "Aether & Iron Guild Crest",
    category: "Classic Atelier",
    url: "/api/ecosystem/logos?preset=aether-iron-crest",
  },
  {
    id: "human-sovereign-shield",
    name: "Sovereign Cleanroom Shield",
    category: "Ethical AI Provenance",
    url: "/api/ecosystem/logos?preset=human-sovereign-shield",
  },
  {
    id: "celestial-codex-sigil",
    name: "Celestial Codex Sigil",
    category: "Sci-Fi & Speculative",
    url: "/api/ecosystem/logos?preset=celestial-codex-sigil",
  },
];

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  studioName: "Rhythm Logic Publishing",
  imprintName: "Rhythm Logic Publishing Holdings",
  tagline: "Publishing The Future Today",
  description:
    "Dedicated to Ethical AI Use and Promotion, Verified Cleanroom Authorship, and Premium Trade Paperback Manufacturing.",
  websiteUrl: "https://rhythmiclogicpublishing.com",
  supportEmail: "create@rhythmlogicpublishing.com",
  headquarters: "Red Deer, Alberta Canada",
  authorizedAdminEmails: [PRIMARY_ADMIN_EMAIL],
  autoApplyToBookImprint: true,
  autoApplyToTitlePage: true,
  autoApplyToSpine: true,
  updatedAt: new Date().toISOString(),
};

const LOCAL_STORAGE_KEY = "tomecrafter_studio_settings_v1";

export function isUserAuthorizedForStudioLogo(
  user: FirebaseUser | null,
  settings?: StudioSettings | null
): boolean {
  if (!user || !user.email || !user.emailVerified) {
    return false;
  }
  const userEmailNormalized = user.email.trim().toLowerCase();
  const primaryEmailNormalized = PRIMARY_ADMIN_EMAIL.toLowerCase();
  if (userEmailNormalized === primaryEmailNormalized) {
    return true;
  }
  const authorizedList = settings?.authorizedAdminEmails || [PRIMARY_ADMIN_EMAIL];
  return authorizedList.some((email) => email.trim().toLowerCase() === userEmailNormalized);
}

export async function convertFileToOptimizedDataUrl(
  file: File,
  maxDim = 512,
  quality = 0.9
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const format =
          file.type === "image/png" || file.type === "image/webp" ? "image/webp" : "image/jpeg";
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (e) => reject(new Error("Failed to read file: " + e));
    reader.readAsDataURL(file);
  });
}

function normalizeSettingsData(data: Record<string, any>): StudioSettings {
  return {
    ...DEFAULT_STUDIO_SETTINGS,
    ...data,
    authorizedAdminEmails: Array.from(
      new Set([PRIMARY_ADMIN_EMAIL, ...(Array.isArray(data.authorizedAdminEmails) ? data.authorizedAdminEmails : [])])
    ),
    updatedAt:
      typeof data.updatedAt?.toDate === "function"
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt || new Date().toISOString(),
  };
}

export async function getStudioSettings(): Promise<StudioSettings> {
  // Only query protected Firestore studio settings if current user is verified admin
  if (isUserAuthorizedForStudioLogo(auth.currentUser)) {
    const path = "settings/studio";
    try {
      const snapshot = await getDoc(doc(db, "settings", "studio"));
      if (snapshot.exists()) {
        const merged = normalizeSettingsData(snapshot.data());
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("Failed to parse cached studio settings:", e);
  }
  return DEFAULT_STUDIO_SETTINGS;
}

export function subscribeToStudioSettings(
  callback: (settings: StudioSettings) => void
): () => void {
  // Only attach Firestore snapshot listener for authorized admins; others receive cached/default imprint
  if (!isUserAuthorizedForStudioLogo(auth.currentUser)) {
    getStudioSettings().then(callback).catch(() => callback(DEFAULT_STUDIO_SETTINGS));
    return () => {};
  }

  const path = "settings/studio";
  const docRef = doc(db, "settings", "studio");
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const merged = normalizeSettingsData(snapshot.data());
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        callback(merged);
      } else {
        callback(DEFAULT_STUDIO_SETTINGS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

function buildFirestoreSettingsPayload(merged: StudioSettings): Record<string, any> {
  const payload: Record<string, any> = {
    studioName: (merged.studioName || DEFAULT_STUDIO_SETTINGS.studioName).slice(0, 120),
    imprintName: (merged.imprintName || DEFAULT_STUDIO_SETTINGS.imprintName).slice(0, 120),
    tagline: (merged.tagline || "").slice(0, 240),
    description: (merged.description || "").slice(0, 2000),
    authorizedAdminEmails: Array.from(
      new Set([PRIMARY_ADMIN_EMAIL, ...(merged.authorizedAdminEmails || [])])
    ).slice(0, 20),
    autoApplyToBookImprint: Boolean(merged.autoApplyToBookImprint),
    autoApplyToTitlePage: Boolean(merged.autoApplyToTitlePage),
    autoApplyToSpine: Boolean(merged.autoApplyToSpine),
    updatedAt: serverTimestamp(),
  };
  if (merged.studioLogo) payload.studioLogo = merged.studioLogo;
  if (merged.websiteUrl) payload.websiteUrl = merged.websiteUrl.slice(0, 512);
  if (merged.supportEmail) payload.supportEmail = merged.supportEmail.slice(0, 320);
  if (merged.headquarters) payload.headquarters = merged.headquarters.slice(0, 160);
  return payload;
}

export async function updateStudioSettings(
  updated: Partial<StudioSettings>
): Promise<StudioSettings> {
  const current = await getStudioSettings();
  const merged: StudioSettings = {
    ...current,
    ...updated,
    updatedAt: new Date().toISOString(),
  };

  if (isUserAuthorizedForStudioLogo(auth.currentUser, current)) {
    const path = "settings/studio";
    const docRef = doc(db, "settings", "studio");
    const payload = buildFirestoreSettingsPayload(merged);
    try {
      const existing = await getDoc(docRef);
      if (existing.exists()) {
        await updateDoc(docRef, payload);
      } else {
        await setDoc(docRef, payload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function uploadStudioLogoProtected(
  file: File,
  currentUser: FirebaseUser | null,
  currentSettings: StudioSettings | null,
  onProgress?: (percent: number) => void
): {
  task?: any;
  promise: Promise<StudioLogoMeta>;
} {
  if (!currentUser) {
    throw new Error(
      "Authentication Required: You must be signed in with an authorized Google administrator account to upload the studio logo."
    );
  }

  const isAuthorized = isUserAuthorizedForStudioLogo(currentUser, currentSettings);
  if (!isAuthorized) {
    throw new Error(
      `Permission Denied: Only authorized studio administrator (${PRIMARY_ADMIN_EMAIL}) can upload and configure the studio logo.`
    );
  }

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    throw new Error(
      "Invalid File Type: Please upload a PNG, JPG, WebP, or SVG logo file."
    );
  }

  const MAX_SIZE_MB = 15;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(
      `File Too Large: Logo file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${MAX_SIZE_MB}MB.`
    );
  }

  const promise = new Promise<StudioLogoMeta>(async (resolve, reject) => {
    try {
      if (onProgress) onProgress(25);
      const optimizedDataUrl = await convertFileToOptimizedDataUrl(file);
      if (onProgress) onProgress(70);

      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `firestore/settings/studio/logo_${timestamp}_${cleanFileName}`;

      if (onProgress) onProgress(90);

      const logoMeta: StudioLogoMeta = {
        url: optimizedDataUrl,
        storagePath: storagePath,
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedByEmail: currentUser.email || PRIMARY_ADMIN_EMAIL,
        uploadedByUid: currentUser.uid,
        verifiedAdmin: true,
      };

      await updateStudioSettings({
        studioLogo: logoMeta,
      });

      if (onProgress) onProgress(100);
      resolve(logoMeta);
    } catch (err: any) {
      console.error("Logo upload process error:", err);
      reject(new Error(err.message || "Failed to process and save studio logo."));
    }
  });

  return { promise };
}

export async function setStudioLogoDirect(
  logoUrl: string,
  logoName: string,
  currentUser: FirebaseUser | null,
  currentSettings: StudioSettings | null
): Promise<StudioLogoMeta> {
  if (!currentUser || !isUserAuthorizedForStudioLogo(currentUser, currentSettings)) {
    throw new Error(
      `Permission Denied: Only authorized studio administrator (${PRIMARY_ADMIN_EMAIL}) can update studio branding.`
    );
  }

  const logoMeta: StudioLogoMeta = {
    url: logoUrl,
    storagePath: "firestore/settings/studio/direct_url",
    fileName: logoName,
    fileSizeBytes: 1024 * 120,
    contentType: "image/png",
    uploadedAt: new Date().toISOString(),
    uploadedByEmail: currentUser.email || PRIMARY_ADMIN_EMAIL,
    uploadedByUid: currentUser.uid,
    verifiedAdmin: true,
  };

  await updateStudioSettings({
    studioLogo: logoMeta,
  });

  return logoMeta;
}

export async function deleteStudioLogoProtected(
  _logoMeta: StudioLogoMeta,
  currentUser: FirebaseUser | null,
  currentSettings: StudioSettings | null
): Promise<void> {
  if (!currentUser || !isUserAuthorizedForStudioLogo(currentUser, currentSettings)) {
    throw new Error("Unauthorized: Only designated studio administrators can remove the studio logo.");
  }

  const current = await getStudioSettings();
  const { studioLogo: _removed, ...rest } = current;
  const updated: StudioSettings = {
    ...rest,
    updatedAt: new Date().toISOString(),
  };

  const path = "settings/studio";
  const docRef = doc(db, "settings", "studio");
  const payload = buildFirestoreSettingsPayload(updated);
  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await setDoc(docRef, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
}
