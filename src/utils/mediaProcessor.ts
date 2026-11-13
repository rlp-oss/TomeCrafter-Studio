import { ChapterIllustration } from "../types";

export interface ProcessedMediaAsset {
  dataUrl: string;
  cleanTitle: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: ChapterIllustration["aspectRatio"];
}

export function detectClosestAspectRatio(
  width: number,
  height: number
): ChapterIllustration["aspectRatio"] {
  if (!width || !height) return "16:9";
  const ratio = width / height;
  const candidates: { label: ChapterIllustration["aspectRatio"]; value: number }[] = [
    { label: "1:1", value: 1 },
    { label: "3:4", value: 3 / 4 },
    { label: "4:3", value: 4 / 3 },
    { label: "9:16", value: 9 / 16 },
    { label: "16:9", value: 16 / 9 },
  ];
  let best = candidates[0];
  let minDiff = Math.abs(ratio - best.value);
  for (const c of candidates) {
    const diff = Math.abs(ratio - c.value);
    if (diff < minDiff) {
      minDiff = diff;
      best = c;
    }
  }
  return best.label;
}

export function formatMediaBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function cleanTitleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  const normalized = withoutExt
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Uploaded Illustration";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Reads and optimizes an uploaded image file (PNG, JPG, WebP, GIF, SVG)
 * into a high-efficiency WebP or SVG data URL suitable for local & cloud book storage.
 */
export async function processUploadedImageFile(
  file: File,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<ProcessedMediaAsset> {
  const allowedPrefixes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"];
  const isAllowed = allowedPrefixes.some((t) => file.type.toLowerCase().includes(t.split("/")[1]));
  if (!isAllowed && !file.name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
    throw new Error(`Unsupported file format "${file.name}". Upload PNG, JPG, WebP, GIF, or SVG.`);
  }

  const maxRawBytes = 25 * 1024 * 1024; // 25 MB raw file limit
  if (file.size > maxRawBytes) {
    throw new Error(`"${file.name}" exceeds the 25 MB maximum upload size.`);
  }

  const cleanTitle = cleanTitleFromFileName(file.name);

  // Preserve vector SVGs cleanly
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    const svgText = await file.text();
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    const encodedSize = new TextEncoder().encode(dataUrl).length;
    return {
      dataUrl,
      cleanTitle,
      fileName: file.name,
      fileSizeBytes: encodedSize,
      mimeType: "image/svg+xml",
      width: 1200,
      height: 675,
      aspectRatio: "16:9",
    };
  }

  const maxDimension = options.maxDimension ?? 1100;
  const quality = options.quality ?? 0.8;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not decode image "${file.name}".`));
    image.src = rawDataUrl;
  });

  const origW = img.naturalWidth || img.width || 1200;
  const origH = img.naturalHeight || img.height || 675;

  let targetW = origW;
  let targetH = origH;
  if (origW > maxDimension || origH > maxDimension) {
    if (origW >= origH) {
      targetW = maxDimension;
      targetH = Math.max(1, Math.round((origH / origW) * maxDimension));
    } else {
      targetH = maxDimension;
      targetW = Math.max(1, Math.round((origW / origH) * maxDimension));
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      dataUrl: rawDataUrl,
      cleanTitle,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || "image/png",
      width: origW,
      height: origH,
      aspectRatio: detectClosestAspectRatio(origW, origH),
    };
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);

  let optimizedDataUrl = canvas.toDataURL("image/webp", quality);
  let outputMime = "image/webp";
  if (!optimizedDataUrl.startsWith("data:image/webp")) {
    optimizedDataUrl = canvas.toDataURL("image/jpeg", quality);
    outputMime = "image/jpeg";
  }

  // Secondary pass if encoded data URL is still > 58 KB so Firestore inline storage stays crisp
  if (optimizedDataUrl.length > 58000 && (targetW > 760 || targetH > 760)) {
    const scale = 760 / Math.max(targetW, targetH);
    const compactW = Math.max(1, Math.round(targetW * scale));
    const compactH = Math.max(1, Math.round(targetH * scale));
    canvas.width = compactW;
    canvas.height = compactH;
    const compactCtx = canvas.getContext("2d");
    if (compactCtx) {
      compactCtx.drawImage(img, 0, 0, compactW, compactH);
      const compactUrl = canvas.toDataURL(outputMime, 0.74);
      if (compactUrl.length < optimizedDataUrl.length) {
        optimizedDataUrl = compactUrl;
        targetW = compactW;
        targetH = compactH;
      }
    }
  }

  const approxBytes = Math.round((optimizedDataUrl.length * 3) / 4);

  return {
    dataUrl: optimizedDataUrl,
    cleanTitle,
    fileName: file.name,
    fileSizeBytes: approxBytes,
    mimeType: outputMime,
    width: targetW,
    height: targetH,
    aspectRatio: detectClosestAspectRatio(targetW, targetH),
  };
}
