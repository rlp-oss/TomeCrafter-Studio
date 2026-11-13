import React, { useState, useEffect, useRef } from "react";
import {
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Type,
  Sliders,
  Palette,
  Sparkles,
  Feather,
  Wand2,
  RotateCcw,
} from "lucide-react";
import { Book, Chapter } from "../types";
import { ReadabilityBadge } from "./ReadabilityBadge";

interface FocusModeEditorProps {
  book: Book;
  activeChapter: Chapter;
  content: string;
  onContentChange: (newContent: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onExitFocusMode: () => void;
  onContinueWriting?: () => void;
  isAiLoading?: boolean;
}

type FocusTheme = "dark" | "parchment" | "midnight" | "sepia";
type LineWidth = "narrow" | "standard" | "wide";

export const FocusModeEditor: React.FC<FocusModeEditorProps> = ({
  book,
  activeChapter,
  content,
  onContentChange,
  onSelectChapter,
  onExitFocusMode,
  onContinueWriting,
  isAiLoading = false,
}) => {
  const [theme, setTheme] = useState<FocusTheme>(() => {
    return (localStorage.getItem("tomecrafter_focus_theme") as FocusTheme) || "dark";
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("tomecrafter_focus_font_size");
    return saved ? parseInt(saved, 10) : 19;
  });
  const [lineWidth, setLineWidth] = useState<LineWidth>("standard");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("tomecrafter_focus_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("tomecrafter_focus_font_size", fontSize.toString());
  }, [fontSize]);

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExitFocusMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExitFocusMode]);

  // Word & reading stats
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const targetWords = activeChapter.targetWords || 3000;
  const progressPercent = Math.min(100, Math.round((words / targetWords) * 100));
  const readingTime = Math.max(1, Math.ceil(words / 225));

  // Chapter navigation
  const currentIndex = book.chapters.findIndex((c) => c.id === activeChapter.id);
  const prevChapter = currentIndex > 0 ? book.chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < book.chapters.length - 1 ? book.chapters[currentIndex + 1] : null;

  // Insert helper
  const insertText = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const updated =
      content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    onContentChange(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  // Theme Styles
  const themeStyles = {
    dark: {
      bg: "bg-stone-950",
      text: "text-stone-200",
      heading: "text-amber-400",
      subheading: "text-stone-400",
      border: "border-stone-800",
      toolbarBg: "bg-stone-900/90",
      buttonHover: "hover:bg-stone-800",
      placeholder: "placeholder-stone-700",
      accent: "text-amber-400",
    },
    parchment: {
      bg: "bg-[#f6f2e9]",
      text: "text-[#2c241c]",
      heading: "text-[#78350f]",
      subheading: "text-[#786b59]",
      border: "border-[#e3dac9]",
      toolbarBg: "bg-[#ece5d8]/90",
      buttonHover: "hover:bg-[#e0d6c3]",
      placeholder: "placeholder-[#a89b88]",
      accent: "text-[#92400e]",
    },
    midnight: {
      bg: "bg-[#0a0f1d]",
      text: "text-[#e2e8f0]",
      heading: "text-[#38bdf8]",
      subheading: "text-[#94a3b8]",
      border: "border-[#1e293b]",
      toolbarBg: "bg-[#0f172a]/90",
      buttonHover: "hover:bg-[#1e293b]",
      placeholder: "placeholder-[#475569]",
      accent: "text-[#38bdf8]",
    },
    sepia: {
      bg: "bg-[#251d18]",
      text: "text-[#ebd9c8]",
      heading: "text-[#f59e0b]",
      subheading: "text-[#a38a74]",
      border: "border-[#3d2f26]",
      toolbarBg: "bg-[#2f241e]/90",
      buttonHover: "hover:bg-[#42342b]",
      placeholder: "placeholder-[#6f5b4c]",
      accent: "text-[#f59e0b]",
    },
  }[theme];

  // Container width classes
  const widthClass = {
    narrow: "max-w-2xl",
    standard: "max-w-3xl",
    wide: "max-w-5xl",
  }[lineWidth];

  const fontFamilyStyle = book.formattingSettings?.googleFontFamily
    ? { fontFamily: `"${book.formattingSettings.googleFontFamily}", Georgia, serif` }
    : { fontFamily: "Garamond, Georgia, serif" };

  return (
    <div
      id="distraction-free-focus-mode"
      className={`fixed inset-0 z-50 ${themeStyles.bg} ${themeStyles.text} flex flex-col transition-colors duration-300 select-text overflow-hidden`}
    >
      {/* Top Floating Control Bar */}
      <header
        className={`px-4 sm:px-8 py-3 border-b ${themeStyles.border} ${themeStyles.toolbarBg} backdrop-blur-md flex items-center justify-between gap-3 shrink-0 transition-all duration-200 shadow-sm`}
      >
        {/* Left: Chapter Switcher & Fast Jumps */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => prevChapter && onSelectChapter(prevChapter.id)}
              disabled={!prevChapter}
              className={`p-1.5 rounded-lg ${themeStyles.buttonHover} disabled:opacity-25 transition-colors`}
              title="Previous Chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={activeChapter.id}
              onChange={(e) => onSelectChapter(e.target.value)}
              className={`px-2.5 py-1 rounded-lg ${themeStyles.toolbarBg} border ${themeStyles.border} ${themeStyles.text} font-serif font-semibold text-xs sm:text-sm focus:outline-none`}
            >
              {book.chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  CH {ch.number}: {ch.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => nextChapter && onSelectChapter(nextChapter.id)}
              disabled={!nextChapter}
              className={`p-1.5 rounded-lg ${themeStyles.buttonHover} disabled:opacity-25 transition-colors`}
              title="Next Chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Punctuation & Formatting */}
          <div className="hidden md:flex items-center space-x-1 border-l pl-3 ml-2 border-stone-700/40 text-xs">
            <button
              onClick={() => insertText("\n## ", "\n")}
              className={`px-2 py-1 rounded ${themeStyles.buttonHover} font-serif font-bold text-xs`}
              title="Scene Heading"
            >
              H2
            </button>
            <button
              onClick={() => insertText("**", "**")}
              className={`px-2 py-1 rounded ${themeStyles.buttonHover} font-bold text-xs`}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => insertText("*", "*")}
              className={`px-2 py-1 rounded ${themeStyles.buttonHover} italic text-xs`}
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => insertText('“', '”')}
              className={`px-2 py-1 rounded ${themeStyles.buttonHover} text-xs font-serif`}
              title="Dialogue Quotes"
            >
              “”
            </button>
            <button
              onClick={() => insertText("—")}
              className={`px-2 py-1 rounded ${themeStyles.buttonHover} text-xs font-mono`}
              title="Em Dash"
            >
              —
            </button>
            <button
              onClick={() => insertText("\n\n* * *\n\n")}
              className={`px-2 py-1 rounded ${themeStyles.buttonHover} text-xs`}
              title="Scene Break Ornament"
            >
              * * *
            </button>
          </div>
        </div>

        {/* Center: Live Word Progress */}
        <div className="hidden lg:flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 font-mono">
            <span className={`font-bold ${themeStyles.accent}`}>
              {words.toLocaleString()}
            </span>
            <span className={themeStyles.subheading}>/ {targetWords.toLocaleString()} w</span>
            <span className="opacity-60">({progressPercent}%)</span>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-stone-700/30 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={`flex items-center space-x-1 ${themeStyles.subheading}`}>
            <Clock className="w-3 h-3" />
            <span>~{readingTime}m</span>
          </div>
        </div>

        {/* Right: Theme, Font Size & Exit Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick AI Continue if available */}
          {onContinueWriting && (
            <button
              onClick={onContinueWriting}
              disabled={isAiLoading}
              className={`hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium ${themeStyles.buttonHover} transition-all disabled:opacity-40`}
              title="Co-write next beat"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiLoading ? "Writing..." : "Co-Write"}</span>
            </button>
          )}

          {/* Theme Switcher Quick Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg ${themeStyles.buttonHover} border ${themeStyles.border} transition-colors flex items-center space-x-1 text-xs`}
              title="Focus View Settings & Themes"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Theme & Layout</span>
            </button>

            {showSettings && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSettings(false)}
                />
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-2xl border ${themeStyles.border} ${themeStyles.toolbarBg} shadow-2xl p-4 z-50 text-xs space-y-4 animate-fadeIn`}
                >
                  <div>
                    <span className="font-semibold block mb-2 opacity-80 uppercase tracking-wider text-[10px]">
                      Color Atmosphere
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setTheme("dark")}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 ${
                          theme === "dark"
                            ? "border-amber-500 bg-stone-900 font-bold text-amber-400"
                            : "border-stone-800 bg-stone-950 text-stone-300"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-stone-950 border border-stone-700" />
                        <span>Obsidian</span>
                      </button>

                      <button
                        onClick={() => setTheme("parchment")}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 ${
                          theme === "parchment"
                            ? "border-amber-700 bg-[#eee8dc] font-bold text-[#78350f]"
                            : "border-[#e3dac9] bg-[#f6f2e9] text-[#2c241c]"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-[#f6f2e9] border border-[#d6cbba]" />
                        <span>Parchment</span>
                      </button>

                      <button
                        onClick={() => setTheme("midnight")}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 ${
                          theme === "midnight"
                            ? "border-sky-500 bg-[#0f172a] font-bold text-sky-400"
                            : "border-[#1e293b] bg-[#0a0f1d] text-slate-300"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-[#0a0f1d] border border-sky-800" />
                        <span>Midnight</span>
                      </button>

                      <button
                        onClick={() => setTheme("sepia")}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 ${
                          theme === "sepia"
                            ? "border-amber-600 bg-[#30251f] font-bold text-amber-300"
                            : "border-[#3d2f26] bg-[#251d18] text-[#ebd9c8]"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-[#251d18] border border-amber-900" />
                        <span>Sepia</span>
                      </button>
                    </div>
                  </div>

                  {/* Font Size Adjuster */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="opacity-80 uppercase tracking-wider text-[10px] font-semibold">
                        Type Size
                      </span>
                      <span className="font-mono">{fontSize}px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                        className={`px-2.5 py-1 rounded-lg ${themeStyles.buttonHover} border ${themeStyles.border} font-bold`}
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min={14}
                        max={26}
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                        className="flex-1 accent-amber-500 h-1.5 bg-stone-700/50 rounded-lg cursor-pointer"
                      />
                      <button
                        onClick={() => setFontSize((s) => Math.min(26, s + 1))}
                        className={`px-2.5 py-1 rounded-lg ${themeStyles.buttonHover} border ${themeStyles.border} font-bold`}
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Column Width */}
                  <div>
                    <span className="opacity-80 uppercase tracking-wider text-[10px] font-semibold block mb-1.5">
                      Reading Width
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(["narrow", "standard", "wide"] as LineWidth[]).map((w) => (
                        <button
                          key={w}
                          onClick={() => setLineWidth(w)}
                          className={`py-1.5 rounded-lg text-center capitalize border transition-colors ${
                            lineWidth === w
                              ? "border-amber-500 bg-amber-500/10 font-bold text-amber-400"
                              : `${themeStyles.border} opacity-70 ${themeStyles.buttonHover}`
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Exit Focus Mode Button */}
          <button
            onClick={onExitFocusMode}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-all shadow-md cursor-pointer"
            title="Exit Focus Mode (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Focus</span>
            <span className="text-[10px] opacity-75 font-mono hidden sm:inline">(Esc)</span>
          </button>
        </div>
      </header>

      {/* Main Focus Writing Canvas Area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 scrollbar-thin">
        <div className={`${widthClass} mx-auto transition-all duration-300 space-y-6`}>
          {/* Subtle Chapter Heading Header */}
          <div className="text-center pb-6 border-b border-dashed border-stone-700/30">
            <div className={`text-xs uppercase tracking-widest font-mono ${themeStyles.accent} mb-1 opacity-80`}>
              {activeChapter.act || "Act I"} • {book.title}
            </div>
            <h1
              className="text-2xl sm:text-4xl font-serif font-bold tracking-tight"
              style={fontFamilyStyle}
            >
              Chapter {activeChapter.number}: {activeChapter.title}
            </h1>
            {activeChapter.setting && (
              <p className={`text-xs ${themeStyles.subheading} mt-1.5 italic`}>
                Setting: {activeChapter.setting} {activeChapter.pov ? `• POV: ${activeChapter.pov}` : ""}
              </p>
            )}
          </div>

          {/* Distraction-Free Textarea */}
          <textarea
            ref={textareaRef}
            autoFocus
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="The scene begins here... Let the words flow unimpeded."
            rows={26}
            className={`w-full bg-transparent border-0 focus:outline-none resize-none leading-relaxed ${themeStyles.placeholder}`}
            style={{
              ...fontFamilyStyle,
              fontSize: `${fontSize}px`,
              lineHeight: "1.9",
              letterSpacing: "0.01em",
            }}
          />
        </div>
      </main>

      {/* Subtle Floating Bottom Status Indicator */}
      <footer
        className={`px-4 sm:px-8 py-2 border-t ${themeStyles.border} ${themeStyles.toolbarBg} flex flex-wrap items-center justify-between gap-2 text-[11px] ${themeStyles.subheading} shrink-0`}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Autosaving</span>
            <span>•</span>
            <span className="font-mono">{words.toLocaleString()} words</span>
            <span>•</span>
            <span className="font-mono">{content.length.toLocaleString()} chars</span>
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-stone-700/50" />

          {/* Real-time Flesch-Kincaid Indicator & 5-Session Sparkline */}
          <ReadabilityBadge content={content} chapterId={activeChapter.id} showCompact />
        </div>

        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline opacity-70">
            Press <kbd className="px-1.5 py-0.5 rounded bg-stone-800/60 font-mono text-[10px]">Esc</kbd> to exit focus mode
          </span>
          <button
            onClick={onExitFocusMode}
            className="hover:underline font-medium cursor-pointer"
          >
            Exit
          </button>
        </div>
      </footer>
    </div>
  );
};
