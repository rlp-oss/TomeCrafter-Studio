import React, { useState, useEffect } from "react";
import {
  Users,
  Sparkles,
  Feather,
  LayoutGrid,
  CheckCircle2,
  Compass,
  BookOpenCheck,
  Send,
  Copy,
  Check,
  Loader2,
  FilePlus2,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Award,
  FileText,
  Download,
  Palette,
  BookMarked,
  Sparkle,
  History,
  Wand2,
  Layers,
  ChevronDown,
  ChevronUp,
  Link2,
  Type,
  Building2,
} from "lucide-react";
import {
  AgentId,
  Book,
  Chapter,
  ChatMessage,
  CritiqueResult,
  ApplyRecommendationsResult,
  CouncilFinalSweepReport,
  FullBookReadAuditResult,
  RealmAgent,
} from "../types";
import { REALM_AGENTS } from "../data/agents";
import { apiService } from "../services/api";
import { BOOK_SIZE_PROFILES } from "../utils/manuscriptImporter";

interface RealmCouncilProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onNavigateToEditor: (chapterId?: string) => void;
  onNavigateToTab?: (tab: any) => void;
  onOpenExportModal?: () => void;
}

export const RealmCouncil: React.FC<RealmCouncilProps> = ({
  book,
  onUpdateBook,
  onNavigateToEditor,
  onNavigateToTab,
  onOpenExportModal,
}) => {
  // Main view mode: "chamber" (chat), "chapter_review" (guided chapter-by-chapter polish), "final_sweep" (plenary sweep & next steps)
  const [activeViewMode, setActiveViewMode] = useState<"chamber" | "chapter_review" | "final_sweep">("chapter_review");

  // --- Chamber (1-on-1 Chat) State ---
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("architect");
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [chatHistories, setChatHistories] = useState<Record<AgentId, ChatMessage[]>>({
    architect: [
      {
        id: "m-arch-1",
        agentId: "architect",
        role: "agent",
        text: `Greetings, author. I am Archon Vael, Master of the Obsidian Citadel. I oversee narrative momentum, tension curves, and structural integrity for "${book.title}". How may we architect your story today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    stylist: [
      {
        id: "m-sty-1",
        agentId: "stylist",
        role: "agent",
        text: `Welcome to the Gilded Spire. I am Lady Seraphina. Every word you write is an incantation. Let us sculpt dialogue that crackles with subtext and scenes drenched in sensory power.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    editor: [
      {
        id: "m-ed-1",
        agentId: "editor",
        role: "agent",
        text: `High Inquisitor Thorne at your service. Bring me your drafts, your plot dilemmas, and your pacing bottlenecks. We shall excise every ounce of fluff until your prose gleams like tempered steel.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    scholar: [
      {
        id: "m-sch-1",
        agentId: "scholar",
        role: "agent",
        text: `I am Archivist Elendur of the Grand Athenaeum. Whether you need an airtight magic system, geopolitical tensions, or deep character trauma bibles, the lore of "${book.title}" shall be unshakeable.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    artisan: [
      {
        id: "m-art-1",
        agentId: "artisan",
        role: "agent",
        text: `I am Grand Visualist Morgana. Together we will design covers that command attention across storefronts and chapter plates that burn themselves into the reader's imagination.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    publisher: [
      {
        id: "m-pub-1",
        agentId: "publisher",
        role: "agent",
        text: `Imperator Cassian welcomes you. When your manuscript is polished, we will craft irresistible Amazon KDP blurbs, select high-volume keywords, and format your book to conquer the marketplace.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
  });

  // --- Chapter-by-Chapter Review & Polish State ---
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [chapterCritiques, setChapterCritiques] = useState<Record<string, CritiqueResult>>({});
  const [isCritiquingChapter, setIsCritiquingChapter] = useState(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);

  // Recommendations Applied State: chapterId -> ApplyRecommendationsResult
  const [appliedRecommendations, setAppliedRecommendations] = useState<Record<string, ApplyRecommendationsResult>>({});
  const [isApplyingRecommendations, setIsApplyingRecommendations] = useState(false);
  const [applyFocusArea, setApplyFocusArea] = useState<"all" | "line_edits" | "pacing" | "dialogue" | "sensory" | "voice">("all");
  const [customAuthorInstructions, setCustomAuthorInstructions] = useState("");
  const [reviewedChapterIds, setReviewedChapterIds] = useState<Set<string>>(new Set());
  const [diffViewMode, setDiffViewMode] = useState<"side_by_side" | "edited_only">("side_by_side");

  // --- Sovereign Final Sweep State ---
  const [finalSweepReport, setFinalSweepReport] = useState<CouncilFinalSweepReport | null>(null);
  const [isRunningFinalSweep, setIsRunningFinalSweep] = useState(false);
  const [sweepError, setSweepError] = useState<string | null>(null);

  // --- Full Book Read Audit State (Digest entire book first, unify formatting & eliminate double edits) ---
  const [fullBookAudit, setFullBookAudit] = useState<FullBookReadAuditResult | null>(null);
  const [isRunningFullBookAudit, setIsRunningFullBookAudit] = useState(false);
  const [fullBookAuditError, setFullBookAuditError] = useState<string | null>(null);
  const [showFullBookDigest, setShowFullBookDigest] = useState(true);
  const [formattingAppliedNotice, setFormattingAppliedNotice] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    setFullBookAudit(null);
    setFullBookAuditError(null);
    setFormattingAppliedNotice(null);
    setApplyError(null);
    setChapterCritiques({});
    setAppliedRecommendations({});
    setFinalSweepReport(null);
    setReviewedChapterIds(new Set());
    setActiveChapterIndex(0);
  }, [book.id]);

  const chapters = book.chapters || [];
  const currentChapter = chapters[activeChapterIndex] || chapters[0];
  const isLastChapter = activeChapterIndex >= chapters.length - 1;
  const currentChapterCritique = currentChapter ? chapterCritiques[currentChapter.id] : null;
  const currentChapterApplied = currentChapter ? appliedRecommendations[currentChapter.id] : null;
  const currentChapterFullAudit =
    fullBookAudit && currentChapter
      ? fullBookAudit.chapterAudits.find(
          (a) => a.chapterId === currentChapter.id || a.chapterNumber === currentChapter.number
        ) || null
      : null;

  // Track total chapters with changes fulfilled / reviewed
  const reviewedCount = reviewedChapterIds.size;
  const totalChapters = chapters.length;
  const isAllChaptersFulfilled = totalChapters > 0 && reviewedCount >= totalChapters;

  const activeAgent = REALM_AGENTS.find((a) => a.id === selectedAgentId) || REALM_AGENTS[0];
  const currentMessages = chatHistories[selectedAgentId] || [];

  const getAgentIcon = (id: AgentId) => {
    switch (id) {
      case "architect":
        return <LayoutGrid className="w-5 h-5" />;
      case "stylist":
        return <Feather className="w-5 h-5" />;
      case "editor":
        return <CheckCircle2 className="w-5 h-5" />;
      case "scholar":
        return <Compass className="w-5 h-5" />;
      case "artisan":
        return <Sparkles className="w-5 h-5" />;
      case "publisher":
        return <BookOpenCheck className="w-5 h-5" />;
    }
  };

  // --- 1-on-1 Chat Handlers ---
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      agentId: selectedAgentId,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...currentMessages, userMsg];
    setChatHistories({
      ...chatHistories,
      [selectedAgentId]: updatedHistory,
    });
    setInputMessage("");
    setIsSending(true);

    try {
      const activeChapter = book.chapters[activeChapterIndex] || book.chapters[0];
      const res = await apiService.chatWithAgent({
        agentId: selectedAgentId,
        message: textToSend,
        bookContext: {
          title: book.title,
          genre: book.genre,
          premise: book.premise,
          tone: book.tone,
        },
        chapterContext: activeChapter
          ? {
              title: activeChapter.title,
              goal: activeChapter.goal,
              content: activeChapter.content,
            }
          : undefined,
        chatHistory: updatedHistory.map((m) => ({
          role: m.role === "user" ? "user" : "agent",
          text: m.text,
        })),
      });

      const agentReply: ChatMessage = {
        id: `msg-agent-${Date.now()}`,
        agentId: selectedAgentId,
        role: "agent",
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatHistories((prev) => ({
        ...prev,
        [selectedAgentId]: [...prev[selectedAgentId], agentReply],
      }));
    } catch (err: any) {
      const errorReply: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        agentId: selectedAgentId,
        role: "agent",
        text: "The Realm Master is contemplating deep mysteries. Error: " + err.message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatHistories((prev) => ({
        ...prev,
        [selectedAgentId]: [...prev[selectedAgentId], errorReply],
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsertIntoCurrentChapter = (text: string) => {
    if (!(book.chapters || []).length || !currentChapter) return;
    const newContent = (currentChapter.content || "") + "\n\n" + text;
    const count = newContent.trim().split(/\s+/).filter(Boolean).length;

    const updated = (book.chapters || []).map((ch) =>
      ch.id === currentChapter.id ? { ...ch, content: newContent, wordCount: count } : ch
    );

    onUpdateBook({ ...book, chapters: updated });
    onNavigateToEditor(currentChapter.id);
  };

  // --- Chapter Review & Recommendation Handlers ---

  // Trigger Council Critique for Active Chapter
  const handleRequestChapterCritique = async (targetChapter?: Chapter) => {
    const chapterToCritique = targetChapter || currentChapter;
    if (!chapterToCritique || !chapterToCritique.content?.trim()) {
      setCritiqueError("This chapter has no written draft yet. Please write or generate prose first.");
      return;
    }

    setIsCritiquingChapter(true);
    setCritiqueError(null);

    try {
      const result = await apiService.critiqueChapter({
        chapterTitle: `Chapter ${chapterToCritique.number}: ${chapterToCritique.title}`,
        content: chapterToCritique.content,
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
          premise: book.premise,
        },
      });

      setChapterCritiques((prev) => ({
        ...prev,
        [chapterToCritique.id]: result,
      }));
    } catch (err: any) {
      console.error("Critique error:", err);
      setCritiqueError(err.message || "Failed to receive Council critique. Please try again.");
    } finally {
      setIsCritiquingChapter(false);
    }
  };

  // Select chapter & sync priority focus from Full Book Read Audit if present
  const handleSelectChapter = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(chapters.length - 1, idx));
    setActiveChapterIndex(safeIdx);
    const targetCh = chapters[safeIdx];
    if (targetCh && fullBookAudit) {
      const auditForCh = fullBookAudit.chapterAudits.find(
        (a) => a.chapterId === targetCh.id || a.chapterNumber === targetCh.number
      );
      if (auditForCh?.priorityFocus) {
        setApplyFocusArea(auditForCh.priorityFocus);
      }
    }
  };

  // Run Full Book Read Audit: Council reads & digests the entire book first, chooses formatting, and audits all chapters
  const handleRunFullBookReadAudit = async () => {
    const draftedCount = chapters.filter((ch) => (ch.content || "").trim().length > 0).length;
    if (chapters.length === 0 || draftedCount === 0) {
      setFullBookAuditError("Add or import manuscript chapters with text before running a Full Book Read Audit.");
      setActiveViewMode("chapter_review");
      return;
    }

    setIsRunningFullBookAudit(true);
    setFullBookAuditError(null);
    setFormattingAppliedNotice(null);
    setActiveViewMode("chapter_review");

    try {
      const result = await apiService.performFullBookReadAudit({ book });
      const nextCritiques: Record<string, CritiqueResult> = {};
      for (const audit of result.chapterAudits || []) {
        const matched = chapters.find(
          (ch) => ch.id === audit.chapterId || ch.number === audit.chapterNumber
        );
        const key = matched ? matched.id : audit.chapterId;
        if (key && audit.critique) {
          nextCritiques[key] = audit.critique;
        }
      }

      setChapterCritiques((prev) => ({ ...prev, ...nextCritiques }));
      setFullBookAudit(result);
      setShowFullBookDigest(true);
      setActiveChapterIndex(0);

      const firstCh = chapters[0];
      if (firstCh) {
        const firstAudit = (result.chapterAudits || []).find(
          (a) => a.chapterId === firstCh.id || a.chapterNumber === firstCh.number
        );
        if (firstAudit?.priorityFocus) {
          setApplyFocusArea(firstAudit.priorityFocus);
        }
      }
    } catch (err: any) {
      console.error("Full book read audit error:", err);
      setFullBookAuditError(err.message || "Failed to complete Full Book Read Audit.");
    } finally {
      setIsRunningFullBookAudit(false);
    }
  };

  // Apply the Council's recommended formatting choices to book.formattingSettings
  const handleApplyCouncilFormattingChoices = () => {
    if (!fullBookAudit?.formattingChoices) return;
    const fc = fullBookAudit.formattingChoices;
    const profile = BOOK_SIZE_PROFILES[fc.recommendedTrimSize] || BOOK_SIZE_PROFILES["6x9"];
    const totalWords =
      chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) || book.currentWordCount || 0;
    const estimatedPages = Math.max(24, Math.ceil(totalWords / profile.wordsPerPage) + 12);
    const spineWidth = Number((estimatedPages * 0.002252).toFixed(3));

    const updatedBook: Book = {
      ...book,
      formattingSettings: {
        ...book.formattingSettings,
        trimSize: fc.recommendedTrimSize || profile.id,
        fontPreset: fc.recommendedFontPreset || "garamond",
        googleFontFamily: fc.recommendedGoogleFont || book.formattingSettings?.googleFontFamily,
        fontSize: fc.recommendedFontSize || profile.fontSize,
        fontSizePx: profile.fontSizePx,
        lineSpacing: fc.recommendedLineSpacing || profile.lineSpacing,
        lineHeightValue: profile.lineHeightValue,
        paragraphIndentEm: profile.paragraphIndentEm,
        paragraphSpacingEm: profile.paragraphSpacingEm,
        chapterWordBudget: profile.chapterWordBudget,
        chapterHeadingCase: fc.recommendedChapterHeadingCase || "title",
        sceneBreakSymbol: fc.recommendedSceneBreakSymbol || "* * *",
        dropCaps: typeof fc.dropCapsRecommended === "boolean" ? fc.dropCapsRecommended : profile.dropCaps,
      },
      publishingKit: {
        ...book.publishingKit,
        printSpecs: {
          recommendedTrimSize: profile.recommendedTrimLabel,
          estimatedPageCount: estimatedPages,
          spineWidthInches: spineWidth,
          margins: profile.margins,
        },
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdateBook(updatedBook);
    setFormattingAppliedNotice(
      `Applied ${profile.label} (${fc.recommendedTrimSize}), ${fc.recommendedGoogleFont || fc.recommendedFontPreset}, ${fc.recommendedFontSize} / ${fc.recommendedLineSpacing} leading.`
    );
  };

  // Apply Council Recommendations to Active Chapter
  const handleApplyRecommendations = async () => {
    if (!currentChapter || !currentChapter.content?.trim()) return;

    setIsApplyingRecommendations(true);
    setApplyError(null);
    try {
      const result = await apiService.applyChapterRecommendations({
        chapter: currentChapter,
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
          premise: book.premise,
          author: book.author,
        },
        critique: currentChapterCritique,
        focusArea: applyFocusArea,
        specialInstructions: customAuthorInstructions.trim() || undefined,
        fullBookDigest: fullBookAudit
          ? {
              narrativeSummary: fullBookAudit.bookDigest.narrativeSummary,
              globalStyleDirectives: fullBookAudit.formattingChoices.globalStyleDirectives,
              continuityLinks: currentChapterFullAudit?.continuityLinks || [],
              formattingNotes: currentChapterFullAudit?.formattingNotes || "",
            }
          : undefined,
      });

      setAppliedRecommendations((prev) => ({
        ...prev,
        [currentChapter.id]: result,
      }));
    } catch (err: any) {
      console.error("Apply recommendations error:", err);
      setApplyError("Encountered an issue applying recommendations: " + (err.message || "Unknown error"));
    } finally {
      setIsApplyingRecommendations(false);
    }
  };

  // Save changes to Chapter and advance to next chapter
  const handleSaveAndMoveToNextChapter = () => {
    if (!currentChapter) return;

    const editedText = currentChapterApplied?.editedContent || currentChapter.content;
    const wordCount = currentChapterApplied?.wordCount || editedText.split(/\s+/).filter(Boolean).length;

    // Update book chapter state
    const updatedChapters = (book.chapters || []).map((ch) =>
      ch.id === currentChapter.id
        ? {
            ...ch,
            content: editedText,
            wordCount,
            status: "polished" as const,
          }
        : ch
    );

    const updatedBook: Book = {
      ...book,
      chapters: updatedChapters,
      currentWordCount: updatedChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0),
      updatedAt: new Date().toISOString(),
    };

    onUpdateBook(updatedBook);

    // Mark as reviewed
    setReviewedChapterIds((prev) => new Set([...prev, currentChapter.id]));

    // Check if this was the last chapter
    if (isLastChapter) {
      // Transition to final sweep
      setActiveViewMode("final_sweep");
      handleRunFinalSweep(updatedBook);
    } else {
      // Move to next chapter
      const nextIndex = activeChapterIndex + 1;
      handleSelectChapter(nextIndex);
      const nextChapter = book.chapters[nextIndex];
      if (nextChapter && nextChapter.content && !chapterCritiques[nextChapter.id]) {
        // Auto-request critique for the next chapter only if not already audited by Full Book Read
        handleRequestChapterCritique(nextChapter);
      }
    }
  };

  // Skip to next chapter without modifying
  const handleSkipToNextChapter = () => {
    if (isLastChapter) {
      setActiveViewMode("final_sweep");
      if (!finalSweepReport) {
        handleRunFinalSweep();
      }
    } else {
      const nextIndex = activeChapterIndex + 1;
      handleSelectChapter(nextIndex);
      const nextChapter = book.chapters[nextIndex];
      if (nextChapter && nextChapter.content && !chapterCritiques[nextChapter.id]) {
        handleRequestChapterCritique(nextChapter);
      }
    }
  };

  // --- Sovereign Final Sweep Handlers ---
  const handleRunFinalSweep = async (bookToSweep?: Book) => {
    const targetBook = bookToSweep || book;
    setIsRunningFinalSweep(true);
    setSweepError(null);

    try {
      const report = await apiService.performCouncilFinalSweep({
        book: targetBook,
      });
      setFinalSweepReport(report);
    } catch (err: any) {
      console.error("Final sweep error:", err);
      setSweepError(err.message || "Failed to complete final sweep.");
    } finally {
      setIsRunningFinalSweep(false);
    }
  };

  // Helper score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 80) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Mode Navigator */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">
                  The Sovereign Realm Council
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Editorial & Polish Suite
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
                Sequential chapter review, automated recommendation application, and plenary manuscript sweeps.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs + Full Book Read Audit CTA */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab("studio")}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-medium transition-colors"
                title="Open 8-Department Publishing Studio & Specialist Teams"
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>8-Dept Studio</span>
              </button>
            )}
            <button
              onClick={handleRunFullBookReadAudit}
              disabled={isRunningFullBookAudit || totalChapters === 0}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-stone-950 font-bold text-xs shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50"
              title="Let the Council read and digest the entire manuscript first, lock unified formatting choices, and break down single-pass recommendations per chapter"
            >
              {isRunningFullBookAudit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reading Full Book ({totalChapters} Ch)...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>{fullBookAudit ? "Re-Run Full Book Read Audit" : "Full Book Read Audit"}</span>
                </>
              )}
            </button>

            <div className="flex items-center p-1 bg-stone-950 rounded-xl border border-stone-800">
              <button
                onClick={() => setActiveViewMode("chapter_review")}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeViewMode === "chapter_review"
                    ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/40"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Chapter Review & Polish</span>
                {reviewedCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeViewMode === "chapter_review"
                        ? "bg-stone-950/30 text-stone-950 font-mono"
                        : "bg-amber-500/20 text-amber-300 font-mono"
                    }`}
                  >
                    {reviewedCount}/{totalChapters}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveViewMode("final_sweep");
                  if (!finalSweepReport && !isRunningFinalSweep) {
                    handleRunFinalSweep();
                  }
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeViewMode === "final_sweep"
                    ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/40"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Sovereign Final Sweep</span>
                {finalSweepReport && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveViewMode("chamber")}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeViewMode === "chamber"
                    ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/40"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Master Consultation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Progress Bar for Chapter Review Mode */}
        {activeViewMode === "chapter_review" && totalChapters > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-800/80">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-amber-400 font-bold">Review Pipeline:</span>
                <span>
                  Chapter {activeChapterIndex + 1} of {totalChapters}:{" "}
                  <strong className="text-stone-200">{currentChapter?.title}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {fullBookAudit && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Full-Book Digest Active • No Double Edits
                  </span>
                )}
                <span className="font-mono text-xs text-stone-300">
                  {reviewedCount} of {totalChapters} Chapters Fulfilled ({Math.round((reviewedCount / totalChapters) * 100)}%)
                </span>
                {isAllChaptersFulfilled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Ready for Final Sweep
                  </span>
                )}
              </div>
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
              {chapters.map((ch, idx) => {
                const isSelected = idx === activeChapterIndex;
                const isReviewed = reviewedChapterIds.has(ch.id);
                const hasApplied = !!appliedRecommendations[ch.id];
                const hasCritique = !!chapterCritiques[ch.id];

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChapter(idx)}
                    className={`relative p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-105 z-10"
                        : isReviewed || hasApplied
                        ? "bg-emerald-950/40 border-emerald-600/40 text-emerald-300 hover:border-emerald-500"
                        : hasCritique
                        ? "bg-amber-950/30 border-amber-600/40 text-amber-300 hover:border-amber-500"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold">Ch {ch.number}</span>
                      {isReviewed || hasApplied ? (
                        <CheckCircle className={`w-3 h-3 ${isSelected ? "text-stone-950" : "text-emerald-400"}`} />
                      ) : hasCritique ? (
                        <Sparkle className={`w-3 h-3 ${isSelected ? "text-stone-950" : "text-amber-400"}`} />
                      ) : null}
                    </div>
                    <div className="text-[10px] truncate mt-0.5 opacity-90">{ch.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: CHAPTER-BY-CHAPTER REVIEW & RECOMMENDATIONS POLISH SUITE           */}
      {/* ========================================================================= */}
      {activeViewMode === "chapter_review" && (
        <div className="space-y-6">
          {/* Full Book Read Audit Loading Banner */}
          {isRunningFullBookAudit && (
            <div className="bg-stone-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-serif font-bold text-base text-stone-100">
                  Council is Reading & Digesting the Entire Manuscript First...
                </h3>
                <p className="text-xs text-stone-400">
                  Scanning all {totalChapters} chapters together to lock unified typography/trim formatting choices, detect cross-chapter continuity threads, eliminate double edits, and generate tailored per-chapter recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Full Book Read Audit Error */}
          {fullBookAuditError && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-700/60 text-rose-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{fullBookAuditError}</span>
              </div>
              <button
                onClick={() => setFullBookAuditError(null)}
                className="text-rose-300 hover:text-white underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Full Book Digest & Formatting Choices Panel */}
          {!isRunningFullBookAudit && fullBookAudit && (
            <div className="bg-stone-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h2 className="font-serif font-bold text-base text-stone-100">
                        Full Book Digest & Council Formatting Choices
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Health: {fullBookAudit.overallHealthScore}/100
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {(fullBookAudit.chapterAudits || []).length} Chapters Digested
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Whole-book context & formatting standards locked upfront so every chapter edit executes in a single pass with zero double edits.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    onClick={handleApplyCouncilFormattingChoices}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>Apply Council Formatting Choices</span>
                  </button>
                  <button
                    onClick={() => setShowFullBookDigest((v) => !v)}
                    className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors"
                    title={showFullBookDigest ? "Collapse Digest" : "Expand Digest"}
                  >
                    {showFullBookDigest ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {formattingAppliedNotice && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{formattingAppliedNotice}</span>
                  </div>
                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab("typesetting")}
                      className="text-emerald-200 hover:text-white underline font-medium ml-3 shrink-0"
                    >
                      Open Interior Typesetting →
                    </button>
                  )}
                </div>
              )}

              {showFullBookDigest && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Narrative Digest & Eliminated Double Edits (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                        <div className="text-[11px] font-mono uppercase text-amber-400 font-bold">
                          Full-Manuscript Narrative Digest
                        </div>
                        <p className="text-xs text-stone-300 leading-relaxed">
                          {fullBookAudit.bookDigest.narrativeSummary}
                        </p>
                        {fullBookAudit.bookDigest.coreThemes?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {fullBookAudit.bookDigest.coreThemes.map((theme, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700 text-[10px] text-stone-300"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                          <div className="text-[11px] font-mono uppercase text-emerald-400 font-bold flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Double Edits Eliminated</span>
                          </div>
                          <ul className="space-y-1 text-[11px] text-stone-300 list-disc pl-4">
                            {(fullBookAudit.bookDigest.crossChapterEliminatedDoubleEdits || []).map(
                              (item, i) => (
                                <li key={i}>{item}</li>
                              )
                            )}
                          </ul>
                        </div>

                        <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                          <div className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center space-x-1">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Continuity & Arc Checkpoints</span>
                          </div>
                          <ul className="space-y-1 text-[11px] text-stone-300 list-disc pl-4">
                            {(fullBookAudit.bookDigest.continuityWarnings || []).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Right: Recommended Book-Wide Formatting Choices (5 cols) */}
                    <div className="lg:col-span-5 p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase text-amber-400 font-bold">
                          Council Formatting Prescription
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          {fullBookAudit.formattingChoices.recommendedTrimSize}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-500">Trim Size</div>
                          <div className="font-bold text-stone-200">
                            {fullBookAudit.formattingChoices.recommendedTrimSize}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-500">Typography</div>
                          <div className="font-bold text-stone-200 truncate">
                            {fullBookAudit.formattingChoices.recommendedGoogleFont ||
                              fullBookAudit.formattingChoices.recommendedFontPreset}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-500">Size / Leading</div>
                          <div className="font-bold text-stone-200">
                            {fullBookAudit.formattingChoices.recommendedFontSize} /{" "}
                            {fullBookAudit.formattingChoices.recommendedLineSpacing}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-500">Headings & Breaks</div>
                          <div className="font-bold text-stone-200 truncate">
                            {fullBookAudit.formattingChoices.recommendedChapterHeadingCase} •{" "}
                            {fullBookAudit.formattingChoices.recommendedSceneBreakSymbol}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed italic">
                        {fullBookAudit.formattingChoices.typographyRationale}
                      </p>

                      {fullBookAudit.formattingChoices.globalStyleDirectives?.length > 0 && (
                        <div className="pt-2 border-t border-stone-800 space-y-1">
                          <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
                            Locked Style Rules (Honored Across Every Chapter):
                          </div>
                          <ul className="space-y-1 text-[11px] text-stone-300 list-disc pl-4">
                            {fullBookAudit.formattingChoices.globalStyleDirectives.map((dir, i) => (
                              <li key={i}>{dir}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chapter-by-Chapter Breakdown Strip from Full Read */}
                  <div className="pt-2 border-t border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
                      <span className="uppercase font-bold text-amber-400">
                        Chapter Breakdown (Click any chapter to inspect & apply single-pass edits)
                      </span>
                      <span>{(fullBookAudit.chapterAudits || []).length} Chapters</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {(fullBookAudit.chapterAudits || []).map((audit) => {
                        const matchedIdx = chapters.findIndex(
                          (ch) => ch.id === audit.chapterId || ch.number === audit.chapterNumber
                        );
                        const isActive = matchedIdx === activeChapterIndex;
                        const avgScore = Math.round(
                          ((audit.critique?.readabilityScore || 80) +
                            (audit.critique?.pacingScore || 80) +
                            (audit.critique?.dialogueScore || 80) +
                            (audit.critique?.sensoryScore || 80)) /
                            4
                        );
                        return (
                          <button
                            key={audit.chapterId || audit.chapterNumber}
                            onClick={() => matchedIdx >= 0 && handleSelectChapter(matchedIdx)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isActive
                                ? "bg-amber-500/15 border-amber-400 text-stone-100"
                                : "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold truncate">
                                Ch {audit.chapterNumber}: {audit.title}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-amber-300 shrink-0">
                                {avgScore}/100
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400 mt-1 line-clamp-1">
                              Focus: <span className="text-emerald-300 font-mono">{audit.priorityFocus}</span> —{" "}
                              {audit.formattingNotes || audit.critique?.overallVerdict}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Chapter Review Banner & Controls */}
          {currentChapter ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Chapter Overview & Council Assessment (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
                  {/* Chapter Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 font-mono text-xs font-bold">
                          Chapter {currentChapter.number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold ${
                            currentChapterApplied || reviewedChapterIds.has(currentChapter.id)
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : currentChapterCritique
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-stone-800 text-stone-400"
                          }`}
                        >
                          {currentChapterApplied || reviewedChapterIds.has(currentChapter.id)
                            ? "Recommendations Applied ✓"
                            : currentChapterCritique
                            ? currentChapterFullAudit
                              ? "Full-Book Audit Ready"
                              : "Critique Ready"
                            : "Pending Council Audit"}
                        </span>
                      </div>
                      <h2 className="text-lg font-serif font-bold text-stone-100 mt-1.5">
                        {currentChapter.title}
                      </h2>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-stone-400">Word Count</div>
                      <div className="font-mono text-sm font-bold text-stone-200">
                        {currentChapterApplied ? currentChapterApplied.wordCount : currentChapter.wordCount || 0} words
                      </div>
                    </div>
                  </div>

                  {/* Scene Beats & Goals Context */}
                  <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1.5">
                    {currentChapter.goal && (
                      <div>
                        <span className="text-stone-500 font-mono">Goal:</span>{" "}
                        <span className="text-stone-300">{currentChapter.goal}</span>
                      </div>
                    )}
                    {currentChapter.conflict && (
                      <div>
                        <span className="text-stone-500 font-mono">Conflict:</span>{" "}
                        <span className="text-stone-300">{currentChapter.conflict}</span>
                      </div>
                    )}
                    {currentChapter.cliffhanger && (
                      <div>
                        <span className="text-stone-500 font-mono">Hook/Ending:</span>{" "}
                        <span className="text-stone-300">{currentChapter.cliffhanger}</span>
                      </div>
                    )}
                  </div>

                  {/* Critique Trigger / Refresh Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => handleRequestChapterCritique()}
                      disabled={isCritiquingChapter || !currentChapter.content?.trim()}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs border border-stone-700 transition-all disabled:opacity-50"
                    >
                      {isCritiquingChapter ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Council is Auditing Chapter {currentChapter.number}...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 text-amber-400" />
                          <span>
                            {currentChapterCritique ? "Re-Run Single Chapter Audit" : "Request Council Audit & Recommendations"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {critiqueError && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{critiqueError}</span>
                    </div>
                  )}
                </div>

                {/* Council Critique Scores & Breakdown Card */}
                {currentChapterCritique && (
                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                      <h3 className="font-serif font-bold text-sm text-stone-200 flex items-center space-x-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>Council Assessment Scores</span>
                      </h3>
                      <span className="text-[10px] font-mono uppercase text-stone-500">
                        {currentChapterFullAudit ? "Full-Book Read Informed" : "High Inquisitor Thorne"}
                      </span>
                    </div>

                    {/* Scores Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400">Readability</div>
                        <div
                          className={`text-base font-mono font-bold mt-0.5 ${
                            currentChapterCritique.readabilityScore >= 85 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {currentChapterCritique.readabilityScore}/100
                        </div>
                      </div>
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400">Pacing</div>
                        <div
                          className={`text-base font-mono font-bold mt-0.5 ${
                            currentChapterCritique.pacingScore >= 85 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {currentChapterCritique.pacingScore}/100
                        </div>
                      </div>
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400">Dialogue</div>
                        <div
                          className={`text-base font-mono font-bold mt-0.5 ${
                            currentChapterCritique.dialogueScore >= 85 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {currentChapterCritique.dialogueScore}/100
                        </div>
                      </div>
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400">Sensory</div>
                        <div
                          className={`text-base font-mono font-bold mt-0.5 ${
                            currentChapterCritique.sensoryScore >= 85 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {currentChapterCritique.sensoryScore}/100
                        </div>
                      </div>
                    </div>

                    {/* Executive Verdict */}
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/90 text-xs">
                      <div className="text-amber-400 font-bold font-mono mb-1">Executive Verdict:</div>
                      <p className="text-stone-300 leading-relaxed italic">
                        "{currentChapterCritique.overallVerdict}"
                      </p>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="space-y-2 text-xs">
                      {currentChapterCritique.strengths && currentChapterCritique.strengths.length > 0 && (
                        <div>
                          <div className="text-emerald-400 font-bold mb-1 flex items-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mastery Highlights:</span>
                          </div>
                          <ul className="space-y-1 pl-4 list-disc text-stone-300 text-[11px]">
                            {(currentChapterCritique.strengths || []).map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentChapterCritique.weaknesses && currentChapterCritique.weaknesses.length > 0 && (
                        <div className="pt-2">
                          <div className="text-amber-400 font-bold mb-1 flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Recommended Refinements:</span>
                          </div>
                          <ul className="space-y-1 pl-4 list-disc text-stone-300 text-[11px]">
                            {(currentChapterCritique.weaknesses || []).map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Full-Read Continuity Links & Formatting Notes for this chapter */}
                      {currentChapterFullAudit && (
                        <div className="pt-2 border-t border-stone-800 space-y-2">
                          {currentChapterFullAudit.formattingNotes && (
                            <div className="p-2.5 rounded-lg bg-stone-950 border border-amber-500/25 text-[11px]">
                              <div className="font-mono text-amber-400 font-bold mb-0.5">
                                Full-Book Formatting Choice for Chapter {currentChapter.number}:
                              </div>
                              <div className="text-stone-300">{currentChapterFullAudit.formattingNotes}</div>
                            </div>
                          )}
                          {currentChapterFullAudit.continuityLinks?.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-stone-950 border border-emerald-500/25 text-[11px]">
                              <div className="font-mono text-emerald-400 font-bold mb-1">
                                Cross-Chapter Continuity Threads:
                              </div>
                              <ul className="space-y-0.5 pl-4 list-disc text-stone-300">
                                {currentChapterFullAudit.continuityLinks.map((link, i) => (
                                  <li key={i}>{link}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Line Edits Preview */}
                    {currentChapterCritique.lineEdits && currentChapterCritique.lineEdits.length > 0 && (
                      <div className="pt-2 border-t border-stone-800">
                        <div className="text-stone-400 font-mono text-[11px] font-bold mb-2">
                          Specific Line Edit Suggestions ({currentChapterCritique.lineEdits.length}):
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {(currentChapterCritique.lineEdits || []).map((le, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] space-y-1"
                            >
                              <div className="text-rose-300/90 line-through">
                                Original: "{le.original}"
                              </div>
                              <div className="text-emerald-300 font-medium">
                                Recommendation: "{le.suggestion}"
                              </div>
                              <div className="text-[10px] text-stone-400 italic">
                                Reason: {le.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Apply Recommendations & Diff / Next Chapter Action Center (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Apply Controls Box */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <Wand2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-stone-100">
                          Apply Council Recommendations
                        </h3>
                        <p className="text-xs text-stone-400">
                          Seamlessly incorporate line edits, pacing corrections, and sensory polish into Chapter {currentChapter.number}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Focus Area & Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1">
                        Application Focus:
                      </label>
                      <select
                        value={applyFocusArea}
                        onChange={(e) => setApplyFocusArea(e.target.value as any)}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-200 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="all">Full Comprehensive Polish (All Edits)</option>
                        <option value="line_edits">Strict Line Edits & Grammar</option>
                        <option value="pacing">Pacing & Narrative Momentum</option>
                        <option value="dialogue">Dialogue Subtext & Voice</option>
                        <option value="sensory">Sensory & Atmospheric Immersion</option>
                        <option value="voice">Authorial Voice & Tone Cohesion</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1">
                        Optional Author Directives:
                      </label>
                      <input
                        type="text"
                        value={customAuthorInstructions}
                        onChange={(e) => setCustomAuthorInstructions(e.target.value)}
                        placeholder="e.g. Keep dialogue sharp, preserve dark humor..."
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-200 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      onClick={handleApplyRecommendations}
                      disabled={isApplyingRecommendations || !currentChapter.content?.trim()}
                      className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {isApplyingRecommendations ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Council is Polishing Chapter {currentChapter.number}...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {currentChapterApplied
                              ? "Re-Apply Recommended Changes"
                              : fullBookAudit
                              ? "Apply Full-Book Informed Recommendations"
                              : "Apply Recommended Changes to Chapter"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {applyError && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{applyError}</span>
                    </div>
                  )}

                  {/* Summary of Changes Applied (If already applied) */}
                  {currentChapterApplied && (
                    <div className="p-4 bg-emerald-950/30 border border-emerald-600/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Recommended Changes Successfully Synthesized!</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-300">
                          {currentChapterApplied.wordCount} words
                        </span>
                      </div>

                      <p className="text-xs text-stone-300 italic">
                        "{currentChapterApplied.editorialVerdict}"
                      </p>

                      {currentChapterApplied.changesApplied && currentChapterApplied.changesApplied.length > 0 && (
                        <div className="pt-2 border-t border-emerald-800/40">
                          <div className="text-[11px] font-mono text-emerald-300 font-bold mb-1">
                            Key Enhancements Applied:
                          </div>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-stone-300">
                            {(currentChapterApplied.changesApplied || []).map((chg, idx) => (
                              <li key={idx} className="flex items-start space-x-1.5">
                                <span className="text-emerald-400">✓</span>
                                <span>{chg}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Chapter Prose Diff / Preview Area */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <h4 className="font-serif font-bold text-sm text-stone-200">
                      {currentChapterApplied ? "Polished Manuscript Version" : "Current Chapter Manuscript"}
                    </h4>
                    {currentChapterApplied && (
                      <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-[11px]">
                        <button
                          onClick={() => setDiffViewMode("side_by_side")}
                          className={`px-2 py-0.5 rounded ${
                            diffViewMode === "side_by_side"
                              ? "bg-amber-500 text-stone-950 font-bold"
                              : "text-stone-400"
                          }`}
                        >
                          Compare Original & Edited
                        </button>
                        <button
                          onClick={() => setDiffViewMode("edited_only")}
                          className={`px-2 py-0.5 rounded ${
                            diffViewMode === "edited_only"
                              ? "bg-amber-500 text-stone-950 font-bold"
                              : "text-stone-400"
                          }`}
                        >
                          Edited Version Only
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content View */}
                  {currentChapterApplied && diffViewMode === "side_by_side" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 text-xs">
                      <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                        <div className="font-mono text-[10px] uppercase text-stone-500 font-bold pb-1 border-b border-stone-800">
                          Original Draft
                        </div>
                        <div className="whitespace-pre-wrap text-stone-400 leading-relaxed font-serif">
                          {currentChapter.content || "Empty chapter draft."}
                        </div>
                      </div>

                      <div className="p-3 bg-stone-950 rounded-xl border border-amber-500/30 space-y-1 shadow-inner">
                        <div className="font-mono text-[10px] uppercase text-amber-400 font-bold pb-1 border-b border-amber-500/20">
                          Council Polished Version
                        </div>
                        <div className="whitespace-pre-wrap text-stone-100 leading-relaxed font-serif">
                          {currentChapterApplied.editedContent}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 max-h-80 overflow-y-auto pr-1 text-xs whitespace-pre-wrap font-serif text-stone-200 leading-relaxed">
                      {currentChapterApplied ? currentChapterApplied.editedContent : currentChapter.content || "Empty chapter draft. Click 'Request Council Audit' or write prose in the editor."}
                    </div>
                  )}

                  {/* Primary Next Action Banner */}
                  <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      onClick={() => onNavigateToEditor(currentChapter.id)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700 flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-400" />
                      <span>Open in Full Editor</span>
                    </button>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        onClick={handleSkipToNextChapter}
                        className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                      >
                        Skip
                      </button>

                      <button
                        onClick={handleSaveAndMoveToNextChapter}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md shadow-amber-950/30 flex items-center justify-center space-x-2 transition-all"
                      >
                        {isLastChapter ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Apply & Initiate Final Sweep →</span>
                          </>
                        ) : (
                          <>
                            <span>Save & Move to Chapter {currentChapter.number + 1}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-stone-900 rounded-2xl border border-stone-800 text-stone-400">
              No chapters found in this book. Please create chapters in the Outline Builder first.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SOVEREIGN FINAL SWEEP & NEXT STEPS                                */}
      {/* ========================================================================= */}
      {activeViewMode === "final_sweep" && (
        <div className="space-y-6">
          {/* Sweep Header Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-800 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-serif font-bold text-stone-100">
                    The Plenary Sovereign Final Sweep
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-400 mt-1">
                  Full-manuscript continuity audit, cross-chapter pacing analysis, and commercial release readiness check.
                </p>
              </div>

              <button
                onClick={() => handleRunFinalSweep()}
                disabled={isRunningFinalSweep}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-950/40 flex items-center space-x-2 transition-all disabled:opacity-50 shrink-0"
              >
                {isRunningFinalSweep ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conducting Plenary Audit...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>{finalSweepReport ? "Re-Run Final Sweep" : "Run Sovereign Final Sweep"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Sweep Loading State */}
            {isRunningFinalSweep && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-200 text-base">
                    The Sovereign Realm Council is Auditing Your Manuscript...
                  </h3>
                  <p className="text-xs text-stone-400 max-w-md mt-1">
                    Archon Vael is verifying arc trajectory, Lady Seraphina is auditing tonal texture, High Inquisitor Thorne is checking continuity, and Imperator Cassian is preparing marketplace calibration.
                  </p>
                </div>
              </div>
            )}

            {/* Sweep Results Dashboard */}
            {!isRunningFinalSweep && finalSweepReport && (
              <div className="mt-6 space-y-6">
                {/* Score & Health Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Master Score */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-stone-950 to-stone-950 border border-amber-500/40 shadow-inner flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                        Master Manuscript Health
                      </div>
                      <div className="text-3xl font-serif font-bold text-stone-100 mt-1">
                        {finalSweepReport.overallScore}/100
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {finalSweepReport.readinessStatus}
                      </span>
                    </div>
                  </div>

                  {/* Voice Cohesion */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-stone-400">
                        Voice & Tone Cohesion
                      </div>
                      <div className="text-2xl font-serif font-bold text-amber-300 mt-1">
                        {finalSweepReport.voiceCohesionScore}%
                      </div>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-2">Lady Seraphina's Spire</div>
                  </div>

                  {/* Lore Consistency */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-stone-400">
                        Lore & World Continuity
                      </div>
                      <div className="text-2xl font-serif font-bold text-amber-300 mt-1">
                        {finalSweepReport.loreConsistencyScore}%
                      </div>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-2">Archivist Elendur's Athenaeum</div>
                  </div>

                  {/* Pacing Momentum */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-stone-400">
                        Pacing & Tension Rhythm
                      </div>
                      <div className="text-2xl font-serif font-bold text-amber-300 mt-1">
                        {finalSweepReport.pacingRhythmScore}%
                      </div>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-2">Archon Vael's Citadel</div>
                  </div>
                </div>

                {/* Narrative Arc Verdict */}
                <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-serif font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Plenary Narrative Arc Synthesis:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed italic">
                    "{finalSweepReport.narrativeArcVerdict}"
                  </p>
                </div>

                {/* Strengths & Final Touch Polish Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                    <div className="text-emerald-400 font-bold font-mono flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Key Manuscript Strengths:</span>
                    </div>
                    <ul className="space-y-1.5 pl-4 list-disc text-stone-300">
                      {finalSweepReport.keyStrengths?.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                    <div className="text-amber-400 font-bold font-mono flex items-center space-x-1.5">
                      <Sliders className="w-4 h-4" />
                      <span>Final Touch Recommendations:</span>
                    </div>
                    <ul className="space-y-1.5 pl-4 list-disc text-stone-300">
                      {finalSweepReport.finalTouchRecommendations?.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Chapter Readiness Matrix */}
                {finalSweepReport.chapterAuditSummary && finalSweepReport.chapterAuditSummary.length > 0 && (
                  <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div className="font-serif font-bold text-sm text-stone-200">
                        Chapter-by-Chapter Readiness Matrix
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 uppercase">
                        {(finalSweepReport.chapterAuditSummary || []).length} Chapters Audited
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(finalSweepReport.chapterAuditSummary || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-stone-200 truncate">
                              Ch {item.chapterNumber}: {item.title}
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">{item.keyNote}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                                item.score >= 90
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {item.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* NEXT STEPS ACTION CENTER                                                  */}
                {/* ========================================================================= */}
                <div className="pt-4 border-t border-stone-800 space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                    <h3 className="font-serif font-bold text-base text-stone-100">
                      Manuscript Next Steps
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Next Step 1: Interior Typesetting */}
                    <button
                      onClick={() => onNavigateToTab && onNavigateToTab("typesetting")}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-900 text-left transition-all group"
                    >
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-3 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                        <BookMarked className="w-5 h-5" />
                      </div>
                      <div className="font-serif font-bold text-sm text-stone-100">
                        Interior Typesetting
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Format drop caps, margins, scene breaks, and book font presets.
                      </p>
                    </button>

                    {/* Next Step 2: Art Studio Plates */}
                    <button
                      onClick={() => onNavigateToTab && onNavigateToTab("art")}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-900 text-left transition-all group"
                    >
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-3 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                        <Palette className="w-5 h-5" />
                      </div>
                      <div className="font-serif font-bold text-sm text-stone-100">
                        Art Studio & Plates
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Generate illuminated chapter plates and sovereign cover art.
                      </p>
                    </button>

                    {/* Next Step 3: Publishing Suite */}
                    <button
                      onClick={() => onNavigateToTab && onNavigateToTab("publishing")}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-900 text-left transition-all group"
                    >
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-3 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                        <BookOpenCheck className="w-5 h-5" />
                      </div>
                      <div className="font-serif font-bold text-sm text-stone-100">
                        Commercial Publishing Suite
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Generate Amazon KDP blurbs, metadata, and query letters.
                      </p>
                    </button>

                    {/* Next Step 4: Export Modal */}
                    <button
                      onClick={() => onOpenExportModal && onOpenExportModal()}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-900 text-left transition-all group"
                    >
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-3 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                        <Download className="w-5 h-5" />
                      </div>
                      <div className="font-serif font-bold text-sm text-stone-100">
                        Export PDF / EPUB
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Download print-ready manuscript files and digital editions.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: 1-ON-1 SOVEREIGN REALM MASTER CONSULTATION CHAMBER                */}
      {/* ========================================================================= */}
      {activeViewMode === "chamber" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: 6 Master Cards */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400 px-1">
              Choose Realm Master
            </div>

            {REALM_AGENTS.map((agent) => {
              const isSelected = selectedAgentId === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? "bg-stone-900 border-amber-500/60 shadow-lg shadow-amber-950/30 scale-[1.01]"
                      : "bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isSelected
                          ? "bg-amber-500 text-stone-950 font-bold"
                          : "bg-stone-800 text-amber-400"
                      }`}
                    >
                      {getAgentIcon(agent.id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-bold text-sm text-stone-100 truncate">
                          {agent.name}
                        </h3>
                        {isSelected && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-amber-400/90 font-medium truncate">
                        {agent.title}
                      </div>
                      <div className="text-[11px] text-stone-400 line-clamp-1 mt-1">
                        {agent.realm}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Active Consultation Chamber */}
          <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[700px]">
            {/* Active Agent Banner */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {getAgentIcon(activeAgent.id)}
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-stone-100 flex items-center space-x-2">
                    <span>{activeAgent.name}</span>
                    <span className="text-xs font-sans text-stone-400 font-normal">
                      — {activeAgent.title}
                    </span>
                  </h2>
                  <p className="text-[11px] text-stone-400 italic">"{activeAgent.quote}"</p>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-[10px] font-mono uppercase text-stone-500">Book Context</span>
                <div className="text-xs font-serif text-amber-300 truncate max-w-xs">{book.title}</div>
              </div>
            </div>

            {/* Quick Prompt Starters */}
            <div className="p-3 bg-stone-950/40 border-b border-stone-800/80 overflow-x-auto flex items-center space-x-2 scrollbar-none">
              <span className="text-[10px] font-mono uppercase text-stone-500 shrink-0">Prompts:</span>
              {(activeAgent.promptStarters || []).map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(starter)}
                  className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/60 transition-colors shrink-0"
                >
                  {starter}
                </button>
              ))}
            </div>

            {/* Chat Messages Scrollable Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {(currentMessages || []).map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser
                          ? "bg-stone-700 text-stone-200"
                          : "bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950"
                      }`}
                    >
                      {isUser ? "You" : activeAgent.name[0]}
                    </div>

                    <div
                      className={`max-w-2xl rounded-2xl p-4 shadow-sm space-y-2 ${
                        isUser
                          ? "bg-amber-500/10 border border-amber-500/30 text-stone-100"
                          : "bg-stone-950 border border-stone-800 text-stone-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-stone-500 border-b border-stone-800/60 pb-1 mb-1">
                        <span className="font-mono">{isUser ? "Author" : activeAgent.name}</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="text-xs sm:text-sm font-sans whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </div>

                      {/* Action buttons on agent responses */}
                      {!isUser && (
                        <div className="flex items-center space-x-2 pt-2 border-t border-stone-800/60">
                          <button
                            onClick={() => handleCopyText(msg.text, idx)}
                            className="flex items-center space-x-1 text-[10px] text-stone-400 hover:text-stone-200 transition-colors"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleInsertIntoCurrentChapter(msg.text)}
                            className="flex items-center space-x-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors ml-3"
                          >
                            <FilePlus2 className="w-3 h-3" />
                            <span>Insert into Active Chapter</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-400 italic">
                    {activeAgent.name} is weaving their realm's wisdom...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 bg-stone-950 border-t border-stone-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Ask ${activeAgent.name} for advice, scene expansions, lore, or structural audits...`}
                  className="flex-1 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 p-3 text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
