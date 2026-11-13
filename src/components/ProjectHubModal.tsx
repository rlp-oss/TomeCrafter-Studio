import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Sparkles,
  X,
  Layers,
  Wand2,
  Trash2,
  Copy,
  Check,
  Calendar,
  Clock,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  FileText,
  Palette,
  Compass,
  Download,
} from "lucide-react";
import { Book, Genre } from "../types";
import { apiService } from "../services/api";

interface ProjectHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  activeBookId: string;
  onSelectBook: (bookId: string) => void;
  onCreateBook: (newBookData: Partial<Book>) => void;
  onDuplicateBook?: (bookId: string) => void;
  onDeleteBook?: (bookId: string) => void;
  initialTab?: "create" | "library";
  authorDefaultName?: string;
}

const GENRE_PRESETS: { genre: Genre; desc: string; icon: string; accent: string }[] = [
  { genre: "Epic Fantasy", desc: "Sprawling lore, high magic, heroic quests", icon: "⚔️", accent: "#d97706" },
  { genre: "Sci-Fi & Cyberpunk", desc: "Synthetic worlds, space sagas, AI dilemmas", icon: "🚀", accent: "#06b6d4" },
  { genre: "Mystery & Thriller", desc: "Twists, high stakes, investigative suspense", icon: "🔍", accent: "#a855f7" },
  { genre: "Historical Fiction", desc: "Period authentic drama, real-world grit", icon: "🏛️", accent: "#b45309" },
  { genre: "Romance & Drama", desc: "Intense character dynamics, emotional payoff", icon: "🥀", accent: "#f43f5e" },
  { genre: "Horror & Gothic", desc: "Psychological dread, eerie atmospheres", icon: "🕯️", accent: "#64748b" },
  { genre: "Non-Fiction & Self-Help", desc: "Structured knowledge, insightful frameworks", icon: "💡", accent: "#10b981" },
  { genre: "Young Adult", desc: "Coming of age, fast-paced conflict", icon: "✨", accent: "#eab308" },
];

const TEMPLATE_PRESETS = [
  {
    title: "The Obsidian Throne",
    genre: "Epic Fantasy" as Genre,
    tone: "grimdark, atmospheric, political intrigue",
    targetWords: 80000,
    premise: "When the High King falls without an heir, five fractured duchies vie for the Obsidian Throne while an ancient primordial blight reawakens in the northern wastes.",
  },
  {
    title: "Echoes of Neo-Kyoto",
    genre: "Sci-Fi & Cyberpunk" as Genre,
    tone: "neon noir, introspective, high-octane",
    targetWords: 60000,
    premise: "A memory-auditor discovers a recurring cryptographic glitch in the consciousness of the city's corporate elite—a glitch hinting at a sentient rebellion living between synaptic pulses.",
  },
  {
    title: "The St. Jude Enigma",
    genre: "Mystery & Thriller" as Genre,
    tone: "taut, psychological, fast-paced",
    targetWords: 50000,
    premise: "An archivist at an isolated coastal sanatorium uncovers coded journals from 1928 that accurately describe crimes committed in modern-day London.",
  },
];

export const ProjectHubModal: React.FC<ProjectHubModalProps> = ({
  isOpen,
  onClose,
  books,
  activeBookId,
  onSelectBook,
  onCreateBook,
  onDuplicateBook,
  onDeleteBook,
  initialTab = "create",
  authorDefaultName = "Anonymous Author",
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "library">(initialTab);

  // Creation State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState(authorDefaultName);
  const [genre, setGenre] = useState<Genre>("Epic Fantasy");
  const [tone, setTone] = useState("atmospheric, immersive, cinematic");
  const [targetWordCount, setTargetWordCount] = useState<number>(60000);
  const [premise, setPremise] = useState("");
  const [isExpandingPremise, setIsExpandingPremise] = useState(false);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  // Library Search / Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyTemplate = (tpl: typeof TEMPLATE_PRESETS[0]) => {
    setTitle(tpl.title);
    setGenre(tpl.genre);
    setTone(tpl.tone);
    setTargetWordCount(tpl.targetWords);
    setPremise(tpl.premise);
    setAppliedTemplate(tpl.title);
  };

  const handleAiExpandPremise = async () => {
    if (!title.trim()) return;
    setIsExpandingPremise(true);
    try {
      const generated = await apiService.generateText({
        prompt: `You are the Master Realm Architect. Generate a compelling 2-paragraph premise and logline for a ${genre} novel titled "${title}". Tone: ${tone}. Target length: ${targetWordCount} words. Emphasize protagonist dilemma, key worldbuilding hook, and core dramatic stakes.`,
      });
      if (generated && generated.trim()) {
        setPremise(generated.trim());
      }
    } catch (err) {
      console.error("Failed to generate premise:", err);
    } finally {
      setIsExpandingPremise(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateBook({
      title: title.trim(),
      subtitle: subtitle.trim(),
      author: author.trim() || authorDefaultName,
      genre,
      tone,
      targetWordCount,
      premise: premise.trim() || "An untold epic awaiting author craftsmanship.",
    });

    onClose();
  };

  const handleCopyRefId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedRefId(id);
    setTimeout(() => setCopiedRefId(null), 2000);
  };

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.premise?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === "all" || b.genre === genreFilter;
    return matchesSearch && matchesGenre;
  });

  const totalWordsAcrossProjects = (books || []).reduce((acc, b) => {
    const bWords = (b.chapters || []).reduce(
      (cAcc, ch) => cAcc + (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
      0
    );
    return acc + bWords;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-stone-900 border border-stone-700/90 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-stone-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-serif font-bold text-lg shadow-md shadow-amber-950/40">
              𝔗
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif font-bold text-lg text-stone-100">
                  Project Creation & Reference Hub
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                  {books.length} {books.length === 1 ? "Project" : "Projects"}
                </span>
              </div>
              <p className="text-xs text-stone-400 font-sans">
                Create new manuscripts or reference, switch, and duplicate active projects.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-stone-800 px-6 bg-stone-900/90 gap-4">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center space-x-2 py-3.5 border-b-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "create"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex items-center space-x-2 py-3.5 border-b-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "library"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Project Reference Library ({books.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "create" ? (
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Quick Template Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-medium flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Starter Archetypes</span>
                  </span>
                  <span className="text-stone-500 text-[11px]">Click to pre-fill</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {TEMPLATE_PRESETS.map((tpl) => (
                    <div
                      key={tpl.title}
                      onClick={() => handleApplyTemplate(tpl)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        appliedTemplate === tpl.title
                          ? "bg-amber-500/10 border-amber-500/50 text-amber-200"
                          : "bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-serif font-bold">
                        <span className="truncate">{tpl.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                          {tpl.genre}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                        {tpl.premise}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Book Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Silver Spire Chronicles"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Subtitle / Series Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Book I: The Awakening"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Author / Pen Name
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your Name / Pen Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Primary Genre
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value as Genre)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  >
                    {GENRE_PRESETS.map((g) => (
                      <option key={g.genre} value={g.genre}>
                        {g.icon} {g.genre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Word Count Presets & Tone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-300 text-xs font-semibold">
                      Target Word Count
                    </label>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {targetWordCount.toLocaleString()} words (~{Math.round(targetWordCount / 250)} pages)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "25k Novella", count: 25000 },
                      { label: "50k Novel", count: 50000 },
                      { label: "80k Epic", count: 80000 },
                      { label: "120k Tome", count: 120000 },
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.count}
                        onClick={() => setTargetWordCount(preset.count)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-mono border transition-all ${
                          targetWordCount === preset.count
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                            : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Tone & Narrative Style
                  </label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g. grimdark, poetic, humorous, tense"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Core Premise & AI Assist */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-stone-300 text-xs font-semibold">
                    Core Premise, Logline & Hook
                  </label>
                  <button
                    type="button"
                    onClick={handleAiExpandPremise}
                    disabled={!title.trim() || isExpandingPremise}
                    className="flex items-center space-x-1.5 text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isExpandingPremise ? "Expanding Premise..." : "AI Generate Premise"}</span>
                  </button>
                </div>
                <textarea
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  rows={3}
                  placeholder="Describe the central character, inciting incident, primary conflict, and unique lore elements..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Footer Submit */}
              <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">
                  ⚡ Auto-save will instantly track this project
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-950/40 disabled:opacity-40 transition-all flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Create & Launch Project</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Project Reference Library View */
            <div className="space-y-4">
              {/* Top Stats Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800">
                  <div className="text-[10px] text-stone-500 font-mono uppercase">Total Projects</div>
                  <div className="text-xl font-bold font-serif text-amber-400 mt-0.5">
                    {books.length} Active
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800">
                  <div className="text-[10px] text-stone-500 font-mono uppercase">Total Words Written</div>
                  <div className="text-xl font-bold font-serif text-emerald-400 mt-0.5">
                    {totalWordsAcrossProjects.toLocaleString()} Words
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800">
                  <div className="text-[10px] text-stone-500 font-mono uppercase">Total Chapters</div>
                  <div className="text-xl font-bold font-serif text-cyan-400 mt-0.5">
                    {(books || []).reduce((acc, b) => acc + (b.chapters || []).length, 0)} Chapters
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects by title, author, premise, or ID..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-stone-400" />
                  <select
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none"
                  >
                    <option value="all">All Genres</option>
                    {GENRE_PRESETS.map((g) => (
                      <option key={g.genre} value={g.genre}>
                        {g.genre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-3 pt-2">
                {filteredBooks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-stone-800 rounded-2xl text-stone-400 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-stone-600" />
                    <p className="text-sm">No projects matching your search criteria.</p>
                    <button
                      onClick={() => setActiveTab("create")}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      + Create a new project now
                    </button>
                  </div>
                ) : (
                  filteredBooks.map((b) => {
                    const isActive = b.id === activeBookId;
                    const bookWords = (b.chapters || []).reduce(
                      (acc, ch) => acc + (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
                      0
                    );
                    const targetW = b.targetWordCount || 60000;
                    const progressPct = Math.min(100, Math.round((bookWords / targetW) * 100));

                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isActive
                            ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-950/30"
                            : "bg-stone-950/70 border-stone-800 hover:border-stone-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Info */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-serif font-bold text-base text-stone-100">
                                {b.title}
                              </span>
                              {b.subtitle && (
                                <span className="text-xs text-stone-400 font-serif italic">
                                  — {b.subtitle}
                                </span>
                              )}
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                                {b.genre}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                                  Active Project
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-stone-400 line-clamp-1 max-w-2xl">
                              {b.premise}
                            </p>

                            <div className="flex items-center space-x-3 text-[11px] text-stone-400 pt-1 font-mono">
                              <span>By {b.author}</span>
                              <span>•</span>
                              <span>{b.chapters.length} {b.chapters.length === 1 ? "Chapter" : "Chapters"}</span>
                              <span>•</span>
                              <span>{bookWords.toLocaleString()} / {targetW.toLocaleString()} words ({progressPct}%)</span>
                              <span>•</span>
                              <button
                                onClick={() => handleCopyRefId(b.id)}
                                className="text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                                title="Copy Project Reference ID"
                              >
                                <span>Ref: {b.id.slice(0, 14)}...</span>
                                {copiedRefId === b.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center space-x-2 shrink-0">
                            {onDuplicateBook && (
                              <button
                                onClick={() => onDuplicateBook(b.id)}
                                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                                title="Duplicate Project as Reference"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onDeleteBook && books.length > 1 && (
                              <button
                                onClick={() => onDeleteBook(b.id)}
                                className="p-2 rounded-xl bg-stone-800 hover:bg-rose-900/50 text-stone-400 hover:text-rose-300 text-xs transition-colors"
                                title="Delete Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onSelectBook(b.id);
                                onClose();
                              }}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 ${
                                isActive
                                  ? "bg-stone-800 text-stone-200 hover:bg-stone-700"
                                  : "bg-amber-500 hover:bg-amber-400 text-stone-950"
                              }`}
                            >
                              <span>{isActive ? "Continue Writing" : "Open Project"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mini Word Count Bar */}
                        <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden mt-2.5 border border-stone-800">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
