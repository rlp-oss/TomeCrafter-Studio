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
  Pencil,
  ArrowLeft,
  Save,
  Cloud,
  CloudOff,
  AlertCircle,
  RefreshCw,
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
  onEditBook?: (
    bookId: string,
    updates: {
      title: string;
      subtitle: string;
      author: string;
      genre: Genre;
      tone: string;
      targetWordCount: number;
      premise: string;
      syncPublishingKit?: boolean;
    }
  ) => Promise<void> | void;
  onDuplicateBook?: (bookId: string) => void;
  onDeleteBook?: (bookId: string) => void;
  initialTab?: "create" | "library";
  initialEditBookId?: string | null;
  authorDefaultName?: string;
  isCloudAuthenticated?: boolean;
  cloudSyncedIds?: Set<string>;
  dirtyBookIds?: Set<string>;
  syncErrorsByBookId?: Record<string, string>;
  syncingBookIds?: Set<string>;
  isSyncingCloud?: boolean;
  onSyncBook?: (bookId: string) => Promise<void> | void;
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
  onEditBook,
  onDuplicateBook,
  onDeleteBook,
  initialTab = "create",
  initialEditBookId = null,
  authorDefaultName = "Anonymous Author",
  isCloudAuthenticated = false,
  cloudSyncedIds,
  dirtyBookIds,
  syncErrorsByBookId,
  syncingBookIds,
  isSyncingCloud = false,
  onSyncBook,
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

  // Edit Project State
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editGenre, setEditGenre] = useState<Genre>("Epic Fantasy");
  const [editTone, setEditTone] = useState("");
  const [editTargetWordCount, setEditTargetWordCount] = useState<number>(60000);
  const [editPremise, setEditPremise] = useState("");
  const [syncPublishingKit, setSyncPublishingKit] = useState<boolean>(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isExpandingEditPremise, setIsExpandingEditPremise] = useState(false);

  // Library Search / Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

  const startEditingBook = (bookToEdit: Book) => {
    setEditingBookId(bookToEdit.id);
    setEditTitle(bookToEdit.title || "");
    setEditSubtitle(bookToEdit.subtitle || "");
    setEditAuthor(bookToEdit.author || authorDefaultName);
    setEditGenre((bookToEdit.genre as Genre) || "Epic Fantasy");
    setEditTone(bookToEdit.tone || "");
    setEditTargetWordCount(bookToEdit.targetWordCount || 60000);
    setEditPremise(bookToEdit.premise || "");
    setSyncPublishingKit(true);
    setActiveTab("library");
  };

  React.useEffect(() => {
    if (!isOpen) return;
    if (initialEditBookId) {
      const target = books.find((b) => b.id === initialEditBookId);
      if (target) {
        startEditingBook(target);
        return;
      }
    }
    setEditingBookId(null);
    setActiveTab(initialTab);
  }, [isOpen, initialTab, initialEditBookId]);

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookId || !editTitle.trim() || !onEditBook) return;
    setIsSavingEdit(true);
    try {
      await onEditBook(editingBookId, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        author: editAuthor.trim() || authorDefaultName,
        genre: editGenre,
        tone: editTone.trim(),
        targetWordCount: editTargetWordCount,
        premise: editPremise.trim(),
        syncPublishingKit,
      });
      setEditingBookId(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAiExpandEditPremise = async () => {
    if (!editTitle.trim()) return;
    setIsExpandingEditPremise(true);
    try {
      const generated = await apiService.generateText({
        prompt: `You are the Master Realm Architect. Generate a compelling 2-paragraph premise and logline for a ${editGenre} book titled "${editTitle}". Tone: ${editTone}. Target length: ${editTargetWordCount} words.`,
      });
      if (generated && generated.trim()) {
        setEditPremise(generated.trim());
      }
    } catch (err) {
      console.error("Failed to generate premise:", err);
    } finally {
      setIsExpandingEditPremise(false);
    }
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
            onClick={() => {
              setEditingBookId(null);
              setActiveTab("create");
            }}
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
            onClick={() => {
              setEditingBookId(null);
              setActiveTab("library");
            }}
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
                  💾 Save changes anytime from the top bar or Ctrl/Cmd+S
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
          ) : editingBookId ? (
            /* Edit Existing Project View */
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="flex items-center justify-between bg-stone-950/80 border border-amber-500/30 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingBookId(null)}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                    title="Back to project list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                      Editing Project Metadata
                    </div>
                    <h3 className="font-serif font-bold text-base text-stone-100">
                      {editTitle || "Untitled Project"}
                    </h3>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-stone-500">
                  ID: {editingBookId}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Book Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter book title..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Subtitle / Series Tag
                  </label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="Optional subtitle..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Author / Pen Name
                  </label>
                  <input
                    type="text"
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    placeholder="Author name..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Primary Genre
                  </label>
                  <select
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value as Genre)}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-300 text-xs font-semibold">
                      Target Word Count
                    </label>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {editTargetWordCount.toLocaleString()} words
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1000}
                      max={10000000}
                      step={500}
                      value={editTargetWordCount}
                      onChange={(e) => setEditTargetWordCount(Math.max(1000, Number(e.target.value) || 1000))}
                      className="w-32 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                    <div className="grid grid-cols-4 gap-1 flex-1">
                      {[
                        { label: "30k", count: 30000 },
                        { label: "50k", count: 50000 },
                        { label: "80k", count: 80000 },
                        { label: "100k", count: 100000 },
                      ].map((preset) => (
                        <button
                          type="button"
                          key={preset.count}
                          onClick={() => setEditTargetWordCount(preset.count)}
                          className={`py-2 rounded-lg text-[11px] font-mono border transition-all ${
                            editTargetWordCount === preset.count
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                              : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold mb-1">
                    Tone & Narrative Style
                  </label>
                  <input
                    type="text"
                    value={editTone}
                    onChange={(e) => setEditTone(e.target.value)}
                    placeholder="e.g. authoritative, grounded, analytical"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-stone-300 text-xs font-semibold">
                    Core Premise, Logline & Hook
                  </label>
                  <button
                    type="button"
                    onClick={handleAiExpandEditPremise}
                    disabled={!editTitle.trim() || isExpandingEditPremise}
                    className="flex items-center space-x-1.5 text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isExpandingEditPremise ? "Expanding Premise..." : "AI Refine Premise"}</span>
                  </button>
                </div>
                <textarea
                  value={editPremise}
                  onChange={(e) => setEditPremise(e.target.value)}
                  rows={3}
                  placeholder="Describe the central thesis, stakes, or premise..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <label className="flex items-center space-x-2.5 text-xs text-stone-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncPublishingKit}
                  onChange={(e) => setSyncPublishingKit(e.target.checked)}
                  className="rounded border-stone-600 bg-stone-950 text-amber-500 focus:ring-amber-500"
                />
                <span>Also sync Publishing Kit Commercial Title & Subtitle with these changes</span>
              </label>

              <div className="pt-4 border-t border-stone-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingBookId(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim() || isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-950/40 disabled:opacity-40 transition-all flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? "Saving..." : "Save Project Changes"}</span>
                </button>
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

                    const isSyncedInCloud = Boolean(cloudSyncedIds?.has(b.id));
                    const isDirty = Boolean(dirtyBookIds?.has(b.id));
                    const syncError = syncErrorsByBookId?.[b.id];
                    const isSyncingThisBook = Boolean(syncingBookIds?.has(b.id)) || (isSyncingCloud && !isSyncedInCloud && !syncError);

                    type CloudHealthState = "syncing" | "error" | "pending" | "local_only" | "synced";
                    let cloudHealth: CloudHealthState = "local_only";
                    if (isSyncingThisBook) {
                      cloudHealth = "syncing";
                    } else if (syncError) {
                      cloudHealth = "error";
                    } else if (!isCloudAuthenticated || !isSyncedInCloud) {
                      cloudHealth = "local_only";
                    } else if (isDirty) {
                      cloudHealth = "pending";
                    } else {
                      cloudHealth = "synced";
                    }

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

                              {cloudHealth === "synced" && (
                                <span
                                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                                  title="This project is backed up and up to date in Firebase Cloud."
                                >
                                  <Cloud className="w-3 h-3" />
                                  <span>Synced</span>
                                </span>
                              )}
                              {cloudHealth === "pending" && (
                                <span
                                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35"
                                  title="Local edits have not been pushed to Firebase Cloud yet."
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>Sync Pending</span>
                                </span>
                              )}
                              {cloudHealth === "syncing" && (
                                <span
                                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/35"
                                  title="Syncing this project to Firebase Cloud..."
                                >
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Syncing</span>
                                </span>
                              )}
                              {cloudHealth === "error" && (
                                <span
                                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold"
                                  title={syncError}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Sync Failed</span>
                                </span>
                              )}
                              {cloudHealth === "local_only" && (
                                <span
                                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800/90 text-stone-300 border border-stone-600/80"
                                  title={
                                    isCloudAuthenticated
                                      ? "Saved in this browser only; not yet synced to Firebase Cloud."
                                      : "Saved in this browser only. Sign in to sync to Firebase Cloud."
                                  }
                                >
                                  <CloudOff className="w-3 h-3 text-stone-400" />
                                  <span>Local Only</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-stone-400 line-clamp-1 max-w-2xl">
                              {b.premise}
                            </p>

                            {syncError && (
                              <p className="text-[11px] text-rose-300/95 bg-rose-950/40 border border-rose-500/25 rounded-lg px-2.5 py-1 max-w-2xl line-clamp-2">
                                Cloud sync error: {syncError}
                              </p>
                            )}

                            <div className="flex items-center space-x-3 text-[11px] text-stone-400 pt-1 font-mono flex-wrap gap-y-1">
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
                          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
                            {isCloudAuthenticated && onSyncBook && cloudHealth !== "synced" && (
                              <button
                                onClick={() => void onSyncBook(b.id)}
                                disabled={isSyncingThisBook}
                                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors disabled:opacity-50 ${
                                  cloudHealth === "error"
                                    ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border-rose-500/40"
                                    : "bg-stone-800 hover:bg-emerald-500/20 text-stone-200 hover:text-emerald-300 border-stone-700 hover:border-emerald-500/40"
                                }`}
                                title={cloudHealth === "error" ? "Retry cloud sync" : "Sync this project to cloud now"}
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingThisBook ? "animate-spin" : ""}`} />
                                <span>{cloudHealth === "error" ? "Retry Sync" : "Sync"}</span>
                              </button>
                            )}
                            {onEditBook && (
                              <button
                                onClick={() => startEditingBook(b)}
                                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-amber-500/20 text-stone-200 hover:text-amber-300 border border-stone-700 hover:border-amber-500/40 text-xs font-medium transition-colors"
                                title={`Edit "${b.title}"`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit Project</span>
                              </button>
                            )}

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
