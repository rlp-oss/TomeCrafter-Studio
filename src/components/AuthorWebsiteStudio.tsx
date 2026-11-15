import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Layout,
  Palette,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Download,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  RefreshCw,
  Share2,
  Save,
  BookOpen,
  Mail,
  ShoppingBag,
  Send,
  Star,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Video,
  Camera,
  Crown,
  Gift,
  Feather,
  Grid,
  Info,
  Code,
  ShieldCheck,
} from "lucide-react";
import {
  AuthorWebsiteConfig,
  AuthorWebsiteGenrePreset,
  AuthorWebsiteLayout,
  MajorAuthorPlatformKey,
  MajorAuthorPlatform,
  Book,
  AuthorWebsiteReview,
  AuthorWebsiteEvent,
} from "../types";
import {
  DEFAULT_MAJOR_PLATFORMS,
  GENRE_PRESET_STYLES,
  PRESET_LAYOUTS,
  generateDefaultAuthorWebsite,
  generateStandaloneHtml,
} from "../utils/authorWebsitePresets";
import { apiService } from "../services/api";

interface AuthorWebsiteStudioProps {
  book: Book;
  onUpdateBook?: (updatedBook: Book) => void;
}

type StudioTab = "platforms" | "presets" | "content" | "styling" | "ai_prompt" | "code_export";
type ViewportMode = "desktop" | "tablet" | "mobile";

const buildBookSyncedWebsiteConfig = (targetBook: Book): AuthorWebsiteConfig => {
  const defaults = generateDefaultAuthorWebsite(targetBook);
  const saved = localStorage.getItem(`author_website_${targetBook.id}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...defaults,
        ...parsed,
        showPublisherBox: parsed.showPublisherBox ?? true,
        publisherName:
          parsed.publisherName ||
          targetBook.publishingKit?.publisherImprint ||
          defaults.publisherName,
        publisherLocation:
          parsed.publisherLocation || defaults.publisherLocation,
        publisherWebsiteUrl:
          parsed.publisherWebsiteUrl || defaults.publisherWebsiteUrl,
        publisherTagline:
          parsed.publisherTagline || defaults.publisherTagline,
        publisherIsbn:
          parsed.publisherIsbn ??
          targetBook.publishingKit?.isbn ??
          defaults.publisherIsbn,
      };
    } catch {
      // fallback to defaults
    }
  }
  return defaults;
};

export const AuthorWebsiteStudio: React.FC<AuthorWebsiteStudioProps> = ({
  book,
  onUpdateBook,
}) => {
  // Website configuration state
  const [config, setConfig] = useState<AuthorWebsiteConfig>(() =>
    buildBookSyncedWebsiteConfig(book)
  );

  // UI state
  const [activeTab, setActiveTab] = useState<StudioTab>("platforms");
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>(new Date().toLocaleTimeString());
  const hasMountedRef = useRef(false);
  const skipNextUnsavedRef = useRef(false);

  // Copy feedback states
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [statusToast, setStatusToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // AI Prompt State
  const [aiPromptText, setAiPromptText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Platform category filter
  const [platformCategoryFilter, setPlatformCategoryFilter] = useState<string>("all");
  const [platformSearch, setPlatformSearch] = useState("");

  // Paste JSON modal state
  const [isPasteJsonOpen, setIsPasteJsonOpen] = useState(false);
  const [pasteJsonInput, setPasteJsonInput] = useState("");

  // Live Iframe preview ref
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const prevBookIdRef = useRef<string>(book.id);

  // Sync website config when active book changes
  useEffect(() => {
    if (prevBookIdRef.current !== book.id) {
      prevBookIdRef.current = book.id;
      skipNextUnsavedRef.current = true;
      setConfig(buildBookSyncedWebsiteConfig(book));
      setSaveStatus("saved");
    }
  }, [book]);

  // Track edits as unsaved rather than firing continuous auto-save writes
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (skipNextUnsavedRef.current) {
      skipNextUnsavedRef.current = false;
      return;
    }
    setSaveStatus("unsaved");
  }, [config]);

  const handleManualSaveWebsite = async () => {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      localStorage.setItem(`author_website_${book.id}`, JSON.stringify(config));
    } catch (storageErr) {
      console.warn("Unable to cache author website locally:", storageErr);
    }

    try {
      const response = await apiService.saveAuthorWebsite(book.id, config);
      if (response?.config) {
        skipNextUnsavedRef.current = true;
        setConfig(response.config);
        try {
          localStorage.setItem(`author_website_${book.id}`, JSON.stringify(response.config));
        } catch {
          // Non-fatal if localStorage quota is exceeded after server save succeeded
        }
      }
      setSaveStatus("saved");
      setLastSavedTime(new Date().toLocaleTimeString());
      showToast("Author website configuration saved.");
    } catch (err: any) {
      console.error("Failed to save author website configuration:", err);
      setSaveStatus("unsaved");
      showToast(err?.message || "Failed to save author website to server.", "error");
    }
  };

  // Sync Publisher Imprint & Official Author Bio straight into Active Book Front/Back Matter
  const handleSyncPublisherAndBioToBook = () => {
    if (!onUpdateBook) {
      showToast("Book state sync is unavailable here.", "error");
      return;
    }
    const formattedImprint = [
      config.publisherName?.trim() || "Rhythm Logic Publishing",
      config.publisherLocation?.trim() || "",
    ]
      .filter(Boolean)
      .join(" • ");

    onUpdateBook({
      ...book,
      author: config.authorName?.trim() || book.author,
      publishingKit: {
        ...book.publishingKit,
        publisherImprint: formattedImprint,
        isbn: config.publisherIsbn?.trim() || book.publishingKit?.isbn,
      },
      formattingSettings: {
        ...book.formattingSettings,
        authorBio: config.bio?.trim() || book.formattingSettings?.authorBio || "",
        newsletterLink:
          config.publisherWebsiteUrl?.trim() ||
          book.formattingSettings?.newsletterLink ||
          "",
      },
      updatedAt: new Date().toISOString(),
    });
    showToast(
      `Synced "${formattedImprint}" & Author Bio to "${book.title}" front/back matter.`
    );
  };

  // Update preview iframe content whenever config changes
  useEffect(() => {
    if (iframeRef.current) {
      const html = generateStandaloneHtml(config);
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [config, viewportMode]);

  // Show temporary status toast
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setStatusToast({ message, type });
    setTimeout(() => setStatusToast(null), 4000);
  };

  // Switch Genre Preset
  const handleApplyGenrePreset = (presetKey: AuthorWebsiteGenrePreset) => {
    const preset = GENRE_PRESET_STYLES[presetKey];
    if (!preset) return;

    setConfig((prev) => ({
      ...prev,
      genrePreset: presetKey,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      cardBackgroundColor: preset.cardBackgroundColor,
      textColor: preset.textColor,
      textMutedColor: preset.textMutedColor,
      fontHeading: preset.fontHeading,
      fontBody: preset.fontBody,
      borderRadius: preset.borderRadius,
    }));

    showToast(`Applied "${preset.name}" styling preset!`);
  };

  // Switch Layout
  const handleApplyLayout = (layoutKey: AuthorWebsiteLayout) => {
    setConfig((prev) => ({ ...prev, layout: layoutKey }));
    showToast(`Layout changed to "${PRESET_LAYOUTS.find((l) => l.id === layoutKey)?.name}"!`);
  };

  // Toggle or update platform URL
  const handleUpdatePlatformUrl = (key: MajorAuthorPlatformKey, url: string) => {
    setConfig((prev) => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: {
          ...prev.platforms[key],
          authorUrl: url,
          enabled: Boolean(url.trim() || prev.platforms[key].enabled),
        },
      },
    }));
  };

  const handleTogglePlatformEnabled = (key: MajorAuthorPlatformKey) => {
    setConfig((prev) => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: {
          ...prev.platforms[key],
          enabled: !prev.platforms[key].enabled,
        },
      },
    }));
  };

  // Handle Edit with AI Prompt
  const handleRunAiPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPromptText.trim()) {
      showToast("Please enter an AI prompt instruction.", "error");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await apiService.aiEditAuthorWebsite({
        currentConfig: config,
        userPrompt: aiPromptText,
        bookContext: book,
      });

      if (response.success && response.config) {
        setConfig(response.config);
        showToast(response.aiSummary || "Website updated with AI prompt!");
        setAiPromptText("");
      }
    } catch (err: any) {
      console.error("AI edit error:", err);
      showToast(err.message || "Failed to update with AI.", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy Full HTML Code
  const handleCopyHtml = () => {
    const html = generateStandaloneHtml(config);
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    showToast("Full Standalone HTML copied to clipboard!");
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  // Download standalone HTML file
  const handleDownloadHtml = () => {
    const html = generateStandaloneHtml(config);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.authorName.toLowerCase().replace(/\s+/g, "-")}-official-website.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded standalone website file!");
  };

  // Copy JSON Configuration
  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    showToast("Configuration JSON copied to clipboard!");
    setTimeout(() => setCopiedJson(false), 2500);
  };

  // Paste JSON Configuration
  const handleApplyPastedJson = () => {
    try {
      const parsed = JSON.parse(pasteJsonInput);
      if (!parsed.authorName || !parsed.featuredBook) {
        throw new Error("Invalid author website configuration format.");
      }
      setConfig(parsed);
      setIsPasteJsonOpen(false);
      setPasteJsonInput("");
      showToast("Custom JSON configuration loaded successfully!");
    } catch (err: any) {
      showToast(err.message || "Invalid JSON syntax.", "error");
    }
  };

  // Add new Review
  const handleAddReview = () => {
    const newRev: AuthorWebsiteReview = {
      id: `rev-${Date.now()}`,
      reviewerName: "Book Reviewer",
      reviewerTitle: "Literary Critic",
      rating: 5,
      quote: "An extraordinary read that keeps you on the edge of your seat.",
      source: "Review",
    };
    setConfig((prev) => ({ ...prev, reviews: [...prev.reviews, newRev] }));
  };

  // Delete review
  const handleDeleteReview = (id: string) => {
    setConfig((prev) => ({ ...prev, reviews: prev.reviews.filter((r) => r.id !== id) }));
  };

  // Add new Event
  const handleAddEvent = () => {
    const newEv: AuthorWebsiteEvent = {
      id: `ev-${Date.now()}`,
      title: "Author Book Signing & Q&A",
      date: "Upcoming • TBA",
      location: "Virtual & In-Person",
      isVirtual: true,
    };
    setConfig((prev) => ({ ...prev, events: [...prev.events, newEv] }));
  };

  const handleDeleteEvent = (id: string) => {
    setConfig((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) }));
  };

  // Filtered platforms list
  const allPlatformsList = Object.values(config.platforms) as MajorAuthorPlatform[];
  const platformsArray = allPlatformsList.filter((p: MajorAuthorPlatform) => {
    const matchesCategory =
      platformCategoryFilter === "all" || p.category.toLowerCase().includes(platformCategoryFilter.toLowerCase());
    const matchesSearch =
      p.name.toLowerCase().includes(platformSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(platformSearch.toLowerCase()) ||
      (p.notes || "").toLowerCase().includes(platformSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const enabledPlatformsCount = allPlatformsList.filter((p: MajorAuthorPlatform) => p.enabled && p.authorUrl).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-950 text-stone-100 flex flex-col">
      {/* ===================================================================== */}
      {/* TOP CONTROLS & HEADER BAR */}
      {/* ===================================================================== */}
      <div className="bg-stone-900/95 border-b border-stone-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-orange-950/40">
            <Globe className="w-5 h-5 text-stone-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-serif font-bold text-stone-100">
                Official Author Website Studio
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live Design Engine
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-stone-400">
              <span>{config.authorName}</span>
              <span>•</span>
              <span className="text-amber-400 capitalize">{config.genrePreset.replace("_", " ")}</span>
              <span>•</span>
              <span className="flex items-center space-x-1 font-mono text-[11px] text-stone-400">
                <CheckCircle2 className={`w-3 h-3 ${saveStatus === "unsaved" ? "text-amber-400" : "text-emerald-400"}`} />
                <span>
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "unsaved"
                    ? "Unsaved changes"
                    : `Saved ${lastSavedTime}`}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Viewport Switcher & Actions */}
        <div className="flex items-center space-x-2 flex-wrap justify-end">
          {/* Device viewport toggle */}
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setViewportMode("desktop")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === "desktop" ? "bg-stone-800 text-amber-300" : "text-stone-500 hover:text-stone-300"
              }`}
              title="Desktop View (1200px)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode("tablet")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === "tablet" ? "bg-stone-800 text-amber-300" : "text-stone-500 hover:text-stone-300"
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode("mobile")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === "mobile" ? "bg-stone-800 text-amber-300" : "text-stone-500 hover:text-stone-300"
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Manual Save & Quick Copy / Download Buttons */}
          <button
            onClick={handleManualSaveWebsite}
            disabled={saveStatus === "saving"}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${
              saveStatus === "unsaved"
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40"
                : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700"
            }`}
            title="Save website configuration"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>{saveStatus === "saving" ? "Saving..." : saveStatus === "unsaved" ? "Save Changes" : "Save Site"}</span>
          </button>

          <button
            onClick={handleCopyHtml}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-all cursor-pointer"
            title="Copy Standalone HTML code to clipboard"
          >
            {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedHtml ? "HTML Copied!" : "Copy HTML"}</span>
          </button>

          <button
            onClick={handleDownloadHtml}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold text-xs transition-all shadow-md cursor-pointer"
            title="Download index.html standalone package"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Site</span>
          </button>

          <button
            onClick={() => setIsFullscreenPreview(true)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors"
            title="Fullscreen Live Preview"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {statusToast && (
        <div
          className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-b ${
            statusToast.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusToast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusToast.message}</span>
          </div>
          <button onClick={() => setStatusToast(null)} className="text-stone-400 hover:text-stone-200">
            Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAIN STUDIO WORKSPACE (TWO PANELS: DESIGN SUITE & LIVE PREVIEW) */}
      {/* ===================================================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* LEFT PANEL: CONFIGURATION & DESIGN TOOLS (5 cols) */}
        <div className="lg:col-span-5 border-r border-stone-800 bg-stone-900/60 flex flex-col h-full overflow-hidden">
          
          {/* Sub Navigation Tabs */}
          <div className="flex items-center space-x-1 p-2 bg-stone-950 border-b border-stone-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab("platforms")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "platforms"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Major Platforms ({enabledPlatformsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("presets")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "presets"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Layout className="w-3.5 h-3.5 text-amber-400" />
              <span>Genre Presets</span>
            </button>

            <button
              onClick={() => setActiveTab("content")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "content"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Content & Bio</span>
            </button>

            <button
              onClick={() => setActiveTab("styling")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "styling"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Styling & Colors</span>
            </button>

            <button
              onClick={() => setActiveTab("ai_prompt")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "ai_prompt"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-stone-950 font-bold shadow"
                  : "text-cyan-400 hover:text-cyan-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Edit with AI</span>
            </button>

            <button
              onClick={() => setActiveTab("code_export")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "code_export"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Code className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Code</span>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            
            {/* ================================================================= */}
            {/* TAB 1: MAJOR AUTHOR PLATFORMS & SIGN-UP MENU */}
            {/* ================================================================= */}
            {activeTab === "platforms" && (
              <div className="space-y-4">
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                      <ShoppingBag className="w-4 h-4" />
                      <span>Major Author Links & Sign-Up Portals</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {enabledPlatformsCount} Attached
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Direct access to official sign-up pages for major author ecosystems (Substack, Amazon Author Central, Goodreads, BookBub, TikTok, etc.). Attach your links to display them automatically on your website.
                  </p>

                  {/* Filter & Search Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Search platforms (e.g. Substack, Amazon, TikTok)..."
                      value={platformSearch}
                      onChange={(e) => setPlatformSearch(e.target.value)}
                      className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />

                    <select
                      value={platformCategoryFilter}
                      onChange={(e) => setPlatformCategoryFilter(e.target.value)}
                      className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">All Categories</option>
                      <option value="Retailers">Retailers & Profiles</option>
                      <option value="Newsletters">Newsletters & VIP</option>
                      <option value="Audio">Audio & Podcasts</option>
                      <option value="Social">Social & Video</option>
                      <option value="Community">Community & Guild</option>
                    </select>
                  </div>
                </div>

                {/* Platforms List */}
                <div className="space-y-3">
                  {platformsArray.map((p) => (
                    <div
                      key={p.key}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                        p.enabled && p.authorUrl
                          ? "bg-stone-900/90 border-amber-500/40 shadow-sm"
                          : "bg-stone-900/40 border-stone-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 text-amber-400">
                            {p.key === "amazon_author" && <ShoppingBag className="w-4 h-4" />}
                            {p.key === "goodreads" && <BookOpen className="w-4 h-4" />}
                            {p.key === "substack" && <Mail className="w-4 h-4" />}
                            {p.key === "tiktok" && <Video className="w-4 h-4" />}
                            {p.key === "instagram" && <Camera className="w-4 h-4" />}
                            {p.key === "patreon" && <Crown className="w-4 h-4" />}
                            {p.key === "bookfunnel" && <Gift className="w-4 h-4" />}
                            {p.key === "spotify" && <Share2 className="w-4 h-4" />}
                            {!["amazon_author", "goodreads", "substack", "tiktok", "instagram", "patreon", "bookfunnel", "spotify"].includes(p.key) && (
                              <Globe className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-stone-100 flex items-center space-x-2">
                              <span>{p.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-400">
                                {p.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-400">{p.notes}</div>
                          </div>
                        </div>

                        {/* 1-Click Official Portal Button */}
                        <a
                          href={p.officialSignUpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 text-amber-300 border border-stone-800 text-[11px] font-medium transition-colors shrink-0"
                          title="Open official sign-up / login portal in new tab"
                        >
                          <span>Sign Up / Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Attach URL Input & Toggle */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="url"
                          placeholder={p.placeholder}
                          value={p.authorUrl}
                          onChange={(e) => handleUpdatePlatformUrl(p.key, e.target.value)}
                          className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleTogglePlatformEnabled(p.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            p.enabled
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-stone-950 text-stone-500 border-stone-800 hover:text-stone-300"
                          }`}
                        >
                          {p.enabled ? "Active" : "Hidden"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 2: PRESET AUTHOR GENRE STYLES & LAYOUTS */}
            {/* ================================================================= */}
            {activeTab === "presets" && (
              <div className="space-y-5">
                {/* Genre Presets Grid */}
                <div className="space-y-3">
                  <div className="border-b border-stone-800 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Preset Genre Styles (Instant Re-Theming)
                    </span>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Preformatted color schemes, typography pairings, and layout vibes for major publishing genres.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(GENRE_PRESET_STYLES).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyGenrePreset(preset.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          config.genrePreset === preset.id
                            ? "bg-stone-900 border-amber-500 ring-2 ring-amber-500/40 shadow-lg"
                            : "bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-stone-100">{preset.name}</span>
                            {config.genrePreset === preset.id && (
                              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-amber-400/90">{preset.genreTag}</div>
                          <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">
                            {preset.description}
                          </p>
                        </div>

                        {/* Color Swatch Preview */}
                        <div className="flex items-center space-x-1.5 pt-3 mt-2 border-t border-stone-800/80">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-stone-700"
                            style={{ backgroundColor: preset.primaryColor }}
                            title="Primary Color"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-stone-700"
                            style={{ backgroundColor: preset.secondaryColor }}
                            title="Secondary Color"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-stone-700"
                            style={{ backgroundColor: preset.backgroundColor }}
                            title="Background Color"
                          />
                          <span className="text-[10px] font-mono text-stone-500 pl-1">
                            {preset.fontHeading.split(",")[0].replace(/'/g, "")}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset Layouts Grid */}
                <div className="space-y-3 pt-3 border-t border-stone-800">
                  <div className="border-b border-stone-800 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Preset Structural Layouts
                    </span>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Choose the overarching conversion layout for your official author page.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {PRESET_LAYOUTS.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => handleApplyLayout(layout.id)}
                        className={`w-full p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                          config.layout === layout.id
                            ? "bg-amber-500/15 border-amber-500/60 text-amber-200"
                            : "bg-stone-900/60 border-stone-800 text-stone-300 hover:border-stone-700"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-xs flex items-center space-x-2 text-stone-100">
                            {layout.iconName === "Layout" && <Layout className="w-3.5 h-3.5 text-amber-400" />}
                            {layout.iconName === "BookOpen" && <BookOpen className="w-3.5 h-3.5 text-amber-400" />}
                            {layout.iconName === "Gift" && <Gift className="w-3.5 h-3.5 text-amber-400" />}
                            {layout.iconName === "Feather" && <Feather className="w-3.5 h-3.5 text-amber-400" />}
                            {layout.iconName === "Grid" && <Grid className="w-3.5 h-3.5 text-amber-400" />}
                            <span>{layout.name}</span>
                          </div>
                          <div className="text-[11px] text-stone-400">{layout.description}</div>
                        </div>
                        {config.layout === layout.id && <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 3: CONTENT & BIO CUSTOMIZER */}
            {/* ================================================================= */}
            {activeTab === "content" && (
              <div className="space-y-5">
                {/* Author Info */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Author Identity & Bio
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Author Pen Name *</label>
                    <input
                      type="text"
                      value={config.authorName}
                      onChange={(e) => setConfig((prev) => ({ ...prev, authorName: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Tagline / Subtitle *</label>
                    <input
                      type="text"
                      value={config.tagline}
                      onChange={(e) => setConfig((prev) => ({ ...prev, tagline: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Official Biography *</label>
                    <textarea
                      rows={4}
                      value={config.bio}
                      onChange={(e) => setConfig((prev) => ({ ...prev, bio: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-300 font-medium">Author Photo URL</label>
                      <input
                        type="url"
                        value={config.authorPhotoUrl || ""}
                        onChange={(e) => setConfig((prev) => ({ ...prev, authorPhotoUrl: e.target.value }))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-300 font-medium">Location / Base</label>
                      <input
                        type="text"
                        value={config.location || ""}
                        onChange={(e) => setConfig((prev) => ({ ...prev, location: e.target.value }))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Publisher & Imprint Box */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Publisher &amp; Imprint Box
                    </span>
                    <label className="flex items-center space-x-2 text-xs text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showPublisherBox !== false}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            showPublisherBox: e.target.checked,
                          }))
                        }
                        className="w-3.5 h-3.5 text-amber-500 rounded bg-stone-950 border-stone-700"
                      />
                      <span>Show on Page</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">
                      Publisher / Imprint Name *
                    </label>
                    <input
                      type="text"
                      value={config.publisherName || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          publisherName: e.target.value,
                        }))
                      }
                      placeholder="Rhythm Logic Publishing"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-300 font-medium">
                        Publisher Location
                      </label>
                      <input
                        type="text"
                        value={config.publisherLocation || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            publisherLocation: e.target.value,
                          }))
                        }
                        placeholder="Red Deer, Alberta, Canada"
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-300 font-medium">
                        Edition ISBN
                      </label>
                      <input
                        type="text"
                        value={config.publisherIsbn || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            publisherIsbn: e.target.value,
                          }))
                        }
                        placeholder="978-1-..."
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">
                      Publisher Website URL
                    </label>
                    <input
                      type="url"
                      value={config.publisherWebsiteUrl || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          publisherWebsiteUrl: e.target.value,
                        }))
                      }
                      placeholder="https://rhythmlogicpublishing.com"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">
                      Imprint Statement / Tagline
                    </label>
                    <textarea
                      rows={2}
                      value={config.publisherTagline || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          publisherTagline: e.target.value,
                        }))
                      }
                      placeholder="Independent Publishing Imprint · Registered Edition & Provenance Catalog"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {onUpdateBook && (
                    <button
                      type="button"
                      onClick={handleSyncPublisherAndBioToBook}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sync Publisher Imprint &amp; Author Bio to Book Export</span>
                    </button>
                  )}
                </div>

                {/* Hero Section Copy */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Hero Section Headlines & CTAs
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Hero Main Headline *</label>
                    <input
                      type="text"
                      value={config.heroHeadline}
                      onChange={(e) => setConfig((prev) => ({ ...prev, heroHeadline: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Hero Subtitle / Hook *</label>
                    <textarea
                      rows={2}
                      value={config.heroSubtitle}
                      onChange={(e) => setConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-300 font-medium">Primary CTA Button</label>
                      <input
                        type="text"
                        value={config.heroCtaText}
                        onChange={(e) => setConfig((prev) => ({ ...prev, heroCtaText: e.target.value }))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-stone-300 font-medium">Secondary CTA Button</label>
                      <input
                        type="text"
                        value={config.heroSecondaryCtaText}
                        onChange={(e) => setConfig((prev) => ({ ...prev, heroSecondaryCtaText: e.target.value }))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Featured Book Details */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Featured Book Showcase & Sample Excerpt
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Book Title *</label>
                    <input
                      type="text"
                      value={config.featuredBook.title}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          featuredBook: { ...prev.featuredBook, title: e.target.value },
                        }))
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Book Cover Image URL</label>
                    <input
                      type="url"
                      value={config.featuredBook.coverUrl || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          featuredBook: { ...prev.featuredBook, coverUrl: e.target.value },
                        }))
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Synopsis *</label>
                    <textarea
                      rows={3}
                      value={config.featuredBook.synopsis}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          featuredBook: { ...prev.featuredBook, synopsis: e.target.value },
                        }))
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Sample Chapter Excerpt</label>
                    <textarea
                      rows={3}
                      value={config.featuredBook.sampleChapterExcerpt || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          featuredBook: { ...prev.featuredBook, sampleChapterExcerpt: e.target.value },
                        }))
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                    />
                  </div>
                </div>

                {/* VIP Newsletter Lead Magnet */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    VIP Reader Guild & Lead Magnet Offer
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Newsletter Headline</label>
                    <input
                      type="text"
                      value={config.newsletterHeadline}
                      onChange={(e) => setConfig((prev) => ({ ...prev, newsletterHeadline: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Lead Magnet Title (Free Novella / Bonus)</label>
                    <input
                      type="text"
                      value={config.newsletterLeadMagnetTitle}
                      onChange={(e) => setConfig((prev) => ({ ...prev, newsletterLeadMagnetTitle: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Button Text</label>
                    <input
                      type="text"
                      value={config.newsletterButtonText}
                      onChange={(e) => setConfig((prev) => ({ ...prev, newsletterButtonText: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                    />
                  </div>
                </div>

                {/* Reviews Manager */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Critical Reviews ({config.reviews.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddReview}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Review</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {config.reviews.map((rev) => (
                      <div key={rev.id} className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={rev.reviewerName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setConfig((prev) => ({
                                ...prev,
                                reviews: prev.reviews.map((r) => (r.id === rev.id ? { ...r, reviewerName: val } : r)),
                              }));
                            }}
                            className="bg-stone-900 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 font-semibold"
                            placeholder="Reviewer Name"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1 text-stone-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={rev.quote}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfig((prev) => ({
                              ...prev,
                              reviews: prev.reviews.map((r) => (r.id === rev.id ? { ...r, quote: val } : r)),
                            }));
                          }}
                          className="w-full bg-stone-900 border border-stone-800 rounded px-2 py-1 text-xs text-stone-300 italic"
                          placeholder="Review quote..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 4: STYLING & COLORS */}
            {/* ================================================================= */}
            {activeTab === "styling" && (
              <div className="space-y-5">
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Color Palette Studio
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-stone-400 font-medium">Primary Accent</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.primaryColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs font-mono text-stone-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-stone-400 font-medium">Secondary Accent</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.secondaryColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                          className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs font-mono text-stone-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-stone-400 font-medium">Background Color</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={config.backgroundColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                          className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.backgroundColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                          className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs font-mono text-stone-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-stone-400 font-medium">Card Background</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={config.cardBackgroundColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, cardBackgroundColor: e.target.value }))}
                          className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.cardBackgroundColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, cardBackgroundColor: e.target.value }))}
                          className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs font-mono text-stone-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Typography & Border Radius */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Typography & Geometry
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Heading Font Family</label>
                    <input
                      type="text"
                      value={config.fontHeading}
                      onChange={(e) => setConfig((prev) => ({ ...prev, fontHeading: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Body Font Family</label>
                    <input
                      type="text"
                      value={config.fontBody}
                      onChange={(e) => setConfig((prev) => ({ ...prev, fontBody: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-300 font-medium">Corner Geometry (Radius)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["sharp", "subtle", "rounded", "pill"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, borderRadius: r }))}
                          className={`py-2 px-2 rounded-xl text-xs font-mono capitalize border transition-all ${
                            config.borderRadius === r
                              ? "bg-amber-500/20 text-amber-300 border-amber-500"
                              : "bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Module Visibility Toggles */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Section Visibility Controls
                  </span>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 cursor-pointer">
                      <span>Certified Human Author Ethical Pledge Badge</span>
                      <input
                        type="checkbox"
                        checked={config.showEthicalAiBadge}
                        onChange={(e) => setConfig((prev) => ({ ...prev, showEthicalAiBadge: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 rounded bg-stone-900 border-stone-700"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 cursor-pointer">
                      <span>Praise & Critical Reviews Section</span>
                      <input
                        type="checkbox"
                        checked={config.showReviews}
                        onChange={(e) => setConfig((prev) => ({ ...prev, showReviews: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 rounded bg-stone-900 border-stone-700"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 cursor-pointer">
                      <span>Upcoming Events & Virtual Signings</span>
                      <input
                        type="checkbox"
                        checked={config.showUpcomingEvents}
                        onChange={(e) => setConfig((prev) => ({ ...prev, showUpcomingEvents: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 rounded bg-stone-900 border-stone-700"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 cursor-pointer">
                      <span>Press Kit & Media Downloads</span>
                      <input
                        type="checkbox"
                        checked={config.showMediaKit}
                        onChange={(e) => setConfig((prev) => ({ ...prev, showMediaKit: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 rounded bg-stone-900 border-stone-700"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 cursor-pointer">
                      <span>Publisher &amp; Imprint Box</span>
                      <input
                        type="checkbox"
                        checked={config.showPublisherBox !== false}
                        onChange={(e) => setConfig((prev) => ({ ...prev, showPublisherBox: e.target.checked }))}
                        className="w-4 h-4 text-amber-500 rounded bg-stone-900 border-stone-700"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 5: EDIT WITH AI PROMPT */}
            {/* ================================================================= */}
            {activeTab === "ai_prompt" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-cyan-950/40 via-blue-950/20 to-stone-900 border border-cyan-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center space-x-2 border-b border-cyan-500/20 pb-3">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="font-serif font-bold text-sm text-cyan-200">
                        AI Website Prompt Studio
                      </h3>
                      <p className="text-xs text-stone-400">
                        Describe any aesthetic, tone, copy changes, or thematic transformations. Gemini 2.5 will update the entire website schema instantly.
                      </p>
                    </div>
                  </div>

                  {/* Prompt Form */}
                  <form onSubmit={handleRunAiPrompt} className="space-y-3">
                    <textarea
                      rows={4}
                      placeholder="e.g. Transform this page into a haunting dark gothic aesthetic with crimson embers. Rewrite the hero headline and bio to appeal to fans of Leigh Bardugo and dark academia..."
                      value={aiPromptText}
                      onChange={(e) => setAiPromptText(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-cyan-400 font-sans"
                    />

                    <button
                      type="submit"
                      disabled={isAiLoading || !aiPromptText.trim()}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:to-blue-600 text-stone-950 font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isAiLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Gemini is Transforming Your Website...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Execute AI Prompt Transformation</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Preset AI Prompt Chips */}
                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <span className="text-[11px] font-mono text-stone-400">Quick Prompt Inspirations:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Make the hero copy punchier for an epic high-stakes fantasy launch",
                        "Adopt a cozy romance tone with pastel rose styling and playful bio",
                        "Re-theme into high-tech cyberpunk sci-fi with neon cyan accents",
                        "Refine for a prestigious literary fiction author with minimalist editorial tone",
                        "Update the lead magnet offer to give away a free 3-chapter audio prequel",
                        "Craft 3 glowing reviews from fictional New York Times & BookTok critics",
                      ].map((promptIdea, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAiPromptText(promptIdea)}
                          className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 text-[11px] text-stone-300 border border-stone-800 hover:border-cyan-500/50 transition-colors text-left"
                        >
                          ✦ {promptIdea}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 6: CODE EXPORT & JSON TEMPLATES */}
            {/* ================================================================= */}
            {activeTab === "code_export" && (
              <div className="space-y-4">
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="border-b border-stone-800 pb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                      <Code className="w-4 h-4" />
                      <span>Ready-to-Deploy Code & Templates</span>
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 leading-relaxed">
                    Your website is generated as a standalone, zero-dependency HTML file with responsive Tailwind styling, Google Fonts, and mobile menus. Deploy in 10 seconds to Netlify, Vercel, GitHub Pages, or embed into WordPress / Squarespace.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>{copiedHtml ? "HTML Copied!" : "1-Click Copy HTML"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadHtml}
                      className="p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Download index.html</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4 text-cyan-400" />
                      <span>{copiedJson ? "JSON Copied!" : "Copy Config JSON"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPasteJsonOpen(true)}
                      className="p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Paste / Load JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT PANEL: LIVE RESPONSIVE PREVIEW (7 cols) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-7 bg-stone-950 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto relative">
          
          {/* Viewport Dimension Header */}
          <div className="w-full flex items-center justify-between pb-3 text-xs text-stone-400 border-b border-stone-800/80 mb-4 max-w-5xl">
            <div className="flex items-center space-x-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Live Preview:{" "}
                <strong className="text-stone-200 capitalize">{viewportMode} Mode</strong> (
                {viewportMode === "desktop" ? "100% Fluid" : viewportMode === "tablet" ? "768px" : "375px"})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.srcdoc = generateStandaloneHtml(config);
                  }
                }}
                className="p-1 text-stone-400 hover:text-stone-200"
                title="Force refresh preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport Frame */}
          <div
            className={`transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-stone-800 flex flex-col ${
              viewportMode === "desktop"
                ? "w-full max-w-5xl h-[780px]"
                : viewportMode === "tablet"
                ? "w-[768px] h-[780px]"
                : "w-[375px] h-[720px]"
            }`}
            style={{ backgroundColor: config.backgroundColor }}
          >
            <iframe
              ref={iframeRef}
              title="Official Author Website Live Preview"
              className="w-full h-full border-0 bg-transparent"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FULLSCREEN PREVIEW MODAL */}
      {/* ===================================================================== */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col">
          <div className="bg-stone-900 border-b border-stone-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-amber-400" />
              <span className="font-serif font-bold text-sm text-stone-100">
                Fullscreen Live Preview — {config.authorName} Official Website
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyHtml}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-xs font-medium text-stone-200 border border-stone-700 hover:bg-stone-700"
              >
                {copiedHtml ? "Copied!" : "Copy HTML"}
              </button>
              <button
                onClick={handleDownloadHtml}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold shadow"
              >
                Download HTML
              </button>
              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full bg-stone-950">
            <iframe
              srcDoc={generateStandaloneHtml(config)}
              title="Fullscreen Author Website Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PASTE / LOAD JSON MODAL */}
      {/* ===================================================================== */}
      {isPasteJsonOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="font-serif font-bold text-sm text-stone-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Paste / Load Configuration JSON</span>
              </span>
              <button
                onClick={() => setIsPasteJsonOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={8}
              placeholder="Paste AuthorWebsiteConfig JSON string here..."
              value={pasteJsonInput}
              onChange={(e) => setPasteJsonInput(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 font-mono focus:outline-none focus:border-cyan-400"
            />

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsPasteJsonOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPastedJson}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-stone-950 font-bold text-xs"
              >
                Load Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
