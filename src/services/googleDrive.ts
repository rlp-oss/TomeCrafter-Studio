import JSZip from "jszip";
import { connectGoogleDriveWithPopup, getStoredGoogleAccessToken } from "./firebase";
import { Book, ChapterIllustration } from "../types";

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
  modifiedTime?: string;
}

export interface ArtworkBackupSummary {
  success: boolean;
  folderName: string;
  folderId?: string;
  folderLink?: string;
  uploadedCount: number;
  items: {
    name: string;
    type: "cover" | "illustration" | "diagram" | "manifest";
    fileId?: string;
    webViewLink?: string;
  }[];
}

const DRIVE_AUTO_SYNC_KEY = "tomecrafter_gdrive_autosync_enabled";
const DRIVE_LAST_SYNC_KEY = "tomecrafter_gdrive_last_sync_map";

export function isGoogleDriveAutoSyncEnabled(): boolean {
  try {
    return localStorage.getItem(DRIVE_AUTO_SYNC_KEY) === "true";
  } catch {
    return false;
  }
}

export function setGoogleDriveAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DRIVE_AUTO_SYNC_KEY, enabled ? "true" : "false");
  } catch (e) {
    console.warn("Failed to set Google Drive auto sync preference:", e);
  }
}

export function getLastDriveSyncTime(bookId: string): string | null {
  try {
    const map = JSON.parse(localStorage.getItem(DRIVE_LAST_SYNC_KEY) || "{}");
    return map[bookId] || null;
  } catch {
    return null;
  }
}

export function recordDriveSyncTime(bookId: string): void {
  try {
    const map = JSON.parse(localStorage.getItem(DRIVE_LAST_SYNC_KEY) || "{}");
    map[bookId] = new Date().toISOString();
    localStorage.setItem(DRIVE_LAST_SYNC_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to record drive sync time:", e);
  }
}

/**
 * Saves a manuscript, JSON package, or text file directly to Google Drive
 */
export async function saveFileToGoogleDrive({
  name,
  content,
  mimeType = "text/plain",
  description = "Created in TomeCrafter AI Book Studio",
}: {
  name: string;
  content: string;
  mimeType?: string;
  description?: string;
}): Promise<{ fileId: string; webViewLink?: string; success: boolean }> {
  let token = getStoredGoogleAccessToken();

  if (!token) {
    // Attempt sign-in with Google to acquire Drive access token
    const { accessToken } = await connectGoogleDriveWithPopup();
    token = accessToken || null;
    if (!token) {
      throw new Error("Could not acquire Google Drive access token. Please sign in with Google.");
    }
  }

  // Create multipart boundary request for metadata + content
  const metadata = {
    name,
    mimeType,
    description,
  };

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelim;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      // In-memory token cleared automatically on re-auth
      throw new Error("Google Drive authorization expired. Please click connect again to re-authenticate.");
    }
    throw new Error(errorData?.error?.message || `Google Drive upload failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    fileId: result.id,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    success: true,
  };
}

/**
 * Generates formatted Markdown manuscript from a Book object
 */
export function generateBookMarkdown(book: Book): string {
  let md = `# ${book.title}\n`;
  if (book.subtitle) md += `*${book.subtitle}*\n\n`;
  md += `**By ${book.author}**\n\n`;
  md += `*Genre: ${book.genre} | Target Word Count: ${book.targetWordCount.toLocaleString()} words*\n\n`;
  if (book.premise) md += `> **Premise**: ${book.premise}\n\n`;
  md += `---\n\n`;

  book.chapters.forEach((ch) => {
    md += `## Chapter ${ch.number}: ${ch.title}\n\n`;
    if (ch.setting || ch.pov) {
      md += `*Setting: ${ch.setting || "Unspecified"} | POV: ${ch.pov || "Third Person"} | Status: ${ch.status}*\n\n`;
    }
    md += `${ch.content || ""}\n\n* * *\n\n`;
  });

  return md;
}

/**
 * Saves full, uncompressed Book archive directly into user's Google Drive.
 * (No 1MB Firestore limit: saves full high-res cover wraps, illustrations, and lore).
 */
export async function saveBookArchiveToGoogleDrive(book: Book): Promise<{
  fileId: string;
  webViewLink?: string;
  name: string;
}> {
  const content = JSON.stringify(book, null, 2);
  const cleanTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${cleanTitle}_TomeCrafter_Archive.json`;

  const res = await saveFileToGoogleDrive({
    name: filename,
    content,
    mimeType: "application/json",
    description: `Complete TomeCrafter Studio project archive for "${book.title}" by ${book.author}. Includes full manuscript, chapters, character lore, cover art, and typesetting settings.`,
  });

  recordDriveSyncTime(book.id);

  return {
    fileId: res.fileId,
    webViewLink: res.webViewLink,
    name: filename,
  };
}

/**
 * Downloads and parses a saved Book JSON archive directly from Google Drive
 */
export async function loadBookFromGoogleDrive(fileId: string): Promise<Book> {
  let token = getStoredGoogleAccessToken();
  if (!token) {
    const { accessToken } = await connectGoogleDriveWithPopup();
    token = accessToken || null;
    if (!token) {
      throw new Error("Could not acquire Google Drive access token. Please sign in with Google.");
    }
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      // In-memory token cleared automatically on re-auth
      throw new Error("Google Drive authorization expired. Please re-authenticate.");
    }
    throw new Error(`Failed to load file from Google Drive (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data || !data.id || !data.title || !Array.isArray(data.chapters)) {
    throw new Error("The selected file is not a valid TomeCrafter book archive JSON.");
  }

  return data as Book;
}

/**
 * Lists recently synced TomeCrafter files from Google Drive
 */
export async function listGoogleDriveFiles(): Promise<GoogleDriveFile[]> {
  let token = getStoredGoogleAccessToken();
  if (!token) return [];

  try {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?pageSize=25&fields=files(id,name,mimeType,webViewLink,createdTime,modifiedTime,size)&q=trashed=false and (name contains 'TomeCrafter' or name contains 'Manuscript' or name contains 'Archive' or mimeType = 'application/json' or mimeType = 'text/markdown')",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      if (res.status === 401) {
        // In-memory token cleared automatically on re-auth
      }
      return [];
    }
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.warn("Failed to list Google Drive files:", err);
    return [];
  }
}

/**
 * Converts a data URL, SVG data string, or remote image URL into a binary Blob
 */
export async function convertUrlToBlob(
  url: string,
  fallbackTitle: string = "Artwork Plate"
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  if (!url) {
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#1c1917"/><text x="600" y="337" fill="#fafaf9" font-family="sans-serif" font-size="28" font-weight="bold" text-anchor="middle">${fallbackTitle}</text></svg>`;
    return {
      blob: new Blob([fallbackSvg], { type: "image/svg+xml" }),
      mimeType: "image/svg+xml",
      extension: "svg",
    };
  }

  if (url.startsWith("data:image/svg+xml")) {
    const rawSvg = decodeURIComponent(url.replace(/^data:image\/svg\+xml;charset=utf-8,/, "").replace(/^data:image\/svg\+xml;utf8,/, ""));
    return {
      blob: new Blob([rawSvg], { type: "image/svg+xml" }),
      mimeType: "image/svg+xml",
      extension: "svg",
    };
  }

  if (url.startsWith("data:")) {
    const mime = url.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/png";
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : mime.includes("svg") ? "svg" : "png";
    const res = await fetch(url);
    const blob = await res.blob();
    return { blob, mimeType: mime, extension: ext };
  }

  // External web URL
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const mime = blob.type || "image/jpeg";
      const ext = mime.includes("png") ? "png" : mime.includes("svg") ? "svg" : "jpg";
      return { blob, mimeType: mime, extension: ext };
    }
  } catch (e) {
    console.warn("Direct image fetch failed, fallback to placeholder card:", e);
  }

  // Fallback if CORS restricts external image URL
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#0f172a"/><text x="600" y="300" fill="#38bdf8" font-family="sans-serif" font-size="26" font-weight="bold" text-anchor="middle">${fallbackTitle}</text><text x="600" y="350" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Source: ${url.slice(0, 70)}...</text></svg>`;
  return {
    blob: new Blob([fallbackSvg], { type: "image/svg+xml" }),
    mimeType: "image/svg+xml",
    extension: "svg",
  };
}

/**
 * Creates or retrieves a folder in Google Drive by name
 */
export async function createOrGetDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<{ id: string; webViewLink?: string }> {
  let token = getStoredGoogleAccessToken();
  if (!token) {
    const { accessToken } = await connectGoogleDriveWithPopup();
    token = accessToken || null;
    if (!token) {
      throw new Error("Could not acquire Google Drive access token. Please sign in with Google.");
    }
  }

  // Check if folder already exists
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return {
        id: searchData.files[0].id,
        webViewLink: searchData.files[0].webViewLink,
      };
    }
  }

  // Create new folder
  const folderMetadata: Record<string, any> = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentFolderId) {
    folderMetadata.parents = [parentFolderId];
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(folderMetadata),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Drive folder (${createRes.status})`);
  }

  const created = await createRes.json();
  return {
    id: created.id,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

/**
 * Uploads a binary Blob directly into a specific Google Drive folder
 */
export async function uploadBlobToGoogleDrive({
  name,
  blob,
  mimeType,
  description = "TomeCrafter AI Studio Asset",
  folderId,
}: {
  name: string;
  blob: Blob;
  mimeType?: string;
  description?: string;
  folderId?: string;
}): Promise<{ fileId: string; webViewLink?: string; success: boolean }> {
  let token = getStoredGoogleAccessToken();
  if (!token) {
    const { accessToken } = await connectGoogleDriveWithPopup();
    token = accessToken || null;
    if (!token) {
      throw new Error("Could not acquire Google Drive access token.");
    }
  }

  const finalMime = mimeType || blob.type || "application/octet-stream";
  const metadata: Record<string, any> = {
    name,
    mimeType: finalMime,
    description,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json; charset=UTF-8" }));
  form.append("file", blob, name);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to upload ${name} to Google Drive (${response.status})`);
  }

  const result = await response.json();
  return {
    fileId: result.id,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    success: true,
  };
}

/**
 * Comprehensive Artwork & Illustrations Backup directly into user's Google Drive assigned folder
 */
export async function backupAllArtworkToGoogleDrive(
  book: Book,
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<ArtworkBackupSummary> {
  const cleanTitle = book.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Untitled";
  const mainFolderName = `TomeCrafter - ${cleanTitle} (Artwork & Illustrations)`;

  onProgress?.("Creating project artwork folders on Google Drive...", 0, 10);
  const mainFolder = await createOrGetDriveFolder(mainFolderName);
  const coversFolder = await createOrGetDriveFolder("Covers", mainFolder.id);
  const illustrationsFolder = await createOrGetDriveFolder("Chapter_Illustrations", mainFolder.id);
  const diagramsFolder = await createOrGetDriveFolder("Diagrams_and_Flowcharts", mainFolder.id);

  // Gather all items to upload
  interface UploadTarget {
    name: string;
    url: string;
    type: "cover" | "illustration" | "diagram" | "manifest";
    folderId: string;
    description: string;
  }

  const targets: UploadTarget[] = [];

  const activeCoverUrl = book.coverImage || book.coverImageUrl;
  if (activeCoverUrl) {
    targets.push({
      name: `01_Full_Cover_Wrap_${cleanTitle}`,
      url: activeCoverUrl,
      type: "cover",
      folderId: coversFolder.id,
      description: `Full cover wrap artwork for "${book.title}" by ${book.author}`,
    });
  }
  if (book.frontCoverImage && book.frontCoverImage !== activeCoverUrl) {
    targets.push({
      name: `02_Front_Cover_Digital_${cleanTitle}`,
      url: book.frontCoverImage,
      type: "cover",
      folderId: coversFolder.id,
      description: `Front digital cover art for "${book.title}"`,
    });
  }

  // 2. Chapter Illustrations & Diagram Plates
  (book.chapters || []).forEach((ch) => {
    (ch.illustrations || []).forEach((ill, idx) => {
      const isDiagram = ill.style === "workflow_chart" || ill.style === "comparison_matrix" || ill.plateType === "workflow_chart" || !!ill.diagramData;
      const cleanIllTitle = ill.title ? ill.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30) : `Plate_${idx + 1}`;
      const baseName = `CH_${ch.number}_${cleanIllTitle}`;

      targets.push({
        name: baseName,
        url: ill.imageUrl,
        type: isDiagram ? "diagram" : "illustration",
        folderId: isDiagram ? diagramsFolder.id : illustrationsFolder.id,
        description: `Chapter ${ch.number} (${ch.title}): ${ill.title || "Illustration"} | Style: ${ill.style}`,
      });
    });
  });

  // 2b. Unassigned Media Library Vault Assets
  (book.mediaLibrary || []).forEach((ill, idx) => {
    const cleanIllTitle = ill.title ? ill.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30) : `Vault_${idx + 1}`;
    targets.push({
      name: `VAULT_${idx + 1}_${cleanIllTitle}`,
      url: ill.imageUrl,
      type: "illustration",
      folderId: illustrationsFolder.id,
      description: `Media Vault Asset: ${ill.title || "Uploaded Illustration"}`,
    });
  });

  const total = targets.length + 1; // +1 for manifest
  let current = 0;
  const uploadedItems: ArtworkBackupSummary["items"] = [];

  for (const target of targets) {
    current++;
    onProgress?.(`Uploading ${target.name}...`, current, total);
    try {
      const { blob, mimeType, extension } = await convertUrlToBlob(target.url, target.name);
      const fullName = `${target.name}.${extension}`;
      const uploadRes = await uploadBlobToGoogleDrive({
        name: fullName,
        blob,
        mimeType,
        folderId: target.folderId,
        description: target.description,
      });

      uploadedItems.push({
        name: fullName,
        type: target.type,
        fileId: uploadRes.fileId,
        webViewLink: uploadRes.webViewLink,
      });
    } catch (e: any) {
      console.warn(`Failed to upload ${target.name} to Drive:`, e);
    }
  }

  // 3. Upload ARTWORK_MANIFEST.json
  current++;
  onProgress?.("Uploading ARTWORK_MANIFEST.json with style & prompt metadata...", current, total);
  const manifestData = {
    bookTitle: book.title,
    author: book.author,
    backupDate: new Date().toISOString(),
    totalAssetsUploaded: uploadedItems.length,
    coverMetadata: {
      hasCoverWrap: !!book.coverImage,
      hasFrontCover: !!book.frontCoverImage,
    },
    illustrations: (book.chapters || []).flatMap((ch) =>
      (ch.illustrations || []).map((ill) => ({
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        id: ill.id,
        title: ill.title,
        style: ill.style,
        aspectRatio: ill.aspectRatio,
        prompt: ill.prompt,
        enhancedPrompt: ill.enhancedPrompt,
        caption: ill.caption,
        placement: ill.placement,
        plateType: ill.plateType,
      }))
    ),
  };

  try {
    const manifestBlob = new Blob([JSON.stringify(manifestData, null, 2)], { type: "application/json" });
    const manifestRes = await uploadBlobToGoogleDrive({
      name: "ARTWORK_MANIFEST.json",
      blob: manifestBlob,
      mimeType: "application/json",
      folderId: mainFolder.id,
      description: `Complete metadata, prompt registry, and layout specs for "${book.title}" artwork`,
    });

    uploadedItems.push({
      name: "ARTWORK_MANIFEST.json",
      type: "manifest",
      fileId: manifestRes.fileId,
      webViewLink: manifestRes.webViewLink,
    });
  } catch (e) {
    console.warn("Failed to upload manifest to Drive:", e);
  }

  return {
    success: true,
    folderName: mainFolderName,
    folderId: mainFolder.id,
    folderLink: mainFolder.webViewLink,
    uploadedCount: uploadedItems.length,
    items: uploadedItems,
  };
}

/**
 * Downloads complete organized Artwork Package as a ZIP file directly to the user's project/device
 */
export async function downloadArtworkPackageZip(book: Book): Promise<void> {
  const zip = new JSZip();
  const cleanTitle = book.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "TomeCrafter_Artwork";

  // Create Folders
  const coversFolder = zip.folder("Covers");
  const illustrationsFolder = zip.folder("Chapter_Illustrations");
  const diagramsFolder = zip.folder("Diagrams_and_Flowcharts");

  // 1. Cover Art
  const zipCoverUrl = book.coverImage || book.coverImageUrl;
  if (zipCoverUrl && coversFolder) {
    const { blob, extension } = await convertUrlToBlob(zipCoverUrl, "Full Cover Wrap");
    coversFolder.file(`01_Full_Cover_Wrap.${extension}`, blob);
  }
  if (book.frontCoverImage && book.frontCoverImage !== zipCoverUrl && coversFolder) {
    const { blob, extension } = await convertUrlToBlob(book.frontCoverImage, "Front Cover Digital");
    coversFolder.file(`02_Front_Cover_Digital.${extension}`, blob);
  }

  // 2. Chapter Illustrations and Diagrams
  let illCount = 0;
  let diagCount = 0;

  for (const ch of book.chapters || []) {
    for (let idx = 0; idx < (ch.illustrations || []).length; idx++) {
      const ill = ch.illustrations[idx];
      const isDiagram = ill.style === "workflow_chart" || ill.style === "comparison_matrix" || ill.plateType === "workflow_chart" || !!ill.diagramData;
      const cleanName = ill.title ? ill.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35) : `Plate_${idx + 1}`;
      const { blob, extension } = await convertUrlToBlob(ill.imageUrl, ill.title || `Chapter ${ch.number}`);

      if (isDiagram && diagramsFolder) {
        diagCount++;
        diagramsFolder.file(`CH_${ch.number}_${cleanName}.${extension}`, blob);
      } else if (illustrationsFolder) {
        illCount++;
        illustrationsFolder.file(`CH_${ch.number}_Ill_${idx + 1}_${cleanName}.${extension}`, blob);
      }
    }
  }

  // 2b. Unassigned Media Library Vault Assets
  const vaultFolder = (book.mediaLibrary && book.mediaLibrary.length > 0) ? zip.folder("Media_Vault") : null;
  for (let idx = 0; idx < (book.mediaLibrary || []).length; idx++) {
    const ill = book.mediaLibrary![idx];
    const cleanName = ill.title ? ill.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35) : `Vault_${idx + 1}`;
    const { blob, extension } = await convertUrlToBlob(ill.imageUrl, ill.title || `Vault ${idx + 1}`);
    if (vaultFolder) {
      illCount++;
      vaultFolder.file(`VAULT_${idx + 1}_${cleanName}.${extension}`, blob);
    }
  }

  // 3. Manifest & README
  const manifest = {
    bookTitle: book.title,
    author: book.author,
    exportedAt: new Date().toISOString(),
    totalIllustrations: illCount,
    totalDiagrams: diagCount,
    hasCoverWrap: !!book.coverImage,
    chapters: (book.chapters || []).map((ch) => ({
      number: ch.number,
      title: ch.title,
      illustrations: (ch.illustrations || []).map((ill) => ({
        title: ill.title,
        style: ill.style,
        aspectRatio: ill.aspectRatio,
        prompt: ill.prompt,
        enhancedPrompt: ill.enhancedPrompt,
        plateType: ill.plateType,
      })),
    })),
  };

  zip.file("ARTWORK_MANIFEST.json", JSON.stringify(manifest, null, 2));

  const readme = `================================================================================
TOMECRAFTER AI BOOK STUDIO - COMPLETE ARTWORK & MEDIA PACKAGE
================================================================================
Title: ${book.title}
Author: ${book.author}
Export Date: ${new Date().toLocaleString()}

DIRECTORY STRUCTURE:
/Covers/
  - 01_Full_Cover_Wrap.png/svg  (Full print jacket spread: Back + Spine + Front)
  - 02_Front_Cover_Digital.png  (High-resolution 300DPI digital storefront cover)

/Chapter_Illustrations/
  - High-resolution thematic interior visual plates and chapter openers.

/Diagrams_and_Flowcharts/
  - Structured comparative matrices, systems pipelines, and vector infographic plates.

ARTWORK MANIFEST:
- See ARTWORK_MANIFEST.json for full prompt seeds, stylistic anchors, and chapter mappings.

================================================================================`;

  zip.file("README_Artwork_Usage.txt", readme);

  // Generate & Download ZIP
  const content = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${cleanTitle}_Complete_Artwork_Package.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
}

/**
 * Downloads a single image or SVG plate directly to local disk
 */
export async function downloadSingleArtworkFile(imageUrl: string, filename: string): Promise<void> {
  const { blob, extension } = await convertUrlToBlob(imageUrl, filename);
  const cleanFilename = filename.includes(".") ? filename : `${filename}.${extension}`;
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
}

