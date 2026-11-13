import React, { useState } from "react";
import {
  Sparkles,
  Search,
  Globe,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Bookmark,
  FileText,
  Copy,
  Check,
  Wand2,
  RefreshCw,
  X,
  Target,
  Clock,
  Compass,
  Lightbulb,
  CornerDownRight,
  Zap,
} from "lucide-react";
import { Book, Chapter, FootnoteReference, IdeaOutline, IdeaOutlineAct } from "../types";
import { apiService } from "../services/api";

interface BuildIdeaBoxProps {
  book: Book;
  onApplyOutline: (outline: IdeaOutline, replaceExistingChapters: boolean, andDraftProseImmediately?: boolean) => void;
  onClose?: () => void;
}

const IDEA_PRESETS = [
  {
    title: "Victorian Clockwork Fossils",
    genre: "Historical Fiction / Steampunk",
    text: "A 1888 paleontology expedition in Montana uncovers fossilized prehistoric bones containing intricate brass gears and clockwork mechanisms that predate human civilization.",
  },
  {
    title: "Quantum Consciousness Ark",
    genre: "Sci-Fi & Cyberpunk",
    text: "A deep space colony ship where passengers' memories are stored in quantum neural archives awakens to discover that half the crew's memories have been swapped with historical figures from 1920s Vienna.",
  },
  {
    title: "Venetian Guild of Cartographers",
    genre: "Historical Mystery",
    text: "In 1570 Venice, an apprentice cartographer discovers secret maps hidden inside Renaissance church frescoes that depict island continents unknown to European explorers.",
  },
  {
    title: "Botanical Magic Revolution",
    genre: "Epic Fantasy",
    text: "An alchemist in an industrializing empire discovers that a rare mountain moss reacts to steam engines by accelerating human thought, sparking a cutthroat corporate conspiracy.",
  },
];

export const BuildIdeaBox: React.FC<BuildIdeaBoxProps> = ({
  book,
  onApplyOutline,
  onClose,
}) => {
  // Input form state
  const [ideaText, setIdeaText] = useState(book.premise || "");
  const [title, setTitle] = useState(book.title || "The Obsidian Chronicle");
  const [genre, setGenre] = useState(book.genre || "Epic Fantasy");
  const [tone, setTone] = useState(book.tone || "Atmospheric, high tension, rich historical texture");
  const [targetChapters, setTargetChapters] = useState(book.chapters.length > 0 ? Math.max(6, book.chapters.length) : 8);
  const [targetWordCount, setTargetWordCount] = useState(book.targetWordCount || 45000);
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(true);
  const [researchMode, setResearchMode] = useState<"comprehensive" | "historical_research" | "sci_fi_feasibility" | "mystery_logic">("comprehensive");
  const [specificResearchTopics, setSpecificResearchTopics] = useState("");

  // Loading & State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [generatedOutline, setGeneratedOutline] = useState<IdeaOutline | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [replaceMode, setReplaceMode] = useState(true);
  const [expandedActs, setExpandedActs] = useState<Record<string, boolean>>({
    "act-1": true,
    "act-2": true,
    "act-3": true,
  });

  // Fact Verification Drawer
  const [showFactChecker, setShowFactChecker] = useState(false);
  const [factClaim, setFactClaim] = useState("");
  const [factContext, setFactContext] = useState("");
  const [isVerifyingFact, setIsVerifyingFact] = useState(false);
  const [factResult, setFactResult] = useState<any>(null);

  // Footnote editing
  const [activeTab, setActiveTab] = useState<"outline" | "footnotes" | "sources" | "premise">("outline");

  const handleGenerate = async () => {
    if (!ideaText.trim()) return;

    setIsLoading(true);
    setLoadingStep("Connecting to Gemini & Google Search Grounding engine...");
    try {
      setTimeout(() => setLoadingStep("Searching historical, scientific & cultural archives..."), 1200);
      setTimeout(() => setLoadingStep("Architecting 3-act structure & pacing arcs..."), 2600);
      setTimeout(() => setLoadingStep("Formulating chapter beats & footnote citations..."), 4200);

      const outline: IdeaOutline = await apiService.buildIdea({
        idea: ideaText,
        title,
        genre,
        tone,
        targetChapterCount: targetChapters,
        targetWordCount,
        enableSearchGrounding: enableGoogleSearch,
        mode: researchMode,
        researchTopics: specificResearchTopics,
      });

      // Ensure acts have IDs if missing
      if (outline.acts) {
        outline.acts = outline.acts.map((act, i) => ({
          ...act,
          id: act.id || `act-${i + 1}`,
          chapters: (act.chapters || []).map((ch, chIdx) => ({
            ...ch,
            id: ch.id || `ch-${i + 1}-${chIdx + 1}`,
            footnotes: ch.footnotes || [],
          })),
        }));
      }

      setGeneratedOutline(outline);
      setActiveTab("outline");
    } catch (err: any) {
      console.error("Build idea error:", err);
      alert(`Failed to expand idea: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyFact = async () => {
    if (!factClaim.trim()) return;
    setIsVerifyingFact(true);
    try {
      const result = await apiService.verifyFact({
        claim: factClaim,
        context: factContext || ideaText,
        genre,
      });
      setFactResult(result);
    } catch (err: any) {
      console.error("Fact verify error:", err);
      alert(`Fact check error: ${err.message}`);
    } finally {
      setIsVerifyingFact(false);
    }
  };

  const handleAddFootnoteToOutline = (newFootnote: FootnoteReference) => {
    if (!generatedOutline) return;
    setGeneratedOutline({
      ...generatedOutline,
      globalFootnotes: [...(generatedOutline.globalFootnotes || []), newFootnote],
    });
  };

  const handleUpdateChapter = (actId: string, chapterId: string, updatedFields: Partial<any>) => {
    if (!generatedOutline) return;
    const newActs = (generatedOutline.acts || []).map((act) => {
      if (act.id !== actId) return act;
      return {
        ...act,
        chapters: (act.chapters || []).map((ch) => {
          if (ch.id !== chapterId) return ch;
          return { ...ch, ...updatedFields };
        }),
      };
    });
    setGeneratedOutline({ ...generatedOutline, acts: newActs });
  };

  const handleAddChapterToAct = (actId: string) => {
    if (!generatedOutline) return;
    const targetAct = (generatedOutline.acts || []).find((a) => a.id === actId);
    if (!targetAct) return;

    const totalChapters = (generatedOutline.acts || []).reduce((sum, a) => sum + (a.chapters || []).length, 0);
    const newChapter = {
      id: `ch-custom-${Date.now()}`,
      number: totalChapters + 1,
      title: `Chapter ${totalChapters + 1}: Turning Point`,
      summary: "Describe the crucial shift in protagonist stakes and revelations.",
      goal: "Protagonist's immediate urgent objective.",
      conflict: "Antagonist resistance or physical danger.",
      cliffhanger: "Gripping revelation leading into the next chapter.",
      pov: "Protagonist POV",
      setting: "Atmospheric Scene Location",
      targetWords: Math.round(targetWordCount / (totalChapters + 1)),
      footnotes: [],
    };

    const newActs = (generatedOutline.acts || []).map((act) => {
      if (act.id !== actId) return act;
      return {
        ...act,
        chapters: [...(act.chapters || []), newChapter],
      };
    });

    setGeneratedOutline({ ...generatedOutline, acts: newActs });
  };

  const handleDeleteChapter = (actId: string, chapterId: string) => {
    if (!generatedOutline) return;
    const newActs = (generatedOutline.acts || []).map((act) => {
      if (act.id !== actId) return act;
      return {
        ...act,
        chapters: (act.chapters || []).filter((ch) => ch.id !== chapterId),
      };
    });
    setGeneratedOutline({ ...generatedOutline, acts: newActs });
  };

  const handleApplyToBook = (andDraftProse: boolean = false) => {
    if (!generatedOutline) return;
    onApplyOutline(generatedOutline, replaceMode, andDraftProse);
    if (onClose) onClose();
  };

  const handleCopyMarkdown = () => {
    if (!generatedOutline) return;
    let md = `# ${title || "Book Outline"}\n\n`;
    md += `**Logline:** ${generatedOutline.logline}\n\n`;
    md += `**Genre:** ${genre} | **Tone:** ${tone}\n\n`;
    md += `**Thematic Question:** ${generatedOutline.thematicQuestion}\n\n`;
    md += `**Expanded Premise:**\n${generatedOutline.expandedPremise}\n\n`;
    md += `## Chapter Breakdown\n\n`;

    generatedOutline.acts.forEach((act) => {
      md += `### ${act.actName}\n*${act.summary}*\n\n`;
      act.chapters.forEach((ch) => {
        md += `#### Chapter ${ch.number}: ${ch.title}\n`;
        md += `- **Goal:** ${ch.goal}\n`;
        md += `- **Conflict:** ${ch.conflict}\n`;
        md += `- **Cliffhanger:** ${ch.cliffhanger}\n`;
        md += `- **Setting / POV:** ${ch.setting} (${ch.pov})\n`;
        md += `- **Target Words:** ~${ch.targetWords.toLocaleString()} words\n`;
        md += `- **Summary:** ${ch.summary}\n`;
        if (ch.footnotes && ch.footnotes.length > 0) {
          md += `- **Footnotes & References:**\n`;
          ch.footnotes.forEach((fn) => {
            md += `  - ${fn.marker} **${fn.title}**: ${fn.description} ${fn.sourceUrl ? `([Source](${fn.sourceUrl}))` : ""}\n`;
          });
        }
        md += `\n`;
      });
    });

    if (generatedOutline.globalFootnotes && generatedOutline.globalFootnotes.length > 0) {
      md += `## Global Bibliography & Footnotes\n\n`;
      generatedOutline.globalFootnotes.forEach((fn) => {
        md += `${fn.marker} **${fn.title}** (${fn.sourceName || "Verified Source"})\n`;
        md += `  ${fn.description}\n`;
        if (fn.sourceUrl) md += `  *Link:* ${fn.sourceUrl}\n`;
        md += `\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[92vh]">
      {/* Header Bar */}
      <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-stone-800 bg-stone-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Chapters</span>
            </button>
          )}

          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif font-bold text-base sm:text-lg text-stone-100">
                Build Upon My Idea
              </h2>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                <Globe className="w-3 h-3" />
                <span>Google Search Grounded</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Transform seed premises into grounded blueprints with verified citations & full manuscript drafting
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFactChecker(!showFactChecker)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              showFactChecker
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : "bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>Fact-Check Claims</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-200 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close Builder"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Fact-Checker Drawer (if open) */}
        {showFactChecker && (
          <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-sky-800/40 pb-2">
              <div className="flex items-center space-x-2 text-sky-300 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Google Search Fact & Feasibility Verifier</span>
              </div>
              <button
                onClick={() => setShowFactChecker(false)}
                className="text-sky-400 hover:text-sky-200 text-xs"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-sky-200/80 mb-1 font-medium">
                  Historical Event, Science Law, or Lore Claim to Verify:
                </label>
                <input
                  type="text"
                  value={factClaim}
                  onChange={(e) => setFactClaim(e.target.value)}
                  placeholder="e.g. Victorian brass gears inside Montana fossils, Venetian church secret cartography..."
                  className="w-full bg-stone-900 border border-sky-700/60 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-sky-200/80 mb-1 font-medium">
                  Story Context / Narrative Goal:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={factContext}
                    onChange={(e) => setFactContext(e.target.value)}
                    placeholder="e.g. Chapter 3 discovery scene, scientific plausibility"
                    className="flex-1 bg-stone-900 border border-sky-700/60 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={handleVerifyFact}
                    disabled={isVerifyingFact || !factClaim.trim()}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 shrink-0 shadow-sm"
                  >
                    {isVerifyingFact ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Verify</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Verification Result Card */}
            {factResult && (
              <div className="p-3.5 rounded-xl bg-stone-950 border border-sky-500/40 space-y-2 text-xs text-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        factResult.verdict === "Verified"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : factResult.verdict === "Partially Accurate"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      }`}
                    >
                      {factResult.verdict}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      Confidence: {factResult.confidenceScore || 90}%
                    </span>
                  </div>

                  {factResult.suggestedFootnote && (
                    <button
                      onClick={() => {
                        handleAddFootnoteToOutline(factResult.suggestedFootnote);
                        alert("Added verified footnote citation to outline bibliography!");
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach as Footnote</span>
                    </button>
                  )}
                </div>

                <p className="text-stone-300">{factResult.explanation}</p>

                {factResult.historicalContext && (
                  <div className="p-2 rounded bg-stone-900/80 border border-stone-800 text-[11px] text-stone-300">
                    <strong className="text-sky-300">Historical & Scientific Context:</strong>{" "}
                    {factResult.historicalContext}
                  </div>
                )}

                {factResult.sources && factResult.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {factResult.sources.map((s: any, idx: number) => (
                      <a
                        key={idx}
                        href={s.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-[10px] text-sky-400 hover:text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60"
                      >
                        <Globe className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[200px]">{s.title || "Web Source"}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Top Input Form & Idea Seeds */}
        {!generatedOutline ? (
          <div className="space-y-5">
            {/* Quick Inspiration Presets */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-2 flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Jumpstart with a High-Concept Idea Seed or enter your own:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {IDEA_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTitle(preset.title);
                      setGenre(preset.genre as any);
                      setIdeaText(preset.text);
                    }}
                    className="p-3 rounded-2xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800/80 hover:border-amber-500/40 text-left transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-amber-400/90 block mb-1">
                        {preset.genre}
                      </span>
                      <h4 className="font-serif font-bold text-xs text-stone-200 group-hover:text-amber-300 transition-colors line-clamp-1">
                        {preset.title}
                      </h4>
                      <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                        {preset.text}
                      </p>
                    </div>
                    <span className="text-[10px] text-stone-400 flex items-center mt-2 group-hover:text-amber-400">
                      <span>Use this seed</span>
                      <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Author Idea Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-200">
                  Your Core Premise, Plot Seed, or Raw Thoughts:
                </label>
                <span className="text-[11px] text-stone-400">
                  {ideaText.length} characters
                </span>
              </div>
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                placeholder="Describe your story idea in any level of detail — e.g. a protagonist dilemma, a secret discovery, a magical or technological premise, historical setting, twist, or character conflict..."
                rows={5}
                className="w-full bg-stone-950 border border-stone-700/80 rounded-2xl p-4 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500 font-sans leading-relaxed shadow-inner"
              />
            </div>

            {/* Narrative Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Book Title / Working Title:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Chronoclast's Secret"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Genre & Literary Style:
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as any)}
                  placeholder="e.g. Epic Fantasy, Historical Mystery"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Target Chapter Count:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={4}
                    max={20}
                    value={targetChapters}
                    onChange={(e) => setTargetChapters(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="font-mono text-xs font-bold text-amber-400 px-2 py-1 bg-stone-950 rounded-lg border border-stone-800">
                    {targetChapters} Chapters
                  </span>
                </div>
              </div>
            </div>

            {/* Google Search Grounding & Research Focus Settings */}
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="enable-search-grounding"
                    checked={enableGoogleSearch}
                    onChange={(e) => setEnableGoogleSearch(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                  />
                  <label htmlFor="enable-search-grounding" className="text-xs text-stone-200 font-medium cursor-pointer">
                    Integrate Google Search Grounding & Real-World Citation Footnotes
                  </label>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-stone-400">Research Focus:</span>
                  <select
                    value={researchMode}
                    onChange={(e) => setResearchMode(e.target.value as any)}
                    className="bg-stone-900 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="comprehensive">Comprehensive Narrative Balance</option>
                    <option value="historical_research">Historical Accuracy & Period Detail</option>
                    <option value="sci_fi_feasibility">Scientific Feasibility & Astrophysics</option>
                    <option value="mystery_logic">Mystery Deductions & Forensic Logic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-stone-400 mb-1">
                  Optional: Specific Historical Events, Science Laws, or Locations to Anchor:
                </label>
                <input
                  type="text"
                  value={specificResearchTopics}
                  onChange={(e) => setSpecificResearchTopics(e.target.value)}
                  placeholder="e.g. 1880s Montana geology, quantum decoherence, Venice Murano glassmakers guild"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                id="generate-idea-outline-btn"
                onClick={handleGenerate}
                disabled={isLoading || !ideaText.trim()}
                className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm shadow-xl hover:shadow-amber-500/20 transition-all cursor-pointer group"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Expanding Idea ({loadingStep || "Thinking..."})</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
                    <span>Build Idea into Chapter Outline & Footnotes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Generated Editable Outline & Chapter Workspace */
          <div className="space-y-6 animate-fadeIn">
            {/* Top Overview & Navigation Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab("outline")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "outline"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                  }`}
                >
                  Chapters & Beat Outline ({generatedOutline.acts.reduce((sum, a) => sum + a.chapters.length, 0)})
                </button>
                <button
                  onClick={() => setActiveTab("premise")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "premise"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                  }`}
                >
                  Expanded Premise & Hook
                </button>
                <button
                  onClick={() => setActiveTab("footnotes")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 ${
                    activeTab === "footnotes"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Footnotes & Citations ({generatedOutline.globalFootnotes?.length || 0})</span>
                </button>
                {generatedOutline.googleSearchSources && generatedOutline.googleSearchSources.length > 0 && (
                  <button
                    onClick={() => setActiveTab("sources")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 ${
                      activeTab === "sources"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Search Sources ({generatedOutline.googleSearchSources.length})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs transition-colors"
                  title="Copy formatted markdown with footnotes & bibliography"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? "Copied!" : "Copy Outline MD"}</span>
                </button>

                <button
                  onClick={() => setGeneratedOutline(null)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs"
                >
                  Edit Raw Seed
                </button>
              </div>
            </div>

            {/* TAB: PREMISE & HOOK */}
            {activeTab === "premise" && (
              <div className="space-y-4">
                {/* Logline Box */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    Publisher Elevator Logline
                  </span>
                  <input
                    type="text"
                    value={generatedOutline.logline}
                    onChange={(e) => setGeneratedOutline({ ...generatedOutline, logline: e.target.value })}
                    className="w-full bg-transparent font-serif font-bold text-stone-100 text-base border-b border-amber-500/30 focus:outline-none focus:border-amber-400 pb-1"
                  />
                </div>

                {/* Thematic & Conflict Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-stone-400 uppercase">
                      Central Thematic Question
                    </span>
                    <textarea
                      value={generatedOutline.thematicQuestion}
                      onChange={(e) => setGeneratedOutline({ ...generatedOutline, thematicQuestion: e.target.value })}
                      rows={2}
                      className="w-full bg-transparent text-xs text-stone-200 focus:outline-none resize-none border-b border-stone-800 focus:border-amber-500"
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-stone-400 uppercase">
                      Core Antagonist / Obstacle
                    </span>
                    <textarea
                      value={generatedOutline.coreConflict}
                      onChange={(e) => setGeneratedOutline({ ...generatedOutline, coreConflict: e.target.value })}
                      rows={2}
                      className="w-full bg-transparent text-xs text-stone-200 focus:outline-none resize-none border-b border-stone-800 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Expanded Premise Narrative */}
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-300">
                      Expanded Narrative Premise & World Atmosphere:
                    </span>
                    <span className="text-[10px] text-stone-400">Editable</span>
                  </div>
                  <textarea
                    value={generatedOutline.expandedPremise}
                    onChange={(e) => setGeneratedOutline({ ...generatedOutline, expandedPremise: e.target.value })}
                    rows={8}
                    className="w-full bg-stone-900/60 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 leading-relaxed focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>
            )}

            {/* TAB: FOOTNOTES & CITATIONS */}
            {activeTab === "footnotes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-sm text-stone-100">
                      Grounded References & Footnote Index
                    </h3>
                    <p className="text-xs text-stone-400">
                      Verified historical, scientific, or lore anchors with citation markers (e.g. [^1])
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const nextNum = (generatedOutline.globalFootnotes?.length || 0) + 1;
                      const newFn: FootnoteReference = {
                        id: `fn-${Date.now()}`,
                        number: nextNum,
                        marker: `[^${nextNum}]`,
                        title: "New Custom Footnote",
                        sourceName: "Author Research",
                        description: "Add background notes or citation detail here.",
                        verifiedWithGoogle: false,
                      };
                      handleAddFootnoteToOutline(newFn);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Footnote</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {generatedOutline.globalFootnotes?.map((fn, idx) => (
                    <div
                      key={fn.id || idx}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-stone-700 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                            {fn.marker || `[^${idx + 1}]`}
                          </span>
                          <input
                            type="text"
                            value={fn.title}
                            onChange={(e) => {
                              const updated = [...generatedOutline.globalFootnotes];
                              updated[idx].title = e.target.value;
                              setGeneratedOutline({ ...generatedOutline, globalFootnotes: updated });
                            }}
                            className="bg-transparent font-semibold text-stone-100 text-xs border-b border-transparent focus:border-amber-500 focus:outline-none px-1"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          {fn.verifiedWithGoogle && (
                            <span className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified with Google</span>
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const updated = generatedOutline.globalFootnotes.filter((_, i) => i !== idx);
                              setGeneratedOutline({ ...generatedOutline, globalFootnotes: updated });
                            }}
                            className="text-stone-400 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={fn.description}
                        onChange={(e) => {
                          const updated = [...generatedOutline.globalFootnotes];
                          updated[idx].description = e.target.value;
                          setGeneratedOutline({ ...generatedOutline, globalFootnotes: updated });
                        }}
                        rows={2}
                        placeholder="Footnote explanation or historical context..."
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                      />

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-stone-400">Source:</span>
                        <input
                          type="text"
                          value={fn.sourceName || ""}
                          onChange={(e) => {
                            const updated = [...generatedOutline.globalFootnotes];
                            updated[idx].sourceName = e.target.value;
                            setGeneratedOutline({ ...generatedOutline, globalFootnotes: updated });
                          }}
                          placeholder="Source Name / Archive / Journal"
                          className="bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-[11px] text-stone-200 focus:outline-none"
                        />
                        {fn.sourceUrl && (
                          <a
                            href={fn.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                          >
                            <span>Open URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: GOOGLE SEARCH SOURCES */}
            {activeTab === "sources" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 flex items-start space-x-3">
                  <Globe className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-sky-200/90 space-y-1">
                    <p className="font-semibold text-sky-100">
                      Live Google Search Grounding Sources
                    </p>
                    <p className="text-[11px] text-sky-200/70">
                      The Gemini engine researched and verified the following web references during outline generation:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {generatedOutline.googleSearchSources?.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-sky-500/40 transition-all block group"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-200 group-hover:text-sky-300">
                        <span className="line-clamp-1">{src.title || "Reference Source"}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-sky-400 shrink-0 ml-2" />
                      </div>
                      <p className="text-[10px] text-stone-400 font-mono truncate mt-1">
                        {src.uri}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: OUTLINE & CHAPTER BREAKDOWN */}
            {activeTab === "outline" && (
              <div className="space-y-6">
                {(generatedOutline.acts || []).map((act) => {
                  const isActExpanded = expandedActs[act.id] !== false;
                  return (
                    <div
                      key={act.id}
                      className="rounded-2xl border border-stone-800 bg-stone-950/60 overflow-hidden"
                    >
                      {/* Act Header */}
                      <div
                        onClick={() =>
                          setExpandedActs({
                            ...expandedActs,
                            [act.id]: !isActExpanded,
                          })
                        }
                        className="px-5 py-3.5 bg-stone-900/90 hover:bg-stone-800/80 border-b border-stone-800 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                            <Layers className="w-4 h-4" />
                          </span>
                          <div>
                            <h3 className="font-serif font-bold text-sm text-stone-100">
                              {act.actName}
                            </h3>
                            <p className="text-[11px] text-stone-400">
                              {act.summary}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-stone-400">
                          <span className="font-mono font-medium">
                            {(act.chapters || []).length} Chapters
                          </span>
                          {isActExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Chapters in this Act */}
                      {isActExpanded && (
                        <div className="p-4 space-y-3.5">
                          {(act.chapters || []).map((ch, chIdx) => (
                            <div
                              key={ch.id}
                              className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/30 transition-all space-y-3"
                            >
                              {/* Chapter Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-2.5">
                                <div className="flex items-center space-x-2 flex-1">
                                  <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                                    Ch. {ch.number}
                                  </span>
                                  <input
                                    type="text"
                                    value={ch.title}
                                    onChange={(e) =>
                                      handleUpdateChapter(act.id, ch.id, {
                                        title: e.target.value,
                                      })
                                    }
                                    className="bg-transparent font-serif font-bold text-stone-100 text-sm border-b border-transparent focus:border-amber-500 focus:outline-none flex-1 px-1"
                                  />
                                </div>

                                <div className="flex items-center space-x-2 text-xs text-stone-400">
                                  <span className="font-mono text-[11px] bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                                    ~{ch.targetWords.toLocaleString()} w
                                  </span>
                                  <button
                                    onClick={() => {
                                      setFactClaim(ch.summary);
                                      setFactContext(`Chapter ${ch.number}: ${ch.title}`);
                                      setShowFactChecker(true);
                                    }}
                                    className="p-1 rounded hover:bg-sky-500/20 text-stone-400 hover:text-sky-300"
                                    title="Verify facts in this chapter"
                                  >
                                    <Search className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteChapter(act.id, ch.id)}
                                    className="p-1 rounded hover:bg-rose-500/20 text-stone-400 hover:text-rose-400"
                                    title="Delete chapter"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Chapter Narrative Summary */}
                              <div>
                                <label className="block text-[10px] uppercase font-mono tracking-wider text-stone-400 mb-1">
                                  Scene Sequence & Progression:
                                </label>
                                <textarea
                                  value={ch.summary}
                                  onChange={(e) =>
                                    handleUpdateChapter(act.id, ch.id, {
                                      summary: e.target.value,
                                    })
                                  }
                                  rows={2}
                                  className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans"
                                />
                              </div>

                              {/* Goal / Conflict / Cliffhanger Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80">
                                  <span className="text-[9px] font-mono uppercase text-emerald-400 block mb-0.5 font-bold">
                                    🎯 Protagonist Goal
                                  </span>
                                  <input
                                    type="text"
                                    value={ch.goal}
                                    onChange={(e) =>
                                      handleUpdateChapter(act.id, ch.id, {
                                        goal: e.target.value,
                                      })
                                    }
                                    className="w-full bg-transparent text-[11px] text-stone-300 focus:outline-none border-b border-transparent focus:border-emerald-400"
                                  />
                                </div>

                                <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80">
                                  <span className="text-[9px] font-mono uppercase text-rose-400 block mb-0.5 font-bold">
                                    ⚡ Core Conflict / Obstacle
                                  </span>
                                  <input
                                    type="text"
                                    value={ch.conflict}
                                    onChange={(e) =>
                                      handleUpdateChapter(act.id, ch.id, {
                                        conflict: e.target.value,
                                      })
                                    }
                                    className="w-full bg-transparent text-[11px] text-stone-300 focus:outline-none border-b border-transparent focus:border-rose-400"
                                  />
                                </div>

                                <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80">
                                  <span className="text-[9px] font-mono uppercase text-amber-400 block mb-0.5 font-bold">
                                    🔥 Cliffhanger / Turning Point
                                  </span>
                                  <input
                                    type="text"
                                    value={ch.cliffhanger}
                                    onChange={(e) =>
                                      handleUpdateChapter(act.id, ch.id, {
                                        cliffhanger: e.target.value,
                                      })
                                    }
                                    className="w-full bg-transparent text-[11px] text-stone-300 focus:outline-none border-b border-transparent focus:border-amber-400"
                                  />
                                </div>
                              </div>

                              {/* Setting & POV & Footnotes */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-400">
                                <div className="flex items-center space-x-3">
                                  <span className="flex items-center space-x-1">
                                    <strong className="text-stone-300">POV:</strong>
                                    <span>{ch.pov || "Protagonist"}</span>
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center space-x-1">
                                    <strong className="text-stone-300">Location:</strong>
                                    <span>{ch.setting || "Setting"}</span>
                                  </span>
                                </div>

                                {ch.footnotes && (ch.footnotes || []).length > 0 && (
                                  <div className="flex items-center space-x-1.5">
                                    <Bookmark className="w-3 h-3 text-amber-400" />
                                    <span className="text-amber-300 text-[10px]">
                                      {(ch.footnotes || []).length} Footnote{(ch.footnotes || []).length > 1 ? "s" : ""}:
                                    </span>
                                    {(ch.footnotes || []).map((f, i) => (
                                      <span
                                        key={i}
                                        className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300"
                                        title={f.description}
                                      >
                                        {f.marker || `[^${i + 1}]`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Add Chapter to Act Button */}
                          <button
                            onClick={() => handleAddChapterToAct(act.id)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-stone-800 hover:border-amber-500/40 text-stone-400 hover:text-amber-300 text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Chapter to {act.actName}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      {generatedOutline && (
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3 text-xs">
            <label className="flex items-center space-x-2 text-stone-300 cursor-pointer">
              <input
                type="radio"
                name="apply-mode"
                checked={replaceMode}
                onChange={() => setReplaceMode(true)}
                className="accent-amber-500"
              />
              <span>Replace existing book chapters</span>
            </label>
            <label className="flex items-center space-x-2 text-stone-400 cursor-pointer">
              <input
                type="radio"
                name="apply-mode"
                checked={!replaceMode}
                onChange={() => setReplaceMode(false)}
                className="accent-amber-500"
              />
              <span>Append to existing chapters</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => handleApplyToBook(false)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-xs transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Apply Outline Only</span>
            </button>

            <button
              type="button"
              id="apply-and-draft-full-manuscript-btn"
              onClick={() => handleApplyToBook(true)}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer group"
            >
              <Zap className="w-4 h-4 text-stone-950 transition-transform group-hover:scale-110" />
              <span>✨ Apply & Auto-Draft Full Manuscript ({generatedOutline.acts.reduce((sum, a) => sum + a.chapters.length, 0)} Chapters)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
