import React from "react";
import {
  BookOpen,
  LayoutGrid,
  Feather,
  Users,
  Compass,
  Sparkles,
  BookOpenCheck,
  Download,
  Plus,
  ChevronDown,
  Layers,
  Mic,
  Sliders,
  HardDrive,
  FolderOpen,
  Video,
  Radio,
  Share2,
  Globe,
  ShoppingBag,
  CreditCard,
  Zap,
  Settings,
  Headphones,
  Building2,
} from "lucide-react";
import { Book } from "../types";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { AutoSaveIndicator, SaveStatus } from "./AutoSaveIndicator";

export type ActiveTab =
  | "studio"
  | "outline"
  | "editor"
  | "dictation"
  | "audiobook"
  | "typography"
  | "social"
  | "website"
  | "store"
  | "subscription"
  | "council"
  | "codex"
  | "art"
  | "typesetting"
  | "publishing"
  | "testers"
  | "settings";

interface NavbarProps {
  books: Book[];
  activeBook: Book;
  activeTab: ActiveTab;
  onSelectBook: (bookId: string) => void;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewBookModal: () => void;
  onOpenProjectHub?: () => void;
  onOpenExportModal: () => void;
  onOpenGoogleDriveModal?: () => void;
  onOpenLandingPage?: () => void;
  onOpenAuthModal?: () => void;
  saveStatus?: SaveStatus;
  lastSavedTime?: string | null;
  isCloudSynced?: boolean;
  cloudSyncedCount?: number;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
  onManualSave?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  books,
  activeBook,
  activeTab,
  onSelectBook,
  onSelectTab,
  onOpenNewBookModal,
  onOpenProjectHub,
  onOpenExportModal,
  onOpenGoogleDriveModal,
  onOpenLandingPage,
  onOpenAuthModal,
  saveStatus = "saved",
  lastSavedTime = null,
  isCloudSynced = false,
  cloudSyncedCount = 0,
  autoSaveEnabled = false,
  onToggleAutoSave,
  onManualSave,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const totalWords = activeBook.chapters.reduce(
    (acc, ch) => acc + (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0
  );
  const targetWords = activeBook.targetWordCount || 50000;
  const progressPercent = Math.min(100, Math.round((totalWords / targetWords) * 100));

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "studio", label: "Publishing Studio", icon: <Building2 className="w-4 h-4" />, badge: "8 Depts" },
    { id: "outline", label: "Chapter Builder", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "editor", label: "Manuscript Studio", icon: <Feather className="w-4 h-4" /> },
    { id: "audiobook", label: "Audiobook Studio", icon: <Headphones className="w-4 h-4" />, badge: "Voice AI / Drive" },
    { id: "store", label: "Store & Merch", icon: <ShoppingBag className="w-4 h-4" />, badge: "Omega Pay" },
    { id: "subscription", label: "Plan & Quota", icon: <Zap className="w-4 h-4" />, badge: "50% Fund" },
    { id: "social", label: "Social Media Studio", icon: <Video className="w-4 h-4" />, badge: "Reels / TikTok" },
    { id: "dictation", label: "Voice Dictation", icon: <Mic className="w-4 h-4" />, badge: "Voice Mic" },
    { id: "typography", label: "Fonts & Formatting", icon: <Sliders className="w-4 h-4" />, badge: "Google Fonts" },
    { id: "council", label: "Realm Council", icon: <Users className="w-4 h-4" />, badge: "6 Masters" },
    { id: "codex", label: "World Codex", icon: <Compass className="w-4 h-4" /> },
    { id: "art", label: "Art & Covers", icon: <Sparkles className="w-4 h-4" /> },
    { id: "typesetting", label: "Typesetting", icon: <Layers className="w-4 h-4" /> },
    { id: "publishing", label: "Publishing Suite", icon: <BookOpenCheck className="w-4 h-4" />, badge: "KDP" },
    { id: "website", label: "Author Website", icon: <Globe className="w-4 h-4" />, badge: "Design Studio" },
    { id: "testers", label: "Tester Console", icon: <Radio className="w-4 h-4" />, badge: "CRM / Sandbox" },
    { id: "settings", label: "Studio Settings", icon: <Settings className="w-4 h-4" />, badge: "Protected" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 text-stone-100 shadow-md">
      {/* Top Bar: Brand, Book Selector, Global Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div
            onClick={onOpenLandingPage}
            className={`flex items-center space-x-3 shrink-0 ${onOpenLandingPage ? "cursor-pointer group" : ""}`}
            title={onOpenLandingPage ? "View TomeCrafter Studio Overview" : undefined}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 text-stone-950 font-serif font-bold text-xl group-hover:scale-105 transition-transform">
              𝔗
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-lg tracking-wide text-amber-400 group-hover:text-amber-300 transition-colors">
                  TomeCrafter
                </span>
                <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AI Studio
                </span>
              </div>
              <p className="text-xs text-stone-400 font-sans hidden md:block">
                Multi-Agent Literary Forge & Publishing Suite
              </p>
            </div>
          </div>

          {/* Book Switcher & Project Hub Button */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-800 border border-stone-700/80 text-stone-200 transition-all text-xs sm:text-sm font-medium max-w-[160px] sm:max-w-xs truncate"
              >
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{activeBook.title}</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl z-50 py-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Your Projects</span>
                      <span className="text-[10px] font-mono text-amber-400">{(books || []).length} Active</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {(books || []).map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            onSelectBook(b.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-stone-800 transition-colors ${
                            b.id === activeBook?.id
                              ? "bg-amber-500/10 text-amber-300 font-medium"
                              : "text-stone-300"
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="truncate font-serif">{b.title}</div>
                            <div className="text-[11px] text-stone-400 flex items-center space-x-1.5">
                              <span>{b.genre}</span>
                              <span>•</span>
                              <span>{(b.chapters || []).length} Ch.</span>
                            </div>
                          </div>
                          {b.id === activeBook?.id && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-stone-800 mt-2 pt-2 px-2 space-y-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenProjectHub) onOpenProjectHub();
                          else onOpenNewBookModal();
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors border border-amber-500/30"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Open Project Hub & Library</span>
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenNewBookModal();
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Project</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Project Hub Button */}
            {onOpenProjectHub && (
              <button
                onClick={onOpenProjectHub}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs font-medium transition-colors"
                title="Manage and reference all book projects"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Projects</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-900 text-amber-300">
                  {books.length}
                </span>
              </button>
            )}
          </div>

          {/* Actions & Integration Center */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Save Status & Auto-Save Toggle */}
            <AutoSaveIndicator
              status={saveStatus}
              lastSavedTime={lastSavedTime}
              isCloudSynced={isCloudSynced}
              autoSaveEnabled={autoSaveEnabled}
              onToggleAutoSave={onToggleAutoSave}
              onManualSave={onManualSave}
              compact={true}
            />

            {/* Landing Page Overview Link */}
            {onOpenLandingPage && (
              <button
                onClick={onOpenLandingPage}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs font-medium transition-colors"
                title="View TomeCrafter Studio Overview"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Overview</span>
              </button>
            )}

            {/* Google Drive Sync Button */}
            {onOpenGoogleDriveModal && (
              <button
                onClick={onOpenGoogleDriveModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-600/40 text-xs font-medium transition-colors"
                title="Save & Sync with Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Drive</span>
              </button>
            )}

            {/* Google Auth Sign Up / In */}
            <GoogleAuthButton
              onDriveClick={onOpenGoogleDriveModal}
              onOpenAuthModal={onOpenAuthModal}
              cloudSyncedCount={cloudSyncedCount}
            />

            {/* Export Button */}
            <button
              onClick={onOpenExportModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-colors"
              title="Export Manuscript & Typeset Package"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-stone-950/80 border-t border-stone-800/60 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 border border-transparent"
                }`}
              >
                <span className={isActive ? "text-amber-400" : "text-stone-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase ${
                      isActive
                        ? "bg-amber-400 text-stone-950 font-bold"
                        : "bg-stone-800 text-stone-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
