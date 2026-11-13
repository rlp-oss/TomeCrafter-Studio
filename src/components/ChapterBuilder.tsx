import React, { useState, useRef } from "react";
import {
  LayoutGrid,
  Plus,
  Sparkles,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Target,
  User,
  MapPin,
  CheckCircle,
  Clock,
  Flame,
  HelpCircle,
  FileText,
  Loader2,
  ChevronRight,
  Globe,
  Bookmark,
  Search,
  Zap,
  Check,
  RefreshCw,
  Play,
  StopCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Book, Chapter, IdeaOutline, FootnoteReference } from "../types";
import { apiService } from "../services/api";
import { BuildIdeaBox } from "./BuildIdeaBox";
import { ManuscriptDropWindow } from "./ManuscriptDropWindow";
import { BOOK_SIZE_PROFILES } from "../utils/manuscriptImporter";

interface ChapterBuilderProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onNavigateToEditor: (chapterId: string) => void;
}

export const ChapterBuilder: React.FC<ChapterBuilderProps> = ({
  book,
  onUpdateBook,
  onNavigateToEditor,
}) => {
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  const [showBuildIdeaModal, setShowBuildIdeaModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // Single Chapter Drafting State
  const [singleDraftingChapterId, setSingleDraftingChapterId] = useState<string | null>(null);
  const [draftingNotification, setDraftingNotification] = useState<string | null>(null);

  // Batch Chapter Compiler State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [selectedBatchChapterIds, setSelectedBatchChapterIds] = useState<string[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchCurrentTitle, setBatchCurrentTitle] = useState("");
  const [batchWordsCount, setBatchWordsCount] = useState(0);
  const abortBatchRef = useRef<boolean>(false);

  // Outline modal inputs
  const [outlineTargetChapters, setOutlineTargetChapters] = useState(8);
  const [outlineTone, setOutlineTone] = useState(book.tone || "Atmospheric, high tension");
  const [outlinePremise, setOutlinePremise] = useState(book.premise || "");

  // Stats calculation
  const totalWords = book.chapters.reduce(
    (acc, ch) => acc + (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0
  );
  const targetWords = book.targetWordCount || 50000;
  const completedChapters = book.chapters.filter((ch) => ch.status === "final" || ch.status === "polished").length;
  const emptyChaptersCount = book.chapters.filter((ch) => !ch.content || ch.content.trim().length === 0).length;

  // Index view mode: strictly by chapter by default (never separate by Acts unless toggled)
  const [indexViewMode, setIndexViewMode] = useState<"by_chapter" | "by_act">("by_chapter");

  // Group chapters by Act (only used when user explicitly switches to Group by Act)
  const actsMap: Record<string, Chapter[]> = {};
  book.chapters.forEach((ch) => {
    const actName = ch.act || "Main Narrative";
    if (!actsMap[actName]) {
      actsMap[actName] = [];
    }
    actsMap[actName].push(ch);
  });
  const hasMultipleActs = Object.keys(actsMap).length > 1;
  const displayedGroups: [string, Chapter[]][] =
    indexViewMode === "by_act" && hasMultipleActs
      ? Object.entries(actsMap)
      : [["All Chapters (In Order)", book.chapters]];

  // Draft a single chapter's prose using outline & footnotes
  const handleDraftSingleChapter = async (chapter: Chapter) => {
    setSingleDraftingChapterId(chapter.id);
    setDraftingNotification(`Drafting Chapter ${chapter.number}: ${chapter.title}...`);

    try {
      const allOutlines = book.chapters.map((c) => ({
        number: c.number,
        title: c.title,
        summary: c.summary,
      }));

      const res = await apiService.compileChapterProse({
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
          premise: book.premise,
          author: book.author,
        },
        chapter: {
          number: chapter.number,
          title: chapter.title,
          summary: chapter.summary,
          goal: chapter.goal,
          conflict: chapter.conflict,
          cliffhanger: chapter.cliffhanger,
          pov: chapter.pov,
          setting: chapter.setting,
          targetWords: chapter.targetWords || 2000,
          footnotes: chapter.footnotes || [],
        },
        allChaptersOutline: allOutlines,
        targetWordCount: chapter.targetWords || 2000,
      });

      if (res.text) {
        const updatedChapters = book.chapters.map((ch) =>
          ch.id === chapter.id
            ? {
                ...ch,
                content: res.text,
                wordCount: res.wordCount,
                status: "draft" as const,
              }
            : ch
        );

        onUpdateBook({
          ...book,
          chapters: updatedChapters,
          updatedAt: new Date().toISOString(),
        });

        setDraftingNotification(`✨ Chapter ${chapter.number} drafted successfully (${res.wordCount.toLocaleString()} words).`);
        setTimeout(() => setDraftingNotification(null), 4000);
      }
    } catch (err: any) {
      alert(`Could not draft Chapter ${chapter.number}: ${err.message}`);
      setDraftingNotification(null);
    } finally {
      setSingleDraftingChapterId(null);
    }
  };

  // Launch Batch Compilation
  const handleStartBatchCompilation = async (customIds?: string[]) => {
    const queueIds = customIds || (selectedBatchChapterIds.length > 0
      ? selectedBatchChapterIds
      : book.chapters.filter((c) => !c.content || c.content.trim().length === 0).map((c) => c.id));

    if (queueIds.length === 0) {
      alert("No chapters selected for compilation.");
      return;
    }

    setIsBatchRunning(true);
    abortBatchRef.current = false;
    let accumulatedWords = 0;
    let currentBookState = { ...book };

    const allOutlines = currentBookState.chapters.map((c) => ({
      number: c.number,
      title: c.title,
      summary: c.summary,
    }));

    for (let i = 0; i < queueIds.length; i++) {
      if (abortBatchRef.current) break;

      const targetId = queueIds[i];
      const targetChapter = currentBookState.chapters.find((c) => c.id === targetId);
      if (!targetChapter) continue;

      setBatchCurrentIndex(i + 1);
      setBatchCurrentTitle(`Chapter ${targetChapter.number}: ${targetChapter.title}`);

      try {
        const res = await apiService.compileChapterProse({
          bookContext: {
            title: currentBookState.title,
            genre: currentBookState.genre,
            tone: currentBookState.tone,
            premise: currentBookState.premise,
            author: currentBookState.author,
          },
          chapter: {
            number: targetChapter.number,
            title: targetChapter.title,
            summary: targetChapter.summary,
            goal: targetChapter.goal,
            conflict: targetChapter.conflict,
            cliffhanger: targetChapter.cliffhanger,
            pov: targetChapter.pov,
            setting: targetChapter.setting,
            targetWords: targetChapter.targetWords || 2000,
            footnotes: targetChapter.footnotes || [],
          },
          allChaptersOutline: allOutlines,
          targetWordCount: targetChapter.targetWords || 2000,
        });

        if (res.text) {
          accumulatedWords += res.wordCount;
          setBatchWordsCount(accumulatedWords);

          const updatedChapters = currentBookState.chapters.map((ch) =>
            ch.id === targetId
              ? {
                  ...ch,
                  content: res.text,
                  wordCount: res.wordCount,
                  status: "draft" as const,
                }
              : ch
          );

          currentBookState = {
            ...currentBookState,
            chapters: updatedChapters,
            updatedAt: new Date().toISOString(),
          };

          // Save each chapter step immediately
          onUpdateBook(currentBookState);
        }
      } catch (err: any) {
        console.warn(`Error compiling chapter ${targetChapter.number}:`, err);
      }
    }

    setIsBatchRunning(false);
    setDraftingNotification(
      `🎉 Full manuscript compilation complete! Generated ${accumulatedWords.toLocaleString()} words.`
    );
    setTimeout(() => setDraftingNotification(null), 5000);
  };

  const handleApplyIdeaOutline = (
    outline: IdeaOutline,
    replaceExisting: boolean,
    andDraftProseImmediately?: boolean
  ) => {
    const newChapters: Chapter[] = [];
    let chapterIndex = replaceExisting ? 1 : book.chapters.length + 1;

    outline.acts.forEach((act) => {
      act.chapters.forEach((ch) => {
        newChapters.push({
          id: `ch-idea-${Date.now()}-${chapterIndex}-${Math.random().toString(36).slice(2, 6)}`,
          number: chapterIndex,
          act: act.actName,
          title: ch.title || `Chapter ${chapterIndex}`,
          summary: ch.summary || "",
          goal: ch.goal || "",
          conflict: ch.conflict || "",
          cliffhanger: ch.cliffhanger || "",
          pov: ch.pov || "Protagonist",
          setting: ch.setting || "Setting",
          targetWords: ch.targetWords || Math.round(targetWords / 10),
          wordCount: 0,
          content: "",
          status: "draft",
          illustrations: [],
          footnotes: ch.footnotes || [],
        });
        chapterIndex++;
      });
    });

    const finalChapters = replaceExisting ? newChapters : [...book.chapters, ...newChapters];

    const updated = {
      ...book,
      premise: outline.expandedPremise || outline.logline || book.premise,
      chapters: finalChapters,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBook(updated);
    setShowBuildIdeaModal(false);

    if (andDraftProseImmediately) {
      // Auto launch batch drafting for the new chapters
      setShowBatchModal(true);
      setSelectedBatchChapterIds(newChapters.map((c) => c.id));
      setTimeout(() => {
        handleStartBatchCompilation(newChapters.map((c) => c.id));
      }, 300);
    }
  };

  const handleAddChapter = () => {
    const nextNumber = book.chapters.length + 1;
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      number: nextNumber,
      act: `Act ${Math.ceil(nextNumber / 4)}: Rising Arc`,
      title: `Chapter ${nextNumber}: New Awakening`,
      summary: "Describe the primary event and character motivation for this chapter.",
      goal: "Protagonist's urgent objective.",
      conflict: "Core obstacle or counter-force.",
      cliffhanger: "A gripping realization or physical peril at the end.",
      pov: "Protagonist POV",
      setting: "Location",
      targetWords: Math.round(targetWords / (book.chapters.length + 1 || 10)),
      wordCount: 0,
      content: "",
      status: "draft",
      illustrations: [],
    };

    onUpdateBook({
      ...book,
      chapters: [...book.chapters, newChapter],
      updatedAt: new Date().toISOString(),
    });
    setEditingChapter(newChapter);
  };

  const handleMoveChapter = (index: number, direction: "up" | "down") => {
    const newChapters = [...book.chapters];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newChapters.length) return;

    const temp = newChapters[index];
    newChapters[index] = newChapters[targetIndex];
    newChapters[targetIndex] = temp;

    // Recalculate numbers
    const renumbered = newChapters.map((ch, i) => ({
      ...ch,
      number: i + 1,
    }));

    onUpdateBook({
      ...book,
      chapters: renumbered,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteChapter = (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;
    const filtered = book.chapters.filter((ch) => ch.id !== id);
    const renumbered = filtered.map((ch, i) => ({
      ...ch,
      number: i + 1,
    }));
    onUpdateBook({
      ...book,
      chapters: renumbered,
      updatedAt: new Date().toISOString(),
    });
    if (editingChapter?.id === id) {
      setEditingChapter(null);
    }
  };

  const handleSaveChapterEdit = (updated: Chapter) => {
    const count = updated.content ? updated.content.trim().split(/\s+/).filter(Boolean).length : 0;
    const withCount = { ...updated, wordCount: count };

    const chapters = book.chapters.map((ch) => (ch.id === withCount.id ? withCount : ch));
    onUpdateBook({
      ...book,
      chapters,
      updatedAt: new Date().toISOString(),
    });
    setEditingChapter(null);
  };

  const handleGenerateAIOutline = async () => {
    setIsGeneratingOutline(true);
    try {
      const outlineData = await apiService.generateOutline({
        title: book.title,
        genre: book.genre,
        premise: outlinePremise || book.premise,
        targetChapterCount: outlineTargetChapters,
        targetWordCount: book.targetWordCount,
        tone: outlineTone,
      });

      if (outlineData && outlineData.acts) {
        const generatedChapters: Chapter[] = [];
        let chapterIdx = 1;

        outlineData.acts.forEach((act) => {
          act.chapters.forEach((ch) => {
            generatedChapters.push({
              id: `ch-gen-${Date.now()}-${chapterIdx}`,
              number: chapterIdx,
              act: act.actName || "Act I",
              title: ch.title || `Chapter ${chapterIdx}`,
              summary: ch.summary || "",
              goal: ch.goal || "",
              conflict: ch.conflict || "",
              cliffhanger: ch.cliffhanger || "",
              pov: ch.pov || "Main Character",
              setting: ch.setting || "Default Setting",
              targetWords: ch.targetWords || Math.round(targetWords / outlineTargetChapters),
              wordCount: 0,
              content: "",
              status: "draft",
              illustrations: [],
            });
            chapterIdx++;
          });
        });

        onUpdateBook({
          ...book,
          premise: outlinePremise || book.premise,
          tone: outlineTone || book.tone,
          chapters: generatedChapters,
          updatedAt: new Date().toISOString(),
        });
        setShowOutlineModal(false);
      }
    } catch (err: any) {
      alert("Plot Architect experienced an error: " + err.message);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Floating Status Notification */}
      {draftingNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-stone-900/95 border border-amber-500/40 text-stone-100 shadow-2xl backdrop-blur-md flex items-center space-x-3 max-w-md animate-slideUp">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-semibold text-stone-100">{draftingNotification}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Remember to click Save (or Ctrl/Cmd+S) when ready to persist</p>
          </div>
          <button
            onClick={() => setDraftingNotification(null)}
            className="text-stone-400 hover:text-stone-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Architect Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <LayoutGrid className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Chapter Architecture & Beat Sheet
            </h1>
          </div>
          <p className="text-sm text-stone-400">
            Construct narrative arcs, track scene objectives, and compile full chapter prose under the guidance of{" "}
            <span className="text-amber-400 font-medium">Archon Vael (Plot Architect)</span>.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {book.chapters.length > 0 && (
            <button
              onClick={() => {
                setSelectedBatchChapterIds(book.chapters.map((c) => c.id));
                setShowBatchModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer group"
              title="Auto-draft full chapter prose for multiple chapters"
            >
              <Zap className="w-4 h-4 text-stone-950 transition-transform group-hover:scale-110" />
              <span>⚡ Compile Full Manuscript</span>
              {emptyChaptersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-stone-950/20 text-stone-950 text-[10px] font-mono ml-0.5">
                  {emptyChaptersCount} empty
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setShowBuildIdeaModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Build Upon Idea</span>
          </button>

          <button
            onClick={() => setShowOutlineModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Outline</span>
          </button>

          <button
            onClick={handleAddChapter}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Chapter</span>
          </button>
        </div>
      </div>

      {/* Full Manuscript Drop Window (Auto-expanded on newly started / empty projects) */}
      <ManuscriptDropWindow
        key={book.id}
        book={book}
        defaultExpanded={totalWords === 0}
        onApplyImport={(updatedBook, firstChapterId, openEditor) => {
          onUpdateBook(updatedBook);
          const trimLabel =
            BOOK_SIZE_PROFILES[updatedBook.formattingSettings?.trimSize || "6x9"].dimensions;
          setDraftingNotification(
            `Populated ${updatedBook.chapters.length} chapters and auto-formatted to ${trimLabel}.`
          );
          setTimeout(() => setDraftingNotification(null), 5000);
          if (openEditor && firstChapterId) {
            onNavigateToEditor(firstChapterId);
          }
        }}
      />

      {/* Idea Expansion Hero Banner */}
      <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/30 border border-amber-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif font-bold text-stone-100 text-base">
                Have an unformed plot spark or raw author idea?
              </h3>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                <Globe className="w-3 h-3" />
                <span>Search & Footnotes</span>
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Launch the <strong>Idea Builder</strong> to formulate an editable 3-act outline, break it down into chapters, ground it in verified historical/scientific facts via Google Search, and auto-attach citation footnotes.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowBuildIdeaModal(true)}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md"
        >
          <span>Open Idea Builder Box</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Total Chapters</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-serif text-stone-100">{book.chapters.length}</div>
          <div className="text-[11px] text-stone-500 mt-1">{completedChapters} ready for final print</div>
        </div>

        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Manuscript Words</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-100">{totalWords.toLocaleString()}</div>
          <div className="text-[11px] text-stone-500 mt-1">Goal: {targetWords.toLocaleString()} w</div>
        </div>

        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Pacing Completion</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-100">
            {Math.min(100, Math.round((totalWords / targetWords) * 100))}%
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Based on target length</div>
        </div>

        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs font-medium mb-1">
            <span>Est. Print Pages</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          {(() => {
            const sizeProfile = BOOK_SIZE_PROFILES[book.formattingSettings?.trimSize || "6x9"];
            return (
              <>
                <div className="text-2xl font-bold font-mono text-stone-100">
                  ~{Math.max(1, Math.ceil(totalWords / sizeProfile.wordsPerPage))} pgs
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  {sizeProfile.label} {sizeProfile.dimensions} (~{sizeProfile.wordsPerPage}w/pg)
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Chapters Index (Strictly By Chapter by Default) */}
      <div className="space-y-8">
        {displayedGroups.map(([groupLabel, chapters]) => (
          <div key={groupLabel} className="space-y-3">
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-lg font-serif font-bold text-amber-300 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>{groupLabel}</span>
              </h2>
              <div className="flex items-center space-x-3">
                {hasMultipleActs && book.chapters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIndexViewMode((m) => (m === "by_chapter" ? "by_act" : "by_chapter"))}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                  >
                    {indexViewMode === "by_chapter" ? "Group by Act" : "List by Chapter"}
                  </button>
                )}
                <span className="text-xs text-stone-400 font-mono">
                  {chapters.length} {chapters.length === 1 ? "Chapter" : "Chapters"} •{" "}
                  {chapters.reduce((sum, c) => sum + (c.content ? c.content.trim().split(/\s+/).filter(Boolean).length : 0), 0).toLocaleString()}{" "}
                  words
                </span>
              </div>
            </div>

            {/* Chapter Cards */}
            <div className="grid grid-cols-1 gap-3">
              {chapters.map((ch) => {
                const globalIndex = book.chapters.findIndex((c) => c.id === ch.id);
                const currentWordCount = ch.content
                  ? ch.content.trim().split(/\s+/).filter(Boolean).length
                  : 0;
                const chapterProgress = ch.targetWords
                  ? Math.min(100, Math.round((currentWordCount / ch.targetWords) * 100))
                  : 0;

                return (
                  <div
                    key={ch.id}
                    className="p-5 rounded-2xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all shadow-sm group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Number, Title, Summary & Meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1.5 flex-wrap gap-y-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                            CH {ch.number}
                          </span>
                          <h3 className="font-serif font-bold text-base text-stone-100 truncate">
                            {ch.title}
                          </h3>
                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                              ch.status === "final"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : ch.status === "polished"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                : ch.status === "review"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {ch.status}
                          </span>
                          {ch.illustrations && ch.illustrations.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{ch.illustrations.length} Art Plates</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-300 line-clamp-2 mb-3">
                          {ch.summary || "No chapter summary defined yet."}
                        </p>

                        {/* Beats Details Pills */}
                        <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
                          {ch.pov && (
                            <span className="flex items-center space-x-1 bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700/50">
                              <User className="w-3 h-3 text-amber-400" />
                              <span>POV: {ch.pov}</span>
                            </span>
                          )}
                          {ch.setting && (
                            <span className="flex items-center space-x-1 bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700/50">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>{ch.setting}</span>
                            </span>
                          )}
                          {ch.cliffhanger && (
                            <span className="flex items-center space-x-1 bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700/50 truncate max-w-xs">
                              <Flame className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="truncate">Hook: {ch.cliffhanger}</span>
                            </span>
                          )}

                          {ch.footnotes && ch.footnotes.length > 0 && (
                            <span className="flex items-center space-x-1 bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30 text-[10px] font-mono">
                              <Bookmark className="w-3 h-3 text-amber-400" />
                              <span>{ch.footnotes.length} Footnote{ch.footnotes.length > 1 ? "s" : ""}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Word Count Metric & Actions */}
                      <div className="flex items-center space-x-4 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 border-stone-800 pt-3 lg:pt-0">
                        {/* Word count progress */}
                        <div className="text-right">
                          <div className="text-xs font-mono font-medium text-stone-200">
                            {currentWordCount.toLocaleString()} / {ch.targetWords.toLocaleString()} w
                          </div>
                          <div className="w-24 bg-stone-800 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${chapterProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Order controls */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleMoveChapter(globalIndex, "up")}
                            disabled={globalIndex === 0}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveChapter(globalIndex, "down")}
                            disabled={globalIndex === book.chapters.length - 1}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Edit metadata */}
                        <button
                          onClick={() => setEditingChapter(ch)}
                          className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                          title="Edit Chapter Blueprint"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteChapter(ch.id)}
                          className="p-2 rounded-lg bg-stone-800 hover:bg-rose-900/30 text-stone-400 hover:text-rose-400 transition-colors"
                          title="Delete Chapter"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Draft Chapter Prose with AI */}
                        <button
                          type="button"
                          onClick={() => handleDraftSingleChapter(ch)}
                          disabled={singleDraftingChapterId === ch.id || isBatchRunning}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            currentWordCount > 0
                              ? "bg-stone-800 hover:bg-stone-700 text-amber-300 border-amber-500/30"
                              : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/40"
                          } disabled:opacity-50`}
                          title="Compile full prose for this chapter using its beats and footnotes"
                        >
                          {singleDraftingChapterId === ch.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                              <span>Drafting...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>{currentWordCount > 0 ? "Re-Draft" : "Draft Prose"}</span>
                            </>
                          )}
                        </button>

                        {/* Open in Editor Button */}
                        <button
                          onClick={() => onNavigateToEditor(ch.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-all"
                        >
                          <span>Write</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {book.chapters.length === 0 && (
          <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-stone-800">
            <LayoutGrid className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <h3 className="text-lg font-serif font-bold text-stone-300">Your Manuscript Canvas is Empty</h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-6">
              Launch your narrative journey by asking Archon Vael to architect a complete chapter outline or add your first chapter manually.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowOutlineModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-medium text-sm hover:bg-amber-400 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Master Outline</span>
              </button>
              <button
                onClick={handleAddChapter}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-200 font-medium text-sm hover:bg-stone-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Chapter</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Outline Generation Modal */}
      {showOutlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">Archon Vael's Master Outliner</h3>
                  <p className="text-xs text-stone-400">Plot Architect & Narrative Blueprint Generator</p>
                </div>
              </div>
              <button
                onClick={() => setShowOutlineModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                  Story Premise & Core Conflict
                </label>
                <textarea
                  value={outlinePremise}
                  onChange={(e) => setOutlinePremise(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Describe your protagonist, central dilemma, ticking clock, antagonist forces, and stakes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Target Chapters
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={outlineTargetChapters}
                    onChange={(e) => setOutlineTargetChapters(parseInt(e.target.value) || 8)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Tone / Pacing
                  </label>
                  <input
                    type="text"
                    value={outlineTone}
                    onChange={(e) => setOutlineTone(e.target.value)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Dark Gothic, Fast-Paced Thriller"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                ⚡ <strong>Architect Note:</strong> Archon Vael will generate a multi-act blueprint complete with
                scene objectives, conflict forces, POV assignments, and cliffhanger turning points.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3 border-t border-stone-800 pt-4">
              <button
                onClick={() => setShowOutlineModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAIOutline}
                disabled={isGeneratingOutline || !outlinePremise.trim()}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all disabled:opacity-50"
              >
                {isGeneratingOutline ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Forging Structure...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Blueprint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Chapter Blueprint Drawer / Modal */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-lg bg-stone-800 text-amber-400 font-mono font-bold text-sm">
                  CH {editingChapter.number}
                </span>
                <h3 className="font-serif font-bold text-lg text-stone-100">Edit Chapter Blueprint</h3>
              </div>
              <button
                onClick={() => setEditingChapter(null)}
                className="text-stone-400 hover:text-stone-200 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Chapter Title
                  </label>
                  <input
                    type="text"
                    value={editingChapter.title}
                    onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Act Grouping
                  </label>
                  <input
                    type="text"
                    value={editingChapter.act}
                    onChange={(e) => setEditingChapter({ ...editingChapter, act: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                  Chapter Summary
                </label>
                <textarea
                  value={editingChapter.summary}
                  onChange={(e) => setEditingChapter({ ...editingChapter, summary: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-amber-500 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Scene Goal
                  </label>
                  <input
                    type="text"
                    value={editingChapter.goal}
                    onChange={(e) => setEditingChapter({ ...editingChapter, goal: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="Protagonist objective"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Conflict / Obstacle
                  </label>
                  <input
                    type="text"
                    value={editingChapter.conflict}
                    onChange={(e) => setEditingChapter({ ...editingChapter, conflict: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="Counter-force"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Ending Cliffhanger
                  </label>
                  <input
                    type="text"
                    value={editingChapter.cliffhanger}
                    onChange={(e) => setEditingChapter({ ...editingChapter, cliffhanger: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="Hook or reveal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    POV Character
                  </label>
                  <input
                    type="text"
                    value={editingChapter.pov}
                    onChange={(e) => setEditingChapter({ ...editingChapter, pov: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Setting Location
                  </label>
                  <input
                    type="text"
                    value={editingChapter.setting}
                    onChange={(e) => setEditingChapter({ ...editingChapter, setting: e.target.value })}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Target Words
                  </label>
                  <input
                    type="number"
                    value={editingChapter.targetWords}
                    onChange={(e) =>
                      setEditingChapter({ ...editingChapter, targetWords: parseInt(e.target.value) || 3000 })
                    }
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editingChapter.status}
                    onChange={(e) =>
                      setEditingChapter({
                        ...editingChapter,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="polished">Polished</option>
                    <option value="final">Final (Print Ready)</option>
                  </select>
                </div>
              </div>

              {/* Footnotes & Citations Section in Chapter Modal */}
              <div className="border-t border-stone-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chapter Footnotes & Grounded References</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = (editingChapter.footnotes?.length || 0) + 1;
                      const newFn: FootnoteReference = {
                        id: `fn-${Date.now()}`,
                        number: nextNum,
                        marker: `[^${nextNum}]`,
                        title: "New Reference",
                        sourceName: "Historical / Scientific Source",
                        description: "Add citation notes...",
                        verifiedWithGoogle: false,
                        chapterNumber: editingChapter.number,
                      };
                      setEditingChapter({
                        ...editingChapter,
                        footnotes: [...(editingChapter.footnotes || []), newFn],
                      });
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Footnote</span>
                  </button>
                </div>

                {editingChapter.footnotes && editingChapter.footnotes.length > 0 ? (
                  <div className="space-y-2">
                    {editingChapter.footnotes.map((fn, idx) => (
                      <div
                        key={fn.id || idx}
                        className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10">
                            {fn.marker || `[^${idx + 1}]`}
                          </span>
                          <input
                            type="text"
                            value={fn.title}
                            onChange={(e) => {
                              const updated = [...(editingChapter.footnotes || [])];
                              updated[idx].title = e.target.value;
                              setEditingChapter({ ...editingChapter, footnotes: updated });
                            }}
                            className="bg-transparent font-semibold text-stone-200 text-xs border-b border-transparent focus:border-amber-500 focus:outline-none flex-1 mx-2"
                            placeholder="Footnote Title"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingChapter.footnotes || []).filter((_, i) => i !== idx);
                              setEditingChapter({ ...editingChapter, footnotes: updated });
                            }}
                            className="text-stone-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={fn.description}
                          onChange={(e) => {
                            const updated = [...(editingChapter.footnotes || [])];
                            updated[idx].description = e.target.value;
                            setEditingChapter({ ...editingChapter, footnotes: updated });
                          }}
                          placeholder="Citation explanation or historical note..."
                          className="w-full bg-stone-900 border border-stone-800 rounded px-2 py-1 text-[11px] text-stone-300 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 italic">
                    No footnotes attached yet. Use the Idea Builder with Google Search Grounding to auto-generate references, or add them manually.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3 border-t border-stone-800 pt-4">
              <button
                onClick={() => setEditingChapter(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveChapterEdit(editingChapter)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Chapter Compilation Studio Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 text-stone-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">
                    Manuscript Auto-Drafting Engine
                  </h3>
                  <p className="text-xs text-stone-400">
                    Compile full narrative prose across your chapter outlines and grounded footnotes
                  </p>
                </div>
              </div>
              {!isBatchRunning && (
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-2 text-stone-400 hover:text-stone-200 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Active Batch Progress Screen */}
            {isBatchRunning ? (
              <div className="py-6 space-y-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-amber-400 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2 max-w-md">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                    Drafting Chapter {batchCurrentIndex} of {selectedBatchChapterIds.length}
                  </span>
                  <h4 className="text-base font-serif font-bold text-stone-100 line-clamp-1">
                    {batchCurrentTitle || "Synthesizing Prose..."}
                  </h4>
                  <p className="text-xs text-stone-400">
                    Pacing scene goals, weaving dialogue, and grounding facts in cited footnotes. Auto-saving each chapter to storage in real-time.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-md bg-stone-950 rounded-full h-3 p-0.5 border border-stone-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        5,
                        Math.round((batchCurrentIndex / selectedBatchChapterIds.length) * 100)
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between w-full max-w-md text-xs font-mono text-stone-400 pt-2 border-t border-stone-800/80">
                  <span>Words Generated: <strong className="text-amber-400">{batchWordsCount.toLocaleString()}</strong></span>
                  <span>Progress: {Math.round((batchCurrentIndex / selectedBatchChapterIds.length) * 100)}%</span>
                </div>

                <button
                  onClick={() => {
                    abortBatchRef.current = true;
                    setIsBatchRunning(false);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer mt-4"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Pause / Cancel Compilation</span>
                </button>
              </div>
            ) : (
              /* Selection Screen */
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-medium">
                    Select chapters to auto-draft prose for:
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBatchChapterIds(book.chapters.map((c) => c.id))}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px]"
                    >
                      Select All ({book.chapters.length})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedBatchChapterIds(
                          book.chapters.filter((c) => !c.content || c.content.trim().length === 0).map((c) => c.id)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px]"
                    >
                      Empty Only ({emptyChaptersCount})
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {book.chapters.map((ch) => {
                    const isSelected = selectedBatchChapterIds.includes(ch.id);
                    const words = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;

                    return (
                      <label
                        key={ch.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/40 text-stone-100"
                            : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBatchChapterIds([...selectedBatchChapterIds, ch.id]);
                              } else {
                                setSelectedBatchChapterIds(selectedBatchChapterIds.filter((id) => id !== ch.id));
                              }
                            }}
                            className="accent-amber-500 rounded"
                          />
                          <span className="font-mono text-stone-400 font-bold">CH {ch.number}</span>
                          <span className="font-semibold text-stone-200 truncate">{ch.title}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] shrink-0 ml-2">
                          <span className="font-mono text-stone-400">
                            {words > 0 ? `${words.toLocaleString()} w (Drafted)` : "Empty"}
                          </span>
                          {ch.footnotes && ch.footnotes.length > 0 && (
                            <span className="text-[10px] text-amber-400 font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                              {ch.footnotes.length} fn
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <p className="font-semibold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>How Archon Vael drafts your manuscript</span>
                  </p>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Each chapter is written sequentially, honoring the scene conflict, POV, target length (~{Math.round(targetWords / book.chapters.length || 2000)} words), and weaving in your grounded research citations. All drafts auto-save continuously to storage.
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-800 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartBatchCompilation()}
                    disabled={selectedBatchChapterIds.length === 0}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Zap className="w-4 h-4 text-stone-950" />
                    <span>Start Compiling {selectedBatchChapterIds.length} Chapters</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full "Build Upon My Idea" Studio Modal */}
      {showBuildIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-5xl">
            <BuildIdeaBox
              book={book}
              onApplyOutline={handleApplyIdeaOutline}
              onClose={() => setShowBuildIdeaModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
