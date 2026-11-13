import React, { useState, useEffect } from "react";
import { LogIn, LogOut, Cloud, ChevronDown, User as UserIcon, HardDrive, ShieldCheck } from "lucide-react";
import { logOut, onAuthUserChanged } from "../services/firebase";
import { User as FirebaseUser } from "firebase/auth";

interface GoogleAuthButtonProps {
  onDriveClick?: () => void;
  onOpenAuthModal?: () => void;
  cloudSyncedCount?: number;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onDriveClick,
  onOpenAuthModal,
  cloudSyncedCount = 0,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthUserChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setShowDropdown(false);
    await logOut();
  };

  if (user) {
    return (
      <div className="relative shrink-0">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-stone-800/80 border border-stone-700 hover:border-amber-500/50 transition-all text-xs text-stone-200 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "User"}
              className="w-5 h-5 rounded-full ring-1 ring-amber-500/40 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
              {user.displayName ? user.displayName[0] : "U"}
            </div>
          )}
          <span className="font-medium hidden sm:inline max-w-[110px] truncate">
            {user.displayName || user.email?.split("@")[0]}
          </span>
          <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-3 z-50 text-xs space-y-2.5">
              <div className="border-b border-stone-800 pb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-stone-200 truncate">{user.displayName || "Author"}</p>
                  {user.emailVerified && (
                    <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
              </div>

              <div className="space-y-1 text-stone-300">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 text-[11px]">
                  <span className="flex items-center space-x-1.5">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Firestore Sync</span>
                  </span>
                  <span className="font-mono tabular-nums text-emerald-400">
                    {cloudSyncedCount} {cloudSyncedCount === 1 ? "book" : "books"}
                  </span>
                </div>

                {onOpenAuthModal && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onOpenAuthModal();
                    }}
                    className="w-full flex items-center space-x-2 text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-800 text-stone-200 transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Account &amp; Cloud Sync</span>
                  </button>
                )}

                {onDriveClick && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onDriveClick();
                    }}
                    className="w-full flex items-center space-x-2 text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-800 text-stone-200 transition-colors cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                    <span>Google Drive Sync</span>
                  </button>
                )}
              </div>

              <div className="border-t border-stone-800 pt-1.5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onOpenAuthModal}
      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
      title="Sign in to sync manuscripts across devices"
    >
      <LogIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Sign In</span>
    </button>
  );
};
