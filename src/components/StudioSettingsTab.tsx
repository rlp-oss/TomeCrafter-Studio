import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Unlock,
  Building2,
  Sparkles,
  Sliders,
  RefreshCw,
  Eye,
  Layers,
  BookOpen,
  Info,
  AlertCircle,
  FileCheck,
  Globe,
  Mail,
  MapPin,
  HardDrive,
  Cloud,
  ChevronRight,
  UserCheck,
  LogIn,
  LogOut,
  Database,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { Book, StudioSettings, StudioLogoMeta } from "../types";
import {
  compressBookForFirestore,
  validateFirestoreDocumentSize,
  formatBytes,
} from "../services/dataCompression";
import {
  PRIMARY_ADMIN_EMAIL,
  PRESET_STUDIO_LOGOS,
  isUserAuthorizedForStudioLogo,
  getStudioSettings,
  updateStudioSettings,
  uploadStudioLogoProtected,
  setStudioLogoDirect,
  deleteStudioLogoProtected,
  subscribeToStudioSettings,
} from "../services/studioSettingsService";
import { signInWithGoogle, logOut } from "../services/firebase";

interface StudioSettingsTabProps {
  book: Book;
  currentUser: FirebaseUser | null;
  onUpdateBook: (updatedBook: Book) => void;
  onSelectTab?: (tab: any) => void;
}

export const StudioSettingsTab: React.FC<StudioSettingsTabProps> = ({
  book,
  currentUser,
  onUpdateBook,
  onSelectTab,
}) => {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Logo Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [logoPreviewMode, setLogoPreviewMode] = useState<"dark" | "paper" | "spine" | "header">("dark");
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isApplyingUrl, setIsApplyingUrl] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<boolean>(false);

  // Form Fields State
  const [studioName, setStudioName] = useState("");
  const [imprintName, setImprintName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [autoApplyToBookImprint, setAutoApplyToBookImprint] = useState(true);
  const [autoApplyToTitlePage, setAutoApplyToTitlePage] = useState(true);
  const [autoApplyToSpine, setAutoApplyToSpine] = useState(true);

  // 1. Subscribe to real-time Studio Settings
  useEffect(() => {
    const unsubscribe = subscribeToStudioSettings((latestSettings) => {
      setSettings(latestSettings);
      setStudioName(latestSettings.studioName);
      setImprintName(latestSettings.imprintName);
      setTagline(latestSettings.tagline);
      setDescription(latestSettings.description);
      setWebsiteUrl(latestSettings.websiteUrl || "");
      setSupportEmail(latestSettings.supportEmail || "");
      setHeadquarters(latestSettings.headquarters || "");
      setAutoApplyToBookImprint(latestSettings.autoApplyToBookImprint);
      setAutoApplyToTitlePage(latestSettings.autoApplyToTitlePage);
      setAutoApplyToSpine(latestSettings.autoApplyToSpine);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAuthorized = isUserAuthorizedForStudioLogo(currentUser, settings);

  // Handle Logo Upload with Resilient Fallback
  const handleProcessLogoUpload = async (file: File) => {
    setUploadError(null);
    uploadAbortRef.current = false;

    if (!isAuthorized) {
      setUploadError(
        `Access Restricted: Only authorized studio administrator (${PRIMARY_ADMIN_EMAIL}) can upload or modify the studio logo.`
      );
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(15);

      // Smooth progress ticker
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 88) {
            clearInterval(progressTimer);
            return 88;
          }
          return prev + 12;
        });
      }, 200);

      const { promise } = uploadStudioLogoProtected(
        file,
        currentUser,
        settings,
        (percent) => {
          setUploadProgress(percent);
        }
      );

      const logoMeta = await promise;
      clearInterval(progressTimer);
      setUploadProgress(100);

      if (uploadAbortRef.current) return;

      // Auto apply to active book if setting is enabled
      if (autoApplyToBookImprint) {
        onUpdateBook({
          ...book,
          publishingKit: {
            ...book.publishingKit,
            publisherImprint: imprintName || settings?.imprintName || "Rhythm Logic Publishing Holdings",
          },
          formattingSettings: {
            ...book.formattingSettings,
            copyrightText: book.formattingSettings.copyrightText || `Published by ${imprintName || settings?.imprintName || "Rhythm Logic Publishing Holdings"}. All rights reserved.`,
          },
          updatedAt: new Date().toISOString(),
        });
      }

      setSaveSuccessNotice("Studio logo uploaded and synced across Cloud Firestore & Active Manuscript!");
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to process studio logo.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle direct URL apply
  const handleApplyCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLogoUrl.trim()) return;

    if (!isAuthorized) {
      setUploadError(`Access Restricted: Only ${PRIMARY_ADMIN_EMAIL} can configure studio branding.`);
      return;
    }

    try {
      setIsApplyingUrl(true);
      setUploadError(null);
      await setStudioLogoDirect(
        customLogoUrl.trim(),
        "Custom Direct Imprint Logo",
        currentUser,
        settings
      );
      setCustomLogoUrl("");
      setShowUrlInput(false);
      setSaveSuccessNotice("Custom logo URL saved and synced successfully!");
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || "Failed to set custom logo URL.");
    } finally {
      setIsApplyingUrl(false);
    }
  };

  // Handle preset logo selection
  const handleApplyPresetLogo = async (presetUrl: string, presetName: string) => {
    if (!isAuthorized) {
      setUploadError(`Access Restricted: Only ${PRIMARY_ADMIN_EMAIL} can configure studio branding.`);
      return;
    }

    try {
      setIsLoading(true);
      setUploadError(null);
      await setStudioLogoDirect(
        presetUrl,
        presetName,
        currentUser,
        settings
      );
      setSaveSuccessNotice(`Selected preset "${presetName}" applied and synced!`);
      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } catch (err: any) {
      setUploadError(err.message || "Failed to apply preset logo.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Cancel Upload
  const handleCancelUpload = () => {
    uploadAbortRef.current = true;
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessLogoUpload(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isAuthorized) {
      setUploadError(`Upload locked: Only ${PRIMARY_ADMIN_EMAIL} is authorized.`);
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessLogoUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isAuthorized) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle Logo Deletion from Firebase Storage
  const handleDeleteLogo = async () => {
    if (!settings?.studioLogo) return;
    if (!isAuthorized) {
      alert("Unauthorized: Only designated studio administrators can remove the studio logo.");
      return;
    }

    if (!confirm("Are you sure you want to remove this custom logo from Firebase Storage?")) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteStudioLogoProtected(settings.studioLogo, currentUser, settings);
      setSaveSuccessNotice("Studio logo successfully removed from Firebase Storage.");
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      alert("Error deleting logo: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Copy URL
  const handleCopyLogoUrl = () => {
    if (settings?.studioLogo?.url) {
      navigator.clipboard.writeText(settings.studioLogo.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // Handle Save General Studio Profile Settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updated = await updateStudioSettings({
        studioName,
        imprintName,
        tagline,
        description,
        websiteUrl,
        supportEmail,
        headquarters,
        autoApplyToBookImprint,
        autoApplyToTitlePage,
        autoApplyToSpine,
      });

      // Also update current active book imprint if requested
      if (autoApplyToBookImprint && imprintName) {
        onUpdateBook({
          ...book,
          publishingKit: {
            ...book.publishingKit,
            publisherImprint: imprintName,
          },
          updatedAt: new Date().toISOString(),
        });
      }

      setSaveSuccessNotice("Studio profile and imprint configurations updated successfully!");
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Apply Studio Imprint to Current Book
  const handleApplyToBook = () => {
    onUpdateBook({
      ...book,
      publishingKit: {
        ...book.publishingKit,
        publisherImprint: imprintName || settings?.imprintName || "Rhythm Logic Publishing • Red Deer, Alberta, Canada",
      },
      formattingSettings: {
        ...book.formattingSettings,
        copyrightText: `Published by ${imprintName || settings?.imprintName || "Rhythm Logic Publishing • Red Deer, Alberta, Canada"}. All rights reserved.`,
      },
      updatedAt: new Date().toISOString(),
    });
    setSaveSuccessNotice(`Studio imprint applied to "${book.title}"!`);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn pb-24">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-stone-100">
              Studio Settings & Imprint Configuration
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-400">
            Manage your publishing house brand, custom book studio logo, Firebase Storage assets, and imprint metadata.
          </p>
        </div>

        {/* Cloud Status Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300">
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Storage: gen-lang-client-0309459920</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore: Connected</span>
          </div>
        </div>
      </div>

      {/* Global Success Notice */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-emerald-950/40 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{saveSuccessNotice}</span>
          </div>
          <button
            onClick={() => setSaveSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Authorization & Access Control Status Banner */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          isAuthorized
            ? "bg-gradient-to-r from-emerald-950/60 via-stone-900 to-stone-950 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
            : currentUser
            ? "bg-gradient-to-r from-amber-950/60 via-stone-900 to-stone-950 border-amber-500/40"
            : "bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border-stone-800"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`p-3 rounded-2xl border shrink-0 ${
                isAuthorized
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : currentUser
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-stone-800 text-stone-400 border-stone-700"
              }`}
            >
              {isAuthorized ? (
                <ShieldCheck className="w-6 h-6" />
              ) : currentUser ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-serif font-bold text-sm sm:text-base text-stone-100">
                  {isAuthorized
                    ? "Authorized Studio Administrator Verified"
                    : currentUser
                    ? "Restricted Studio Access"
                    : "Authentication Required for Logo Management"}
                </span>

                {isAuthorized ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>STORAGE WRITE GRANTED</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>READ-ONLY MODE</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-stone-400 leading-relaxed max-w-2xl">
                {isAuthorized ? (
                  <span>
                    Logged in as <strong className="text-emerald-300">{currentUser?.email}</strong>. You have full administrative permission to upload, replace, and configure custom studio logos stored in Firebase Storage.
                  </span>
                ) : currentUser ? (
                  <span>
                    Logged in as <strong className="text-stone-300">{currentUser.email}</strong>. Upload access is strictly restricted to designated studio administrator:{" "}
                    <strong className="text-amber-300">{PRIMARY_ADMIN_EMAIL}</strong>.
                  </span>
                ) : (
                  <span>
                    Sign in with your authorized Google administrator account (
                    <strong className="text-amber-300">{PRIMARY_ADMIN_EMAIL}</strong>
                    ) to unlock protected Firebase Storage logo uploads and imprint controls.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Auth Action Button */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold text-stone-200 truncate max-w-[160px]">
                    {currentUser.displayName || currentUser.email}
                  </div>
                  <div className="text-[10px] font-mono text-stone-400">
                    {isAuthorized ? "Primary Administrator" : "Beta Viewer"}
                  </div>
                </div>
                <button
                  onClick={() => logOut()}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700 transition-colors flex items-center space-x-1.5"
                  title="Sign out or switch accounts"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch User</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold transition-all shadow-lg shadow-amber-950/40 flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4 text-stone-950" />
                <span>Sign In as Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Protected Logo Upload & Live Previews) | Right (Studio Profile Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Protected Logo Upload Component */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl relative overflow-hidden">
            {/* Component Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-serif font-bold text-lg text-stone-100">
                    Custom Book Studio Logo
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Saved directly to Firebase Storage Bucket • Synced with Firestore
                  </p>
                </div>
              </div>

              {settings?.studioLogo ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>ACTIVE IN STORAGE</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                  NO LOGO STORED
                </span>
              )}
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Upload Notice</div>
                  <div>{uploadError}</div>
                </div>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-red-400 hover:text-red-200"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={!isAuthorized || isUploading}
            />

            {/* Upload Area / Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => {
                if (isAuthorized && !isUploading) {
                  fileInputRef.current?.click();
                }
              }}
              className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${
                !isAuthorized
                  ? "bg-stone-950/50 border-stone-800 opacity-80 cursor-not-allowed"
                  : isDragging
                  ? "bg-amber-500/15 border-amber-400 scale-[1.01] shadow-xl"
                  : "bg-stone-950 hover:bg-stone-950/80 border-stone-800 hover:border-amber-500/50"
              }`}
            >
              {isUploading ? (
                /* Uploading in progress */
                <div className="space-y-4 w-full max-w-xs py-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                    <Upload className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm text-stone-200 mb-1">
                      Processing & Syncing Logo...
                    </div>
                    <div className="text-[11px] text-amber-400 font-mono">
                      {uploadProgress}% completed • Firestore & Cloud Storage
                    </div>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(15, uploadProgress)}%` }}
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelUpload();
                      }}
                      className="px-3 py-1 text-[11px] font-mono rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors"
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              ) : settings?.studioLogo ? (
                /* Existing Logo Display */
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-center p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 max-w-[240px] mx-auto">
                    <img
                      src={settings.studioLogo.url}
                      alt={settings.studioName || "Studio Logo"}
                      className="max-h-24 max-w-full object-contain filter drop-shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-stone-200">
                      {settings.studioLogo.fileName}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {(settings.studioLogo.fileSizeBytes / 1024).toFixed(1)} KB • {settings.studioLogo.contentType}
                    </div>
                  </div>

                  {isAuthorized ? (
                    <div className="flex items-center justify-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-medium border border-stone-700 flex items-center space-x-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Replace Logo</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLogo();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-medium border border-red-800/50 flex items-center space-x-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 font-mono flex items-center justify-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Upload Locked (Admin: {PRIMARY_ADMIN_EMAIL})</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Upload Prompt */
                <div className="space-y-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-transform ${
                      isAuthorized
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:scale-110"
                        : "bg-stone-800 text-stone-500 border border-stone-700"
                    }`}
                  >
                    {isAuthorized ? (
                      <Upload className="w-7 h-7" />
                    ) : (
                      <Lock className="w-7 h-7" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="font-serif font-bold text-sm text-stone-200">
                      {isAuthorized
                        ? "Click or Drag to Upload Studio Logo"
                        : "Studio Logo Upload Restricted"}
                    </div>
                    <p className="text-xs text-stone-400 max-w-sm mx-auto">
                      {isAuthorized
                        ? "Upload high-res PNG, JPG, WebP, or vector SVG. Resilient Cloud & Firestore persistence for cover wraps, spine badges, and colophons."
                        : `Only ${PRIMARY_ADMIN_EMAIL} can upload custom studio branding.`}
                    </p>
                  </div>

                  <div className="pt-2">
                    {isAuthorized ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-[10px] font-mono text-amber-400">
                        <span>Max 15MB • Transparent PNG / SVG Preferred</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          signInWithGoogle();
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold shadow"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In to Unlock</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Direct URL and Preset Logo Controls */}
            {isAuthorized && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-stone-400 uppercase font-semibold">
                    Alternative Logo Setup
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-mono transition-colors flex items-center space-x-1"
                  >
                    <span>{showUrlInput ? "Hide URL Input" : "Paste Image URL"}</span>
                  </button>
                </div>

                {showUrlInput && (
                  <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/my-studio-logo.png"
                      value={customLogoUrl}
                      onChange={(e) => setCustomLogoUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingUrl || !customLogoUrl.trim()}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      {isApplyingUrl ? "Saving..." : "Apply URL"}
                    </button>
                  </form>
                )}

                {/* Preset Studio Logos for 1-Click Setup */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-stone-400">
                    Quick Imprint Presets:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_STUDIO_LOGOS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPresetLogo(preset.url, preset.name)}
                        className="flex items-center space-x-2.5 p-2 rounded-xl bg-stone-950 hover:bg-stone-900 border border-stone-800/80 hover:border-amber-500/40 text-left transition-all group"
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-7 h-7 rounded-lg object-cover border border-stone-700"
                        />
                        <div className="overflow-hidden">
                          <div className="text-[11px] font-semibold text-stone-200 truncate group-hover:text-amber-300">
                            {preset.name}
                          </div>
                          <div className="text-[9px] font-mono text-stone-400 truncate">
                            {preset.category}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Storage Metadata Panel (When logo is present) */}
            {settings?.studioLogo && (
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-stone-400 flex items-center space-x-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                    <span>Firebase Storage Details</span>
                  </span>
                  <button
                    onClick={handleCopyLogoUrl}
                    className="flex items-center space-x-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono transition-colors"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied URL!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Public URL</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-stone-400">
                    <span>Storage Path:</span>
                    <span className="text-stone-300 truncate max-w-[240px]">
                      {settings.studioLogo.storagePath}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-400">
                    <span>Uploaded By:</span>
                    <span className="text-emerald-300 font-bold truncate max-w-[200px]">
                      {settings.studioLogo.uploadedByEmail}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-400">
                    <span>Timestamp:</span>
                    <span className="text-stone-300">
                      {new Date(settings.studioLogo.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleApplyToBook}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Apply Studio Imprint to Current Book ("{book.title}")</span>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Live Previews in Different Publishing Contexts */}
            {settings?.studioLogo && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-bold text-stone-300 flex items-center space-x-1.5">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span>Multi-Context Publishing Preview</span>
                  </span>
                  <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-[10px]">
                    <button
                      onClick={() => setLogoPreviewMode("dark")}
                      className={`px-2 py-1 rounded-lg ${
                        logoPreviewMode === "dark" ? "bg-stone-800 text-stone-100 font-bold" : "text-stone-400"
                      }`}
                    >
                      Dark UI
                    </button>
                    <button
                      onClick={() => setLogoPreviewMode("paper")}
                      className={`px-2 py-1 rounded-lg ${
                        logoPreviewMode === "paper" ? "bg-amber-100 text-stone-900 font-bold" : "text-stone-400"
                      }`}
                    >
                      Paperback Page
                    </button>
                    <button
                      onClick={() => setLogoPreviewMode("spine")}
                      className={`px-2 py-1 rounded-lg ${
                        logoPreviewMode === "spine" ? "bg-stone-800 text-amber-300 font-bold" : "text-stone-400"
                      }`}
                    >
                      Spine Colophon
                    </button>
                    <button
                      onClick={() => setLogoPreviewMode("header")}
                      className={`px-2 py-1 rounded-lg ${
                        logoPreviewMode === "header" ? "bg-stone-800 text-stone-100 font-bold" : "text-stone-400"
                      }`}
                    >
                      Header Bar
                    </button>
                  </div>
                </div>

                {/* Preview Window */}
                <div className="rounded-2xl border border-stone-800 overflow-hidden">
                  {logoPreviewMode === "dark" && (
                    <div className="p-6 bg-stone-950 flex flex-col items-center justify-center space-y-2 text-center">
                      <img
                        src={settings.studioLogo.url}
                        alt="Logo Preview"
                        className="h-16 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="font-serif font-bold text-sm text-stone-100">
                        {studioName || settings.studioName}
                      </div>
                      <div className="text-[10px] text-stone-400 italic">
                        {tagline || settings.tagline}
                      </div>
                    </div>
                  )}

                  {logoPreviewMode === "paper" && (
                    <div className="p-8 bg-[#fbf8f2] text-stone-900 flex flex-col items-center justify-center space-y-3 text-center shadow-inner">
                      <div className="text-[10px] uppercase font-mono tracking-widest text-stone-500">
                        Half-Title / Imprint Page
                      </div>
                      <div className="font-serif font-bold text-lg text-stone-950 tracking-wide">
                        {book.title}
                      </div>
                      <div className="w-12 h-0.5 bg-stone-300 my-1" />
                      <img
                        src={settings.studioLogo.url}
                        alt="Logo Preview"
                        className="h-12 object-contain filter grayscale contrast-125"
                        referrerPolicy="no-referrer"
                      />
                      <div className="font-serif font-bold text-xs text-stone-800 tracking-wider">
                        {imprintName || settings.imprintName}
                      </div>
                      <div className="text-[9px] text-stone-600 font-serif">
                        {headquarters || "San Francisco"} • London • Tokyo
                      </div>
                    </div>
                  )}

                  {logoPreviewMode === "spine" && (
                    <div className="p-4 bg-stone-950 flex items-center justify-center">
                      <div className="w-20 py-6 px-2 bg-amber-700/80 border-y-2 border-amber-500/40 rounded flex flex-col items-center justify-between h-48 shadow-lg text-stone-950">
                        <div className="font-serif font-bold text-[9px] text-stone-900 [writing-mode:vertical-rl] truncate max-h-24">
                          {book.title}
                        </div>
                        <div className="mt-auto flex flex-col items-center">
                          <img
                            src={settings.studioLogo.url}
                            alt="Logo Spine"
                            className="w-8 h-8 object-contain filter brightness-0 invert"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-mono text-[7px] uppercase font-bold text-stone-950 tracking-tighter mt-1">
                            {imprintName?.slice(0, 10) || "IMPRINT"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {logoPreviewMode === "header" && (
                    <div className="p-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={settings.studioLogo.url}
                          alt="Logo Header"
                          className="h-8 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="leading-tight">
                          <div className="font-serif font-bold text-xs text-amber-400">
                            {studioName || settings.studioName}
                          </div>
                          <div className="text-[9px] text-stone-400">
                            Author & Publisher Workspace
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                        PREVIEW
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Studio Profile & Imprint Configuration Form */}
        <div className="lg:col-span-6 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Sliders className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-serif font-bold text-lg text-stone-100">
                    Publishing Atelier & Imprint Details
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Configures copyright notices, ISBN imprints, and title pages
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold transition-all shadow-md shadow-amber-950/30 flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-stone-950" />
                    <span>Save Imprint</span>
                  </>
                )}
              </button>
            </div>

            {/* Studio Name & Imprint */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-300">
                  Studio / Atelier Name
                </label>
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="e.g. Aether & Iron Press"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-300">
                  Publishing Imprint (for ISBN / KDP)
                </label>
                <input
                  type="text"
                  value={imprintName}
                  onChange={(e) => setImprintName(e.target.value)}
                  placeholder="e.g. Aether & Iron Publishing Co."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-300">
                Studio Tagline / Motto
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Where Artisan Craft Meets Ethical Provenance"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Statement / Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-300">
                Studio Statement & Colophon Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dedicated to human-authored literature and cleanroom craft..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
              />
            </div>

            {/* Website, Support Email, Headquarters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] text-stone-400 flex items-center space-x-1">
                  <Globe className="w-3 h-3 text-amber-400" />
                  <span>Website URL</span>
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-stone-400 flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-amber-400" />
                  <span>Contact Email</span>
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="admin@studio.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-stone-400 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Headquarters</span>
                </label>
                <input
                  type="text"
                  value={headquarters}
                  onChange={(e) => setHeadquarters(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Auto-Apply Preferences */}
            <div className="pt-3 border-t border-stone-800 space-y-3">
              <span className="text-xs font-serif font-bold text-stone-300 block">
                Automatic Manuscript Application Rules
              </span>

              <div className="space-y-2">
                <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 cursor-pointer hover:border-stone-700">
                  <input
                    type="checkbox"
                    checked={autoApplyToBookImprint}
                    onChange={(e) => setAutoApplyToBookImprint(e.target.checked)}
                    className="rounded border-stone-700 text-amber-500 focus:ring-amber-500/20 bg-stone-900 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-stone-200 block">
                      Auto-sync Imprint to Active Book Publishing Kit
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Keeps ISBN imprint name synchronized across export packages and Amazon KDP manifests.
                    </span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 cursor-pointer hover:border-stone-700">
                  <input
                    type="checkbox"
                    checked={autoApplyToTitlePage}
                    onChange={(e) => setAutoApplyToTitlePage(e.target.checked)}
                    className="rounded border-stone-700 text-amber-500 focus:ring-amber-500/20 bg-stone-900 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-stone-200 block">
                      Embed Studio Logo on Typeset Title & Colophon Pages
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Renders your custom high-res studio logo on PDF export front matter and half-title pages.
                    </span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 cursor-pointer hover:border-stone-700">
                  <input
                    type="checkbox"
                    checked={autoApplyToSpine}
                    onChange={(e) => setAutoApplyToSpine(e.target.checked)}
                    className="rounded border-stone-700 text-amber-500 focus:ring-amber-500/20 bg-stone-900 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-stone-200 block">
                      Include Studio Imprint Colophon on Book Spine Wrap
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Calculates spine badge coordinates for trade paperback cover spreads.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Submit Footer */}
            <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-stone-500">
                Last updated: {settings ? new Date(settings.updatedAt).toLocaleDateString() : "Just now"}
              </span>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow-lg flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4 text-stone-950" />
                <span>Save All Studio Configurations</span>
              </button>
            </div>
          </form>

          {/* Access Control & RBAC Reference Card */}
          <div className="p-5 rounded-3xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-stone-200 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Firebase RBAC Access Matrix</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300">Enforced by Security Rules</span>
            </div>

            <div className="space-y-2 text-[11px] text-stone-400">
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-900 border border-stone-800/80">
                <span>Primary Studio Admin:</span>
                <span className="font-mono text-emerald-300 font-bold">{PRIMARY_ADMIN_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-900 border border-stone-800/80">
                <span>Storage Bucket Target:</span>
                <span className="font-mono text-stone-300">gen-lang-client-0309459920.firebasestorage.app</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-900 border border-stone-800/80">
                <span>Upload Permission:</span>
                <span className={`font-mono font-bold ${isAuthorized ? "text-emerald-300" : "text-amber-400"}`}>
                  {isAuthorized ? "✓ GRANTED (Signed in as Administrator)" : "✗ RESTRICTED (Sign in required)"}
                </span>
              </div>
            </div>
          </div>

          {/* Firestore Document Minification & 1MB Limit Safety Diagnostic Card */}
          {(() => {
            const comp = compressBookForFirestore(book);
            const validation = validateFirestoreDocumentSize(comp.compressedBook);
            return (
              <div className="p-5 rounded-3xl bg-stone-950 border border-stone-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-stone-200 flex items-center space-x-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>Firestore Document Compression & 1MB Limit Monitor</span>
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    book.isOffloadedToDrive
                      ? "bg-sky-950/60 text-sky-300 border-sky-500/30"
                      : validation.status === "optimal"
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-950/60 text-amber-300 border-amber-500/30"
                  }`}>
                    {book.isOffloadedToDrive
                      ? "Offloaded to Google Drive"
                      : `${validation.percentOfLimit}% of 1MB limit used`}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-stone-400">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800/80">
                      <span className="text-[10px] text-stone-500 block">Raw Manuscript Size</span>
                      <span className="font-mono text-stone-200 font-bold text-xs">{formatBytes(comp.originalBytes)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800/80">
                      <span className="text-[10px] text-stone-500 block">
                        {book.isOffloadedToDrive ? "Firestore Metadata Stub" : "Minified Cloud Payload"}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold text-xs">
                        {book.isOffloadedToDrive && book.offloadMetadata
                          ? book.offloadMetadata.compressedSizeFormatted
                          : formatBytes(comp.compressedBytes)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800/80">
                      <span className="text-[10px] text-stone-500 block">Storage Strategy</span>
                      <span className={`font-mono font-bold text-xs ${book.isOffloadedToDrive ? "text-sky-300" : "text-amber-300"}`}>
                        {book.isOffloadedToDrive ? "Google Drive Archive" : "Firestore Document"}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden mt-2">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        book.isOffloadedToDrive
                          ? "bg-sky-400"
                          : validation.status === "optimal"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, validation.percentOfLimit))}%` }}
                    />
                  </div>

                  <div className="pt-2 text-[10px] text-stone-500 flex flex-wrap items-center justify-between gap-1">
                    <span>
                      Active Protections: Whitespace normalization • Deep key pruning • Automatic Google Drive overflow offload
                    </span>
                    <span className="font-mono text-emerald-400">
                      {book.isOffloadedToDrive ? "✓ Full Archive Safe in Drive" : "✓ Safe for 1MB Firestore Sync"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
