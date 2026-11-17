// Zero-Cost Local Mode: Studio settings & logos persist in browser localStorage with zero Firestore/Storage calls.
import { FirebaseUser } from "./firebase";
import { StudioSettings, StudioLogoMeta } from "../types";

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
  _user: FirebaseUser | null,
  _settings?: StudioSettings | null
): boolean {
  // Local-only mode: studio customization is stored in the user's own browser localStorage.
  return true;
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

export async function getStudioSettings(): Promise<StudioSettings> {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_STUDIO_SETTINGS, ...JSON.parse(cached) };
    }
  } catch (e) {
    console.error("Failed to parse cached studio settings:", e);
  }
  return DEFAULT_STUDIO_SETTINGS;
}

export function subscribeToStudioSettings(
  callback: (settings: StudioSettings) => void
): () => void {
  getStudioSettings()
    .then(callback)
    .catch(() => callback(DEFAULT_STUDIO_SETTINGS));
  return () => {};
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
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error("Failed to persist studio settings locally:", e);
  }
  return merged;
}

export function uploadStudioLogoProtected(
  file: File,
  currentUser: FirebaseUser | null,
  _currentSettings: StudioSettings | null,
  onProgress?: (percent: number) => void
): {
  task?: any;
  promise: Promise<StudioLogoMeta>;
} {
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
      if (onProgress) onProgress(80);

      const logoMeta: StudioLogoMeta = {
        url: optimizedDataUrl,
        storagePath: `local/settings/studio/logo_${Date.now()}`,
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedByEmail: currentUser?.email || PRIMARY_ADMIN_EMAIL,
        uploadedByUid: currentUser?.uid || "local-studio",
        verifiedAdmin: true,
      };

      await updateStudioSettings({ studioLogo: logoMeta });

      if (onProgress) onProgress(100);
      resolve(logoMeta);
    } catch (err: any) {
      reject(new Error(err.message || "Failed to process studio logo."));
    }
  });

  return { promise };
}

export async function setStudioLogoDirect(
  logoUrl: string,
  logoName: string,
  currentUser: FirebaseUser | null,
  _currentSettings: StudioSettings | null
): Promise<StudioLogoMeta> {
  const logoMeta: StudioLogoMeta = {
    url: logoUrl,
    storagePath: "local/settings/studio/direct_url",
    fileName: logoName,
    fileSizeBytes: 1024 * 120,
    contentType: "image/png",
    uploadedAt: new Date().toISOString(),
    uploadedByEmail: currentUser?.email || PRIMARY_ADMIN_EMAIL,
    uploadedByUid: currentUser?.uid || "local-studio",
    verifiedAdmin: true,
  };

  await updateStudioSettings({ studioLogo: logoMeta });
  return logoMeta;
}

export async function deleteStudioLogoProtected(
  _logoMeta: StudioLogoMeta,
  _currentUser: FirebaseUser | null,
  _currentSettings: StudioSettings | null
): Promise<void> {
  const current = await getStudioSettings();
  const { studioLogo: _removed, ...rest } = current;
  const updated: StudioSettings = {
    ...rest,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
}
