import React, { useState, useEffect } from "react";
import {
  HardDrive,
  Upload,
  Check,
  ExternalLink,
  FileText,
  Code,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  FolderOpen,
  CloudCheck,
  ShieldCheck,
  Database,
  ArrowDownToLine,
  Trash2,
  Layers,
  Image as ImageIcon,
  FolderArchive,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Book } from "../types";
import {
  saveFileToGoogleDrive,
  saveBookArchiveToGoogleDrive,
  loadBookFromGoogleDrive,
  listGoogleDriveFiles,
  generateBookMarkdown,
  isGoogleDriveAutoSyncEnabled,
  setGoogleDriveAutoSyncEnabled,
  backupAllArtworkToGoogleDrive,
  downloadArtworkPackageZip,
  ArtworkBackupSummary,
  GoogleDriveFile,
} from "../services/googleDrive";
import {
  compressBookForFirestore,
  validateFirestoreDocumentSize,
  formatBytes,
} from "../services/dataCompression";
import {
  detectFirestoreOverflow,
  executeGoogleDriveOffload,
} from "../services/driveOffloadService";
import { getStoredGoogleAccessToken, connectGoogleDriveWithPopup, auth } from "../services/firebase";

interface GoogleDriveSyncModalProps {
  book: Book;
  onClose: () => void;
  onRestoreBook?: (restoredBook: Book) => void;
  onUpdateBook?: (updatedBook: Book) => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  book,
  onClose,
  onRestoreBook,
  onUpdateBook,
}) => {
  const [activeTab, setActiveTab] = useState<"backup" | "restore" | "settings">("backup");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isOffloading, setIsOffloading] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [hasToken, setHasToken] = useState<boolean>(!!getStoredGoogleAccessToken());
  const [autoSync, setAutoSync] = useState<boolean>(isGoogleDriveAutoSyncEnabled());
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const [uploadSuccess, setUploadSuccess] = useState<{
    name: string;
    webViewLink?: string;
    message?: string;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Artwork Backup & Download State
  const [isBackingUpArtwork, setIsBackingUpArtwork] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [backupProgressMsg, setBackupProgressMsg] = useState<string>("");
  const [backupProgressPercent, setBackupProgressPercent] = useState<number>(0);
  const [artworkBackupSummary, setArtworkBackupSummary] = useState<ArtworkBackupSummary | null>(null);

  // Calculate total artwork assets
  const totalIllustrationsCount =
    book.chapters.reduce((sum, ch) => sum + (ch.illustrations?.length || 0), 0) +
    (book.coverImage ? 1 : 0) +
    (book.coverImageUrl ? 1 : 0);

  // Calculate book size & Firestore compression metrics
  const compressionResult = compressBookForFirestore(book);
  const sizeValidation = validateFirestoreDocumentSize(compressionResult.compressedBook);
  const bookSizeBytes = compressionResult.originalBytes;
  const bookSizeFormatted = formatBytes(bookSizeBytes);
  const minifiedSizeFormatted = formatBytes(compressionResult.compressedBytes);

  useEffect(() => {
    if (activeTab === "restore") {
      fetchDriveFiles();
    }
  }, [activeTab]);

  const fetchDriveFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listGoogleDriveFiles();
      setDriveFiles(files);
    } catch (err: any) {
      console.warn("Could not fetch Google Drive files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setUploadError(null);
      const { accessToken } = await connectGoogleDriveWithPopup();
      if (accessToken) {
        setHasToken(true);
        setStatusNotice("Google Drive connected successfully!");
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to authenticate with Google Drive.");
    }
  };

  const handleUploadFullArchive = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const res = await saveBookArchiveToGoogleDrive(book);
      setUploadSuccess({
        name: res.name,
        webViewLink: res.webViewLink,
        message: "Full uncompressed manuscript, cover wraps, and lore archive saved to your Google Drive account!",
      });
      setHasToken(true);
    } catch (err: any) {
      setUploadError(err.message || "Failed to save archive to Google Drive.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadMarkdown = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const content = generateBookMarkdown(book);
      const filename = `${book.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Manuscript.md`;
      const res = await saveFileToGoogleDrive({
        name: filename,
        content,
        mimeType: "text/markdown",
        description: `TomeCrafter AI Book Studio manuscript for "${book.title}" by ${book.author}`,
      });
      setUploadSuccess({
        name: filename,
        webViewLink: res.webViewLink,
        message: "Formatted Markdown chapters successfully uploaded to your Google Drive!",
      });
      setHasToken(true);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload markdown to Google Drive.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackupArtwork = async () => {
    setIsBackingUpArtwork(true);
    setUploadError(null);
    setUploadSuccess(null);
    setArtworkBackupSummary(null);
    try {
      const summary = await backupAllArtworkToGoogleDrive(book, (msg, current, total) => {
        setBackupProgressMsg(msg);
        setBackupProgressPercent(Math.round((current / total) * 100));
      });
      setArtworkBackupSummary(summary);
      setUploadSuccess({
        name: summary.folderName,
        webViewLink: summary.folderLink,
        message: `Successfully stored ${summary.uploadedCount} artwork & media assets in Google Drive folder: ${summary.folderName}`,
      });
      setHasToken(true);
    } catch (err: any) {
      setUploadError(err.message || "Failed to backup artwork to Google Drive.");
    } finally {
      setIsBackingUpArtwork(false);
      setBackupProgressMsg("");
    }
  };

  const handleDownloadArtworkZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadArtworkPackageZip(book);
      setStatusNotice("Complete Artwork Package (.ZIP) downloaded to your computer!");
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || "Failed to download artwork ZIP package.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleTriggerDriveOffload = async () => {
    setIsOffloading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const currentUserId = auth.currentUser?.uid || "local-user";
      const result = await executeGoogleDriveOffload(book, currentUserId);
      if (result.success) {
        setUploadSuccess({
          name: result.driveFileName || "Google Drive Archive",
          webViewLink: result.driveWebViewLink,
          message: `Successfully offloaded full manuscript (${result.originalSizeFormatted}) to Google Drive! A lean metadata stub (${result.stubSizeFormatted}) was stored in Firestore.`,
        });
        setHasToken(true);
        if (onUpdateBook && result.metadataStub) {
          onUpdateBook({
            ...book,
            isOffloadedToDrive: true,
            offloadMetadata: result.metadataStub.offloadMetadata,
          });
        }
      } else {
        setUploadError(result.error || "Failed to offload manuscript to Google Drive.");
      }
    } catch (err: any) {
      setUploadError(err.message || "Error executing Google Drive offload.");
    } finally {
      setIsOffloading(false);
    }
  };

  const handleRestoreFromDrive = async (file: GoogleDriveFile) => {
    if (!onRestoreBook) return;
    if (confirmRestoreId !== file.id) {
      setConfirmRestoreId(file.id);
      return;
    }
    setConfirmRestoreId(null);

    setRestoringFileId(file.id);
    setUploadError(null);
    try {
      const loadedBook = await loadBookFromGoogleDrive(file.id);
      onRestoreBook(loadedBook);
      setStatusNotice(`Successfully restored "${loadedBook.title}" from Google Drive!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || "Failed to restore book archive from Google Drive.");
    } finally {
      setRestoringFileId(null);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled);
    setGoogleDriveAutoSyncEnabled(enabled);
    setStatusNotice(
      enabled
        ? "Google Drive Auto-Sync enabled! Full manuscript archives will automatically mirror to your Drive account."
        : "Google Drive Auto-Sync disabled."
    );
    setTimeout(() => setStatusNotice(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <HardDrive className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif font-bold text-lg text-stone-100">
                  Google Drive Cloud Vault
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                  No 1MB Limit
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Store unlimited high-res manuscript archives & cover art in your Google Drive account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 bg-stone-950 p-1 rounded-2xl border border-stone-800">
          <button
            onClick={() => setActiveTab("backup")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "backup"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Save to Drive</span>
          </button>
          <button
            onClick={() => setActiveTab("restore")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "restore"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Restore / Import</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "settings"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Drive Auto-Sync</span>
          </button>
        </div>

        {/* Error Notice */}
        {uploadError && (
          <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="flex-1">{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="text-amber-400 hover:text-amber-300 font-mono text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Notice */}
        {uploadSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-semibold text-emerald-300">
              <Check className="w-4 h-4" />
              <span>{uploadSuccess.message || "File saved to your Google Drive!"}</span>
            </div>
            <p className="text-[11px] text-stone-300 font-mono">{uploadSuccess.name}</p>
            {uploadSuccess.webViewLink && (
              <a
                href={uploadSuccess.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-sky-400 hover:text-sky-300 font-medium underline text-xs pt-1"
              >
                <span>Open & View in Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {statusNotice && (
          <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-500/30 text-sky-300 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Current Book Payload Size & Firestore Compression Banner */}
        <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Database className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-stone-300 font-medium">Raw Manuscript:</span>{" "}
                <span className="font-mono text-stone-200 font-bold">{bookSizeFormatted}</span>
                <span className="text-stone-500 mx-1.5">•</span>
                <span className="text-stone-300 font-medium">Minified Cloud:</span>{" "}
                <span className="font-mono text-emerald-400 font-bold">{minifiedSizeFormatted}</span>
                {compressionResult.compressionRatio > 0 && (
                  <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    -{compressionResult.compressionRatio}%
                  </span>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center space-x-1 ${
              book.isOffloadedToDrive
                ? "bg-sky-950/60 text-sky-300 border border-sky-500/30"
                : sizeValidation.status === "optimal"
                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                : sizeValidation.status === "warning"
                ? "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                : "bg-rose-950/60 text-rose-300 border border-rose-500/30"
            }`}>
              {book.isOffloadedToDrive ? (
                <>
                  <HardDrive className="w-3 h-3" />
                  <span>Archived in Drive (Stub in Cloud)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>{sizeValidation.percentOfLimit}% of 1MB Limit</span>
                </>
              )}
            </span>
          </div>

          <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                book.isOffloadedToDrive
                  ? "bg-sky-400"
                  : sizeValidation.status === "optimal"
                  ? "bg-emerald-500"
                  : sizeValidation.status === "warning"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(2, sizeValidation.percentOfLimit))}%` }}
            />
          </div>
        </div>

        {/* Offloaded to Google Drive Notice if Active */}
        {book.isOffloadedToDrive && book.offloadMetadata && (
          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sky-300 font-semibold">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Active Google Drive Offload Storage</span>
              </div>
              <span className="text-[10px] font-mono text-stone-400">
                {new Date(book.offloadMetadata.offloadedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-[11px] text-stone-300">
              This manuscript is securely archived in your Google Drive (<strong>{book.offloadMetadata.driveFileName}</strong>). A queryable metadata stub keeps your project outline, word counts, and history in Firestore.
            </p>
            {book.offloadMetadata.driveWebViewLink && (
              <div className="pt-1">
                <a
                  href={book.offloadMetadata.driveWebViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-[11px] text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2"
                >
                  <span>Open Drive File ({book.offloadMetadata.originalSizeFormatted})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Backup to Drive */}
        {activeTab === "backup" && (
          <div className="space-y-3 text-xs">
            {/* Automatic 1MB Overflow Service Feature Card */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/40 transition-colors space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-stone-100 text-sm">
                        1MB Limit Overflow & Metadata Stub Engine
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        Automatic
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Whenever your manuscript or artwork exceeds Firestore&apos;s 1MB document limit, TomeCrafter automatically offloads the complete lossless archive to Google Drive and keeps a lean metadata stub in Firestore for seamless syncing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                <div className="flex items-center space-x-2 text-[10px] font-mono text-stone-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Data Loss • Outlines & Lore Preserved</span>
                </div>
                <button
                  onClick={handleTriggerDriveOffload}
                  disabled={isOffloading || isUploading}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-medium text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-40"
                  title="Archive full book in Google Drive and keep a metadata stub in Firestore"
                >
                  {isOffloading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Offloading to Drive...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Manual Drive Offload</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Project Full Archive */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-sky-500/40 transition-colors space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-100 text-sm">
                      Complete Studio Archive (.json)
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Full book payload: all chapters, cover art wraps, character codex, beats & typesetting rules.
                    </p>
                    <div className="mt-1.5 flex items-center space-x-2 text-[10px] font-mono text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Zero size restrictions • 100% loss-less fidelity</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleUploadFullArchive}
                  disabled={isUploading}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-sky-950/50 disabled:opacity-40"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Save Full Archive to Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Markdown Manuscript */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-200">Markdown Manuscript (.md)</h4>
                  <p className="text-[11px] text-stone-400">Standard formatted draft chapters</p>
                </div>
              </div>
              <button
                onClick={handleUploadMarkdown}
                disabled={isUploading}
                className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs flex items-center space-x-1.5 disabled:opacity-40 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Save .md</span>
              </button>
            </div>

            {/* Artwork & Media Package (Covers, Illustrations & Diagrams) */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-purple-500/40 transition-colors space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-stone-100 text-sm">
                        Artwork, Covers & Visual Plates
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {totalIllustrationsCount} items
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Back up full wrap covers, in-chapter scene art, and diagram plates to your assigned Google Drive folder, or download as a standalone ZIP archive.
                    </p>
                  </div>
                </div>
              </div>

              {isBackingUpArtwork && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{backupProgressMsg || "Uploading artwork assets..."}</span>
                    <span className="font-mono">{backupProgressPercent}%</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${backupProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  onClick={handleDownloadArtworkZip}
                  disabled={isDownloadingZip}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs flex items-center space-x-1.5 disabled:opacity-40 transition-colors"
                  title="Download all artwork organized in folders as a ZIP file"
                >
                  {isDownloadingZip ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Bundling ZIP...</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Download ZIP</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleBackupArtwork}
                  disabled={isBackingUpArtwork || isUploading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-purple-950/50 disabled:opacity-40"
                  title="Upload all artwork to an organized Google Drive folder hierarchy"
                >
                  {isBackingUpArtwork ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing ({backupProgressPercent}%)...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Backup Artwork to Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Restore from Drive */}
        {activeTab === "restore" && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-300 font-medium">TomeCrafter Files on Your Google Drive</span>
              <button
                onClick={fetchDriveFiles}
                disabled={isLoadingFiles}
                className="text-sky-400 hover:text-sky-300 flex items-center space-x-1 text-[11px] font-mono"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                <span className="font-mono text-xs">Searching your Google Drive account...</span>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 text-center space-y-2">
                <HardDrive className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-stone-300 font-medium">No saved archives found yet</p>
                <p className="text-stone-500 text-[11px] max-w-sm mx-auto">
                  Click &quot;Save to Drive&quot; on any manuscript to create an archive in your Google Drive.
                </p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between hover:border-stone-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden mr-2">
                      <div className="p-2 rounded-xl bg-stone-900 text-sky-400 shrink-0">
                        {file.name.endsWith(".json") ? (
                          <Code className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-medium text-stone-200 truncate">{file.name}</div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : "Google Drive file"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {file.name.endsWith(".json") && onRestoreBook && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleRestoreFromDrive(file)}
                            disabled={restoringFileId === file.id}
                            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs flex items-center space-x-1 transition-colors disabled:opacity-40 ${
                              confirmRestoreId === file.id
                                ? "bg-amber-600 hover:bg-amber-500 text-white"
                                : "bg-sky-600 hover:bg-sky-500 text-white"
                            }`}
                          >
                            {restoringFileId === file.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowDownToLine className="w-3 h-3" />
                            )}
                            <span>{confirmRestoreId === file.id ? "Confirm Restore" : "Restore"}</span>
                          </button>
                          {confirmRestoreId === file.id && (
                            <button
                              onClick={() => setConfirmRestoreId(null)}
                              className="px-2 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Drive Auto-Sync Configuration */}
        {activeTab === "settings" && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-200 text-sm">
                    Automatic Google Drive Mirroring
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Automatically syncs full uncompressed JSON manuscripts to your Google Drive account whenever you save.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              <div className="border-t border-stone-800/80 pt-3 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>Bypasses Firestore 1MB document limitations</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-400 text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>Backs up full resolution cover artwork & illustrations</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-400 text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>Accessible from any computer via your Google account</span>
                </div>
              </div>
            </div>

            {!hasToken && (
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between">
                <span className="text-sky-300 text-xs font-medium">
                  Connect Google Account to enable Drive sync
                </span>
                <button
                  onClick={handleConnectDrive}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors"
                >
                  Connect Drive
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="border-t border-stone-800 pt-3 flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>TomeCrafter Secure Cloud Storage</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
