import React, { useState, useEffect } from "react";
import {
  Type,
  ExternalLink,
  Sliders,
  Palette,
  Sparkles,
  AlignLeft,
  AlignJustify,
  AlignCenter,
  AlignRight,
  BookOpen,
  Check,
  RefreshCw,
  Zap,
  Split,
  Eye,
  Maximize2,
  Minimize2,
  FileCode,
  Download,
  Info,
} from "lucide-react";
import { Book, FormattingSettings, Chapter } from "../types";

interface TypographyCustomizerTabProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onOpenExportModal: () => void;
}

// Curated Popular Google Fonts
const GOOGLE_FONTS_CATALOG = [
  { name: "Cinzel", category: "Display / Classical Epic", defaultWeight: "400;600;700" },
  { name: "Playfair Display", category: "Modern Editorial Serif", defaultWeight: "400;600;700" },
  { name: "EB Garamond", category: "Classic Literary Serif", defaultWeight: "400;500;700" },
  { name: "Cormorant Garamond", category: "Graceful High-Contrast Serif", defaultWeight: "400;600;700" },
  { name: "Lora", category: "Contemporary Calligraphic Serif", defaultWeight: "400;500;600" },
  { name: "Merriweather", category: "Highly Legible Book Serif", defaultWeight: "300;400;700" },
  { name: "Spectral", category: "Screen-Optimized Elegant Serif", defaultWeight: "400;600;700" },
  { name: "Alegreya", category: "Dynamic Literary Serif", defaultWeight: "400;500;700" },
  { name: "Bitter", category: "Slab Serif for Extended Reading", defaultWeight: "400;600;700" },
  { name: "Inter", category: "Ultra-Clean Neutral Sans", defaultWeight: "400;500;600" },
  { name: "Plus Jakarta Sans", category: "Modern Crisp Display Sans", defaultWeight: "400;600;700" },
  { name: "Outfit", category: "Geometric Friendly Sans", defaultWeight: "400;600;700" },
  { name: "Space Grotesk", category: "Sci-Fi / Modernist Sans", defaultWeight: "400;600;700" },
  { name: "Roboto Serif", category: "Variable Bookwork Serif", defaultWeight: "400;600;700" },
  { name: "Crimson Text", category: "Traditional Oldstyle Garamond", defaultWeight: "400;600;700" },
  { name: "IM Fell English", category: "17th Century Antique Letterpress", defaultWeight: "400" },
];

// Curated Text Ink Color Palettes
const FONT_COLOR_PALETTES = [
  { name: "Classic Obsidian Ink", color: "#111827", bg: "bg-gray-900" },
  { name: "Midnight Charcoal", color: "#1e293b", bg: "bg-slate-800" },
  { name: "Sepia Parchment", color: "#45321f", bg: "bg-[#45321f]" },
  { name: "Dark Walnut", color: "#2b1810", bg: "bg-[#2b1810]" },
  { name: "Rosewood Burgundy", color: "#3b1828", bg: "bg-[#3b1828]" },
  { name: "Forest Pine", color: "#15281e", bg: "bg-[#15281e]" },
  { name: "Rich Sovereign Gold", color: "#b48608", bg: "bg-[#b48608]" },
  { name: "Warm Amber", color: "#d97706", bg: "bg-amber-600" },
  { name: "Bone White / Light", color: "#e2e8f0", bg: "bg-slate-200" },
  { name: "Pure Ivory", color: "#f8fafc", bg: "bg-white" },
];

export const TypographyCustomizerTab: React.FC<TypographyCustomizerTabProps> = ({
  book,
  onUpdateBook,
  onOpenExportModal,
}) => {
  const currentSettings: FormattingSettings = {
    trimSize: book.formattingSettings?.trimSize || "6x9",
    fontPreset: book.formattingSettings?.fontPreset || "garamond",
    googleFontFamily: book.formattingSettings?.googleFontFamily || "EB Garamond",
    fontColor: book.formattingSettings?.fontColor || "#111827",
    fontSize: book.formattingSettings?.fontSize || "11pt",
    fontSizePx: book.formattingSettings?.fontSizePx || 16,
    lineSpacing: book.formattingSettings?.lineSpacing || "1.5",
    lineHeightValue: book.formattingSettings?.lineHeightValue || 1.6,
    letterSpacingEm: book.formattingSettings?.letterSpacingEm || 0,
    paragraphIndentEm: book.formattingSettings?.paragraphIndentEm || 1.5,
    paragraphSpacingEm: book.formattingSettings?.paragraphSpacingEm || 0,
    textAlign: book.formattingSettings?.textAlign || "justify",
    chapterHeadingCase: book.formattingSettings?.chapterHeadingCase || "title",
    chapterWordBudget: book.formattingSettings?.chapterWordBudget || 3000,
    dropCaps: book.formattingSettings?.dropCaps ?? true,
    dropCapSize: book.formattingSettings?.dropCapSize || 3,
    sceneBreakSymbol: book.formattingSettings?.sceneBreakSymbol || "* * *",
    showPageNumbers: book.formattingSettings?.showPageNumbers ?? true,
    runningHeaders: book.formattingSettings?.runningHeaders ?? true,
    includeFrontMatter: book.formattingSettings?.includeFrontMatter ?? true,
    includeBackMatter: book.formattingSettings?.includeBackMatter ?? true,
    dedicationText: book.formattingSettings?.dedicationText || "",
    copyrightText: book.formattingSettings?.copyrightText || "",
    authorBio: book.formattingSettings?.authorBio || "",
    newsletterLink: book.formattingSettings?.newsletterLink || "",
    acknowledgments: book.formattingSettings?.acknowledgments || "",
  };

  const [settings, setSettings] = useState<FormattingSettings>(currentSettings);
  const [customFontInput, setCustomFontInput] = useState<string>("");
  const [previewChapterIndex, setPreviewChapterIndex] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<"light-parchment" | "dark-obsidian">("light-parchment");
  const [autoFormatSuccessMsg, setAutoFormatSuccessMsg] = useState<string | null>(null);

  // Dynamically load Google Font stylesheet into document head
  useEffect(() => {
    const fontName = settings.googleFontFamily || "EB Garamond";
    const formattedFontName = fontName.replace(/\s+/g, "+");
    const linkId = `google-font-${formattedFontName}`;

    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${formattedFontName}:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap`;
      document.head.appendChild(link);
    }
  }, [settings.googleFontFamily]);

  // Update book settings
  const handleSaveSettings = (newSettings: FormattingSettings) => {
    setSettings(newSettings);
    onUpdateBook({
      ...book,
      formattingSettings: newSettings,
      updatedAt: new Date().toISOString(),
    });
  };

  // Load custom font from text input
  const handleLoadCustomGoogleFont = () => {
    if (!customFontInput.trim()) return;
    const fontName = customFontInput.trim();
    const updated = {
      ...settings,
      googleFontFamily: fontName,
      fontPreset: "custom" as const,
    };
    handleSaveSettings(updated);
    setCustomFontInput("");
  };

  // Auto-Format Entire Manuscript Engine (Quotes, dashes, ellipses, double spaces)
  const handleAutoFormatManuscript = () => {
    let modifiedChaptersCount = 0;
    const updatedChapters = (book.chapters || []).map((ch) => {
      if (!ch.content) return ch;
      let text = ch.content;

      // Smart quotes replacement
      text = text
        .replace(/(\W|^)"(\S)/g, "$1“$2") // open double quotes
        .replace(/(\S)"(\W|$)/g, "$1”$2") // close double quotes
        .replace(/"/g, "”")
        .replace(/(\W|^)'(\S)/g, "$1‘$2") // open single quotes
        .replace(/(\S)'(\W|$)/g, "$1’$2") // close single quotes
        .replace(/'/g, "’");

      // Em-dashes
      text = text.replace(/--/g, "—").replace(/ — /g, "—");

      // Ellipses
      text = text.replace(/\.\.\./g, "…");

      // Multiple spaces
      text = text.replace(/[ \t]+/g, " ");

      modifiedChaptersCount++;
      return {
        ...ch,
        content: text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });

    setAutoFormatSuccessMsg(`Auto-formatted smart typography & punctuation across ${modifiedChaptersCount} chapters!`);
    setTimeout(() => setAutoFormatSuccessMsg(null), 4000);
  };

  // Helper for chapter title formatting based on chapterHeadingCase
  const formatChapterHeading = (chapter: Chapter) => {
    const title = chapter.title || `Chapter ${chapter.number}`;
    switch (settings.chapterHeadingCase) {
      case "small-caps":
        return title.toLowerCase();
      case "uppercase":
        return title.toUpperCase();
      case "roman":
        const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
        const num = romanNumerals[chapter.number - 1] || chapter.number;
        return `CHAPTER ${num}: ${title.toUpperCase()}`;
      case "title":
      default:
        return title;
    }
  };

  const activeChapter = book.chapters[previewChapterIndex] || book.chapters[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-indigo-950/40 border border-stone-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-100">
              Custom Typography, Google Fonts & Manual Formatting
            </h1>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl">
            Fine-tune letter spacing, line height, font sizing, custom Google Fonts CDN pairing, color palettes, and automated word & chapter rebalancing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoFormatManuscript}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto-Format Manuscript</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Typeset</span>
          </button>
        </div>
      </div>

      {autoFormatSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{autoFormatSuccessMsg}</span>
          </div>
          <button onClick={() => setAutoFormatSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* Main Grid: Controls on Left, Live Page Rendering on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Controls (5 columns) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 1: Google Fonts Selector */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-stone-200 font-serif font-bold text-sm">
                <Type className="w-4 h-4 text-indigo-400" />
                <span>Google Fonts Catalog</span>
              </div>
              <a
                href="https://fonts.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <span>Browse Google Fonts</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Quick Font Selector Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {GOOGLE_FONTS_CATALOG.map((f) => (
                <button
                  key={f.name}
                  onClick={() =>
                    handleSaveSettings({
                      ...settings,
                      googleFontFamily: f.name,
                      fontPreset: "custom",
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                    settings.googleFontFamily === f.name
                      ? "bg-indigo-950/60 border-indigo-500 text-indigo-200 font-bold"
                      : "bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300"
                  }`}
                >
                  <span className="font-serif truncate" style={{ fontFamily: f.name }}>
                    {f.name}
                  </span>
                  <span className="text-[9px] text-stone-500 truncate font-sans">
                    {f.category}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Google Font Input */}
            <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
              <label className="text-[11px] text-stone-400">Load Any Google Font by Name:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customFontInput}
                  onChange={(e) => setCustomFontInput(e.target.value)}
                  placeholder="e.g. Philosopher, Great Vibes, Cinzel Decorative..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-indigo-500"
                  onKeyDown={(e) => e.key === "Enter" && handleLoadCustomGoogleFont()}
                />
                <button
                  onClick={handleLoadCustomGoogleFont}
                  disabled={!customFontInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-40"
                >
                  Load
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Font Color Palette */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-stone-200 font-serif font-bold text-sm">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Text Ink Color Palette</span>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {settings.fontColor}
              </span>
            </div>

            {/* Palette Swatches */}
            <div className="grid grid-cols-5 gap-2">
              {FONT_COLOR_PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    handleSaveSettings({
                      ...settings,
                      fontColor: p.color,
                    })
                  }
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                    settings.fontColor === p.color
                      ? "border-amber-500 ring-2 ring-amber-500/30 bg-stone-950"
                      : "border-stone-800 hover:border-stone-700 bg-stone-950/60"
                  }`}
                  title={p.name}
                >
                  <div
                    className="w-5 h-5 rounded-full border border-stone-700/50 shadow-inner"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[9px] text-stone-400 truncate w-full text-center">
                    {p.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Hex Color Picker */}
            <div className="flex items-center space-x-3 pt-2 border-t border-stone-800/80">
              <label className="text-[11px] text-stone-400">Custom Color:</label>
              <input
                type="color"
                value={settings.fontColor || "#111827"}
                onChange={(e) =>
                  handleSaveSettings({
                    ...settings,
                    fontColor: e.target.value,
                  })
                }
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={settings.fontColor || "#111827"}
                onChange={(e) =>
                  handleSaveSettings({
                    ...settings,
                    fontColor: e.target.value,
                  })
                }
                className="flex-1 px-3 py-1 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs font-mono"
              />
            </div>
          </div>

          {/* Section 3: Granular Size & Spacing Sliders */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center space-x-2 text-stone-200 font-serif font-bold text-sm">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Font Size, Leading & Letter Spacing</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Font Size (px) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Font Size:</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.fontSizePx}px</span>
                </div>
                <input
                  type="range"
                  min="11"
                  max="28"
                  step="1"
                  value={settings.fontSizePx}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...settings,
                      fontSizePx: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Line Height / Leading */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Line Spacing (Leading):</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.lineHeightValue}x</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="2.4"
                  step="0.05"
                  value={settings.lineHeightValue}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...settings,
                      lineHeightValue: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Letter Spacing (Tracking) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Letter Spacing (Tracking):</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.letterSpacingEm}em</span>
                </div>
                <input
                  type="range"
                  min="-0.04"
                  max="0.2"
                  step="0.01"
                  value={settings.letterSpacingEm}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...settings,
                      letterSpacingEm: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Paragraph Indent */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Paragraph Indent:</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.paragraphIndentEm}em</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.25"
                  value={settings.paragraphIndentEm}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...settings,
                      paragraphIndentEm: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Alignment Selector */}
              <div className="pt-2 border-t border-stone-800 space-y-1.5">
                <span className="text-stone-400">Text Alignment:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "justify", label: "Justify", icon: AlignJustify },
                    { id: "left", label: "Left", icon: AlignLeft },
                    { id: "center", label: "Center", icon: AlignCenter },
                    { id: "right", label: "Right", icon: AlignRight },
                  ].map((align) => {
                    const IconComponent = align.icon;
                    return (
                      <button
                        key={align.id}
                        onClick={() =>
                          handleSaveSettings({
                            ...settings,
                            textAlign: align.id as any,
                          })
                        }
                        className={`py-1.5 rounded-lg border flex items-center justify-center space-x-1 text-xs ${
                          settings.textAlign === align.id
                            ? "bg-indigo-950/80 border-indigo-500 text-indigo-200 font-bold"
                            : "bg-stone-950/60 border-stone-800 text-stone-400"
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{align.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chapter Headings & Drop Caps */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-800">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400">Heading Style:</label>
                  <select
                    value={settings.chapterHeadingCase}
                    onChange={(e) =>
                      handleSaveSettings({
                        ...settings,
                        chapterHeadingCase: e.target.value as any,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs"
                  >
                    <option value="title">Title Case</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="small-caps">small-caps</option>
                    <option value="roman">Roman Numerals (I, II)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400">Drop Caps:</label>
                  <button
                    onClick={() =>
                      handleSaveSettings({
                        ...settings,
                        dropCaps: !settings.dropCaps,
                      })
                    }
                    className={`w-full py-1.5 rounded-lg border text-xs font-medium ${
                      settings.dropCaps
                        ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                        : "bg-stone-950/60 border-stone-800 text-stone-500"
                    }`}
                  >
                    {settings.dropCaps ? "✓ Enabled (3-line)" : "✕ Disabled"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Real-Time Book Reader Canvas (7 columns) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Chapter Selector & Preview Theme Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-stone-900 border border-stone-800 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-stone-400 text-[11px]">Preview Chapter:</span>
              <select
                value={previewChapterIndex}
                onChange={(e) => setPreviewChapterIndex(Number(e.target.value))}
                className="px-3 py-1 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs"
              >
                {(book.chapters || []).map((ch, idx) => (
                  <option key={ch.id} value={idx}>
                    Chapter {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewMode("light-parchment")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  previewMode === "light-parchment"
                    ? "bg-[#f4efe4] text-stone-950 shadow-sm"
                    : "bg-stone-950 text-stone-400 hover:text-stone-200"
                }`}
              >
                Parchment Page
              </button>
              <button
                onClick={() => setPreviewMode("dark-obsidian")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  previewMode === "dark-obsidian"
                    ? "bg-stone-950 text-amber-300 border border-amber-500/40"
                    : "bg-stone-950 text-stone-400 hover:text-stone-200"
                }`}
              >
                Obsidian Dark
              </button>
            </div>
          </div>

          {/* Book Canvas Preview Container */}
          <div
            className={`rounded-2xl border p-8 sm:p-12 shadow-2xl min-h-[580px] max-h-[720px] overflow-y-auto transition-all ${
              previewMode === "light-parchment"
                ? "bg-[#f8f5ee] border-[#dfd7c6] shadow-amber-950/20"
                : "bg-[#121214] border-stone-800 shadow-black"
            }`}
          >
            {/* Header Stamp */}
            {settings.runningHeaders && (
              <div
                className="flex items-center justify-between border-b pb-3 mb-8 text-[11px] uppercase tracking-widest opacity-60"
                style={{
                  color: previewMode === "light-parchment" ? settings.fontColor : "#a8a29e",
                  fontFamily: settings.googleFontFamily,
                }}
              >
                <span>{book.title}</span>
                <span>{book.author}</span>
              </div>
            )}

            {/* Chapter Heading */}
            <div className="text-center my-6 space-y-1">
              <div
                className="text-xs uppercase tracking-widest opacity-50"
                style={{
                  color: previewMode === "light-parchment" ? settings.fontColor : "#cbd5e1",
                  fontFamily: settings.googleFontFamily,
                }}
              >
                {activeChapter?.act || "Act I"}
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{
                  color: previewMode === "light-parchment" ? settings.fontColor : "#f8fafc",
                  fontFamily: settings.googleFontFamily,
                  letterSpacing: `${settings.letterSpacingEm}em`,
                  fontVariant: settings.chapterHeadingCase === "small-caps" ? "small-caps" : "normal",
                }}
              >
                {activeChapter ? formatChapterHeading(activeChapter) : "Chapter Title"}
              </h2>
            </div>

            {/* Chapter Body with Exact Typography Styles */}
            <div
              className="space-y-4 leading-relaxed"
              style={{
                fontFamily: settings.googleFontFamily,
                fontSize: `${settings.fontSizePx}px`,
                lineHeight: settings.lineHeightValue,
                letterSpacing: `${settings.letterSpacingEm}em`,
                textAlign: settings.textAlign as any,
                color: previewMode === "light-parchment" ? settings.fontColor : "#e2e8f0",
              }}
            >
              {(activeChapter?.content || "No drafted manuscript content yet for this chapter. Use the manual dictation suite or editor to draft your scene.")
                .split("\n\n")
                .map((paragraph, pIdx) => {
                  const isFirstPara = pIdx === 0;

                  // Render Drop Cap on the very first letter of the chapter if enabled
                  if (isFirstPara && settings.dropCaps && paragraph.length > 0) {
                    const firstLetter = paragraph[0];
                    const restOfPara = paragraph.slice(1);
                    return (
                      <p
                        key={pIdx}
                        className="leading-relaxed"
                        style={{
                          textIndent: 0,
                          marginBottom: `${settings.paragraphSpacingEm}em`,
                        }}
                      >
                        <span
                          className="float-left font-serif leading-none mr-2 font-bold select-none"
                          style={{
                            fontSize: `${(settings.fontSizePx || 16) * 3.2}px`,
                            lineHeight: 0.8,
                            paddingTop: "4px",
                            fontFamily: settings.googleFontFamily,
                            color: previewMode === "light-parchment" ? settings.fontColor : "#f59e0b",
                          }}
                        >
                          {firstLetter}
                        </span>
                        {restOfPara}
                      </p>
                    );
                  }

                  return (
                    <p
                      key={pIdx}
                      style={{
                        textIndent: isFirstPara ? 0 : `${settings.paragraphIndentEm}em`,
                        marginBottom: `${settings.paragraphSpacingEm}em`,
                      }}
                    >
                      {paragraph}
                    </p>
                  );
                })}
            </div>

            {/* Scene Break Divider */}
            <div
              className="text-center my-8 select-none text-base opacity-60"
              style={{
                fontFamily: settings.googleFontFamily,
                color: previewMode === "light-parchment" ? settings.fontColor : "#94a3b8",
              }}
            >
              {settings.sceneBreakSymbol}
            </div>

            {/* Page Number */}
            {settings.showPageNumbers && (
              <div
                className="text-center pt-8 border-t border-stone-300/30 text-xs font-mono opacity-50"
                style={{
                  color: previewMode === "light-parchment" ? settings.fontColor : "#94a3b8",
                }}
              >
                — Page {previewChapterIndex * 12 + 1} —
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
