import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  X,
  Copy,
  Check,
  Download,
  Share2,
  MessageSquare,
  Bookmark,
  ExternalLink,
  Loader2,
  Layers,
  Send,
  HelpCircle,
  Hash,
  FileText,
  Clock,
  ThumbsUp,
  RefreshCw,
} from "lucide-react";
import { Book, Chapter, SubstackArticle } from "../types";
import { apiService } from "../services/api";

interface SubstackArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  chapter: Chapter;
}

export const SubstackArticleModal: React.FC<SubstackArticleModalProps> = ({
  isOpen,
  onClose,
  book,
  chapter,
}) => {
  const [articleAngle, setArticleAngle] = useState<string>("philosophical_deep_dive");
  const [customFocus, setCustomFocus] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [article, setArticle] = useState<SubstackArticle | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"preview" | "markdown" | "discussion" | "references">("preview");

  if (!isOpen) return null;

  const handleGenerateArticle = async () => {
    setIsGenerating(true);
    try {
      const generated = await apiService.generateSubstackArticle({
        bookContext: {
          title: book.title,
          author: book.author,
          genre: book.genre,
          tone: book.tone,
          premise: book.premise,
        },
        chapter: {
          number: chapter.number,
          title: chapter.title,
          summary: chapter.summary,
          goal: chapter.goal,
          conflict: chapter.conflict,
          cliffhanger: chapter.cliffhanger,
          content: chapter.content,
        },
        articleAngle,
        customFocus,
      });
      setArticle(generated);
      setActiveViewTab("preview");
    } catch (err: any) {
      alert(err.message || "Failed to generate Substack article.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!article) return;
    const fullText = `# ${article.articleTitle}
*${article.subtitle}*

> **Ideological Focus:** ${article.ideologyTheme} | **Estimated Reading Time:** ${article.estimatedReadTimeMins} mins
> **By ${book.author}** (Companion to *${book.title}*, Chapter ${article.chapterNumber})

---

${article.contentMarkdown}

---

### 💬 Reader Discussion & Community Inquiry
${article.discussionPrompts.map((p, i) => `${i + 1}. **${p}**`).join("\n\n")}

---

### 📚 Reference & Academic Background
${article.referenceMaterials.map((r) => `- **${r.title}** (${r.sourceType || "Reference"}): ${r.description}${r.url ? ` [Link](${r.url})` : ""}`).join("\n")}

---

**${article.callToAction}**

*Tags: ${article.suggestedTags.map((t) => `#${t}`).join(" ")}*
`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    if (!article) return;
    const element = document.createElement("a");
    const fullText = `# ${article.articleTitle}\n\n${article.contentMarkdown}`;
    const file = new Blob([fullText], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `substack-ch${article.chapterNumber}-${article.articleTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto text-stone-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-orange-950/30">
              <Share2 className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-stone-100">
                  Substack Ideology & Reference Companion
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Chapter {chapter.number}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Expand upon "{chapter.title}" themes to generate high-engagement Substack articles with reader discussion hooks.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Generation Configuration Controls */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Article Configuration & Ideology Angle</span>
              </span>
              <span className="text-xs text-stone-400">
                Target: {book.title} ({book.genre})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { id: "philosophical_deep_dive", label: "Philosophical Deep-Dive", desc: "Core moral dilemmas & worldview stakes" },
                { id: "historical_lore_analysis", label: "Historical & Scientific Lore", desc: "Real-world analogies & research context" },
                { id: "character_psychology", label: "Character Psychology & Flaws", desc: "Internal motivations & ideological shifts" },
                { id: "worldbuilding_discourse", label: "Worldbuilding & System Ethics", desc: "Societal structures, magic/tech consequences" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setArticleAngle(opt.id)}
                  className={`text-left p-3 rounded-xl border text-xs transition-all ${
                    articleAngle === opt.id
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm"
                      : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700"
                  }`}
                >
                  <div className="font-semibold text-stone-200">{opt.label}</div>
                  <div className="text-[11px] text-stone-400 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full space-y-1">
                <label className="text-xs text-stone-400 font-medium">
                  Custom Author Prompt / Focus Note (Optional)
                </label>
                <input
                  type="text"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  placeholder="e.g. Highlight the parallel between the alchemical clock and modern algorithmic automation..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
                />
              </div>

              <button
                onClick={handleGenerateArticle}
                disabled={isGenerating}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-stone-950 font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Chapter Ideology...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{article ? "Regenerate Article" : "Generate Substack Article"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Article Viewport */}
          {article ? (
            <div className="space-y-4">
              {/* Tab Switcher & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 p-2 rounded-xl border border-stone-800/80">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setActiveViewTab("preview")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeViewTab === "preview"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Substack Newsletter Preview
                  </button>
                  <button
                    onClick={() => setActiveViewTab("discussion")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeViewTab === "discussion"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Discussion Hooks ({article.discussionPrompts.length})
                  </button>
                  <button
                    onClick={() => setActiveViewTab("references")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeViewTab === "references"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Reference Material ({article.referenceMaterials.length})
                  </button>
                  <button
                    onClick={() => setActiveViewTab("markdown")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeViewTab === "markdown"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Raw Markdown
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied Markdown!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy for Substack</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              {/* Substack Newsletter View */}
              {activeViewTab === "preview" && (
                <div className="bg-stone-950 border border-stone-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-inner font-sans max-w-3xl mx-auto">
                  {/* Substack Header Card */}
                  <div className="border-b border-stone-800 pb-6 space-y-3">
                    <div className="flex items-center space-x-2 text-[11px] font-mono text-orange-400 uppercase tracking-wider">
                      <span>{book.title}</span>
                      <span>•</span>
                      <span>Substack Ideology Companion</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 leading-tight">
                      {article.articleTitle}
                    </h1>

                    <p className="text-stone-400 text-sm sm:text-base italic">
                      {article.subtitle}
                    </p>

                    <div className="flex items-center justify-between pt-3 text-xs text-stone-500">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center font-bold text-stone-950 text-[10px]">
                          {book.author.charAt(0)}
                        </span>
                        <span className="text-stone-300 font-medium">{book.author}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>{article.estimatedReadTimeMins} min read</span>
                        </span>
                        <span>•</span>
                        <span className="text-amber-400">{article.ideologyTheme}</span>
                      </div>
                    </div>
                  </div>

                  {/* Substack Executive Callout */}
                  <div className="bg-amber-950/20 border-l-4 border-amber-500 px-4 py-3 rounded-r-xl text-xs text-amber-200/90 leading-relaxed italic">
                    {article.executiveSummary}
                  </div>

                  {/* Article Body Content */}
                  <div className="prose prose-invert prose-stone max-w-none text-stone-300 text-sm leading-relaxed space-y-4 whitespace-pre-wrap font-serif">
                    {article.contentMarkdown}
                  </div>

                  {/* Discussion Prompts Section */}
                  <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center space-x-2 text-orange-400 font-semibold text-xs uppercase tracking-wider">
                      <MessageSquare className="w-4 h-4" />
                      <span>Join the Discussion (Reader Inquiry Prompts)</span>
                    </div>
                    <ul className="space-y-2 text-xs text-stone-300 list-disc list-inside">
                      {(article.discussionPrompts || []).map((prompt, idx) => (
                        <li key={idx} className="leading-relaxed">
                          <span className="text-stone-200">{prompt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Reference Materials List */}
                  {(article.referenceMaterials || []).length > 0 && (
                    <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center space-x-2 text-stone-300 font-semibold text-xs uppercase tracking-wider">
                        <Bookmark className="w-4 h-4 text-amber-400" />
                        <span>Curated Reference & Reading Material</span>
                      </div>
                      <div className="space-y-2">
                        {(article.referenceMaterials || []).map((ref, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-800/80 text-xs flex items-start justify-between">
                            <div>
                              <div className="font-medium text-stone-200 flex items-center space-x-2">
                                <span>{ref.title}</span>
                                {ref.sourceType && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-400 border border-stone-700">
                                    {ref.sourceType}
                                  </span>
                                )}
                              </div>
                              <p className="text-stone-400 text-[11px] mt-0.5">{ref.description}</p>
                            </div>
                            {ref.url && (
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-stone-500 hover:text-amber-400 p-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Call To Action & Substack Widget */}
                  <div className="border-t border-stone-800 pt-6 text-center space-y-3">
                    <p className="text-xs text-stone-300 font-medium italic">
                      "{article.callToAction}"
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="px-4 py-2 rounded-xl bg-orange-600 text-stone-950 font-bold text-xs shadow-md">
                        Subscribe to {book.author}'s Substack
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-medium text-xs border border-stone-700">
                        Leave a Comment
                      </div>
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                      {article.suggestedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900 text-stone-400 border border-stone-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Markdown Tab */}
              {activeViewTab === "markdown" && (
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-xs text-stone-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {`# ${article.articleTitle}\n\n*${article.subtitle}*\n\n> **Ideology Focus:** ${article.ideologyTheme}\n\n${article.contentMarkdown}\n\n### Reader Discussion\n${(article.discussionPrompts || []).map((p, i) => `${i + 1}. ${p}`).join("\n\n")}\n\n### References\n${(article.referenceMaterials || []).map((r) => `- **${r.title}**: ${r.description}`).join("\n")}`}
                </div>
              )}

              {/* Discussion Hooks Tab */}
              {activeViewTab === "discussion" && (
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-4">
                  <h3 className="font-serif text-sm font-bold text-amber-300">
                    Community Discussion Hooks & Poll Questions
                  </h3>
                  <p className="text-xs text-stone-400">
                    Paste these prompts at the bottom of your Substack post or in the Substack Chat thread to spark lively reader engagement.
                  </p>
                  <div className="space-y-3">
                    {(article.discussionPrompts || []).map((prompt, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-start space-x-3 text-xs"
                      >
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1 text-stone-200 leading-relaxed font-serif text-sm">
                          {prompt}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference Material Tab */}
              {activeViewTab === "references" && (
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-4">
                  <h3 className="font-serif text-sm font-bold text-amber-300">
                    Verified Real-World Reference Materials & Ideology Antecedents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(article.referenceMaterials || []).map((ref, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-stone-100">{ref.title}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-400 border border-stone-700">
                            {ref.sourceType || "Reference"}
                          </span>
                        </div>
                        <p className="text-stone-400 text-xs leading-relaxed">{ref.description}</p>
                        {ref.url && (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] text-amber-400 hover:text-amber-300"
                          >
                            <span>Explore Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-500 space-y-3">
              <Share2 className="w-10 h-10 mx-auto text-stone-600 opacity-60" />
              <p className="text-xs max-w-md mx-auto">
                Click <strong>"Generate Substack Article"</strong> above to craft a publication-ready essay expanding upon Chapter {chapter.number}'s themes, complete with reader inquiry prompts and reference background.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
