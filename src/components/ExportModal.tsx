import React, { useState } from "react";
import {
  Download,
  FileText,
  Copy,
  Check,
  Printer,
  Sparkles,
  Layers,
  Code,
  BookOpen,
  ShieldCheck,
  Leaf,
  CheckCircle2,
  Package,
  PackageCheck,
  FileArchive,
  ExternalLink,
  BookMarked,
  Info,
  Loader2,
  HeartHandshake,
  Headphones,
} from "lucide-react";
import { Book, PublisherPlatform, OriginalityReport } from "../types";
import { finalizeManuscriptExport } from "../services/c2paPublishingEngine";
import {
  PUBLISHER_PLATFORMS,
  generatePrintableManuscriptHTML,
  createPublisherPackageZip,
  calculatePrintSpine,
} from "../services/publisherExportService";
import {
  downloadFullAudiobookZip,
  AUDIOBOOK_VOICE_PRESETS,
  DEFAULT_AUDIOBOOK_SETTINGS,
  generateChapterNarrationScript,
} from "../services/audiobookService";

interface ExportModalProps {
  book: Book;
  onClose: () => void;
  onUpdateBook?: (updatedBook: Book) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ book, onClose, onUpdateBook }) => {
  const [activeTab, setActiveTab] = useState<"publisher_bundle" | "quick_formats">("publisher_bundle");
  const [selectedPlatform, setSelectedPlatform] = useState<PublisherPlatform>("amazon_kdp");
  const [isBundlingZip, setIsBundlingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<string>("");
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [lastManifestNotice, setLastManifestNotice] = useState<string | null>(null);

  const spine = calculatePrintSpine(book);
  const currentPlatformConfig = PUBLISHER_PLATFORMS[selectedPlatform] || PUBLISHER_PLATFORMS.amazon_kdp;

  // Combine Book Art and PDF into Download Package (.zip)
  const handleDownloadPublisherPackage = async () => {
    setIsBundlingZip(true);
    setZipProgress("Initializing C2PA manifest & packaging assets...");

    try {
      setZipProgress("Rendering typeset manuscript & back cover package...");
      const zipBlob = await createPublisherPackageZip(book, selectedPlatform);
      
      setZipProgress("Finalizing compressed package (.zip)...");
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${sanitizedTitle}_${selectedPlatform.toUpperCase()}_Publishing_Package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastManifestNotice(
        `Successfully bundled ${currentPlatformConfig.name} package with art, PDF manuscript, and verified provenance.`
      );
    } catch (err: any) {
      alert("Failed to bundle publisher package: " + err.message);
    } finally {
      setIsBundlingZip(false);
      setZipProgress("");
    }
  };

  // Generate HTML for print / PDF export with C2PA metadata header & H.U.M.A.N. pledge
  const handlePrintDocument = async () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate the printable PDF document.");
      return;
    }

    const htmlContent = await generatePrintableManuscriptHTML(book, selectedPlatform);
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setLastManifestNotice("Printable PDF Window Opened • Ready for Print / Save as PDF");
  };

  // Generate full markdown formatted book with injected C2PA metadata
  const generateMarkdown = async () => {
    let md = `# ${book.title}\n`;
    if (book.subtitle) md += `*${book.subtitle}*\n\n`;
    md += `**By ${book.author}**\n\n`;
    md += `---\n\n`;

    if (book.formattingSettings?.dedicationText) {
      md += `*${book.formattingSettings.dedicationText}*\n\n---\n\n`;
    }

    book.chapters.forEach((ch) => {
      md += `## Chapter ${ch.number}: ${ch.title}\n\n`;
      if (ch.setting) md += `*Setting: ${ch.setting} | POV: ${ch.pov}*\n\n`;
      md += `${ch.content || ""}\n\n`;
      md += `* * *\n\n`;
    });

    if (book.formattingSettings?.authorBio) {
      md += `## About the Author\n\n${book.formattingSettings.authorBio}\n\n`;
    }

    const c2paResult = await finalizeManuscriptExport(md, {
      title: book.title,
      author: book.author,
      genre: book.genre,
    });

    if (c2paResult?.embeddedPayload) {
      md += `\n\n${c2paResult.embeddedPayload}\n`;
    }

    return md;
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = async () => {
    const md = await generateMarkdown();
    handleDownloadFile(
      md,
      `${book.title.replace(/\s+/g, "_")}_Manuscript.md`,
      "text/markdown"
    );
    setLastManifestNotice("Markdown Manuscript Downloaded with C2PA Header");
  };

  const handleCopyMarkdown = async () => {
    const md = await generateMarkdown();
    navigator.clipboard.writeText(md);
    setCopiedFormat("markdown");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleExportProjectJSON = async () => {
    const c2paResult = await finalizeManuscriptExport(book, {
      title: book.title,
      author: book.author,
    });

    const exportObject = {
      ...book,
      c2paManifest: {
        hash: c2paResult.manifestHash,
        fairlyTrainedId: c2paResult.fairlyTrainedId,
        claimGenerator: c2paResult.claimGenerator,
        covenant: c2paResult.covenant,
        attributionSplit: c2paResult.attributionSplit,
        injectedAt: c2paResult.injectedTimestamp,
      },
    };

    handleDownloadFile(
      JSON.stringify(exportObject, null, 2),
      `${book.title.replace(/\s+/g, "_")}_TomeCrafter_Archive.json`,
      "application/json"
    );
    setLastManifestNotice("JSON Project Archive with C2PA Provenance Stamped");
  };

  // Count total illustrations
  const totalIllustrations = book.chapters.reduce(
    (sum, ch) => sum + (ch.illustrations ? ch.illustrations.length : 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 p-6 bg-stone-950/80 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Package className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif font-bold text-xl text-stone-100">
                  Publisher Packages & Master Export Combiner
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 border border-stone-700">
                  v2.6 C2PA Ready
                </span>
              </div>
              <p className="text-xs text-stone-400">
                "{book.title}" by {book.author} • {book.chapters.length} Chapters • ~{spine.estimatedPages} Pages ({spine.totalWords.toLocaleString()} Words) • {totalIllustrations} Scene Illustrations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* C2PA Provenance & Cleanroom Status Bar */}
        <div className="px-6 py-2.5 bg-[#171f14] border-b border-[#3b4e2d] text-[#c9dfb8] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <Leaf className="w-4 h-4 text-[#8cb86d]" />
            <span className="font-semibold">C2PA JUMBF Manifest Injector:</span>
            <span className="font-mono text-[11px] text-emerald-300">FT-ETHIC-TOMECRAFTER-2026</span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400 font-mono text-[10px]">
              Spine: {spine.spineWidthInches} in ({spine.spineWidthMm} mm)
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-emerald-300 font-medium">Standard Direct Author Royalty • Verified Cleanroom</span>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 pt-4 border-b border-stone-800 bg-stone-900/60 shrink-0">
          <button
            onClick={() => setActiveTab("publisher_bundle")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === "publisher_bundle"
                ? "bg-stone-900 text-amber-400 border-stone-700 border-b-stone-900"
                : "text-stone-400 hover:text-stone-200 border-transparent"
            }`}
          >
            <PackageCheck className="w-4 h-4 text-amber-400" />
            <span>Publisher Art & PDF Combiner (Amazon KDP, Ingram, etc.)</span>
          </button>

          <button
            onClick={() => setActiveTab("quick_formats")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === "quick_formats"
                ? "bg-stone-900 text-amber-400 border-stone-700 border-b-stone-900"
                : "text-stone-400 hover:text-stone-200 border-transparent"
            }`}
          >
            <FileText className="w-4 h-4 text-stone-400" />
            <span>Quick Manuscript Formats (.md, .json, .txt)</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {lastManifestNotice && (
            <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fadeIn">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{lastManifestNotice}</span>
              </div>
              <button
                onClick={() => setLastManifestNotice(null)}
                className="text-emerald-400 hover:text-emerald-200 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === "publisher_bundle" ? (
            /* TAB 1: PUBLISHER BUNDLE & ART COMBINER */
            <div className="space-y-6">

              {/* Publisher Platform Selector Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-amber-400 tracking-wider">
                    Select Target Publisher / Marketplace Format
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Calculates trim, spine width ({spine.spineWidthInches} in), and color profile
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(Object.keys(PUBLISHER_PLATFORMS) as PublisherPlatform[]).map((platformKey) => {
                    const platform = PUBLISHER_PLATFORMS[platformKey];
                    const isSelected = selectedPlatform === platformKey;
                    return (
                      <button
                        key={platformKey}
                        onClick={() => setSelectedPlatform(platformKey)}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[90px] ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-950/30"
                            : "bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-serif font-bold text-xs truncate ${isSelected ? "text-amber-300" : "text-stone-200"}`}>
                              {platform.name.split("(")[0]}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 line-clamp-2 leading-tight">
                            {platform.tagline}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-stone-800/60 text-[9px] font-mono">
                          <span className="text-stone-500">{platform.interiorFileExtension.toUpperCase()} + ART</span>
                          <span className="text-amber-400/80 truncate max-w-[80px]">
                            {platform.recommendedTrim.split(" ")[0]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Publisher Specifications & Package Combiner Card */}
              <div className="p-6 rounded-3xl bg-stone-950 border border-stone-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-serif font-bold text-base text-stone-100">
                        {currentPlatformConfig.name} Specifications
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                        {currentPlatformConfig.targetFormat}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">{currentPlatformConfig.tagline}</p>
                  </div>

                  <a
                    href={currentPlatformConfig.guidelinesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-mono"
                  >
                    <span>Publisher Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Platform Specs Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-stone-500 block">Recommended Trim</span>
                    <span className="font-semibold text-stone-200">{currentPlatformConfig.recommendedTrim}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-stone-500 block">Color Profile</span>
                    <span className="font-semibold text-stone-200">{currentPlatformConfig.colorSpace}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-stone-500 block">Computed Spine</span>
                    <span className="font-semibold font-mono text-amber-300">
                      {spine.spineWidthInches}" ({spine.spineWidthMm}mm)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-stone-500 block">Cover Spread Spec</span>
                    <span className="font-semibold text-stone-200 truncate block">
                      {currentPlatformConfig.coverRequirement}
                    </span>
                  </div>
                </div>

                {/* Package Breakdown Checklist */}
                <div className="space-y-2 p-4 rounded-2xl bg-stone-900/50 border border-stone-800/80 text-xs">
                  <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block mb-1">
                    Package Contents Included in Combined Download (.zip):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-300">
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Typeset Manuscript Interior (HTML / PDF Ready)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Front Cover Artwork (High-Res 300 DPI)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Back Cover Spread with Barcode & Provenance</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{totalIllustrations} In-Chapter Scene Illustrations (WebP/PNG)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>C2PA Cryptographic Provenance Manifest & Hash</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Marketplace Metadata Manifest & ISBN Specs (JSON)</span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons: Combine & Download (.zip) + Save PDF */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleDownloadPublisherPackage}
                    disabled={isBundlingZip}
                    className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-sm transition-all shadow-xl shadow-amber-950/40 flex items-center justify-center space-x-2 disabled:opacity-60"
                  >
                    {isBundlingZip ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-stone-950" />
                        <span>{zipProgress || "Bundling Publisher Archive..."}</span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="w-5 h-5 text-stone-950" />
                        <span>Combine Book Art & PDF (Download {currentPlatformConfig.name.split(" ")[0]} .ZIP)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrintDocument}
                    className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs border border-stone-700 flex items-center justify-center space-x-2 transition-colors shrink-0"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Print / Save PDF Manuscript</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: QUICK MANUSCRIPT FORMATS */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Option 1: Print / PDF */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <Printer className="w-4 h-4" />
                    <span>Typeset Print / PDF</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    6x9 Trade Paperback format ready with title page, page numbers, C2PA provenance header, and custom typography margins.
                  </p>
                </div>

                <button
                  onClick={handlePrintDocument}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>

              {/* Option 2: Markdown Package */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                    <FileText className="w-4 h-4" />
                    <span>Markdown (.md) Manuscript</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Universal format compatible with Scrivener, Vellum, Obsidian, and Ulysses with C2PA metadata.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportMarkdown}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-center"
                  >
                    Download .md
                  </button>
                  <button
                    onClick={handleCopyMarkdown}
                    className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
                    title="Copy markdown"
                  >
                    {copiedFormat === "markdown" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Option 3: Publishing Bible JSON */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <Code className="w-4 h-4" />
                    <span>Full Book Project (.json)</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Complete archive containing chapter beats, lore bible codex, cover configs, H.U.M.A.N. pledge, and KDP publishing kit.
                  </p>
                </div>

                <button
                  onClick={handleExportProjectJSON}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium flex items-center justify-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Project JSON</span>
                </button>
              </div>

              {/* Option 4: Plain Text */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-stone-300 font-bold">
                    <BookOpen className="w-4 h-4" />
                    <span>Plain Text (.txt)</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Stripped clean text without markdown or formatting tags for raw copy-pasting and text analysis.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const plainText = book.chapters
                      .map((c) => `CHAPTER ${c.number}: ${c.title}\n\n${c.content || ""}\n\n`)
                      .join("\n-------------------------\n\n");
                    handleDownloadFile(
                      plainText,
                      `${book.title.replace(/\s+/g, "_")}_Manuscript.txt`,
                      "text/plain"
                    );
                  }}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium flex items-center justify-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>

              {/* Option 5: Audiobook Master Package (.ZIP) */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-amber-500/30 hover:border-amber-500 transition-all flex flex-col justify-between space-y-4 md:col-span-2">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <Headphones className="w-4 h-4" />
                    <span>Audiobook Master Package (.zip) — Audio & M3U Playlist</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Synthesizes all {book.chapters.length} chapters into mastered audio files, complete with spoken broadcast intro, M3U playlist file, ACX metadata, and spoken narrative transcript.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    const preset = AUDIOBOOK_VOICE_PRESETS[0];
                    const tracks = book.chapters.map((ch) => ({
                      id: `track-${ch.id}`,
                      chapterId: ch.id,
                      chapterNumber: ch.number,
                      chapterTitle: ch.title,
                      wordCount: ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0,
                      estimatedDurationMinutes: Math.max(1, Math.ceil((ch.content?.length || 500) / 750)),
                      status: "idle" as const,
                      voicePresetId: preset.id,
                      voicePresetName: preset.name,
                      narrationScript: generateChapterNarrationScript(book, ch, DEFAULT_AUDIOBOOK_SETTINGS, preset),
                      cues: [],
                    }));
                    await downloadFullAudiobookZip(book, tracks, DEFAULT_AUDIOBOOK_SETTINGS, preset);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/40"
                >
                  <Headphones className="w-4 h-4" />
                  <span>Download Audiobook Master (.ZIP)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stone-800 p-4 px-6 bg-stone-950/90 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <span>ISBN: {book.publishingKit?.isbn || "978-1-95482-104-9"}</span>
            <span>•</span>
            <span>Imprint: {book.publishingKit?.publisherImprint || "Aether & Iron Press"}</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
