import React, { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Palette,
  Layers,
  Download,
  BookOpen,
  Eye,
  Sliders,
  Check,
  Loader2,
  RefreshCw,
  Maximize2,
  Plus,
  ShieldCheck,
  FileCheck,
  PackageCheck,
  CheckCircle2,
  Type,
  Info,
  Workflow,
  Table,
  HardDrive,
  ExternalLink,
  FolderDown,
  FolderArchive,
  AlertCircle,
  Share2,
  Ruler,
} from "lucide-react";
import { Book, ChapterIllustration, Genre } from "../types";
import { apiService } from "../services/api";
import {
  backupAllArtworkToGoogleDrive,
  downloadArtworkPackageZip,
  downloadSingleArtworkFile,
  uploadBlobToGoogleDrive,
  convertUrlToBlob,
  ArtworkBackupSummary,
} from "../services/googleDrive";
import { DiagramStudioTab } from "./DiagramStudioTab";
import { FullScreenCoverPreviewModal } from "./FullScreenCoverPreviewModal";
import { calculateSpineFormatting } from "../utils/spineCalculator";

interface ArtStudioProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onOpenExportModal?: () => void;
}

const CURATED_CLEAN_BACKGROUNDS = [
  {
    id: "clean-ethical-ai",
    title: "Ethical AI & Celestial Dawn",
    category: "Non-Fiction / Tech",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "clean-quantum",
    title: "Quantum Horizon & Deep Nebula",
    category: "Sci-Fi / Hard AI",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "clean-steampunk",
    title: "Alchemical Brass & Quintessence",
    category: "Fantasy / Steampunk",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "clean-minimalist",
    title: "Obsidian & Gold Minimalist",
    category: "Luxury / Non-Fiction",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "clean-cosmic",
    title: "Cosmic Nexus & Starlight",
    category: "Space Odyssey",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "clean-library",
    title: "Alexandria Library & Vault",
    category: "Literary / Historical",
    url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop",
  },
];

export const ArtStudio: React.FC<ArtStudioProps> = ({ book, onUpdateBook, onOpenExportModal }) => {
  const [activeSubTab, setActiveSubTab] = useState<"cover" | "illustrations" | "diagrams">("cover");

  // Cover Designer State
  const [coverPrompt, setCoverPrompt] = useState(
    `Pure visual artwork background for "${book.title}", ${book.genre}. Atmospheric, high-contrast, focal point symbolizing ethical evolution, cinematic lighting, ultra-detailed composition. Clean text-free illustration.`
  );
  const [coverStyle, setCoverStyle] = useState("cinematic_digital");
  const [coverTitleFont, setCoverTitleFont] = useState(book.coverTitleFont || "font-sans");
  const [coverAccentColor, setCoverAccentColor] = useState(book.coverAccentColor || "#10b981");
  const [coverMaskMode, setCoverMaskMode] = useState<"vignette" | "backplate" | "cinema" | "subtle">("vignette");
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  // Gallery / New Scene Art State
  const [scenePrompt, setScenePrompt] = useState("");
  const [sceneStyle, setSceneStyle] = useState("cinematic_digital");
  const [sceneRatio, setSceneRatio] = useState<"16:9" | "3:4" | "1:1" | "4:3">("16:9");
  const [targetChapterId, setTargetChapterId] = useState(book.chapters[0]?.id || "");
  const [isGeneratingSceneArt, setIsGeneratingSceneArt] = useState(false);

  // Full Screen Cover & Spine Preview Modal State
  const [showFullScreenCoverModal, setShowFullScreenCoverModal] = useState(false);
  const [fullScreenInitialMode, setFullScreenInitialMode] = useState<"wrap" | "3d" | "front" | "spine" | "back">("wrap");

  // Calculate Page count & Spine Width with Auto-Formatting Engine
  const totalWords = book.chapters.reduce(
    (sum, c) => sum + (c.content ? c.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0
  );
  const estimatedPages = Math.max(80, Math.ceil((totalWords || 50000) / 250));
  
  // Calculate spine geometry & typography using dedicated auto-formatter
  const liveSpineMetrics = calculateSpineFormatting({
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    wordCount: totalWords,
    manualPageCount: estimatedPages,
    paperType: "white-50lb",
    trimHeightInches: 9,
    trimWidthInches: 6,
    autoFit: true,
  });

  const spineWidthInches = liveSpineMetrics.spineWidthInches.toFixed(3);
  const spineWidthMm = liveSpineMetrics.spineWidthMm.toFixed(1);

  // Collect all illustrations across all chapters
  const allIllustrations: { chapterTitle: string; chapterNumber: number; illustration: ChapterIllustration }[] = [];
  book.chapters.forEach((ch) => {
    (ch.illustrations || []).forEach((ill) => {
      allIllustrations.push({
        chapterTitle: ch.title,
        chapterNumber: ch.number,
        illustration: ill,
      });
    });
  });

  const handleGenerateCover = async () => {
    setIsGeneratingCover(true);
    try {
      const res = await apiService.generateIllustration({
        prompt: `Pure visual background artwork for book titled "${book.title}", ${book.genre}. Atmospheric, high-contrast, focal point symbolizing ${book.genre}, cinematic lighting, fine detail. MANDATORY GUARDRAIL: DO NOT RENDER ANY TEXT, WORDS, LETTERS, TITLES, OR NAMES IN THE IMAGE. Pure visual art only.`,
        style: coverStyle,
        aspectRatio: "3:4",
        sceneContext: `Official Commercial Book Background Artwork for ${book.title} by ${book.author} (Dynamic typography typeset by client engine)`,
      });

      const coverUrl =
        res.imageUrl ||
        `https://picsum.photos/seed/${encodeURIComponent(book.title)}/1000/1500`;

      onUpdateBook({
        ...book,
        coverImageUrl: coverUrl,
        coverAccentColor: coverAccentColor,
        coverTitleFont: coverTitleFont,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      alert("Cover generation encountered an issue: " + err.message);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleApplyCleanBackground = (url: string) => {
    onUpdateBook({
      ...book,
      coverImageUrl: url,
      coverAccentColor: coverAccentColor,
      coverTitleFont: coverTitleFont,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleGenerateSceneArt = async () => {
    if (!scenePrompt.trim() || !targetChapterId) return;
    setIsGeneratingSceneArt(true);

    try {
      const res = await apiService.generateIllustration({
        prompt: scenePrompt,
        style: sceneStyle,
        aspectRatio: sceneRatio,
        sceneContext: `Illustration for ${book.title}`,
      });

      const newIll: ChapterIllustration = {
        id: `ill-art-${Date.now()}`,
        title: scenePrompt.slice(0, 35),
        prompt: scenePrompt,
        enhancedPrompt: res.enhancedPrompt,
        style: sceneStyle,
        aspectRatio: sceneRatio,
        imageUrl:
          res.imageUrl ||
          `https://picsum.photos/seed/${encodeURIComponent(scenePrompt)}/1200/675`,
        placement: "header",
        createdAt: new Date().toISOString(),
      };

      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id === targetChapterId) {
          return {
            ...ch,
            illustrations: [...(ch.illustrations || []), newIll],
          };
        }
        return ch;
      });

      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });

      setScenePrompt("");
    } catch (err: any) {
      setToastNotice("Scene art generation failed: " + (err?.message || "Unknown error"));
      setTimeout(() => setToastNotice(null), 5000);
    } finally {
      setIsGeneratingSceneArt(false);
    }
  };

  const handleDeleteIllustration = (chId: string, illId: string) => {
    const updatedChapters = book.chapters.map((ch) => {
      if (ch.id === chId) {
        return {
          ...ch,
          illustrations: (ch.illustrations || []).filter((i) => i.id !== illId),
        };
      }
      return ch;
    });
    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
    setToastNotice("Illustration removed from manuscript.");
    setTimeout(() => setToastNotice(null), 3500);
  };

  // Artwork Backup & Download State
  const [isBackingUpArtwork, setIsBackingUpArtwork] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [backupProgressMsg, setBackupProgressMsg] = useState("");
  const [backupProgressPercent, setBackupProgressPercent] = useState(0);
  const [backupSummary, setBackupSummary] = useState<ArtworkBackupSummary | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [uploadingSingleId, setUploadingSingleId] = useState<string | null>(null);

  const handleBackupAllArtwork = async () => {
    setIsBackingUpArtwork(true);
    setBackupSummary(null);
    setToastNotice(null);
    try {
      const summary = await backupAllArtworkToGoogleDrive(book, (msg, current, total) => {
        setBackupProgressMsg(msg);
        setBackupProgressPercent(Math.round((current / total) * 100));
      });
      setBackupSummary(summary);
      setToastNotice(`Successfully backed up ${summary.uploadedCount} artwork assets to Google Drive folder: ${summary.folderName}`);
    } catch (err: any) {
      alert("Google Drive Artwork Backup failed: " + (err.message || err));
    } finally {
      setIsBackingUpArtwork(false);
      setBackupProgressMsg("");
    }
  };

  const handleDownloadZipPackage = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadArtworkPackageZip(book);
      setToastNotice("Complete Artwork Package (.ZIP) downloaded to your computer!");
      setTimeout(() => setToastNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to package artwork ZIP: " + (err.message || err));
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDownloadSingle = async (url: string, filename: string) => {
    try {
      await downloadSingleArtworkFile(url, filename);
      setToastNotice(`Downloaded "${filename}"`);
      setTimeout(() => setToastNotice(null), 3000);
    } catch (e: any) {
      alert("Download failed: " + e.message);
    }
  };

  const handleUploadSinglePlateToDrive = async (ill: ChapterIllustration, chNum: number) => {
    setUploadingSingleId(ill.id);
    try {
      const { blob, mimeType, extension } = await convertUrlToBlob(ill.imageUrl, ill.title || `CH_${chNum}`);
      const filename = `CH_${chNum}_${(ill.title || "Illustration").replace(/[^a-zA-Z0-9_-]/g, "_")}.${extension}`;
      const res = await uploadBlobToGoogleDrive({
        name: filename,
        blob,
        mimeType,
        description: `TomeCrafter artwork for "${book.title}", Chapter ${chNum}: ${ill.title || "Plate"}`,
      });
      setToastNotice(`Saved "${filename}" directly to your Google Drive!`);
      setTimeout(() => setToastNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to upload plate to Google Drive: " + err.message);
    } finally {
      setUploadingSingleId(null);
    }
  };

  const handleSaveCoverToDrive = async () => {
    setUploadingSingleId("cover-wrap");
    try {
      const coverUrl = book.coverImage || book.coverImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
      const { blob, mimeType, extension } = await convertUrlToBlob(coverUrl, `${book.title} Cover Art`);
      const filename = `${book.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Cover_Art.${extension}`;
      await uploadBlobToGoogleDrive({
        name: filename,
        blob,
        mimeType,
        description: `Cover artwork for "${book.title}" by ${book.author}`,
      });
      setToastNotice(`Saved "${filename}" directly to your Google Drive!`);
      setTimeout(() => setToastNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to upload cover to Google Drive: " + err.message);
    } finally {
      setUploadingSingleId(null);
    }
  };

  const totalArtworkAssetsCount = (book.coverImage ? 1 : 0) + (book.frontCoverImage && book.frontCoverImage !== book.coverImage ? 1 : 0) + (book.coverImageUrl ? 1 : 0) + allIllustrations.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastNotice}</span>
          </div>
          <button
            onClick={() => setToastNotice(null)}
            className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Art & Cover Design Studio
            </h1>
          </div>
          <p className="text-sm text-stone-400">
            Directed by <span className="text-purple-400 font-medium">Grand Visualist Morgana</span>. Create
            breathtaking book covers, compute precise print spines, and generate in-chapter scene art.
          </p>
        </div>

        {/* Sub-tab switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs transition-all shadow-lg shadow-amber-950/30"
              title="Combine book art, cover, and formatted PDF into publisher package"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Combine Book Art & PDF (Download)</span>
            </button>
          )}

          <div className="flex items-center space-x-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setActiveSubTab("cover")}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "cover"
                  ? "bg-purple-600 text-stone-100 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Cover & Spine Designer
            </button>
            <button
              onClick={() => setActiveSubTab("illustrations")}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "illustrations"
                  ? "bg-purple-600 text-stone-100 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Manuscript Illustrations ({allIllustrations.length})
            </button>
            <button
              onClick={() => setActiveSubTab("diagrams")}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "diagrams"
                  ? "bg-emerald-600 text-stone-950 font-bold shadow"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Flowcharts & Tables</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Artwork Backup & Project Export Bar */}
      <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-stone-100 text-sm">
                Artwork & Media Storage Manager
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {totalArtworkAssetsCount} Assets Ready
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Download complete project media packages or back up all high-resolution plates directly to your Google Drive assigned folder.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadZipPackage}
            disabled={isDownloadingZip}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold text-xs transition-all disabled:opacity-40"
            title="Download all covers, illustrations, diagrams, and manifest as an organized ZIP archive"
          >
            {isDownloadingZip ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Bundling ZIP...</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Artwork (.ZIP)</span>
              </>
            )}
          </button>

          <button
            onClick={handleBackupAllArtwork}
            disabled={isBackingUpArtwork}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all shadow-lg shadow-sky-950/50 disabled:opacity-40"
            title="Upload covers, chapter illustrations, and diagrams into a dedicated Google Drive folder"
          >
            {isBackingUpArtwork ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing to Drive ({backupProgressPercent}%)...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5" />
                <span>Backup All to Google Drive</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backup Progress / Completion Banner */}
      {isBackingUpArtwork && (
        <div className="p-4 rounded-2xl bg-sky-950/60 border border-sky-500/40 text-sky-200 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{backupProgressMsg || "Syncing artwork assets..."}</span>
            <span className="font-mono">{backupProgressPercent}%</span>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-sky-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${backupProgressPercent}%` }}
            />
          </div>
        </div>
      )}

      {backupSummary && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-emerald-300">
                Google Drive Backup Completed ({backupSummary.uploadedCount} items stored)
              </span>
            </div>
            {backupSummary.folderLink && (
              <a
                href={backupSummary.folderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-semibold transition-colors"
              >
                <span>Open Folder in Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="text-[11px] text-stone-300 font-mono">
            Assigned Drive Folder: <span className="text-emerald-300 font-bold">{backupSummary.folderName}</span>
          </div>
        </div>
      )}

      {activeSubTab === "cover" ? (
        /* Cover Designer Mode */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Cover Controls & Guardrailed Prompt Forge */}
          <div className="lg:col-span-5 space-y-6">
            {/* Strict Guardrails Active Status Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-start space-x-3 shadow-md">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-emerald-300 flex items-center space-x-1.5">
                  <span>STRICT TEXT-FREE ART GUARDRAILS ACTIVE</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  The AI generates 100% pure background artwork without embedded letters, fake titles, or ghost text. All typography and author names are typeset cleanly by TomeCrafter.
                </p>
              </div>
            </div>

            {/* Book Metadata & Typography Synchronizer */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                <div className="flex items-center space-x-2 text-stone-200 text-xs font-bold font-mono">
                  <Type className="w-4 h-4 text-emerald-400" />
                  <span>Cover Metadata & Shielding</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Live Synchronized</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Book Title (Front Cover & Spine)</label>
                  <input
                    type="text"
                    value={book.title}
                    onChange={(e) => onUpdateBook({ ...book, title: e.target.value, updatedAt: new Date().toISOString() })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 font-bold focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. The Sovereign Author"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={book.subtitle || ""}
                    onChange={(e) => onUpdateBook({ ...book, subtitle: e.target.value, updatedAt: new Date().toISOString() })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. A Roadmap To Ethical AI Evolution"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-stone-400 font-semibold mb-1">Author Name</label>
                    <input
                      type="text"
                      value={book.author}
                      onChange={(e) => onUpdateBook({ ...book, author: e.target.value, updatedAt: new Date().toISOString() })}
                      className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 font-bold focus:border-emerald-500 focus:outline-none"
                      placeholder="e.g. C.W. Germain"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 font-semibold mb-1">Genre</label>
                    <input
                      type="text"
                      value={book.genre}
                      onChange={(e) => onUpdateBook({ ...book, genre: e.target.value as Genre, updatedAt: new Date().toISOString() })}
                      className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-400 font-semibold mb-1">
                    Contrast Mask Shield (Protects against underlying text/artifacts)
                  </label>
                  <select
                    value={coverMaskMode}
                    onChange={(e) => setCoverMaskMode(e.target.value as any)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="vignette">Top & Bottom Dark Vignette Shield (Recommended)</option>
                    <option value="backplate">Solid Dark Glass Title & Author Backplates</option>
                    <option value="cinema">Deep Cinema Gradient Shield</option>
                    <option value="subtle">Subtle Contrast Gradient</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Verified Text-Free Background Library */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="text-xs font-mono font-bold text-stone-300">
                  Curated Verified Text-Free Artworks
                </span>
                <span className="text-[10px] text-stone-400">1-Click Apply</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {CURATED_CLEAN_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => handleApplyCleanBackground(bg.url)}
                    className={`relative rounded-xl overflow-hidden aspect-[3/4] border group transition-all ${
                      book.coverImageUrl === bg.url
                        ? "border-emerald-500 ring-2 ring-emerald-500/40"
                        : "border-stone-800 hover:border-stone-600"
                    }`}
                    title={bg.title}
                  >
                    <img src={bg.url} alt={bg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                      <span className="text-[9px] font-mono text-stone-200 truncate w-full text-left">
                        {bg.title.split(" ")[0]}
                      </span>
                    </div>
                    {book.coverImageUrl === bg.url && (
                      <div className="absolute top-1 right-1 p-0.5 rounded-full bg-emerald-500 text-stone-950">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Image URL or upload */}
              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="Or paste clean background image URL..."
                  className="flex-1 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (customCoverUrl.trim()) {
                      handleApplyCleanBackground(customCoverUrl.trim());
                      setCustomCoverUrl("");
                    }
                  }}
                  disabled={!customCoverUrl.trim()}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* AI Generator Box */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-serif font-bold text-base text-stone-100">
                  Generate Custom Guardrailed Cover Art
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                  Art Generation Prompt (Pure Background Art)
                </label>
                <textarea
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-3 text-xs focus:border-purple-500 focus:outline-none"
                  placeholder="Describe key visual motifs, lighting, symbols, textures (No text/titles)..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">Art Style</label>
                  <select
                    value={coverStyle}
                    onChange={(e) => setCoverStyle(e.target.value)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="cinematic_digital">Cinematic Digital Art</option>
                    <option value="epic_oil_painting">Epic Fantasy Oil Painting</option>
                    <option value="gothic_woodcut">Victorian Woodcut Engraving</option>
                    <option value="storybook_watercolor">Classic Watercolor</option>
                    <option value="cyberpunk_concept">Cyberpunk Sci-Fi Concept</option>
                    <option value="dark_charcoal">Dark Charcoal / Noir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">
                    Title Typography
                  </label>
                  <select
                    value={coverTitleFont}
                    onChange={(e) => setCoverTitleFont(e.target.value)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="font-sans">Modern Clean Sans (Bold)</option>
                    <option value="font-serif">Classic Serif Display</option>
                    <option value="font-mono">Technical Spec Mono</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={coverAccentColor}
                    onChange={(e) => setCoverAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-stone-700"
                  />
                  <span className="font-mono text-xs text-stone-300">{coverAccentColor}</span>
                </div>
              </div>

              {/* Print Spine Metrics Box */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
                <div className="font-mono text-[10px] uppercase font-bold text-amber-400 flex items-center justify-between">
                  <span>Physical Print Spine Calculation</span>
                  <span>KDP / Ingram Ready</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-stone-300">
                  <div>
                    Est. Pages: <span className="font-mono font-bold text-stone-100">{estimatedPages}</span>
                  </div>
                  <div>
                    Spine Width: <span className="font-mono font-bold text-stone-100">{spineWidthInches}" ({spineWidthMm} mm)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateCover}
                disabled={isGeneratingCover || !coverPrompt.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-stone-100 font-bold text-sm transition-all shadow-lg shadow-purple-950/40 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isGeneratingCover ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering Guardrailed Art...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Guardrailed Cover Art</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Full Wrap-Around Book Cover Simulation (Back, Spine, Front) */}
          <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono uppercase font-bold text-stone-200 flex items-center space-x-1.5">
                  <span>Full Commercial Print Wrap Mockup (6x9 Trade)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  Spine: {liveSpineMetrics.spineWidthFormatted}
                </span>
              </div>

              {/* Full Screen Interactive Preview Trigger Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setFullScreenInitialMode("3d");
                    setShowFullScreenCoverModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all shadow-sm"
                  title="Open interactive 3D rotatable book preview"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>3D Mockup</span>
                </button>

                <button
                  onClick={() => {
                    setFullScreenInitialMode("wrap");
                    setShowFullScreenCoverModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-stone-100 text-xs font-bold transition-all shadow-md shadow-purple-950/40"
                  title="Open full screen interactive cover, spine & back jacket inspection"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen Preview</span>
                </button>
              </div>
            </div>

            {/* Wrap-around book container */}
            <div
              onClick={() => {
                setFullScreenInitialMode("wrap");
                setShowFullScreenCoverModal(true);
              }}
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col md:flex-row min-h-[500px] bg-stone-950 cursor-pointer group"
              title="Click to expand Full Screen Cover, Spine & Back Preview"
            >
              {/* Hover Overlay Hint */}
              <div className="absolute inset-0 bg-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none flex items-center justify-center">
                <div className="px-4 py-2 rounded-2xl bg-stone-950/90 border border-purple-500/60 text-purple-200 text-xs font-bold flex items-center space-x-2 shadow-2xl backdrop-blur-md">
                  <Maximize2 className="w-4 h-4 text-amber-300" />
                  <span>Click to Expand Full Screen 3D & Flat Cover Preview</span>
                </div>
              </div>

              {/* Back Cover */}
              <div className="flex-1 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950/90 text-stone-300 text-xs">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-2">
                    PRAISE & SUMMARY
                  </div>
                  <h4 className="font-serif font-bold text-sm text-stone-100 leading-snug mb-3">
                    {book.publishingKit?.salesBlurb?.hook || "THE DEFINITIVE BLUEPRINT FOR ETHICAL AI & PROVENANCE"}
                  </h4>
                  <p className="text-stone-400 text-[11px] leading-relaxed line-clamp-6">
                    {book.publishingKit?.salesBlurb?.body || book.premise}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-mono text-stone-500">
                      ISBN {book.publishingKit?.isbn || "978-1-95482-104-9"}
                    </div>
                    <div className="text-[9px] font-mono text-stone-500 uppercase">
                      {book.genre}
                    </div>
                  </div>
                  {/* Fake Barcode box */}
                  <div className="bg-white p-1 flex items-center justify-center rounded">
                    <div className="font-mono text-[7px] text-black tracking-tighter text-center">
                      ||| | |||| | ||| <br /> 9781954821049
                    </div>
                  </div>
                </div>
              </div>

              {/* Spine - Auto-Formatted Title Typography */}
              <div
                className="w-full md:w-12 py-4 px-1 flex md:flex-col items-center justify-between border-b md:border-b-0 md:border-r border-stone-800 text-stone-200 text-xs font-serif font-bold relative"
                style={{ backgroundColor: "#141210" }}
              >
                {/* Author Name */}
                <span
                  className="text-[9px] font-mono uppercase tracking-tighter rotate-0 md:-rotate-90 origin-center whitespace-nowrap"
                  style={{ color: liveSpineMetrics.spineWidthInches < 0.2 ? "#9ca3af" : coverAccentColor }}
                >
                  {liveSpineMetrics.formattedAuthor}
                </span>

                {/* Auto-Formatted Title with calculated point size and tracking */}
                <span
                  className={`font-serif tracking-widest text-stone-100 uppercase rotate-0 md:-rotate-90 origin-center whitespace-nowrap drop-shadow-sm ${coverTitleFont}`}
                  style={{
                    fontSize: `${Math.max(9, Math.min(14, liveSpineMetrics.autoFontSizePx))}px`,
                    letterSpacing: `${liveSpineMetrics.letterSpacingEm}em`,
                  }}
                >
                  {liveSpineMetrics.formattedTitle}
                </span>

                {/* Publisher Imprint Glyph */}
                <span className="text-[9px] font-mono text-amber-400 rotate-0 md:-rotate-90 origin-center">
                  𝔗
                </span>
              </div>

              {/* Front Cover with Guardrailed Dynamic Typeset & Contrast Shield */}
              <div className="flex-1 relative min-h-[420px] flex flex-col justify-between p-6 overflow-hidden bg-stone-950">
                {/* Background Artwork */}
                <img
                  src={
                    book.coverImageUrl ||
                    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"
                  }
                  alt="Book Front Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Contrast Shield Mask Layers based on coverMaskMode */}
                {coverMaskMode === "vignette" && (
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-stone-950/85 pointer-events-none" />
                )}
                {coverMaskMode === "backplate" && (
                  <div className="absolute inset-0 bg-stone-950/40 pointer-events-none" />
                )}
                {coverMaskMode === "cinema" && (
                  <div className="absolute inset-0 bg-gradient-to-b from-stone-950/90 via-transparent to-stone-950/95 pointer-events-none" />
                )}
                {coverMaskMode === "subtle" && (
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-stone-950/50 pointer-events-none" />
                )}

                {/* Top: Genre / Praise Banner */}
                <div className="relative z-10 text-center">
                  <span className="text-[9px] uppercase tracking-widest font-mono text-amber-300 font-bold px-3 py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-md shadow-lg">
                    {book.genre}
                  </span>
                </div>

                {/* Center / Bottom: Title & Subtitle & Author */}
                <div className={`relative z-10 text-center space-y-2.5 ${
                  coverMaskMode === "backplate" ? "bg-black/70 p-4 rounded-2xl border border-white/10 backdrop-blur-md" : ""
                }`}>
                  <h2
                    className={`text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] leading-tight ${coverTitleFont}`}
                    style={{ color: "#ffffff" }}
                  >
                    {book.title}
                  </h2>
                  {book.subtitle && (
                    <p className="text-xs font-serif text-amber-200/90 italic drop-shadow max-w-xs mx-auto leading-relaxed">
                      {book.subtitle}
                    </p>
                  )}
                  <div className="pt-3">
                    <span
                      className="text-xs uppercase tracking-widest font-mono font-bold drop-shadow-md px-3 py-1 rounded-md bg-black/50 border border-white/10 inline-block"
                      style={{ color: coverAccentColor }}
                    >
                      {book.author}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Cover Export & Google Drive Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setFullScreenInitialMode("wrap");
                    setShowFullScreenCoverModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                  <span>Inspect Spine & Bleeds Full Screen</span>
                </button>

                <button
                  onClick={() =>
                    handleDownloadSingle(
                      book.coverImage || book.coverImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
                      `${book.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Cover_Art.png`
                    )
                  }
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Cover (PNG/JPG)</span>
                </button>
              </div>

              <button
                onClick={handleSaveCoverToDrive}
                disabled={uploadingSingleId === "cover-wrap"}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-sky-900/40 hover:bg-sky-900/60 border border-sky-500/40 text-sky-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {uploadingSingleId === "cover-wrap" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>Save Cover to Drive</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeSubTab === "illustrations" ? (
        /* Manuscript Illustrations Gallery Mode */
        <div className="space-y-8">
          {/* Generator Form */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-serif font-bold text-base text-stone-100">
                Inscribe New Manuscript Illustration
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Scene Illustration Description
                </label>
                <input
                  type="text"
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder="e.g. Doctor Vance examining the humming violet quintessence vial in her candlelit lab..."
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Bind to Chapter
                </label>
                <select
                  value={targetChapterId}
                  onChange={(e) => setTargetChapterId(e.target.value)}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-purple-500 focus:outline-none"
                >
                  {book.chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      CH {ch.number}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-4 text-xs">
                <select
                  value={sceneStyle}
                  onChange={(e) => setSceneStyle(e.target.value)}
                  className="rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-purple-500 focus:outline-none"
                >
                  <optgroup label="Artistic Styles">
                    <option value="cinematic_digital">Cinematic Digital Art</option>
                    <option value="epic_oil_painting">Epic Oil Painting</option>
                    <option value="gothic_woodcut">Woodcut Engraving</option>
                    <option value="storybook_watercolor">Storybook Watercolor</option>
                    <option value="cyberpunk_concept">Cyberpunk Concept</option>
                  </optgroup>
                  <optgroup label="Diagrams, Flowcharts & Tables">
                    <option value="workflow_chart">📊 Workflow & Process Flowchart</option>
                    <option value="comparison_matrix">⚖️ Comparative Analysis Table</option>
                    <option value="system_architecture">🔄 System Architecture & Network</option>
                    <option value="infographic_table">📋 Structured Infographic & Metrics</option>
                    <option value="technical_schematic">📐 Technical Blueprint & Schematic</option>
                  </optgroup>
                </select>
              </div>

              <button
                onClick={handleGenerateSceneArt}
                disabled={isGeneratingSceneArt || !scenePrompt.trim()}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-stone-100 font-bold text-xs transition-all disabled:opacity-50"
              >
                {isGeneratingSceneArt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Painting Plate...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate Plate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Illustrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allIllustrations.map((item, idx) => {
              const chapterObj = book.chapters.find((c) => c.number === item.chapterNumber);
              return (
                <div
                  key={idx}
                  className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-lg group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video overflow-hidden bg-stone-950">
                      <img
                        src={item.illustration.imageUrl}
                        alt={item.illustration.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-amber-300">
                        CH {item.chapterNumber}
                      </div>
                    </div>

                    <div className="p-4 space-y-2 text-xs">
                      <h4 className="font-serif font-bold text-sm text-stone-100 truncate">
                        {item.illustration.title || `Chapter ${item.chapterNumber} Plate`}
                      </h4>
                      <p className="text-stone-400 text-[11px] line-clamp-2">
                        {item.illustration.prompt}
                      </p>
                      <div className="text-[10px] text-purple-400 font-mono flex items-center justify-between pt-2 border-t border-stone-800">
                        <span>{item.illustration.style}</span>
                        <span>Placement: {item.illustration.placement}</span>
                      </div>
                    </div>
                  </div>

                  {/* Illustration Card Action Bar */}
                  <div className="p-3 bg-stone-950/80 border-t border-stone-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() =>
                        handleDownloadSingle(
                          item.illustration.imageUrl,
                          `CH_${item.chapterNumber}_${(item.illustration.title || "Illustration").replace(/[^a-zA-Z0-9_-]/g, "_")}.png`
                        )
                      }
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-medium transition-colors"
                      title="Download image plate"
                    >
                      <Download className="w-3 h-3 text-amber-400" />
                      <span>Download</span>
                    </button>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUploadSinglePlateToDrive(item.illustration, item.chapterNumber)}
                        disabled={uploadingSingleId === item.illustration.id}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/40 text-sky-200 text-[11px] font-medium transition-colors disabled:opacity-50"
                        title="Upload directly to Google Drive"
                      >
                        {uploadingSingleId === item.illustration.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <HardDrive className="w-3 h-3 text-sky-400" />
                        )}
                        <span>Drive</span>
                      </button>

                      {chapterObj && (
                        <button
                          onClick={() => handleDeleteIllustration(chapterObj.id, item.illustration.id)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          title="Delete from Chapter"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {allIllustrations.length === 0 && (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-stone-800">
              <ImageIcon className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <h3 className="text-lg font-serif font-bold text-stone-300">No Manuscript Plates Inscribed</h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto mt-1">
                Generate scenic visual plates to accompany your chapters.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Diagrams, Flowcharts & Comparison Tables Studio */
        <DiagramStudioTab
          book={book}
          onUpdateBook={onUpdateBook}
        />
      )}
      {/* Full Screen Cover, Spine & Back Mockup Modal */}
      {showFullScreenCoverModal && (
        <FullScreenCoverPreviewModal
          book={book}
          onClose={() => setShowFullScreenCoverModal(false)}
          onUpdateBook={onUpdateBook}
          initialViewMode={fullScreenInitialMode}
        />
      )}
    </div>
  );
};
