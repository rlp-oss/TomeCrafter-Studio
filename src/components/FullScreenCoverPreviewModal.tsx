import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  BookOpen,
  Eye,
  Sliders,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  Type,
  RotateCcw,
  Palette,
  Check,
  Copy,
  ChevronRight,
  ExternalLink,
  HardDrive,
  Grid,
  FileCheck,
  Ruler,
  PackageCheck,
} from "lucide-react";
import { Book, Genre } from "../types";
import {
  calculateSpineFormatting,
  PaperType,
  SpineOrientation,
  SpineAlignment,
  PAPER_PROFILES,
  SpineCalculationResult,
} from "../utils/spineCalculator";
import { downloadSingleArtworkFile } from "../services/googleDrive";

interface FullScreenCoverPreviewModalProps {
  book: Book;
  onClose: () => void;
  onUpdateBook?: (updatedBook: Book) => void;
  initialViewMode?: "wrap" | "3d" | "front" | "spine" | "back";
}

export const FullScreenCoverPreviewModal: React.FC<FullScreenCoverPreviewModalProps> = ({
  book,
  onClose,
  onUpdateBook,
  initialViewMode = "wrap",
}) => {
  // Modal View Modes: 2D Print Wrap Spread | Interactive 3D Perspective | Front Solo | Spine Solo | Back Solo
  const [viewMode, setViewMode] = useState<"wrap" | "3d" | "front" | "spine" | "back">(initialViewMode);
  
  // 3D Angle Presets: 3/4 Front, 3/4 Spine, 3/4 Back, Layflat Open
  const [threeDAngle, setThreeDAngle] = useState<"front34" | "spine34" | "back34" | "layflat">("front34");
  const [is3DHardcover, setIs3DHardcover] = useState<boolean>(true);

  // Overlay Guides: Bleed (0.125"), Trim Line, Safe Margins, Crease Hinges
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Spine Formatting Configuration State
  const [paperType, setPaperType] = useState<PaperType>("white-50lb");
  const [spineOrientation, setSpineOrientation] = useState<SpineOrientation>("western");
  const [spineAlignment, setSpineAlignment] = useState<SpineAlignment>("distributed");
  const [autoFitSpine, setAutoFitSpine] = useState<boolean>(true);
  const [manualFontSizePt, setManualFontSizePt] = useState<number>(11);
  const [includeSubtitleOnSpine, setIncludeSubtitleOnSpine] = useState<boolean>(false);
  const [includePublisherGlyph, setIncludePublisherGlyph] = useState<boolean>(true);
  const [spineBgColor, setSpineBgColor] = useState<string>("#141210");
  const [spineTextColor, setSpineTextColor] = useState<string>("#f5f5f4");
  const [spineAccentColor, setSpineAccentColor] = useState<string>(book.coverAccentColor || "#10b981");

  // Cover Front & Back Settings
  const [coverMaskMode, setCoverMaskMode] = useState<"vignette" | "backplate" | "cinema" | "subtle" | "none">("vignette");
  const [coverTitleFont, setCoverTitleFont] = useState<string>(book.coverTitleFont || "font-serif");
  const [coverAccentColor, setCoverAccentColor] = useState<string>(book.coverAccentColor || "#10b981");
  const [customPageCount, setCustomPageCount] = useState<number | undefined>(undefined);
  const [isCustomPageOverride, setIsCustomPageOverride] = useState<boolean>(false);
  
  // UI Utilities
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const [copiedSpec, setCopiedSpec] = useState<boolean>(false);
  const [activeSidePanel, setActiveSidePanel] = useState<"spine" | "front" | "back" | "specs" | "none">(
    typeof window !== "undefined" && window.innerWidth < 1024 ? "none" : "spine"
  );
  const [isCleanScreenshotMode, setIsCleanScreenshotMode] = useState<boolean>(false);
  const [isDownloadingWrapPng, setIsDownloadingWrapPng] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapSpreadRef = useRef<HTMLDivElement>(null);

  // Calculate Total Words & Estimated Pages
  const totalWords = book.chapters.reduce(
    (sum, c) => sum + (c.content ? c.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0
  );
  const baseCalculatedPages = Math.max(64, Math.ceil((totalWords || 50000) / 250));
  const effectivePages = isCustomPageOverride && customPageCount ? customPageCount : baseCalculatedPages;

  // Compute Spine Formatting Engine Metrics
  const spineMetrics: SpineCalculationResult = calculateSpineFormatting({
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    wordCount: totalWords,
    manualPageCount: effectivePages,
    paperType,
    trimHeightInches: 9,
    trimWidthInches: 6,
    orientation: spineOrientation,
    alignment: spineAlignment,
    includeSubtitleOnSpine,
    includePublisherGlyph,
    manualFontSizePt: autoFitSpine ? undefined : manualFontSizePt,
    autoFit: autoFitSpine,
  });

  // Handle Fullscreen API
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsNativeFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsNativeFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isNativeFullscreen) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNativeFullscreen, onClose]);

  // Copy Print Spec Geometry to Clipboard
  const handleCopySpecs = () => {
    const specText = `=== COMMERCIAL PRINT COVER SPECIFICATIONS ===
Title: ${book.title}
Author: ${book.author}
Trim Size: 6.000" x 9.000" (152.4 mm x 228.6 mm)
Page Count: ${effectivePages} pages (${spineMetrics.paperProfile.name}, PPI: ${spineMetrics.paperProfile.ppi})
Spine Width: ${spineMetrics.spineWidthInches}" (${spineMetrics.spineWidthMm} mm)
Bleed Margin: ${spineMetrics.bleedMarginInches}" (3.175 mm)
Total Full Wrap Dimension: ${spineMetrics.totalWrapWidthInches}" x ${spineMetrics.totalWrapHeightInches}" (${(spineMetrics.totalWrapWidthInches * 25.4).toFixed(1)} mm x ${(spineMetrics.totalWrapHeightInches * 25.4).toFixed(1)} mm)
Color Profile: CMYK / PDF/X-1a:2001 (300 DPI)
Spine Auto-Fit Status: ${autoFitSpine ? `Auto-Optimized (${spineMetrics.autoFontSizePt}pt / ${spineMetrics.letterSpacingEm}em tracking)` : `Manual (${manualFontSizePt}pt)`}
Target Platforms: Amazon KDP, IngramSpark, Barnes & Noble Press, Lulu`;

    navigator.clipboard.writeText(specText);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2500);
  };

  // Sync any changes back to Book if onUpdateBook provided
  const handleSaveSpinePreferences = () => {
    if (!onUpdateBook) return;
    onUpdateBook({
      ...book,
      coverTitleFont,
      coverAccentColor,
      updatedAt: new Date().toISOString(),
    });
  };

  const coverImageSrc =
    book.coverImage ||
    book.coverImageUrl ||
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";

  return (
    <div
      id="fullscreen-cover-modal"
      ref={containerRef}
      className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl text-stone-100 flex flex-col overflow-hidden select-none animate-fadeIn"
    >
      {/* Top Header Navigation & Controls Bar */}
      <header className="h-16 px-4 sm:px-6 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0 shadow-lg">
        {/* Left Title & Trim Specs */}
        <div className="flex items-center space-x-3 truncate">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <h2 className="font-serif font-bold text-sm sm:text-base text-stone-100 truncate">
                {book.title}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                Spine: {spineMetrics.spineWidthFormatted}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-mono truncate">
              Full Commercial Wrap • 6x9 Trade Print • {effectivePages} Pages • {spineMetrics.paperProfile.name}
            </p>
          </div>
        </div>

        {/* Center: View Mode Switcher */}
        <div className="hidden md:flex items-center space-x-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
          <button
            id="viewmode-wrap-btn"
            onClick={() => setViewMode("wrap")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              viewMode === "wrap"
                ? "bg-purple-600 text-stone-100 shadow-md font-bold"
                : "text-stone-400 hover:text-stone-200"
            }`}
            title="Commercial 2D Full Jacket Spread (Back + Spine + Front)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Full Jacket Wrap (2D)</span>
          </button>

          <button
            id="viewmode-3d-btn"
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              viewMode === "3d"
                ? "bg-purple-600 text-stone-100 shadow-md font-bold"
                : "text-stone-400 hover:text-stone-200"
            }`}
            title="Interactive 3D Book Perspective with realistic spine curve & lighting"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>3D Book Mockup</span>
          </button>

          <button
            id="viewmode-front-btn"
            onClick={() => setViewMode("front")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "front" ? "bg-stone-800 text-stone-100 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Front Cover
          </button>

          <button
            id="viewmode-spine-btn"
            onClick={() => setViewMode("spine")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
              viewMode === "spine" ? "bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
            title="Isolated Spine Precision Caliper View"
          >
            <Ruler className="w-3 h-3 text-amber-400" />
            <span>Spine Caliper</span>
          </button>

          <button
            id="viewmode-back-btn"
            onClick={() => setViewMode("back")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "back" ? "bg-stone-800 text-stone-100 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Back Cover
          </button>
        </div>

        {/* Right Action Icons & Exit */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Clean Screenshot Mode (Hides all UI chrome) */}
          <button
            onClick={() => setIsCleanScreenshotMode(!isCleanScreenshotMode)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              isCleanScreenshotMode
                ? "bg-amber-500 text-black font-bold border-amber-400 shadow-md"
                : "bg-stone-900 border-stone-800 text-stone-300 hover:text-white"
            }`}
            title="Toggle Clean Screenshot Mode (hides all UI overlays for pristine mobile/desktop screenshots)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Screenshot Mode</span>
          </button>

          {/* Guide Overlay Toggle */}
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-colors flex items-center space-x-1.5 ${
              showGuides
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
            title="Toggle Bleed, Safe Margin, and Fold Crease Guidelines"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">{showGuides ? "Guides Active" : "Show Guides"}</span>
          </button>

          {/* Copy Print Spec Data */}
          <button
            onClick={handleCopySpecs}
            className="px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-medium transition-colors flex items-center space-x-1.5"
            title="Copy exact print dimensions and geometry specs for KDP / IngramSpark"
          >
            {copiedSpec ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-mono hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden sm:inline">Copy Specs</span>
              </>
            )}
          </button>

          {/* Side Drawer Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === "none" ? "spine" : "none")}
            className={`p-2 rounded-xl border transition-colors ${
              activeSidePanel !== "none"
                ? "bg-purple-950/80 border-purple-500/50 text-purple-300"
                : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
            title="Toggle Spine & Typography Settings Panel"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen API Toggle */}
          <button
            onClick={toggleNativeFullscreen}
            className="p-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
            title={isNativeFullscreen ? "Exit Native Fullscreen" : "Enter Native Fullscreen"}
          >
            {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors"
            title="Close Preview (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Exit Button when in Clean Screenshot Mode */}
      {isCleanScreenshotMode && (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
          <button
            onClick={() => setIsCleanScreenshotMode(false)}
            className="px-4 py-2 rounded-2xl bg-black/90 border border-amber-400/80 text-amber-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center space-x-2 hover:bg-black"
          >
            <Eye className="w-4 h-4" />
            <span>Exit Screenshot Mode</span>
          </button>
        </div>
      )}

      {/* Main View Area with Stage and Collapsible Inspector Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Stage Canvas Area */}
        <main
          className={`flex-1 overflow-auto flex items-center justify-center bg-[radial-gradient(#1c1917_1px,transparent_1px)] [background-size:16px_16px] bg-stone-950 transition-all ${
            isCleanScreenshotMode ? "p-2 sm:p-4" : "p-3 sm:p-6 md:p-8"
          }`}
        >
          {/* ========================================================================= */}
          {/* 1. COMMERCIAL FULL JACKET WRAP SPREAD (2D Print) */}
          {/* ========================================================================= */}
          {viewMode === "wrap" && (
            <div className="flex flex-col items-center justify-center w-full max-w-5xl space-y-3 animate-scaleUp">
              {/* Top Ruler / Bleed Spec Banner (Hidden in Clean Screenshot Mode) */}
              {!isCleanScreenshotMode && showGuides && (
                <div className="w-full flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono text-stone-400 px-2">
                  <span className="flex items-center space-x-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>Bleed: 0.125" (3.2mm) • Safe Margins: 0.25"</span>
                  </span>
                  <span className="text-stone-500">
                    Total Spread: {spineMetrics.totalWrapWidthInches}" x {spineMetrics.totalWrapHeightInches}" ({spineMetrics.spineWidthFormatted} spine)
                  </span>
                </div>
              )}

              {/* Complete Wrap Layout Container - Scaled and Aspect-Fitted for All Screens */}
              <div
                ref={wrapSpreadRef}
                className={`relative rounded-xl overflow-hidden shadow-2xl border transition-all duration-300 flex flex-row w-full max-h-[82vh] aspect-[12.3/9] ${
                  showGuides && !isCleanScreenshotMode ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-stone-800"
                }`}
                style={{
                  backgroundColor: "#0c0a09",
                }}
              >
                {/* ----------------- BACK COVER (Left 1/3) ----------------- */}
                <div className="flex-[4] relative p-3 sm:p-5 md:p-7 flex flex-col justify-between bg-stone-950/95 text-stone-300 border-r border-stone-800/80 overflow-hidden">
                  {/* Subtle Paper Texture Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-900/60 to-stone-950/90 pointer-events-none" />

                  {/* Top: Sales Hook & Praise */}
                  <div className="relative z-10 space-y-1.5 sm:space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold px-1.5 sm:px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                        {book.genre}
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-mono text-stone-500">
                        USD $16.99 / GBP £13.99
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-xs sm:text-sm md:text-base text-stone-100 leading-snug line-clamp-2">
                      {book.publishingKit?.salesBlurb?.hook || "AN UNFORGETTABLE JOURNEY OF ETHICAL INNOVATION & VISION"}
                    </h3>

                    <p className="text-[9px] sm:text-[11px] md:text-xs text-stone-400 leading-relaxed line-clamp-3 sm:line-clamp-4 md:line-clamp-6">
                      {book.publishingKit?.salesBlurb?.body || book.premise || "Within the shifting currents of speculative lore, secrets long buried threaten to transform the boundaries of imagination."}
                    </p>
                  </div>

                  {/* Bottom: Author Bio, Imprint & Barcode */}
                  <div className="relative z-10 pt-2 sm:pt-4 border-t border-stone-800/80 flex items-end justify-between gap-1 sm:gap-2">
                    <div className="space-y-0.5 sm:space-y-1 max-w-[60%]">
                      <div className="font-serif font-bold text-[9px] sm:text-[11px] text-stone-200">
                        {book.author}
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-stone-400 line-clamp-1 sm:line-clamp-2">
                        {book.formattingSettings?.authorBio || "Author of acclaimed works on ethical provenance and sovereign creation."}
                      </div>
                      <div className="text-[7px] sm:text-[8px] font-mono text-stone-500">
                        {book.publishingKit?.publisherImprint || "Rhythm Logic Publishing • Red Deer, Alberta, Canada"}
                      </div>
                    </div>

                    {/* Official EAN / ISBN Barcode Box */}
                    <div className="bg-white p-1 sm:p-1.5 rounded flex flex-col items-center justify-center shrink-0 shadow-md">
                      <div className="font-mono text-[6px] sm:text-[8px] text-black tracking-tighter leading-none text-center font-bold">
                        ||||| || |||| ||||| ||| ||||
                      </div>
                      <div className="font-mono text-[5px] sm:text-[7px] text-black tracking-tight leading-none mt-0.5">
                        {book.publishingKit?.isbn || "978-1-95482-104-9"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ----------------- SPINE (Center) ----------------- */}
                <div
                  className="relative flex flex-col items-center justify-between py-3 sm:py-6 px-0.5 sm:px-1 border-r border-stone-800 transition-all duration-300 select-none"
                  style={{
                    width: `${Math.max(36, Math.min(100, spineMetrics.spineWidthInches * 90))}px`,
                    backgroundColor: spineBgColor,
                    color: spineTextColor,
                  }}
                >
                  {/* Left & Right Crease Hinge Shadows */}
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-l from-black/60 to-transparent pointer-events-none" />

                  {/* Top Imprint / Logo Glyph */}
                  {includePublisherGlyph && (
                    <div className="z-10 flex flex-col items-center opacity-80 shrink-0">
                      <span className="font-serif text-[8px] sm:text-[10px] text-amber-400 font-bold">𝔗</span>
                    </div>
                  )}

                  {/* Spine Title (Auto-Formatted & Auto-Aligned) */}
                  <div className="flex-1 flex items-center justify-center w-full overflow-hidden my-1 sm:my-2">
                    {spineOrientation === "western" ? (
                      /* Standard Western Spine: Rotated -90deg */
                      <div className="transform -rotate-90 origin-center flex items-center space-x-2 sm:space-x-4 whitespace-nowrap">
                        <span
                          className={`font-serif font-black tracking-widest text-stone-100 uppercase drop-shadow-sm ${coverTitleFont}`}
                          style={{
                            fontSize: `${Math.max(8, spineMetrics.effectiveFontSizePx * 0.85)}px`,
                            letterSpacing: `${spineMetrics.letterSpacingEm}em`,
                          }}
                        >
                          {spineMetrics.formattedTitle}
                        </span>

                        {spineMetrics.formattedSubtitle && (
                          <span className="text-[8px] sm:text-[10px] font-sans opacity-70 italic">
                            — {spineMetrics.formattedSubtitle}
                          </span>
                        )}

                        <span
                          className="font-mono uppercase font-bold text-[8px] sm:text-[10px] opacity-90"
                          style={{ color: spineAccentColor }}
                        >
                          {spineMetrics.formattedAuthor}
                        </span>
                      </div>
                    ) : spineOrientation === "vertical-stack" ? (
                      /* Vertical Stacked Characters */
                      <div className="flex flex-col items-center space-y-0.5 sm:space-y-1 text-center font-serif font-bold text-[8px] sm:text-[10px] leading-tight text-stone-100">
                        {spineMetrics.formattedTitle.slice(0, 16).split("").map((char, idx) => (
                          <span key={idx} className="block">
                            {char === " " ? "•" : char}
                          </span>
                        ))}
                      </div>
                    ) : (
                      /* Horizontal Text (Wide Spine) */
                      <div className="text-center space-y-0.5 sm:space-y-1">
                        <div
                          className="font-serif font-bold text-stone-100 leading-tight"
                          style={{ fontSize: `${Math.max(8, spineMetrics.effectiveFontSizePx * 0.85)}px` }}
                        >
                          {spineMetrics.formattedTitle}
                        </div>
                        <div className="text-[7px] sm:text-[9px] font-mono text-amber-400">
                          {spineMetrics.formattedAuthor}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Imprint Name */}
                  <div className="z-10 text-[6px] sm:text-[8px] font-mono uppercase tracking-tighter opacity-60 text-center shrink-0">
                    POD
                  </div>
                </div>

                {/* ----------------- FRONT COVER (Right 1/3) ----------------- */}
                <div className="flex-[4] relative p-3 sm:p-5 md:p-7 flex flex-col justify-between overflow-hidden bg-stone-950">
                  {/* Background Artwork */}
                  <img
                    src={coverImageSrc}
                    alt="Front Cover Artwork"
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Contrast Shield Mask */}
                  {coverMaskMode === "vignette" && (
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/30 to-stone-950/85 pointer-events-none" />
                  )}
                  {coverMaskMode === "backplate" && (
                    <div className="absolute inset-0 bg-stone-950/45 pointer-events-none" />
                  )}
                  {coverMaskMode === "cinema" && (
                    <div className="absolute inset-0 bg-gradient-to-b from-stone-950/90 via-transparent to-stone-950/95 pointer-events-none" />
                  )}
                  {coverMaskMode === "subtle" && (
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/65 via-transparent to-stone-950/40 pointer-events-none" />
                  )}

                  {/* Top Genre / Praise Badge */}
                  <div className="relative z-10 text-center">
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-widest font-mono text-amber-300 font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-md shadow-lg">
                      {book.genre}
                    </span>
                  </div>

                  {/* Center / Bottom: Title, Subtitle & Author */}
                  <div
                    className={`relative z-10 text-center space-y-1 sm:space-y-2 ${
                      coverMaskMode === "backplate"
                        ? "bg-black/75 p-2 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-md"
                        : ""
                    }`}
                  >
                    <h1
                      className={`text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.95)] leading-tight ${coverTitleFont}`}
                    >
                      {book.title}
                    </h1>

                    {book.subtitle && (
                      <p className="text-[10px] sm:text-xs md:text-sm font-serif text-amber-200/90 italic drop-shadow max-w-sm mx-auto leading-relaxed line-clamp-2">
                        {book.subtitle}
                      </p>
                    )}

                    <div className="pt-1 sm:pt-2">
                      <span
                        className="text-[9px] sm:text-xs uppercase tracking-widest font-mono font-bold drop-shadow-md px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-md bg-black/60 border border-white/15 inline-block"
                        style={{ color: coverAccentColor }}
                      >
                        {book.author}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. INTERACTIVE 3D REALISTIC BOOK PERSPECTIVE */}
          {/* ========================================================================= */}
          {viewMode === "3d" && (
            <div className="flex flex-col items-center justify-center max-w-full space-y-6 animate-scaleUp">
              {/* 3D Angle Switcher Toolbar */}
              <div className="flex items-center space-x-2 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-800 shadow-xl">
                <button
                  onClick={() => setThreeDAngle("front34")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    threeDAngle === "front34"
                      ? "bg-purple-600 text-white font-bold shadow"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  3/4 Front Angle
                </button>
                <button
                  onClick={() => setThreeDAngle("spine34")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    threeDAngle === "spine34"
                      ? "bg-purple-600 text-white font-bold shadow"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  3/4 Spine Angle
                </button>
                <button
                  onClick={() => setThreeDAngle("back34")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    threeDAngle === "back34"
                      ? "bg-purple-600 text-white font-bold shadow"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  3/4 Back Angle
                </button>
                <button
                  onClick={() => setThreeDAngle("layflat")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    threeDAngle === "layflat"
                      ? "bg-purple-600 text-white font-bold shadow"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Lay-Flat Open Spread
                </button>
              </div>

              {/* 3D Perspective Stage Container */}
              <div
                className="relative flex items-center justify-center p-8 transition-transform duration-700 ease-out"
                style={{
                  perspective: "1200px",
                  minHeight: "480px",
                }}
              >
                {/* 3D Book Assembly */}
                <div
                  className="relative transition-all duration-700 ease-out transform-gpu cursor-grab active:cursor-grabbing"
                  style={{
                    width: threeDAngle === "layflat" ? "680px" : "320px",
                    height: "460px",
                    transformStyle: "preserve-3d",
                    transform:
                      threeDAngle === "front34"
                        ? "rotateY(-25deg) rotateX(10deg)"
                        : threeDAngle === "spine34"
                        ? "rotateY(45deg) rotateX(8deg)"
                        : threeDAngle === "back34"
                        ? "rotateY(155deg) rotateX(10deg)"
                        : "rotateX(30deg) rotateY(0deg)",
                  }}
                >
                  {/* Book Spine Curvature Side Plate in 3D */}
                  {threeDAngle !== "layflat" && (
                    <div
                      className="absolute top-0 bottom-0 left-0 flex flex-col items-center justify-between py-4 px-1 border-r border-black/40 text-stone-200 shadow-2xl origin-left"
                      style={{
                        width: `${Math.max(32, spineMetrics.spineWidthInches * 60)}px`,
                        backgroundColor: spineBgColor,
                        transform: "rotateY(-90deg) translateX(-100%)",
                        boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)",
                      }}
                    >
                      <span className="text-[8px] font-mono text-amber-400">𝔗</span>
                      <div className="transform -rotate-90 origin-center whitespace-nowrap flex items-center space-x-2">
                        <span
                          className="font-serif font-black text-stone-100 text-[10px] uppercase tracking-wider"
                          style={{ fontSize: `${Math.max(8, spineMetrics.autoFontSizePt - 1)}px` }}
                        >
                          {spineMetrics.formattedTitle}
                        </span>
                        <span className="text-[8px] font-mono text-emerald-400">
                          {spineMetrics.formattedAuthor}
                        </span>
                      </div>
                      <span className="text-[7px] font-mono text-stone-500">POD</span>
                    </div>
                  )}

                  {/* 3D Page Block Edge (Thickness) */}
                  {threeDAngle !== "layflat" && (
                    <div
                      className="absolute top-2 bottom-2 right-0 bg-[#e7e5e4] shadow-inner origin-right"
                      style={{
                        width: `${Math.max(24, spineMetrics.spineWidthInches * 50)}px`,
                        transform: "rotateY(90deg) translateZ(0px)",
                        backgroundImage: "repeating-linear-gradient(to bottom, #d6d3d1 0px, #e7e5e4 2px, #f5f5f4 4px)",
                      }}
                    />
                  )}

                  {/* Front Cover 3D Panel */}
                  <div
                    className="absolute inset-0 rounded-r-xl overflow-hidden shadow-2xl bg-stone-950 flex flex-col justify-between p-6"
                    style={{
                      transform: "translateZ(0px)",
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.95)",
                    }}
                  >
                    <img
                      src={coverImageSrc}
                      alt="Cover 3D"
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Contrast Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/80 pointer-events-none" />

                    {/* Top Genre */}
                    <div className="relative z-10 text-center">
                      <span className="text-[8px] uppercase tracking-widest font-mono text-amber-300 font-bold px-2.5 py-0.5 rounded-full bg-black/60 border border-white/20">
                        {book.genre}
                      </span>
                    </div>

                    {/* Title & Author */}
                    <div className="relative z-10 text-center space-y-2">
                      <h2 className={`text-2xl font-black text-white drop-shadow-md leading-tight ${coverTitleFont}`}>
                        {book.title}
                      </h2>
                      {book.subtitle && (
                        <p className="text-[11px] font-serif text-amber-200/90 italic">
                          {book.subtitle}
                        </p>
                      )}
                      <div className="pt-2">
                        <span
                          className="text-[10px] uppercase font-mono font-bold px-3 py-0.5 rounded bg-black/60 border border-white/10"
                          style={{ color: coverAccentColor }}
                        >
                          {book.author}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-stone-500">
                Tip: Switch angle presets above to view spine curvature, paper edge thickness, and back cover.
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. FRONT COVER SOLO */}
          {/* ========================================================================= */}
          {viewMode === "front" && (
            <div className="flex flex-col items-center justify-center max-w-full space-y-4 animate-scaleUp">
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 bg-stone-950 flex flex-col justify-between p-8"
                style={{
                  width: "360px",
                  height: "540px",
                }}
              >
                <img
                  src={coverImageSrc}
                  alt="Front Cover Solo"
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Mask */}
                {coverMaskMode === "vignette" && (
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/30 to-stone-950/85 pointer-events-none" />
                )}
                {coverMaskMode === "backplate" && (
                  <div className="absolute inset-0 bg-stone-950/45 pointer-events-none" />
                )}
                {coverMaskMode === "cinema" && (
                  <div className="absolute inset-0 bg-gradient-to-b from-stone-950/90 via-transparent to-stone-950/95 pointer-events-none" />
                )}

                <div className="relative z-10 text-center">
                  <span className="text-[9px] uppercase tracking-widest font-mono text-amber-300 font-bold px-3 py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-md shadow-lg">
                    {book.genre}
                  </span>
                </div>

                <div className="relative z-10 text-center space-y-3">
                  <h1 className={`text-3xl font-black text-white drop-shadow-md leading-tight ${coverTitleFont}`}>
                    {book.title}
                  </h1>
                  {book.subtitle && (
                    <p className="text-xs font-serif text-amber-200/90 italic">
                      {book.subtitle}
                    </p>
                  )}
                  <div className="pt-2">
                    <span
                      className="text-xs uppercase tracking-widest font-mono font-bold drop-shadow px-3.5 py-1 rounded bg-black/60 border border-white/10"
                      style={{ color: coverAccentColor }}
                    >
                      {book.author}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. ISOLATED SPINE CALIPER & AUTO-FORMATTING RULER */}
          {/* ========================================================================= */}
          {viewMode === "spine" && (
            <div className="flex flex-col items-center justify-center max-w-full space-y-6 animate-scaleUp">
              {/* Millimeter & Inch Ruler Caliper Header */}
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3 max-w-md w-full shadow-xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 font-bold flex items-center space-x-1.5">
                    <Ruler className="w-4 h-4" />
                    <span>PRECISION SPINE CALIPER</span>
                  </span>
                  <span className="text-stone-300 font-bold">{spineMetrics.spineWidthFormatted}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                  <div className="p-2 rounded-xl bg-stone-950 border border-stone-800">
                    <span className="text-stone-500 block">Pages</span>
                    <span className="text-stone-100 font-bold">{effectivePages}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-950 border border-stone-800">
                    <span className="text-stone-500 block">Paper PPI</span>
                    <span className="text-stone-100 font-bold">{spineMetrics.paperProfile.ppi}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-950 border border-stone-800">
                    <span className="text-stone-500 block">Auto Font</span>
                    <span className="text-emerald-400 font-bold">{spineMetrics.autoFontSizePt} pt</span>
                  </div>
                </div>

                {spineMetrics.warningMessage && (
                  <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] leading-tight">
                    {spineMetrics.warningMessage}
                  </div>
                )}
              </div>

              {/* Isolated Scaled Spine Strip */}
              <div className="flex items-center space-x-6">
                {/* Visual Height & Caliper Guides */}
                <div
                  className="relative rounded-lg shadow-2xl border border-stone-700 flex flex-col items-center justify-between py-8 px-2 select-none"
                  style={{
                    width: `${Math.max(64, spineMetrics.spineWidthInches * 140)}px`,
                    height: "540px",
                    backgroundColor: spineBgColor,
                    color: spineTextColor,
                  }}
                >
                  <span className="font-serif text-sm text-amber-400 font-bold">𝔗</span>

                  {/* Rotated Western Spine Text */}
                  <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
                    <div className="transform -rotate-90 origin-center whitespace-nowrap flex items-center space-x-6">
                      <span
                        className={`font-serif font-black uppercase text-stone-100 tracking-widest ${coverTitleFont}`}
                        style={{
                          fontSize: `${spineMetrics.effectiveFontSizePx}px`,
                          letterSpacing: `${spineMetrics.letterSpacingEm}em`,
                        }}
                      >
                        {spineMetrics.formattedTitle}
                      </span>
                      {spineMetrics.formattedSubtitle && (
                        <span className="text-xs font-sans italic opacity-80">
                          — {spineMetrics.formattedSubtitle}
                        </span>
                      )}
                      <span
                        className="font-mono text-xs uppercase font-bold"
                        style={{ color: spineAccentColor }}
                      >
                        {spineMetrics.formattedAuthor}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono uppercase text-stone-400">
                    {book.publishingKit?.publisherImprint?.slice(0, 12) || "RHYTHM LOGIC"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. BACK COVER SOLO */}
          {/* ========================================================================= */}
          {viewMode === "back" && (
            <div className="flex flex-col items-center justify-center max-w-full space-y-4 animate-scaleUp">
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 bg-stone-950 p-8 flex flex-col justify-between text-stone-300"
                style={{
                  width: "360px",
                  height: "540px",
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                      {book.genre}
                    </span>
                    <span className="text-[9px] font-mono text-stone-500">
                      $16.99 USD
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-stone-100 leading-snug">
                    {book.publishingKit?.salesBlurb?.hook || "THE DEFINITIVE BLUEPRINT FOR ETHICAL CREATOR INNOVATION"}
                  </h3>

                  <p className="text-xs text-stone-400 leading-relaxed line-clamp-6">
                    {book.publishingKit?.salesBlurb?.body || book.premise || "Within the shifting currents of speculative lore, secrets long buried threaten to transform the boundaries of imagination."}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800 flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="font-serif font-bold text-xs text-stone-200">
                      {book.author}
                    </div>
                    <div className="text-[9px] font-mono text-stone-500">
                      {book.publishingKit?.publisherImprint || "Rhythm Logic Publishing • Red Deer, Alberta, Canada"}
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded flex flex-col items-center justify-center">
                    <div className="font-mono text-[8px] text-black tracking-tighter font-bold">
                      ||||| || |||| ||||| ||| ||||
                    </div>
                    <div className="font-mono text-[7px] text-black tracking-tight">
                      {book.publishingKit?.isbn || "978-1-95482-104-9"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* RIGHT COLLAPSIBLE INSPECTOR & AUTO-FORMATTING DRAWER */}
        {/* ========================================================================= */}
        {activeSidePanel !== "none" && (
          <aside className="w-80 sm:w-96 bg-stone-900/95 border-l border-stone-800 p-5 overflow-y-auto shrink-0 space-y-6 shadow-2xl animate-slideLeft">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-sm text-stone-100">
                  Spine & Cover Caliper
                </h3>
              </div>
              <button
                onClick={() => setActiveSidePanel("none")}
                className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spine Auto-Formatting Engine Section */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Type className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-stone-200">
                    Spine Title Auto-Formatting
                  </span>
                </div>
                <button
                  onClick={() => setAutoFitSpine(!autoFitSpine)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                    autoFitSpine
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-stone-800 text-stone-400"
                  }`}
                >
                  {autoFitSpine ? "Auto-Fit ON" : "Manual"}
                </button>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed">
                Calculates optimal font size and character spacing from manuscript page count and spine thickness to prevent text truncation.
              </p>

              {/* Live Metric Readout */}
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-stone-400">
                  <span>Computed Spine Width:</span>
                  <span className="text-amber-400 font-bold">{spineMetrics.spineWidthFormatted}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Optimal Font Size:</span>
                  <span className="text-emerald-400 font-bold">{spineMetrics.autoFontSizePt} pt</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Letter Tracking:</span>
                  <span className="text-stone-200">{spineMetrics.letterSpacingEm} em</span>
                </div>
              </div>

              {/* Manual Override Slider if Auto-Fit OFF */}
              {!autoFitSpine && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-stone-300">
                    <span>Manual Font Size</span>
                    <span className="font-mono text-amber-400">{manualFontSizePt} pt</span>
                  </div>
                  <input
                    type="range"
                    min={7}
                    max={20}
                    step={0.5}
                    value={manualFontSizePt}
                    onChange={(e) => setManualFontSizePt(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              )}

              {/* Spine Text Orientation */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Text Orientation
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    onClick={() => setSpineOrientation("western")}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      spineOrientation === "western"
                        ? "bg-purple-600/30 border-purple-500 text-stone-100 font-bold"
                        : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    -90° Western
                  </button>
                  <button
                    onClick={() => setSpineOrientation("vertical-stack")}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      spineOrientation === "vertical-stack"
                        ? "bg-purple-600/30 border-purple-500 text-stone-100 font-bold"
                        : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Stacked Letters
                  </button>
                  <button
                    onClick={() => setSpineOrientation("horizontal")}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      spineOrientation === "horizontal"
                        ? "bg-purple-600/30 border-purple-500 text-stone-100 font-bold"
                        : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Horizontal
                  </button>
                </div>
              </div>

              {/* Paper PPI Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Paper Stock & PPI
                </label>
                <select
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value as PaperType)}
                  className="w-full rounded-xl bg-stone-900 border border-stone-800 text-stone-200 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="white-50lb">Standard White 50# (PPI 444)</option>
                  <option value="cream-50lb">Warm Cream 50# (PPI 434)</option>
                  <option value="white-60lb">Premium White 60# (PPI 380)</option>
                  <option value="heavy-70lb">Archival Heavy 70# (PPI 320)</option>
                </select>
              </div>

              {/* Page Count Override Toggle */}
              <div className="space-y-2 pt-2 border-t border-stone-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-medium">Page Count Override</span>
                  <input
                    type="checkbox"
                    checked={isCustomPageOverride}
                    onChange={(e) => setIsCustomPageOverride(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                </div>
                {isCustomPageOverride && (
                  <input
                    type="number"
                    min={48}
                    max={1500}
                    value={customPageCount || effectivePages}
                    onChange={(e) => setCustomPageCount(parseInt(e.target.value) || 100)}
                    className="w-full rounded-xl bg-stone-900 border border-stone-800 text-stone-100 p-2 text-xs font-mono"
                  />
                )}
              </div>

              {/* Spine Colors */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] text-stone-400 font-mono mb-1">Spine Background</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={spineBgColor}
                      onChange={(e) => setSpineBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-stone-700"
                    />
                    <span className="text-[10px] font-mono text-stone-300">{spineBgColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-stone-400 font-mono mb-1">Author Accent</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={spineAccentColor}
                      onChange={(e) => setSpineAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-stone-700"
                    />
                    <span className="text-[10px] font-mono text-stone-300">{spineAccentColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Front Cover Contrast Shield & Typography */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center space-x-2 text-stone-200 text-xs font-bold font-mono">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Front Cover Typography</span>
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 font-mono mb-1">Title Font Family</label>
                <select
                  value={coverTitleFont}
                  onChange={(e) => setCoverTitleFont(e.target.value)}
                  className="w-full rounded-xl bg-stone-900 border border-stone-800 text-stone-200 p-2 text-xs focus:outline-none"
                >
                  <option value="font-serif">Classic Serif Display</option>
                  <option value="font-sans">Modern Bold Sans</option>
                  <option value="font-mono">Technical Spec Mono</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 font-mono mb-1">Contrast Mask Shield</label>
                <select
                  value={coverMaskMode}
                  onChange={(e) => setCoverMaskMode(e.target.value as any)}
                  className="w-full rounded-xl bg-stone-900 border border-stone-800 text-stone-200 p-2 text-xs focus:outline-none"
                >
                  <option value="vignette">Top & Bottom Dark Vignette</option>
                  <option value="backplate">Solid Dark Glass Backplates</option>
                  <option value="cinema">Deep Cinema Gradient</option>
                  <option value="subtle">Subtle Contrast</option>
                  <option value="none">No Mask (Raw Art)</option>
                </select>
              </div>
            </div>

            {/* Download & Export Tools */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() =>
                  downloadSingleArtworkFile(
                    coverImageSrc,
                    `${book.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Full_Cover_Art.png`
                  )
                }
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-stone-100 font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-purple-950/40"
              >
                <Download className="w-4 h-4" />
                <span>Download Front Cover (PNG)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4 text-stone-400" />
                <span>Print Jacket Mockup</span>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
