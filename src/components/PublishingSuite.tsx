import React, { useState } from "react";
import {
  BookOpenCheck,
  Sparkles,
  DollarSign,
  Tag,
  Share2,
  Download,
  Copy,
  Check,
  Loader2,
  FileDown,
  Layers,
  Award,
  Globe,
  TrendingUp,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Book, PublishingKit } from "../types";
import { apiService } from "../services/api";
import { OriginalityMeter } from "./OriginalityMeter";

interface PublishingSuiteProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onOpenExportModal: () => void;
}

export const PublishingSuite: React.FC<PublishingSuiteProps> = ({
  book,
  onUpdateBook,
  onOpenExportModal,
}) => {
  const [suiteView, setSuiteView] = useState<"originality" | "metadata">("originality");
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const defaultKit = {
    salesBlurb: {
      hook: "A forgotten discovery. An ancient conspiracy. The clock is ticking.",
      body: `In the candlelit spires of Oakhaven, Doctor Evelyn Vance unearths a forbidden formula capable of rewriting human mortality. But when the Iron Inquisitors breach her laboratory, she must flee with a relic she barely understands.\n\nFlung into a world of airship piracy and shadowy dynasties, Evelyn must forge an alliance with a disgraced sky-captain before the alchemical secret tears the empire apart.`,
      cta: "Grab your copy today and embark on an unforgettable journey.",
    },
    amazonKeywords: [
      "steampunk science fiction thriller",
      "alchemical fantasy novel",
      "victorian gaslamp adventure",
      "airship fantasy series",
      "female scientist protagonist fantasy",
      "speculative fiction bestseller",
      "dark academia fantasy book",
    ],
    bisacCategories: [
      "FICTION / Fantasy / Historical",
      "FICTION / Steampunk",
      "FICTION / Science Fiction / Hard Sci-Fi",
    ],
    compTitles: [
      "The Golden Compass by Philip Pullman",
      "The Invisible Life of Addie LaRue by V.E. Schwab",
      "Babel by R.F. Kuang",
    ],
    targetAudience: "Adult and crossover YA readers of gaslamp fantasy and intellectual suspense.",
    pricingRecommendations: {
      ebook: 4.99,
      paperback: 16.99,
      hardcover: 27.99,
    },
    marketingHook: "What if the greatest scientific discovery in history was also its death warrant?",
    launchStrategy:
      "1. Build ARC (Advance Reader Copy) team of 50 reviewers.\n2. 3-week pre-order discount campaign at $2.99.\n3. Newsletter swap with top fantasy authors.",
    isbn: "978-1-95482-104-9",
    publisherImprint: "Rhythm Logic Publishing • Red Deer, Alberta, Canada",
  };

  const rawKit = book.publishingKit;
  const kit = {
    ...defaultKit,
    ...(rawKit || {}),
    salesBlurb: {
      ...defaultKit.salesBlurb,
      ...(rawKit?.salesBlurb || {}),
    },
    amazonKeywords: rawKit?.amazonKeywords && rawKit.amazonKeywords.length > 0 ? rawKit.amazonKeywords : defaultKit.amazonKeywords,
    bisacCategories: rawKit?.bisacCategories && rawKit.bisacCategories.length > 0 ? rawKit.bisacCategories : defaultKit.bisacCategories,
    compTitles: rawKit?.compTitles && rawKit.compTitles.length > 0 ? rawKit.compTitles : defaultKit.compTitles,
    pricingRecommendations: {
      ...defaultKit.pricingRecommendations,
      ...(rawKit?.pricingRecommendations || {}),
    },
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGeneratePublishingKitWithCassian = async () => {
    setIsGeneratingKit(true);

    try {
      const result = await apiService.generatePublishingKit({
        book: {
          title: book.title,
          subtitle: book.subtitle,
          author: book.author,
          genre: book.genre,
          tone: book.tone,
          premise: book.premise,
          targetAudience: book.targetAudience,
        },
      });

      const updatedKit: PublishingKit = {
        salesBlurb: result.salesBlurb || kit.salesBlurb,
        amazonKeywords: result.amazonKeywords || kit.amazonKeywords,
        bisacCategories: result.bisacCategories || kit.bisacCategories,
        compTitles: result.compTitles || kit.compTitles,
        targetAudience: result.targetAudience || kit.targetAudience,
        pricingRecommendations: result.pricingRecommendations || kit.pricingRecommendations,
        marketingHook: result.marketingHook || kit.marketingHook,
        launchStrategy: result.launchStrategy || kit.launchStrategy,
        isbn: book.publishingKit?.isbn || "978-1-95482-104-9",
        publisherImprint: book.publishingKit?.publisherImprint || "Rhythm Logic Publishing • Red Deer, Alberta, Canada",
      };

      onUpdateBook({
        ...book,
        publishingKit: updatedKit,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      alert("Imperator Cassian failed to construct publishing kit: " + err.message);
    } finally {
      setIsGeneratingKit(false);
    }
  };

  // Calculate estimated royalties
  const ebookRoyaltyRate = 0.7; // 70% for KDP
  const paperbackPrintCost = 4.2; // approx print cost for 250pg trade
  const paperbackRoyaltyRate = 0.6; // 60% Amazon paperback
  const ebookRoyalty = (kit.pricingRecommendations.ebook * ebookRoyaltyRate).toFixed(2);
  const paperbackRoyalty = Math.max(
    0,
    kit.pricingRecommendations.paperback * paperbackRoyaltyRate - paperbackPrintCost
  ).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <BookOpenCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Publishing & Marketplace Command
            </h1>
          </div>
          <p className="text-sm text-stone-400">
            Governed by <span className="text-amber-400 font-medium">Imperator Cassian</span>. Amazon KDP
            metadata, sales blurb architecture, BISAC categorization, pricing calculus, and distributor exports.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {suiteView === "metadata" && (
            <button
              onClick={handleGeneratePublishingKitWithCassian}
              disabled={isGeneratingKit}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs transition-all shadow-lg shadow-amber-950/30 disabled:opacity-50"
            >
              {isGeneratingKit ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Strategizing Campaign...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Regenerate Publishing Kit</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onOpenExportModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium text-xs border border-stone-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Formatted Book</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex items-center space-x-2 mb-6 border-b border-stone-800 pb-3">
        <button
          onClick={() => setSuiteView("originality")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            suiteView === "originality"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>Originality Meter & Provenance Royalties</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-stone-900 border border-stone-700 text-amber-300">
            {book.originalityReport?.score ?? 100}%
          </span>
        </button>

        <button
          onClick={() => setSuiteView("metadata")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            suiteView === "metadata"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
          }`}
        >
          <Tag className="w-4 h-4 text-amber-400" />
          <span>Amazon KDP Metadata & Keywords</span>
        </button>
      </div>

      {suiteView === "originality" ? (
        <OriginalityMeter book={book} onUpdateBook={onUpdateBook} />
      ) : (
        /* Grid: Blurb & Marketplace Metadata (Left) + Pricing & Distributor Export (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Amazon KDP Sales Blurb & Comp Titles */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sales Blurb Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-base text-stone-100">
                  Amazon KDP Sales Blurb Architecture
                </h3>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `${kit.salesBlurb.hook}\n\n${kit.salesBlurb.body}\n\n${kit.salesBlurb.cta}`,
                    "full_blurb"
                  )
                }
                className="flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-mono"
              >
                {copiedKey === "full_blurb" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied Full Blurb</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy for KDP</span>
                  </>
                )}
              </button>
            </div>

            {/* Hook */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
                Opening Hook (Above the fold)
              </span>
              <div className="p-3 rounded-xl bg-stone-950 border border-amber-500/30 text-sm font-serif font-bold text-stone-100">
                {kit.salesBlurb.hook}
              </div>
            </div>

            {/* Body */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-400">
                Core Tension & Synopsis
              </span>
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 whitespace-pre-line leading-relaxed font-sans">
                {kit.salesBlurb.body}
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-400">
                Call-to-Action Closing
              </span>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs italic text-stone-200">
                {kit.salesBlurb.cta}
              </div>
            </div>
          </div>

          {/* Comp Titles & Audience */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="font-serif font-bold text-base text-stone-100">
                Comparative Titles & Audience Positioning
              </h3>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-400">
                Comparative Titles ("For Readers of...")
              </span>
              <div className="flex flex-wrap gap-2">
                {(kit.compTitles || []).map((comp, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs font-serif text-amber-300"
                  >
                    📖 {comp}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <span className="text-[10px] font-mono uppercase font-bold text-stone-400">
                Target Reader Demographic
              </span>
              <p className="text-xs text-stone-300 bg-stone-950 p-3 rounded-xl border border-stone-800">
                {kit.targetAudience}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Keywords, BISAC Categories & Pricing Calculus */}
        <div className="lg:col-span-5 space-y-6">
          {/* 7 Amazon KDP Keywords */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-base text-stone-100">
                  7 High-Volume KDP Keywords
                </h3>
              </div>
              <button
                onClick={() => handleCopy(kit.amazonKeywords.join(", "), "keywords")}
                className="text-xs text-amber-400 hover:text-amber-300 font-mono"
              >
                {copiedKey === "keywords" ? "Copied" : "Copy All"}
              </button>
            </div>

            <div className="space-y-2">
              {kit.amazonKeywords.map((kw, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200"
                >
                  <span className="font-mono text-amber-400 font-bold">{idx + 1}.</span>
                  <span className="flex-1 mx-2">{kw}</span>
                  <button
                    onClick={() => handleCopy(kw, `kw-${idx}`)}
                    className="text-stone-500 hover:text-stone-300 text-[10px]"
                  >
                    {copiedKey === `kw-${idx}` ? "✓" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* BISAC Categories */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-100 border-b border-stone-800 pb-2">
              Official BISAC Category Codes
            </h3>
            <div className="space-y-1.5">
              {kit.bisacCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs font-mono text-stone-300"
                >
                  📂 {cat}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Calculus & Royalty Estimator */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="font-serif font-bold text-base text-stone-100">
                Pricing Calculus & Royalties
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* eBook */}
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-400">eBook Retail</div>
                <div className="text-xl font-bold font-mono text-stone-100">
                  ${kit.pricingRecommendations.ebook.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono">
                  ~${ebookRoyalty} net royalty (70%)
                </div>
              </div>

              {/* Paperback */}
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-400">Paperback Retail</div>
                <div className="text-xl font-bold font-mono text-stone-100">
                  ${kit.pricingRecommendations.paperback.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono">
                  ~${paperbackRoyalty} net / print copy
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-stone-400 italic">
              ISBN: <span className="font-mono text-stone-300">{kit.isbn}</span> • Imprint:{" "}
              <span className="text-stone-300">{kit.publisherImprint}</span>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
