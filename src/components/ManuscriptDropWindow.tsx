import React, { useState, useRef, useMemo } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Ruler,
  Sliders,
  AlertCircle,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  ClipboardPaste,
  Loader2,
} from "lucide-react";
import { Book } from "../types";
import {
  BOOK_SIZE_PROFILES,
  BookTrimSize,
  extractTextFromManuscriptFile,
  buildManuscriptImportPreview,
} from "../utils/manuscriptImporter";

interface ManuscriptDropWindowProps {
  book: Book;
  defaultExpanded?: boolean;
  onApplyImport: (updatedBook: Book, firstImportedChapterId?: string, openEditor?: boolean) => void;
}

export const ManuscriptDropWindow: React.FC<ManuscriptDropWindowProps> = ({
  book,
  defaultExpanded = false,
  onApplyImport,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<BookTrimSize>(
    book.formattingSettings?.trimSize || "6x9"
  );
  const [autoFormatTypography, setAutoFormatTypography] = useState<boolean>(true);
  const [rebalanceToFitSize, setRebalanceToFitSize] = useState<boolean>(false);
  const [replaceExistingChapters, setReplaceExistingChapters] = useState<boolean>(true);
  const [fitBookTargetToManuscript, setFitBookTargetToManuscript] = useState<boolean>(true);

  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>("");

  const [loadedRawText, setLoadedRawText] = useState<string | null>(null);
  const [loadedSourceName, setLoadedSourceName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProfile = BOOK_SIZE_PROFILES[selectedSize];

  const preview = useMemo(() => {
    if (!loadedRawText || !loadedRawText.trim()) return null;
    return buildManuscriptImportPreview(loadedRawText, loadedSourceName, book, {
      trimSize: selectedSize,
      autoFormatTypography,
      rebalanceToFitSize,
      replaceExistingChapters,
      fitBookTargetToManuscript,
    });
  }, [
    loadedRawText,
    loadedSourceName,
    book,
    selectedSize,
    autoFormatTypography,
    rebalanceToFitSize,
    replaceExistingChapters,
    fitBookTargetToManuscript,
  ]);

  const handleFileSelected = async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      const extracted = await extractTextFromManuscriptFile(file);
      if (!extracted || !extracted.trim()) {
        setParseError(`"${file.name}" appears to be empty or has no readable text.`);
        return;
      }
      setLoadedRawText(extracted);
      setLoadedSourceName(file.name);
      setIsExpanded(true);
    } catch (err: any) {
      setParseError(err?.message || `Could not read "${file.name}". Try .docx, .txt, .md, .html, .rtf, or .epub.`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
    e.target.value = "";
  };

  const handleLoadPastedManuscript = () => {
    if (!pastedText.trim()) return;
    setParseError(null);
    setLoadedRawText(pastedText);
    setLoadedSourceName("Pasted Manuscript");
    setShowPasteBox(false);
  };

  const handleConfirmImport = (openEditorAfter: boolean) => {
    if (!preview || preview.chapters.length === 0) return;

    const finalChapters = replaceExistingChapters
      ? preview.chapters
      : [...book.chapters, ...preview.chapters];

    const totalWordCount = finalChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    const spineInches = Math.max(0.25, +((preview.estimatedPages * 0.002252) + 0.06).toFixed(2));

    const updatedBook: Book = {
      ...book,
      chapters: finalChapters,
      currentWordCount: totalWordCount,
      targetWordCount: preview.suggestedTargetWords,
      formattingSettings: preview.appliedFormatting,
      publishingKit: {
        ...(book.publishingKit || {
          salesBlurb: { hook: "", body: book.premise || "", callToAction: "" },
          amazonKeywords: [],
          bisacCategories: [],
          targetAudience: book.targetAudience || "Adult Readers",
        }),
        printSpecs: {
          recommendedTrimSize: activeProfile.recommendedTrimLabel,
          estimatedPageCount: preview.estimatedPages,
          spineWidthInches: spineInches,
          margins: activeProfile.margins,
        },
      },
      updatedAt: new Date().toISOString(),
    };

    onApplyImport(updatedBook, preview.chapters[0]?.id, openEditorAfter);
    setLoadedRawText(null);
    setLoadedSourceName("");
    setPastedText("");
    setIsExpanded(false);
  };

  const resetLoaded = () => {
    setLoadedRawText(null);
    setLoadedSourceName("");
    setParseError(null);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`mb-6 rounded-2xl border transition-all shadow-lg overflow-hidden ${
        isDragging
          ? "border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/40"
          : "border-stone-800 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/20"
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.docx,.html,.htm,.rtf,.epub"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Bar (Always Visible — Also Acts as Drop Target When Collapsed) */}
      <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="font-serif font-bold text-stone-100 text-sm sm:text-base">
                Full Manuscript Drop Window
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                DOCX • TXT • MD • EPUB • HTML • RTF
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Drop a complete manuscript to auto-populate chapters and auto-format typography to{" "}
              <span className="text-amber-300 font-medium">
                {activeProfile.label} ({activeProfile.dimensions})
              </span>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all cursor-pointer shadow-md"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Manuscript</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <span>{isExpanded ? "Collapse" : "Open Drop Window"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Drop Window Body */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-stone-800/80 space-y-4">
          {/* Step 1: Select Target Book Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-200 flex items-center space-x-1.5">
                <Ruler className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Select Target Book Size (Auto-Formats Font, Margins & Chapter Budget)</span>
              </span>
              <span className="text-[11px] font-mono text-stone-400">
                {activeProfile.fontSize} • Line {activeProfile.lineSpacing} • ~{activeProfile.chapterWordBudget.toLocaleString()} w/ch
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {(Object.values(BOOK_SIZE_PROFILES) as typeof BOOK_SIZE_PROFILES[BookTrimSize][]).map(
                (profile) => {
                  const active = selectedSize === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedSize(profile.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "bg-amber-500/15 border-amber-400/60 text-stone-100 shadow-sm"
                          : "bg-stone-950/70 border-stone-800 hover:border-stone-700 text-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-serif font-bold text-stone-100">
                          {profile.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            active
                              ? "bg-amber-400 text-stone-950 font-bold"
                              : "bg-stone-800 text-amber-300"
                          }`}
                        >
                          {profile.dimensions}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">
                        {profile.subtitle}
                      </p>
                      <div className="text-[10px] font-mono text-stone-500 mt-1.5">
                        {profile.fontSize} • ~{profile.wordsPerPage} w/pg • {profile.chapterWordBudget.toLocaleString()} w/ch
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Parse Error Banner */}
          {parseError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{parseError}</span>
              </div>
              <button
                type="button"
                onClick={() => setParseError(null)}
                className="text-rose-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Dropzone OR Parsed Manuscript Preview */}
          {!preview ? (
            <div className="space-y-3">
              {!showPasteBox ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-amber-400 bg-amber-500/15 scale-[1.01]"
                      : "border-stone-700 hover:border-amber-500/60 bg-stone-950/60 hover:bg-stone-950/90"
                  }`}
                >
                  {isParsing ? (
                    <div className="flex flex-col items-center space-y-2 py-2">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                      <p className="text-sm font-semibold text-stone-200">
                        Extracting manuscript & detecting chapters...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-serif font-bold text-stone-100">
                          {isDragging
                            ? "Release to drop your manuscript here"
                            : "Drag & drop your full manuscript file here, or click to browse"}
                        </p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xl mx-auto">
                          Supports <strong>.docx</strong>, <strong>.txt</strong>, <strong>.md</strong>,{" "}
                          <strong>.epub</strong>, <strong>.html</strong>, and <strong>.rtf</strong>. Splits
                          strictly on explicit Chapter headings (ignoring page &amp; chapter breaks) and fits
                          formatting to your <strong>{activeProfile.dimensions}</strong> layout.
                        </p>
                      </div>
                      <div className="pt-1 flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors"
                        >
                          Choose File
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPasteBox(true);
                          }}
                          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                          <span>Or Paste Full Text</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-200 flex items-center space-x-1.5">
                      <ClipboardPaste className="w-4 h-4 text-amber-400" />
                      <span>Paste Full Manuscript Text</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(false)}
                      className="text-xs text-stone-400 hover:text-stone-200"
                    >
                      Back to File Drop
                    </button>
                  </div>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={7}
                    placeholder="Paste your entire manuscript here (with Chapter 1, Chapter 2, # headings, or plain prose)..."
                    className="w-full rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs p-3 focus:outline-none focus:border-amber-500 font-serif leading-relaxed"
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(false)}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadPastedManuscript}
                      disabled={!pastedText.trim()}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs disabled:opacity-40"
                    >
                      Parse & Preview Chapters
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Preview & One-Click Populate */
            <div className="rounded-2xl border border-emerald-500/40 bg-stone-950/90 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-serif font-bold text-stone-100 flex items-center space-x-2">
                      <span>{preview.sourceName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Ready to Populate
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">
                      <strong className="text-amber-300">{preview.detectedChapterCount}</strong> chapters detected •{" "}
                      <strong className="text-stone-200">{preview.rawWordCount.toLocaleString()}</strong> words • Est.{" "}
                      <strong className="text-stone-200">{preview.estimatedPages} pages</strong> at{" "}
                      <strong className="text-amber-300">{activeProfile.dimensions}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetLoaded}
                  className="text-xs text-stone-400 hover:text-stone-200 flex items-center space-x-1 self-start sm:self-center"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Choose Different File</span>
                </button>
              </div>

              {/* Formatting & Chapter Split Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-stone-900 border border-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFormatTypography}
                    onChange={(e) => setAutoFormatTypography(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-stone-300">Auto-format quotes & dashes</span>
                </label>

                <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-stone-900 border border-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rebalanceToFitSize}
                    onChange={(e) => setRebalanceToFitSize(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-stone-300">
                    Re-split chapters over ~{activeProfile.chapterWordBudget.toLocaleString()}w
                  </span>
                </label>

                <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-stone-900 border border-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExistingChapters}
                    onChange={(e) => setReplaceExistingChapters(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-stone-300">Replace template chapters</span>
                </label>

                <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-stone-900 border border-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fitBookTargetToManuscript}
                    onChange={(e) => setFitBookTargetToManuscript(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-stone-300">Fit word goal to manuscript</span>
                </label>
              </div>

              {/* Detected Chapter List Preview */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {preview.chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-900/90 border border-stone-800 text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-800 text-amber-400">
                        CH {ch.number}
                      </span>
                      <span className="font-serif font-medium text-stone-200 truncate">
                        {ch.title}
                      </span>
                      <span className="text-[10px] text-stone-500 hidden sm:inline">({ch.act})</span>
                    </div>
                    <span className="font-mono text-[11px] text-stone-400 shrink-0 ml-2">
                      {ch.wordCount.toLocaleString()} w
                    </span>
                  </div>
                ))}
              </div>

              {/* Confirm Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => handleConfirmImport(false)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Populate Chapters Here</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmImport(true)}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Populate, Fit to {activeProfile.dimensions} & Open Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
