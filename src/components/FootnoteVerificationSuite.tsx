import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  HelpCircle,
  Bookmark,
  Check,
  X,
  Scroll,
  ArrowRight,
  Filter,
  Copy,
} from "lucide-react";
import {
  Book,
  Chapter,
  FootnoteReference,
  FootnoteVerificationStatus,
  FootnoteType,
  FootnoteAuditResult,
  SingleFootnoteAuditResult,
} from "../types";
import { apiService } from "../services/api";

interface FootnoteVerificationSuiteProps {
  book: Book;
  activeChapter?: Chapter | null;
  onUpdateBook: (updatedBook: Book) => void;
  onInsertMarkerAtCursor?: (marker: string) => void;
  compact?: boolean;
}

export const FootnoteVerificationSuite: React.FC<FootnoteVerificationSuiteProps> = ({
  book,
  activeChapter,
  onUpdateBook,
  onInsertMarkerAtCursor,
  compact = false,
}) => {
  const [scope, setScope] = useState<"chapter" | "manuscript">("chapter");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAuditing, setIsAuditing] = useState(false);
  const [verifyingFootnoteId, setVerifyingFootnoteId] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<FootnoteAuditResult | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [editingFootnote, setEditingFootnote] = useState<FootnoteReference | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"apa" | "chicago" | "mla" | "markdown">("chicago");

  // New Footnote Form State
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<FootnoteType>("real_world_fact");

  const authorName = book.author || "Author";

  // Gather current scoped footnotes
  const getScopedFootnotes = (): { footnote: FootnoteReference; chapterId?: string; chapterNum?: number }[] => {
    if (scope === "chapter" && activeChapter) {
      return (activeChapter.footnotes || []).map((fn) => ({
        footnote: fn,
        chapterId: activeChapter.id,
        chapterNum: activeChapter.number,
      }));
    }

    // Full manuscript
    const list: { footnote: FootnoteReference; chapterId?: string; chapterNum?: number }[] = [];
    book.chapters.forEach((ch) => {
      (ch.footnotes || []).forEach((fn) => {
        list.push({ footnote: fn, chapterId: ch.id, chapterNum: ch.number });
      });
    });
    return list;
  };

  const scopedItems = getScopedFootnotes();

  // Filter scoped items
  const filteredItems = scopedItems.filter((item) => {
    const fn = item.footnote;
    if (filterStatus === "all") return true;
    if (filterStatus === "alerts") {
      return (
        fn.verificationStatus === "author_attribution_alert" ||
        fn.verificationStatus === "hallucination_warning" ||
        fn.isAttributedToCurrentUser
      );
    }
    if (filterStatus === "verified") return fn.verificationStatus === "verified_real_publication" || fn.verifiedWithGoogle;
    if (filterStatus === "lore") return fn.verificationStatus === "in_universe_lore" || fn.footnoteType === "in_universe_lore";
    if (filterStatus === "unverified") return !fn.verificationStatus || fn.verificationStatus === "unverified";
    return true;
  });

  // Calculate metrics
  const alertCount = scopedItems.filter(
    (i) =>
      i.footnote.verificationStatus === "author_attribution_alert" ||
      i.footnote.verificationStatus === "hallucination_warning" ||
      i.footnote.isAttributedToCurrentUser
  ).length;

  const verifiedCount = scopedItems.filter(
    (i) => i.footnote.verificationStatus === "verified_real_publication" || i.footnote.verifiedWithGoogle
  ).length;

  const loreCount = scopedItems.filter(
    (i) => i.footnote.verificationStatus === "in_universe_lore" || i.footnote.footnoteType === "in_universe_lore"
  ).length;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to update a footnote in the book state
  const updateFootnoteInBook = (
    footnoteId: string,
    updater: (fn: FootnoteReference) => FootnoteReference
  ) => {
    const updatedChapters = book.chapters.map((ch) => {
      if (!ch.footnotes) return ch;
      const updatedFootnotes = ch.footnotes.map((fn) => {
        if (fn.id === footnoteId) {
          return updater(fn);
        }
        return fn;
      });
      return { ...ch, footnotes: updatedFootnotes };
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
  };

  // Helper to delete a footnote
  const deleteFootnoteFromBook = (footnoteId: string) => {
    const updatedChapters = book.chapters.map((ch) => {
      if (!ch.footnotes) return ch;
      const updatedFootnotes = ch.footnotes.filter((fn) => fn.id !== footnoteId);
      return { ...ch, footnotes: updatedFootnotes };
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
    showToast("Footnote removed.");
  };

  // Audit all scoped footnotes
  const handleAuditAll = async () => {
    if (scopedItems.length === 0) {
      showToast("No footnotes found to audit.");
      return;
    }

    setIsAuditing(true);
    try {
      const footnotesToAudit = scopedItems.map((item) => item.footnote);
      const result = await apiService.auditManuscriptFootnotes({
        footnotes: footnotesToAudit,
        authorName: book.author,
        bookContext: {
          title: book.title,
          genre: book.genre,
          premise: book.premise,
        },
      });

      setAuditReport(result);

      // Merge results into book state
      const resultMap = new Map<string, SingleFootnoteAuditResult>();
      result.detailedResults.forEach((res) => {
        resultMap.set(res.footnoteId, res);
      });

      const updatedChapters = book.chapters.map((ch) => {
        if (!ch.footnotes) return ch;
        const updatedFootnotes = ch.footnotes.map((fn) => {
          const audit = resultMap.get(fn.id);
          if (audit) {
            return {
              ...fn,
              verificationStatus: audit.status,
              verifiedWithGoogle: audit.status === "verified_real_publication",
              isAttributedToCurrentUser: audit.isAttributedToCurrentUser,
              verificationNotes: audit.explanation,
              sourceUrl: audit.verifiedSourceUrl || fn.sourceUrl,
              sourceName: audit.verifiedSourceName || fn.sourceName,
              realSourceAlternatives: audit.realSourceAlternatives,
            };
          }
          return fn;
        });
        return { ...ch, footnotes: updatedFootnotes };
      });

      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });

      showToast(`Audit Complete! ${result.authorAttributionAlertsCount} author alerts flagged.`);
    } catch (err: any) {
      alert("Footnote audit error: " + (err.message || "Failed to audit footnotes."));
    } finally {
      setIsAuditing(false);
    }
  };

  // Verify a single footnote individually
  const handleVerifySingle = async (fn: FootnoteReference) => {
    setVerifyingFootnoteId(fn.id);
    try {
      const result = await apiService.verifyFootnote({
        footnote: fn,
        authorName: book.author,
        bookContext: {
          title: book.title,
          genre: book.genre,
          premise: book.premise,
        },
      });

      updateFootnoteInBook(fn.id, (existing) => ({
        ...existing,
        verificationStatus: result.status,
        verifiedWithGoogle: result.status === "verified_real_publication",
        isAttributedToCurrentUser: result.isAttributedToCurrentUser,
        verificationNotes: result.explanation,
        sourceUrl: result.verifiedSourceUrl || existing.sourceUrl,
        sourceName: result.verifiedSourceName || existing.sourceName,
        realSourceAlternatives: result.realSourceAlternatives,
      }));

      showToast(`Verification updated: ${result.status.replace(/_/g, " ")}`);
    } catch (err: any) {
      alert("Verification error: " + (err.message || "Failed to verify footnote."));
    } finally {
      setVerifyingFootnoteId(null);
    }
  };

  // 1-Click Fix 1: Remove false author attribution
  const handleClearAuthorAttribution = (fn: FootnoteReference) => {
    updateFootnoteInBook(fn.id, (existing) => ({
      ...existing,
      authorOrCreator: undefined,
      isAttributedToCurrentUser: false,
      verificationStatus: "unverified",
      verificationNotes: "Author name removed from citation to prevent false attribution. Pending real-world source check.",
    }));
    showToast("Author attribution cleared from footnote.");
  };

  // 1-Click Fix 2: Convert to In-Universe Story Lore
  const handleConvertToLore = (fn: FootnoteReference) => {
    updateFootnoteInBook(fn.id, (existing) => ({
      ...existing,
      footnoteType: "in_universe_lore",
      verificationStatus: "in_universe_lore",
      isAttributedToCurrentUser: false,
      sourceName: existing.sourceName ? `${existing.sourceName} [In-Universe Codex]` : "[In-Universe Codex]",
      verificationNotes: "Explicitly classified as fictional worldbuilding / narrative lore citation.",
    }));
    showToast("Converted to In-Universe Lore Citation.");
  };

  // 1-Click Fix 3: Replace with Real Verified Alternative Source
  const handleApplyRealAlternative = (fn: FootnoteReference, alt: any) => {
    updateFootnoteInBook(fn.id, (existing) => ({
      ...existing,
      title: alt.title || existing.title,
      authorOrCreator: alt.author || existing.authorOrCreator,
      sourceName: alt.sourceName || existing.sourceName,
      sourceUrl: alt.url || existing.sourceUrl,
      footnoteType: "academic_source",
      verificationStatus: "verified_real_publication",
      verifiedWithGoogle: true,
      isAttributedToCurrentUser: false,
      verificationNotes: `Replaced with genuine verified publication: "${alt.title}" by ${alt.author || "reputable source"}.`,
    }));
    showToast("Replaced with verified genuine publication!");
  };

  // 1-Click Fix 4: Author confirms they genuinely published this
  const handleConfirmUserPublished = (fn: FootnoteReference) => {
    updateFootnoteInBook(fn.id, (existing) => ({
      ...existing,
      userPublishedConfirmation: true,
      verificationStatus: "verified_real_publication",
      isAttributedToCurrentUser: true,
      verificationNotes: `Confirmed by author (${book.author}) as genuine personal published work.`,
    }));
    showToast("Confirmed as genuine published work by author.");
  };

  // Add new manual footnote
  const handleAddFootnoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetChapter = activeChapter || book.chapters[0];
    if (!targetChapter) {
      alert("Please create a chapter first.");
      return;
    }

    const currentCount = (targetChapter.footnotes || []).length;
    const nextNumber = currentCount + 1;

    const newFn: FootnoteReference = {
      id: `fn-${Date.now()}`,
      number: nextNumber,
      marker: `[^${nextNumber}]`,
      title: newTitle.trim(),
      authorOrCreator: newAuthor.trim() || undefined,
      sourceName: newSourceName.trim() || undefined,
      sourceUrl: newSourceUrl.trim() || undefined,
      description: newDescription.trim() || "Author manuscript reference",
      footnoteType: newType,
      verificationStatus: newType === "in_universe_lore" ? "in_universe_lore" : "unverified",
      verifiedWithGoogle: false,
      chapterNumber: targetChapter.number,
    };

    const updatedChapters = book.chapters.map((ch) => {
      if (ch.id === targetChapter.id) {
        return {
          ...ch,
          footnotes: [...(ch.footnotes || []), newFn],
        };
      }
      return ch;
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });

    setNewTitle("");
    setNewAuthor("");
    setNewSourceName("");
    setNewSourceUrl("");
    setNewDescription("");
    setShowAddModal(false);
    showToast("Footnote created successfully.");
  };

  // Save edited footnote
  const handleSaveEdit = () => {
    if (!editingFootnote) return;
    updateFootnoteInBook(editingFootnote.id, () => editingFootnote);
    setEditingFootnote(null);
    showToast("Footnote details updated.");
  };

  // Generate Export Bibliography text
  const generateBibliographyText = () => {
    const allFootnotes: FootnoteReference[] = [];
    book.chapters.forEach((ch) => {
      (ch.footnotes || []).forEach((fn) => allFootnotes.push(fn));
    });

    if (allFootnotes.length === 0) {
      return "No footnotes recorded in manuscript.";
    }

    if (exportFormat === "markdown") {
      return allFootnotes
        .map(
          (fn, i) =>
            `[^${i + 1}]: ${fn.authorOrCreator ? `${fn.authorOrCreator}. ` : ""}*${fn.title}*. ${
              fn.sourceName ? `${fn.sourceName}. ` : ""
            }${fn.sourceUrl ? `Available at: <${fn.sourceUrl}>` : ""} ${
              fn.footnoteType === "in_universe_lore" ? "[In-Universe Lore]" : ""
            }`
        )
        .join("\n\n");
    }

    if (exportFormat === "apa") {
      return allFootnotes
        .map(
          (fn) =>
            `${fn.authorOrCreator || "Unknown"}. (${fn.publicationYear || "n.d."}). *${fn.title}*. ${
              fn.sourceName || ""
            }. ${fn.sourceUrl ? `Retrieved from ${fn.sourceUrl}` : ""}`
        )
        .join("\n\n");
    }

    if (exportFormat === "chicago") {
      return allFootnotes
        .map(
          (fn, i) =>
            `${i + 1}. ${fn.authorOrCreator ? `${fn.authorOrCreator}, ` : ""}*${fn.title}* (${
              fn.sourceName || "Publisher Unspecified"
            }${fn.publicationYear ? `, ${fn.publicationYear}` : ""})${
              fn.sourceUrl ? `, ${fn.sourceUrl}` : ""
            }.`
        )
        .join("\n\n");
    }

    // MLA
    return allFootnotes
      .map(
        (fn) =>
          `${fn.authorOrCreator ? `${fn.authorOrCreator}. ` : ""}*${fn.title}*. ${
            fn.sourceName ? `${fn.sourceName}, ` : ""
          }${fn.publicationYear || ""}${fn.sourceUrl ? `, ${fn.sourceUrl}` : ""}.`
      )
      .join("\n\n");
  };

  const getStatusBadge = (fn: FootnoteReference) => {
    if (fn.verificationStatus === "author_attribution_alert" || fn.isAttributedToCurrentUser) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>False Attribution Alert</span>
        </span>
      );
    }
    if (fn.verificationStatus === "hallucination_warning") {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Unverified / Hallucination Risk</span>
        </span>
      );
    }
    if (fn.verificationStatus === "verified_real_publication" || fn.verifiedWithGoogle) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Verified Real Publication</span>
        </span>
      );
    }
    if (fn.verificationStatus === "in_universe_lore" || fn.footnoteType === "in_universe_lore") {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
          <Scroll className="w-3 h-3 text-purple-400" />
          <span>In-Universe Lore Reference</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-stone-400 bg-stone-800 border border-stone-700">
        <HelpCircle className="w-3 h-3 text-stone-400" />
        <span>Unverified Draft</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center justify-between animate-fade-in shadow-lg">
          <span className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{notification}</span>
          </span>
          <button onClick={() => setNotification(null)} className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>
      )}

      {/* Author Attribution Shield Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-amber-500/30 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-stone-100 text-sm sm:text-base">
                  Author Attribution Shield & Footnote Verifier
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Active Protection
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Safeguarding author <strong className="text-amber-300 font-semibold">{authorName}</strong> against
                AI hallucinated citations and fabricated publications.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAuditAll}
              disabled={isAuditing || scopedItems.length === 0}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              <span>{isAuditing ? "Auditing Grounding..." : `Audit All (${scopedItems.length})`}</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center space-x-1 transition-colors"
              title="Export Bibliography & Citations"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Export Citations</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800/80">
          <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800 text-center">
            <div className="text-[10px] uppercase font-mono text-stone-400">Total Scoped</div>
            <div className="text-base font-bold text-stone-100 font-mono">{scopedItems.length}</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
            <div className="text-[10px] uppercase font-mono text-rose-300">False Attribution Alerts</div>
            <div className="text-base font-bold text-rose-400 font-mono">{alertCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <div className="text-[10px] uppercase font-mono text-emerald-300">Verified Publications</div>
            <div className="text-base font-bold text-emerald-400 font-mono">{verifiedCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
            <div className="text-[10px] uppercase font-mono text-purple-300">In-Universe Lore</div>
            <div className="text-base font-bold text-purple-400 font-mono">{loreCount}</div>
          </div>
        </div>

        {/* False Attribution Alert Callout Banner if detected */}
        {alertCount > 0 && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start space-x-3 text-xs text-rose-200">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-300">
                {alertCount} Made-Up Citation(s) Falsely Claiming Your Name Detected!
              </div>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                The AI generated citations attributing unreleased or non-existent books/papers to{" "}
                <span className="font-semibold text-white">{authorName}</span>. Use the 1-click remediation buttons below
                to strip your name, reclassify as fictional lore, or replace with genuine published studies.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-stone-900/60 rounded-xl border border-stone-800 text-xs">
        {/* Scope Toggle */}
        <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
          <button
            onClick={() => setScope("chapter")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              scope === "chapter" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Current Chapter {activeChapter ? `(CH ${activeChapter.number})` : ""}
          </button>
          <button
            onClick={() => setScope("manuscript")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              scope === "manuscript" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Full Manuscript ({book.chapters.length} CH)
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          <span className="text-[11px] text-stone-500 flex items-center space-x-1 pl-1 pr-2">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </span>
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              filterStatus === "all" ? "bg-stone-700 text-stone-100" : "text-stone-400 hover:bg-stone-800"
            }`}
          >
            All ({scopedItems.length})
          </button>
          {alertCount > 0 && (
            <button
              onClick={() => setFilterStatus("alerts")}
              className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                filterStatus === "alerts"
                  ? "bg-rose-500/30 text-rose-200 border border-rose-500/50"
                  : "text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              Alerts ({alertCount})
            </button>
          )}
          <button
            onClick={() => setFilterStatus("verified")}
            className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              filterStatus === "verified"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/50"
                : "text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setFilterStatus("lore")}
            className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              filterStatus === "lore"
                ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                : "text-purple-400 hover:bg-purple-500/10"
            }`}
          >
            Lore ({loreCount})
          </button>
          <button
            onClick={() => setFilterStatus("unverified")}
            className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              filterStatus === "unverified"
                ? "bg-stone-600 text-stone-200"
                : "text-stone-400 hover:bg-stone-800"
            }`}
          >
            Unverified
          </button>
        </div>

        {/* Add Manual Footnote Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Footnote</span>
        </button>
      </div>

      {/* Footnotes List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 bg-stone-950/80 rounded-2xl border border-stone-800/80 p-6 space-y-2">
            <Bookmark className="w-8 h-8 text-stone-600 mx-auto" />
            <h4 className="font-serif font-bold text-stone-300 text-sm">No Footnotes Matching Filter</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {scopedItems.length === 0
                ? "This chapter currently has no footnotes. Use the Add Footnote button or run research grounding."
                : "No footnotes match the selected status filter."}
            </p>
          </div>
        ) : (
          filteredItems.map(({ footnote: fn, chapterNum }) => {
            const isAlert =
              fn.verificationStatus === "author_attribution_alert" ||
              fn.verificationStatus === "hallucination_warning" ||
              fn.isAttributedToCurrentUser;
            const isVerifying = verifyingFootnoteId === fn.id;

            return (
              <div
                key={fn.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isAlert
                    ? "bg-stone-950 border-rose-500/50 shadow-md shadow-rose-950/20"
                    : fn.verificationStatus === "verified_real_publication"
                    ? "bg-stone-950 border-emerald-500/30"
                    : fn.verificationStatus === "in_universe_lore"
                    ? "bg-stone-950 border-purple-500/30"
                    : "bg-stone-950 border-stone-800 hover:border-stone-700"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-mono text-xs text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                      {fn.marker}
                    </span>
                    {chapterNum && scope === "manuscript" && (
                      <span className="font-mono text-[10px] text-stone-400 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800">
                        CH {chapterNum}
                      </span>
                    )}
                    <h4 className="font-serif font-bold text-stone-200 text-sm">{fn.title}</h4>
                    {getStatusBadge(fn)}
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center space-x-1.5">
                    {onInsertMarkerAtCursor && (
                      <button
                        onClick={() => onInsertMarkerAtCursor(` ${fn.marker}`)}
                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-mono transition-colors"
                        title="Insert marker at current cursor position"
                      >
                        + Insert
                      </button>
                    )}
                    <button
                      onClick={() => handleVerifySingle(fn)}
                      disabled={isVerifying}
                      className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                      title="Verify with Google Search Grounding"
                    >
                      <Search className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin text-amber-400" : ""}`} />
                    </button>
                    <button
                      onClick={() => setEditingFootnote(fn)}
                      className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                      title="Edit Footnote"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteFootnoteFromBook(fn.id)}
                      className="p-1.5 rounded bg-stone-800 hover:bg-rose-900/50 text-stone-400 hover:text-rose-300 text-xs transition-colors"
                      title="Delete Footnote"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metadata & Author Citation */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                  {fn.authorOrCreator && (
                    <div className="flex items-center space-x-1">
                      <span className="text-stone-500">Cited Author:</span>
                      <span
                        className={`font-medium ${
                          fn.authorOrCreator.toLowerCase().includes(authorName.toLowerCase())
                            ? "text-rose-300 bg-rose-500/10 px-1 rounded border border-rose-500/30"
                            : "text-stone-300"
                        }`}
                      >
                        {fn.authorOrCreator}
                      </span>
                    </div>
                  )}

                  {fn.sourceName && (
                    <div className="flex items-center space-x-1">
                      <span className="text-stone-500">Source:</span>
                      <span className="text-stone-300">{fn.sourceName}</span>
                    </div>
                  )}

                  {fn.sourceUrl && (
                    <a
                      href={fn.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center space-x-1 truncate max-w-xs"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{fn.sourceUrl}</span>
                    </a>
                  )}
                </div>

                {/* Description / Text Content */}
                {fn.description && (
                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/60">
                    {fn.description}
                  </p>
                )}

                {/* Verification Explanation Note if present */}
                {fn.verificationNotes && (
                  <div className="text-[11px] text-stone-400 bg-stone-900/80 p-2 rounded-lg border border-stone-800 flex items-start space-x-2">
                    <HelpCircle className="w-3.5 h-3.5 text-stone-500 flex-shrink-0 mt-0.5" />
                    <span>{fn.verificationNotes}</span>
                  </div>
                )}

                {/* 1-Click Remediation Toolbox for Flagged Footnotes */}
                {isAlert && (
                  <div className="p-3 rounded-xl bg-stone-900 border border-rose-500/30 space-y-2">
                    <div className="text-[11px] font-bold text-rose-300 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>1-Click Author Remediation Tools:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleClearAuthorAttribution(fn)}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-medium border border-stone-700 flex items-center space-x-1"
                      >
                        <X className="w-3 h-3 text-rose-400" />
                        <span>Remove My Name from Citation</span>
                      </button>

                      <button
                        onClick={() => handleConvertToLore(fn)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-medium border border-purple-500/40 flex items-center space-x-1"
                      >
                        <Scroll className="w-3 h-3" />
                        <span>Tag as Fictional Story Lore</span>
                      </button>

                      <button
                        onClick={() => handleConfirmUserPublished(fn)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-medium border border-emerald-500/40 flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>I Actually Published This</span>
                      </button>
                    </div>

                    {/* Real-World Alternative Sources if discovered */}
                    {fn.realSourceAlternatives && fn.realSourceAlternatives.length > 0 && (
                      <div className="pt-2 border-t border-stone-800 space-y-1.5">
                        <div className="text-[10px] text-stone-400 uppercase font-mono">
                          Verified Genuine Real-World Alternative Sources:
                        </div>
                        {fn.realSourceAlternatives.map((alt, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-between gap-2"
                          >
                            <div className="text-[11px] text-stone-300 truncate">
                              <span className="font-semibold text-emerald-400">{alt.title}</span>
                              {alt.author && <span className="text-stone-400"> by {alt.author}</span>}
                              {alt.sourceName && <span className="text-stone-500"> ({alt.sourceName})</span>}
                            </div>
                            <button
                              onClick={() => handleApplyRealAlternative(fn, alt)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center space-x-1 flex-shrink-0"
                            >
                              <span>Use This Source</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Footnote Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-stone-100">Add Manuscript Footnote / Citation</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFootnoteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 mb-1 font-medium">Footnote Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("real_world_fact")}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      newType === "real_world_fact"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200"
                        : "bg-stone-950 border-stone-800 text-stone-400"
                    }`}
                  >
                    <div className="font-bold">Real-World Reference</div>
                    <div className="text-[10px] text-stone-500">Academic, science, historical fact</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("in_universe_lore")}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      newType === "in_universe_lore"
                        ? "bg-purple-500/20 border-purple-500 text-purple-200"
                        : "bg-stone-950 border-stone-800 text-stone-400"
                    }`}
                  >
                    <div className="font-bold">In-Universe Lore</div>
                    <div className="text-[10px] text-stone-500">Story codex, fictional world chronicles</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-medium">Title / Citation Name *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Medieval Metallurgy Techniques or The Codex of Eldoria"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-300 mb-1 font-medium">Cited Author / Creator</label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Real Scholar or Fictional Chronicler"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 mb-1 font-medium">Publisher / Archive Name</label>
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="e.g. Oxford Press or Royal Library"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-medium">Source URL (if applicable)</label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-medium">Description / Context</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="How this reference grounds the chapter or what factual claim it supports..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
                >
                  Save Footnote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Footnote Modal */}
      {editingFootnote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-stone-100">Edit Footnote Details</h3>
              </div>
              <button onClick={() => setEditingFootnote(null)} className="text-stone-400 hover:text-stone-200">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 mb-1 font-medium">Title</label>
                <input
                  type="text"
                  value={editingFootnote.title}
                  onChange={(e) => setEditingFootnote({ ...editingFootnote, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-300 mb-1 font-medium">Author / Originator</label>
                  <input
                    type="text"
                    value={editingFootnote.authorOrCreator || ""}
                    onChange={(e) =>
                      setEditingFootnote({ ...editingFootnote, authorOrCreator: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 mb-1 font-medium">Publisher / Archive</label>
                  <input
                    type="text"
                    value={editingFootnote.sourceName || ""}
                    onChange={(e) =>
                      setEditingFootnote({ ...editingFootnote, sourceName: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-medium">Source URL</label>
                <input
                  type="url"
                  value={editingFootnote.sourceUrl || ""}
                  onChange={(e) =>
                    setEditingFootnote({ ...editingFootnote, sourceUrl: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                />
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-medium">Description</label>
                <textarea
                  value={editingFootnote.description || ""}
                  onChange={(e) => setEditingFootnote({ ...editingFootnote, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingFootnote(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Bibliography Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-stone-100">Export Manuscript Bibliography & Endnotes</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-stone-400 hover:text-stone-200">
                ✕
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-stone-400">Format:</span>
              {(["chicago", "apa", "mla", "markdown"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`px-3 py-1 rounded-lg uppercase font-mono font-bold transition-colors ${
                    exportFormat === fmt
                      ? "bg-amber-500 text-stone-950"
                      : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={generateBibliographyText()}
                rows={10}
                className="w-full p-3 font-mono text-xs text-stone-200 bg-stone-950 border border-stone-800 rounded-xl leading-relaxed focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateBibliographyText());
                  showToast("Bibliography copied to clipboard!");
                }}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] flex items-center space-x-1 border border-stone-700 shadow"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
