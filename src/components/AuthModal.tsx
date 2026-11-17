import React, { useState, useEffect } from "react";
import {
  X,
  Cloud,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  RefreshCw,
  AlertCircle,
  BookOpen,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  HardDrive,
} from "lucide-react";
import {
  FirebaseUser,
  signInWithGoogle,
  logOut,
  fetchUserProfile,
  syncUserProfileToFirestore,
} from "../services/firebase";
import { Genre } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  booksCount: number;
  cloudSyncedCount: number;
  isSyncingCloud?: boolean;
  onSyncAllToCloud?: () => Promise<void>;
  onOpenGoogleDriveModal?: () => void;
}

const GENRE_OPTIONS: Genre[] = [
  "Epic Fantasy",
  "Sci-Fi & Cyberpunk",
  "Mystery & Thriller",
  "Historical Fiction",
  "Romance & Drama",
  "Horror & Gothic",
  "Non-Fiction & Self-Help",
  "Young Adult",
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  booksCount,
  cloudSyncedCount,
  isSyncingCloud = false,
  onSyncAllToCloud,
  onOpenGoogleDriveModal,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Author Profile Preferences stored in /users/{uid}
  const [penName, setPenName] = useState("");
  const [preferredGenre, setPreferredGenre] = useState<string>("Epic Fantasy");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setError(null);
    setSuccessMsg(null);
    setPenName(currentUser.displayName || "");

    fetchUserProfile(currentUser.uid)
      .then((profile) => {
        if (profile) {
          if (profile.displayName) setPenName(profile.displayName);
          if (profile.preferredGenre) setPreferredGenre(profile.preferredGenre);
        }
      })
      .catch((err) => {
        console.warn("Unable to load user profile:", err);
      });
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await signInWithGoogle();
      setSuccessMsg("Signed in! Your cloud library is syncing now.");
    } catch (err: any) {
      setError(err?.message || "Unable to complete Google sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingProfile(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await syncUserProfileToFirestore(currentUser, {
        displayName: penName.trim() || currentUser.displayName || "Author",
        preferredGenre,
      });
      setSuccessMsg("Author profile saved to Firebase.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Could not update author profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleManualSync = async () => {
    if (!onSyncAllToCloud) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await onSyncAllToCloud();
      setSuccessMsg("All local manuscripts synced to Firestore.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Cloud sync failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await logOut();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {currentUser ? <UserIcon className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-semibold text-stone-100">
                {currentUser ? "Author Account & Local Studio" : "Zero-Cost Local Studio Mode"}
              </h2>
              <p className="text-xs text-stone-400">
                {currentUser
                  ? "Manage your local library and author profile"
                  : "All paid cloud sync, Firebase Auth, and external API calls are disabled ($0/mo)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-medium text-rose-100">Authentication Notice</p>
                <p className="text-rose-200/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {!currentUser ? (
            <>
              {/* Zero-Cost Local Mode Summary */}
              <div className="space-y-3 bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-stone-200">Local Browser Persistence ($0 Cloud Cost)</p>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Your studio holds {booksCount} {booksCount === 1 ? "manuscript" : "manuscripts"} saved directly in browser storage with zero Firebase, Firestore, or Gemini billing.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-stone-200">Portable Local Backups</p>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Use Export Book anytime to download complete Print PDF, ePub, DOCX, or Markdown files directly to your computer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>Continue in Zero-Cost Local Mode</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Signed-In User Card */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-stone-950/70 border border-stone-800">
                <div className="flex items-center space-x-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "Author"}
                      className="w-11 h-11 rounded-full ring-2 ring-amber-500/40 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-base shrink-0">
                      {(currentUser.displayName || currentUser.email || "A")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-semibold text-stone-100 truncate">
                        {currentUser.displayName || "TomeCrafter Author"}
                      </p>
                      {currentUser.emailVerified && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-stone-400">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Studio Library</span>
                  </div>
                  <p className="text-lg font-semibold text-stone-100 tabular-nums">
                    {booksCount} {booksCount === 1 ? "Tome" : "Tomes"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-stone-400">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cloud Synced</span>
                  </div>
                  <p className="text-lg font-semibold text-emerald-300 tabular-nums">
                    {cloudSyncedCount} in Firestore
                  </p>
                </div>
              </div>

              {/* Author Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-3 border-t border-stone-800 pt-4">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Author Pen Name
                  </label>
                  <input
                    type="text"
                    value={penName}
                    onChange={(e) => setPenName(e.target.value)}
                    maxLength={120}
                    placeholder="Your pen name or imprint name"
                    className="w-full px-3.5 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Primary Genre Focus
                  </label>
                  <select
                    value={preferredGenre}
                    onChange={(e) => setPreferredGenre(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {savingProfile ? "Saving Profile..." : "Save Author Profile"}
                  </button>
                </div>
              </form>

              {/* Sync & Account Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-800 pt-4">
                <div className="flex items-center gap-2">
                  {onSyncAllToCloud && (
                    <button
                      onClick={handleManualSync}
                      disabled={isSyncingCloud}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-stone-200 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncingCloud ? "animate-spin" : ""}`} />
                      <span>{isSyncingCloud ? "Syncing..." : "Sync All Now"}</span>
                    </button>
                  )}
                  {onOpenGoogleDriveModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenGoogleDriveModal();
                      }}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-stone-200 transition-colors cursor-pointer"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                      <span>Drive Backup</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-xs font-medium text-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
