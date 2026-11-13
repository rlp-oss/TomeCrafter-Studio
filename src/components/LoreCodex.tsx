import React, { useState } from "react";
import {
  Compass,
  Plus,
  Sparkles,
  Search,
  User,
  MapPin,
  Flame,
  Shield,
  Clock,
  Trash2,
  Edit3,
  BookOpen,
  Loader2,
  ExternalLink,
  Eye,
  Ear,
  Wind,
} from "lucide-react";
import { Book, LoreEntry } from "../types";
import { apiService } from "../services/api";

interface LoreCodexProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
}

export const LoreCodex: React.FC<LoreCodexProps> = ({ book, onUpdateBook }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LoreEntry | null>(null);

  // Modal Generator States
  const [loreCategory, setLoreCategory] = useState<LoreEntry["category"]>("Character");
  const [loreName, setLoreName] = useState("");
  const [lorePrompt, setLorePrompt] = useState("");

  const categories: string[] = [
    "All",
    "Character",
    "Location",
    "Magic/Tech",
    "Faction",
    "Artifact",
    "Timeline",
  ];

  const filteredEntries = book.loreEntries.filter((entry) => {
    const matchesCat = selectedCategory === "All" || entry.category === selectedCategory;
    const matchesSearch =
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryIcon = (category: LoreEntry["category"]) => {
    switch (category) {
      case "Character":
        return <User className="w-4 h-4 text-amber-400" />;
      case "Location":
        return <MapPin className="w-4 h-4 text-emerald-400" />;
      case "Magic/Tech":
        return <Flame className="w-4 h-4 text-purple-400" />;
      case "Faction":
        return <Shield className="w-4 h-4 text-blue-400" />;
      case "Timeline":
        return <Clock className="w-4 h-4 text-rose-400" />;
      default:
        return <Compass className="w-4 h-4 text-stone-400" />;
    }
  };

  const handleGenerateLoreWithScholar = async () => {
    if (!loreName.trim()) {
      alert("Please enter a subject name first (e.g., 'Evelyn Vance' or 'Aether-Solvent').");
      return;
    }
    setIsAiGenerating(true);

    try {
      const generated = await apiService.generateLore({
        category: loreCategory,
        name: loreName,
        promptHint: lorePrompt,
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
        },
      });

      const newEntry: LoreEntry = {
        id: `lore-${Date.now()}`,
        name: generated.name || loreName,
        category: (generated.category as any) || loreCategory,
        tagline: generated.tagline || "",
        description: generated.description || "",
        secretsOrFlaws: generated.secretsOrFlaws,
        sensoryDetails: generated.sensoryDetails,
        relatedEntities: generated.relatedEntities,
        plotHooks: generated.plotHooks,
      };

      onUpdateBook({
        ...book,
        loreEntries: [...book.loreEntries, newEntry],
        updatedAt: new Date().toISOString(),
      });

      setShowAddModal(false);
      setLoreName("");
      setLorePrompt("");
    } catch (err: any) {
      alert("Archivist Elendur encountered an error: " + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDeleteEntry = (id: string) => {
    if (!confirm("Remove this entry from the World Codex?")) return;
    const updated = book.loreEntries.filter((e) => e.id !== id);
    onUpdateBook({ ...book, loreEntries: updated });
  };

  const handleSaveEdit = (updated: LoreEntry) => {
    const list = book.loreEntries.map((e) => (e.id === updated.id ? updated : e));
    onUpdateBook({ ...book, loreEntries: list });
    setEditingEntry(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              World Codex & Lore Bible
            </h1>
          </div>
          <p className="text-sm text-stone-400">
            Governed by <span className="text-indigo-400 font-medium">Archivist Elendur</span>. Maintain
            continuity across characters, locations, magic systems, factions, and secret histories.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-stone-100 font-medium text-sm transition-all shadow-lg shadow-indigo-950/30"
        >
          <Sparkles className="w-4 h-4" />
          <span>Consult Archivist & Add Lore</span>
        </button>
      </div>

      {/* Category Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters, lore, secrets..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Lore Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="p-5 rounded-2xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-3">
              {/* Header: Name & Category */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-stone-950 border border-stone-800">
                    {getCategoryIcon(entry.category)}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-100">{entry.name}</h3>
                    <span className="text-[10px] font-mono uppercase text-indigo-400/90">
                      {entry.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingEntry(entry)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-900/30 text-stone-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {entry.tagline && (
                <p className="text-xs text-amber-300/90 font-medium italic">{entry.tagline}</p>
              )}

              <p className="text-xs text-stone-300 leading-relaxed line-clamp-4">{entry.description}</p>

              {/* Secrets or Flaws */}
              {entry.secretsOrFlaws && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                  <span className="font-bold font-mono text-[9px] uppercase block text-rose-400 mb-0.5">
                    Critical Secret / Flaw:
                  </span>
                  {entry.secretsOrFlaws}
                </div>
              )}

              {/* Sensory Details */}
              {entry.sensoryDetails && (
                <div className="space-y-1 text-[11px] text-stone-400 bg-stone-950/80 p-2.5 rounded-xl border border-stone-800/80">
                  {entry.sensoryDetails.sight && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Eye className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{entry.sensoryDetails.sight}</span>
                    </div>
                  )}
                  {entry.sensoryDetails.sound && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Ear className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="truncate">{entry.sensoryDetails.sound}</span>
                    </div>
                  )}
                  {entry.sensoryDetails.scent && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Wind className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{entry.sensoryDetails.scent}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Plot Hooks */}
              {entry.plotHooks && entry.plotHooks.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-stone-500 font-bold">
                    Narrative Hooks:
                  </span>
                  <ul className="text-[11px] text-stone-400 list-disc pl-4 space-y-0.5">
                    {entry.plotHooks.map((hook, idx) => (
                      <li key={idx}>{hook}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Related Entities Tags */}
            {entry.relatedEntities && entry.relatedEntities.length > 0 && (
              <div className="pt-2 border-t border-stone-800/80 flex flex-wrap gap-1">
                {entry.relatedEntities.map((rel, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-stone-800 text-stone-400"
                  >
                    {rel}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-stone-800">
          <Compass className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-bold text-stone-300">No Lore Records Found</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-6">
            Build your world's bedrock by adding characters, cities, artifacts, or magic theorems.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-stone-100 text-sm font-medium transition-colors"
          >
            Consult Archivist Elendur
          </button>
        </div>
      )}

      {/* Add Lore Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  <Compass className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">Archivist Elendur's Codex Forge</h3>
                  <p className="text-xs text-stone-400">Generate or flesh out deep lore</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">
                    Lore Category
                  </label>
                  <select
                    value={loreCategory}
                    onChange={(e) => setLoreCategory(e.target.value as any)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Character">Character</option>
                    <option value="Location">Location</option>
                    <option value="Magic/Tech">Magic / Technology</option>
                    <option value="Faction">Faction / Order</option>
                    <option value="Artifact">Artifact / Relic</option>
                    <option value="Timeline">Timeline / Historical Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">
                    Entity / Subject Name
                  </label>
                  <input
                    type="text"
                    value={loreName}
                    onChange={(e) => setLoreName(e.target.value)}
                    placeholder="e.g. Inquisitor Malakor"
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Context / Guiding Prompt
                </label>
                <textarea
                  value={lorePrompt}
                  onChange={(e) => setLorePrompt(e.target.value)}
                  rows={3}
                  placeholder="Provide hints about background, relationships, abilities, or role in the narrative..."
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px]">
                🏛️ <strong>Scholar's Guarantee:</strong> Archivist Elendur will construct a rich lore profile
                including sensory signatures, fatal secrets/flaws, and story-driving plot hooks.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3 border-t border-stone-800 pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateLoreWithScholar}
                disabled={isAiGenerating || !loreName.trim()}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-stone-100 font-bold text-xs transition-all disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Inscribing Codex...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Inscribe into Codex</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lore Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-100">Edit Lore Entry</h3>
              <button onClick={() => setEditingEntry(null)} className="text-stone-400 hover:text-stone-200">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">Name</label>
                  <input
                    type="text"
                    value={editingEntry.name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">Category</label>
                  <select
                    value={editingEntry.category}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, category: e.target.value as any })
                    }
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Character">Character</option>
                    <option value="Location">Location</option>
                    <option value="Magic/Tech">Magic / Technology</option>
                    <option value="Faction">Faction / Order</option>
                    <option value="Artifact">Artifact / Relic</option>
                    <option value="Timeline">Timeline / Historical Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">Tagline</label>
                <input
                  type="text"
                  value={editingEntry.tagline}
                  onChange={(e) => setEditingEntry({ ...editingEntry, tagline: e.target.value })}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">Description</label>
                <textarea
                  value={editingEntry.description}
                  onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Secret / Vulnerability
                </label>
                <input
                  type="text"
                  value={editingEntry.secretsOrFlaws || ""}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, secretsOrFlaws: e.target.value })
                  }
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3 border-t border-stone-800 pt-4">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingEntry)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-stone-100 font-bold text-xs transition-colors"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
