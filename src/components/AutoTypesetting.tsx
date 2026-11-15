import React, { useState } from "react";
import {
  Layers,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Type,
  Sparkles,
  Check,
  Download,
  Eye,
  FileText,
  Printer,
  Loader2,
} from "lucide-react";
import { Book, ChapterIllustration, FormattingSettings } from "../types";
import { apiService } from "../services/api";

interface AutoTypesettingProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onOpenExportModal: () => void;
}

export const AutoTypesetting: React.FC<AutoTypesettingProps> = ({
  book,
  onUpdateBook,
  onOpenExportModal,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"spread" | "single">("spread");
  const [isFormattingAll, setIsFormattingAll] = useState(false);
  const [formatSuccessMsg, setFormatSuccessMsg] = useState<string | null>(null);

  const settings = book.formattingSettings || {
    trimSize: "6x9",
    fontPreset: "garamond",
    fontSize: "11pt",
    lineSpacing: "1.5",
    dropCaps: true,
    sceneBreakSymbol: "❦",
    showPageNumbers: true,
    runningHeaders: true,
    includeFrontMatter: true,
    includeBackMatter: true,
    dedicationText: "For those who believe in stories.",
    copyrightText: `Copyright © ${new Date().getFullYear()} ${book.author}. All rights reserved.`,
    authorBio: (book.author || "").toLowerCase().includes("germain")
      ? "C.W. (Cody) Germain is an independent software systems architect and founder based in Red Deer, Alberta, Canada."
      : `${book.author} is an independent author and researcher.`,
    newsletterLink: "https://rhythmlogicpublishing.com",
    acknowledgments: "Gratitude to readers and editors.",
  };

  const handleUpdateSettings = (partial: Partial<FormattingSettings>) => {
    const updated = { ...settings, ...partial };
    onUpdateBook({
      ...book,
      formattingSettings: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Build the book pages array
  // Pages:
  // Page 1: Half Title
  // Page 2: Copyright
  // Page 3: Title Page
  // Page 4: Dedication
  // Page 5: Table of Contents
  // Page 6+: Chapters
  // End Pages: Acknowledgments, Author Bio

  interface PageData {
    type: "half_title" | "title_page" | "copyright" | "dedication" | "toc" | "chapter" | "back_matter";
    title?: string;
    chapterNumber?: number;
    act?: string;
    content?: string;
    illustrations?: ChapterIllustration[];
    pageNumber: number;
  }

  const pages: PageData[] = [];
  let pageCounter = 1;

  if (settings.includeFrontMatter) {
    // Half title
    pages.push({ type: "half_title", title: book.title, pageNumber: pageCounter++ });
    // Copyright
    pages.push({
      type: "copyright",
      title: "Copyright",
      content: settings.copyrightText,
      pageNumber: pageCounter++,
    });
    // Full Title Page
    pages.push({
      type: "title_page",
      title: book.title,
      content: book.subtitle,
      pageNumber: pageCounter++,
    });
    // Dedication
    if (settings.dedicationText) {
      pages.push({
        type: "dedication",
        title: "Dedication",
        content: settings.dedicationText,
        pageNumber: pageCounter++,
      });
    }
    // TOC
    pages.push({ type: "toc", title: "Contents", pageNumber: pageCounter++ });
  }

  // Chapters (each chapter starts on a new page)
  book.chapters.forEach((ch) => {
    pages.push({
      type: "chapter",
      title: ch.title,
      chapterNumber: ch.number,
      act: ch.act,
      content: ch.content || "Chapter manuscript in progress...",
      illustrations: ch.illustrations || [],
      pageNumber: pageCounter++,
    });
  });

  // Back Matter
  if (settings.includeBackMatter) {
    if (settings.acknowledgments) {
      pages.push({
        type: "back_matter",
        title: "Acknowledgments",
        content: settings.acknowledgments,
        pageNumber: pageCounter++,
      });
    }
    if (settings.authorBio) {
      pages.push({
        type: "back_matter",
        title: "About the Author",
        content: `${settings.authorBio}\n\nStay connected: ${settings.newsletterLink}`,
        pageNumber: pageCounter++,
      });
    }
  }

  const totalPages = pages.length;

  const handleNextPage = () => {
    if (viewMode === "spread") {
      if (currentPageIndex + 2 < totalPages) {
        setCurrentPageIndex(currentPageIndex + 2);
      }
    } else {
      if (currentPageIndex + 1 < totalPages) {
        setCurrentPageIndex(currentPageIndex + 1);
      }
    }
  };

  const handlePrevPage = () => {
    if (viewMode === "spread") {
      if (currentPageIndex - 2 >= 0) {
        setCurrentPageIndex(currentPageIndex - 2);
      }
    } else {
      if (currentPageIndex - 1 >= 0) {
        setCurrentPageIndex(currentPageIndex - 1);
      }
    }
  };

  const handleAutoFormatAllChapters = async () => {
    setIsFormattingAll(true);
    try {
      const formattedChapters = [];
      for (const ch of book.chapters) {
        if (ch.content) {
          const res = await apiService.autoFormatText({
            rawText: ch.content,
            preset: settings.fontPreset,
          });
          formattedChapters.push({
            ...ch,
            content: res.formattedText,
          });
        } else {
          formattedChapters.push(ch);
        }
      }

      onUpdateBook({
        ...book,
        chapters: formattedChapters,
        updatedAt: new Date().toISOString(),
      });

      setFormatSuccessMsg("All chapters have been beautifully typeset and formatted!");
      setTimeout(() => setFormatSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Auto formatting failed: " + err.message);
    } finally {
      setIsFormattingAll(false);
    }
  };

  // Font family mapping for preview
  const getFontFamilyClass = (preset: FormattingSettings["fontPreset"]) => {
    switch (preset) {
      case "garamond":
      case "baskerville":
      case "caslon":
      case "merriweather":
        return "font-serif";
      case "courier":
        return "font-mono";
      default:
        return "font-serif";
    }
  };

  const leftPage = pages[currentPageIndex];
  const rightPage = viewMode === "spread" ? pages[currentPageIndex + 1] : null;

  // Render a single simulated book page
  const renderBookPage = (page: PageData | null, isRight: boolean) => {
    if (!page) {
      return (
        <div className="flex-1 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-r-xl p-8 flex items-center justify-center text-stone-400 text-xs italic">
          [End of Printed Matter]
        </div>
      );
    }

    return (
      <div
        className={`flex-1 bg-[#faf8f5] text-stone-900 border border-stone-300 shadow-xl p-8 sm:p-12 flex flex-col justify-between min-h-[560px] max-h-[700px] overflow-hidden ${
          isRight ? "rounded-r-2xl border-l-0" : "rounded-l-2xl border-r-0"
        } ${getFontFamilyClass(settings.fontPreset)}`}
        style={{
          fontSize: settings.fontSize === "10pt" ? "13px" : settings.fontSize === "12pt" ? "15px" : "14px",
          lineHeight: settings.lineSpacing,
        }}
      >
        {/* Running Header */}
        <div className="text-[10px] uppercase tracking-widest text-stone-500 font-sans text-center border-b border-stone-300 pb-2 mb-6">
          {settings.runningHeaders && (
            isRight ? page.title || "Chapter" : book.title
          )}
        </div>

        {/* Page Body Content */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-none space-y-4">
          {page.type === "half_title" && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <h2 className="text-xl font-bold uppercase tracking-widest font-serif">{page.title}</h2>
            </div>
          )}

          {page.type === "title_page" && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <h1 className="text-2xl font-bold tracking-wide font-serif">{page.title}</h1>
              {page.content && <p className="text-xs italic text-stone-600 max-w-xs">{page.content}</p>}
              <div className="pt-8 text-xs uppercase tracking-widest font-mono text-stone-700">
                {book.author}
              </div>
              <div className="pt-4 text-[10px] text-stone-500 font-serif">
                {book.publishingKit?.publisherImprint || "Rhythm Logic Publishing • Red Deer, Alberta, Canada"}
              </div>
            </div>
          )}

          {page.type === "copyright" && (
            <div className="h-full flex flex-col justify-end text-[10px] text-stone-600 leading-relaxed font-sans pb-4">
              <div className="whitespace-pre-line">{page.content}</div>
              <div className="mt-4 font-mono text-[9px]">
                First Edition • ISBN: {book.publishingKit?.isbn || "978-1-95482-104-9"}
              </div>
            </div>
          )}

          {page.type === "dedication" && (
            <div className="h-full flex flex-col items-center justify-center text-center italic text-stone-800 px-6">
              <p>"{page.content}"</p>
            </div>
          )}

          {page.type === "toc" && (
            <div className="space-y-3">
              <h3 className="text-center font-bold text-sm uppercase tracking-widest mb-6">Contents</h3>
              <div className="space-y-2 text-xs">
                {(book.chapters || []).map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between border-b border-dotted border-stone-300 pb-1">
                    <span>
                      {ch.number}. {ch.title}
                    </span>
                    <span className="font-mono text-stone-500 text-[11px]">{ch.number + 5}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page.type === "chapter" && (
            <div className="space-y-4">
              {(page.illustrations || [])
                .filter((ill) => ill.placement === "header" || ill.placement === "fullpage")
                .map((ill) => (
                  <figure key={ill.id} className="mb-4 rounded-lg overflow-hidden border border-stone-300 bg-stone-200/50">
                    <img
                      src={ill.imageUrl}
                      alt={ill.title}
                      className="w-full max-h-44 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {ill.caption && (
                      <figcaption className="text-[10px] italic text-stone-600 text-center py-1 px-2">
                        {ill.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}

              <div className="text-center mb-6 pt-2">
                <div className="text-[10px] uppercase tracking-widest text-stone-500 font-sans mb-1">
                  {page.act}
                </div>
                <h3 className="text-lg font-bold font-serif">
                  Chapter {page.chapterNumber}
                </h3>
                <div className="text-xs italic text-stone-600">{page.title}</div>
              </div>

              <div className="text-justify leading-relaxed whitespace-pre-line text-stone-800">
                {page.content}
              </div>

              {(page.illustrations || [])
                .filter((ill) => ill.placement === "inline" || ill.placement === "tail")
                .map((ill) => (
                  <figure key={ill.id} className="mt-4 rounded-lg overflow-hidden border border-stone-300 bg-stone-200/50">
                    <img
                      src={ill.imageUrl}
                      alt={ill.title}
                      className="w-full max-h-44 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {ill.caption && (
                      <figcaption className="text-[10px] italic text-stone-600 text-center py-1 px-2">
                        {ill.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
            </div>
          )}

          {page.type === "back_matter" && (
            <div className="space-y-4">
              <h3 className="text-center font-bold text-sm uppercase tracking-widest mb-4">
                {page.title}
              </h3>
              <p className="text-justify text-xs leading-relaxed whitespace-pre-line text-stone-800">
                {page.content}
              </p>
            </div>
          )}
        </div>

        {/* Footer Page Number */}
        {settings.showPageNumbers && (
          <div className="text-[10px] font-mono text-stone-500 text-center pt-4 border-t border-stone-300 mt-4">
            {page.pageNumber}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Typesetting & Print Simulator
            </h1>
          </div>
          <p className="text-sm text-stone-400">
            Precision book formatting governed by the <span className="text-amber-400 font-medium">Typesetting Sovereign</span>. Live dual-page spread simulator with trim margins and font presets.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoFormatAllChapters}
            disabled={isFormattingAll}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
          >
            {isFormattingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Typesetting Manuscript...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Format All Chapters</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-lg shadow-amber-900/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Print Package</span>
          </button>
        </div>
      </div>

      {formatSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 mb-6">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{formatSuccessMsg}</span>
        </div>
      )}

      {/* Grid: Typesetting Controls (Left) + Interactive Book Reader Simulator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Typesetting & Formatting Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h3 className="font-serif font-bold text-base text-stone-100">
                Book Geometry & Typography
              </h3>
            </div>

            {/* Font Preset & Size */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Typeface Preset
                </label>
                <select
                  value={settings.fontPreset}
                  onChange={(e) => handleUpdateSettings({ fontPreset: e.target.value as any })}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="garamond">Adobe Garamond (Classic)</option>
                  <option value="baskerville">Baskerville (Regency)</option>
                  <option value="caslon">Caslon (Renaissance)</option>
                  <option value="merriweather">Merriweather (Literary)</option>
                  <option value="courier">Courier (Typewriter/Noir)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Font Size
                </label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => handleUpdateSettings({ fontSize: e.target.value as any })}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="10pt">10 pt (Dense)</option>
                  <option value="11pt">11 pt (Standard Trade)</option>
                  <option value="12pt">12 pt (Digest/Large)</option>
                </select>
              </div>
            </div>

            {/* Trim Size & Line Spacing */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Trim Size
                </label>
                <select
                  value={settings.trimSize}
                  onChange={(e) => handleUpdateSettings({ trimSize: e.target.value as any })}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="6x9">6 x 9 in (Trade Paperback)</option>
                  <option value="5.5x8.5">5.5 x 8.5 in (Digest)</option>
                  <option value="8x10">8 x 10 in (Illustrated/Workbook)</option>
                  <option value="pocket">4.25 x 6.87 in (Mass Market)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Line Height
                </label>
                <select
                  value={settings.lineSpacing}
                  onChange={(e) => handleUpdateSettings({ lineSpacing: e.target.value as any })}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="1.4">1.4 (Compact)</option>
                  <option value="1.5">1.5 (Standard)</option>
                  <option value="1.6">1.6 (Spacious)</option>
                </select>
              </div>
            </div>

            {/* Scene Break Symbol */}
            <div>
              <label className="block text-stone-300 text-xs font-semibold uppercase mb-1">
                Scene Break Ornament
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {["❦", "✦ ✦ ✦", "— ♦ —", "* * *"].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleUpdateSettings({ sceneBreakSymbol: sym as any })}
                    className={`py-1.5 rounded-xl border text-center font-serif transition-colors ${
                      settings.sceneBreakSymbol === sym
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Front & Back Matter Toggles */}
            <div className="space-y-3 pt-3 border-t border-stone-800 text-xs">
              <label className="flex items-center space-x-2 text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.includeFrontMatter}
                  onChange={(e) => handleUpdateSettings({ includeFrontMatter: e.target.checked })}
                  className="rounded border-stone-700 text-amber-500 focus:ring-0 bg-stone-950"
                />
                <span>Include Front Matter (Title Page, Copyright, TOC)</span>
              </label>

              <label className="flex items-center space-x-2 text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.includeBackMatter}
                  onChange={(e) => handleUpdateSettings({ includeBackMatter: e.target.checked })}
                  className="rounded border-stone-700 text-amber-500 focus:ring-0 bg-stone-950"
                />
                <span>Include Back Matter (Author Bio & Acknowledgments)</span>
              </label>

              <label className="flex items-center space-x-2 text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.runningHeaders}
                  onChange={(e) => handleUpdateSettings({ runningHeaders: e.target.checked })}
                  className="rounded border-stone-700 text-amber-500 focus:ring-0 bg-stone-950"
                />
                <span>Running Headers (Verso Title / Recto Chapter)</span>
              </label>

              <label className="flex items-center space-x-2 text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dropCaps}
                  onChange={(e) => handleUpdateSettings({ dropCaps: e.target.checked })}
                  className="rounded border-stone-700 text-amber-500 focus:ring-0 bg-stone-950"
                />
                <span>Stylized Drop Caps on Chapter Openings</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Live Book Reader Spread Simulator */}
        <div className="lg:col-span-8 space-y-4">
          {/* Simulator Bar (Spread / Single toggle & Page Nav) */}
          <div className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-stone-400">
                Page {currentPageIndex + 1} {viewMode === "spread" && rightPage ? `& ${currentPageIndex + 2}` : ""} of {totalPages}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Spread vs Single */}
              <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
                <button
                  onClick={() => setViewMode("spread")}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    viewMode === "spread" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400"
                  }`}
                >
                  Dual Spread
                </button>
                <button
                  onClick={() => setViewMode("single")}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    viewMode === "single" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400"
                  }`}
                >
                  Single Page
                </button>
              </div>

              {/* Navigation arrows */}
              <button
                onClick={handlePrevPage}
                disabled={currentPageIndex === 0}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-30 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPageIndex >= totalPages - (viewMode === "spread" ? 2 : 1)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-30 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Book Canvas Spread View */}
          <div className="flex items-stretch gap-0 bg-stone-950 p-4 sm:p-6 rounded-3xl border border-stone-800 shadow-2xl overflow-hidden">
            {renderBookPage(leftPage, false)}
            {viewMode === "spread" && renderBookPage(rightPage, true)}
          </div>
        </div>
      </div>
    </div>
  );
};
