import React, { useState, useEffect, useRef } from "react";
import {
  Feather,
  Sparkles,
  CheckCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Wand2,
  Compass,
  FileText,
  AlertCircle,
  Eye,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  Sliders,
  Type,
  SplitSquareVertical,
  Layers,
  Image as ImageIcon,
  Bookmark,
  Globe,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Share2,
  Download,
  HardDrive,
  Save,
  Upload,
  FolderOpen,
} from "lucide-react";
import { Book, Chapter, ChapterIllustration, CritiqueResult, FootnoteReference, FactVerificationResult } from "../types";
import { apiService } from "../services/api";
import {
  downloadSingleArtworkFile,
  uploadBlobToGoogleDrive,
  convertUrlToBlob,
} from "../services/googleDrive";
import { FocusModeEditor } from "./FocusModeEditor";
import { ReadabilityBadge } from "./ReadabilityBadge";
import { OriginalityMeter } from "./OriginalityMeter";
import { FootnoteVerificationSuite } from "./FootnoteVerificationSuite";
import { SubstackArticleModal } from "./SubstackArticleModal";
import { processUploadedImageFile } from "../utils/mediaProcessor";

interface ManuscriptEditorProps {
  book: Book;
  activeChapterId?: string;
  onUpdateBook: (updatedBook: Book) => void;
  onNavigateToTab: (tab: any) => void;
  autoSaveEnabled?: boolean;
  hasUnsavedChanges?: boolean;
  onManualSave?: () => void;
}

export const ManuscriptEditor: React.FC<ManuscriptEditorProps> = ({
  book,
  activeChapterId,
  onUpdateBook,
  onNavigateToTab,
  autoSaveEnabled = false,
  hasUnsavedChanges = false,
  onManualSave,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    activeChapterId || (book.chapters[0] ? book.chapters[0].id : "")
  );

  useEffect(() => {
    if (activeChapterId) {
      setSelectedChapterId(activeChapterId);
    }
  }, [activeChapterId]);

  const activeChapter = book.chapters.find((ch) => ch.id === selectedChapterId) || book.chapters[0];

  const [content, setContent] = useState(activeChapter ? activeChapter.content : "");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [sideDrawerTab, setSideDrawerTab] = useState<"beats" | "footnotes" | "codex" | "critique" | "art">("beats");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState("");
  const [aiNotification, setAiNotification] = useState<string | null>(null);

  // Footnote verification state
  const [claimToVerify, setClaimToVerify] = useState("");
  const [isVerifyingClaim, setIsVerifyingClaim] = useState(false);
  const [claimVerificationResult, setClaimVerificationResult] = useState<FactVerificationResult | null>(null);

  // Critique State
  const [critiqueResult, setCritiqueResult] = useState<CritiqueResult | null>(null);
  const [isCritiquing, setIsCritiquing] = useState(false);

  // New Illustration Modal / Generator
  const [showArtGenerator, setShowArtGenerator] = useState(false);
  const [artPrompt, setArtPrompt] = useState("");
  const [artStyle, setArtStyle] = useState("cinematic_digital");
  const [artPlacement, setArtPlacement] = useState<"header" | "inline" | "fullpage" | "tail">("header");
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [isUploadingChapterArt, setIsUploadingChapterArt] = useState(false);
  const chapterArtUploadRef = useRef<HTMLInputElement>(null);

  // Substack Article Generator State
  const [isSubstackModalOpen, setIsSubstackModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content when chapter changes
  useEffect(() => {
    if (activeChapter) {
      setContent(activeChapter.content || "");
      setCritiqueResult(null);
    }
  }, [activeChapter?.id]);

  // Handle local text update
  const handleContentChange = (newText: string) => {
    setContent(newText);
    if (!activeChapter) return;

    const count = newText.trim().split(/\s+/).filter(Boolean).length;
    const updatedChapters = book.chapters.map((ch) =>
      ch.id === activeChapter.id ? { ...ch, content: newText, wordCount: count } : ch
    );

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
  };

  // Chapter word counts & stats
  const chapterWords = content.trim().split(/\s+/).filter(Boolean).length;
  const targetWords = activeChapter?.targetWords || 3000;
  const readingTimeMins = Math.max(1, Math.ceil(chapterWords / 225));
  const chapterProgress = Math.min(100, Math.round((chapterWords / targetWords) * 100));

  // Navigation between chapters
  const currentChapterIndex = book.chapters.findIndex((c) => c.id === activeChapter?.id);
  const prevChapter = currentChapterIndex > 0 ? book.chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex < book.chapters.length - 1 ? book.chapters[currentChapterIndex + 1] : null;

  // Footnote and attribution safety metrics
  const chapterAlertCount = (activeChapter?.footnotes || []).filter(
    (fn) =>
      fn.verificationStatus === "author_attribution_alert" ||
      fn.verificationStatus === "hallucination_warning" ||
      fn.isAttributedToCurrentUser
  ).length;

  const totalBookAlertCount = book.chapters.reduce(
    (acc, ch) =>
      acc +
      (ch.footnotes || []).filter(
        (fn) =>
          fn.verificationStatus === "author_attribution_alert" ||
          fn.verificationStatus === "hallucination_warning" ||
          fn.isAttributedToCurrentUser
      ).length,
    0
  );

  // Insert formatted text at cursor
  const insertTextAtCursor = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + selected + suffix;
    const updated = content.substring(0, start) + replacement + content.substring(end);
    handleContentChange(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selected.length
        );
      }
    }, 50);
  };

  // AI Actions with Realm Masters
  const handleDraftFullChapterFromOutline = async () => {
    if (!activeChapter) return;
    setIsAiLoading(true);
    setAiLoadingMessage(`Drafting Chapter ${activeChapter.number}: ${activeChapter.title} from outline & footnotes...`);

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
          number: activeChapter.number,
          title: activeChapter.title,
          summary: activeChapter.summary,
          goal: activeChapter.goal,
          conflict: activeChapter.conflict,
          cliffhanger: activeChapter.cliffhanger,
          pov: activeChapter.pov,
          setting: activeChapter.setting,
          targetWords: activeChapter.targetWords || 2000,
          footnotes: activeChapter.footnotes || [],
        },
        allChaptersOutline: allOutlines,
        targetWordCount: activeChapter.targetWords || 2000,
      });

      if (res.text) {
        handleContentChange(res.text);
        setAiNotification(`✨ Chapter ${activeChapter.number} compiled successfully (${res.wordCount.toLocaleString()} words).`);
        setTimeout(() => setAiNotification(null), 4500);
      }
    } catch (err: any) {
      alert("Prose drafting encountered an error: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleContinueWriting = async () => {
    if (!activeChapter) return;
    setIsAiLoading(true);
    setAiLoadingMessage("Lady Seraphina (Prose Stylist) is composing the next scene...");

    try {
      const res = await apiService.writeProse({
        mode: "continue",
        chapterTitle: activeChapter.title,
        sceneBeats: activeChapter.goal + ". " + activeChapter.conflict,
        currentContent: content,
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
        },
        wordGoal: 450,
      });

      if (res.text) {
        const separator = content.endsWith("\n\n") ? "" : content.endsWith("\n") ? "\n" : "\n\n";
        const newText = content + separator + res.text.trim();
        handleContentChange(newText);
        setAiNotification("Lady Seraphina expanded your scene with lyrical momentum.");
        setTimeout(() => setAiNotification(null), 4000);
      }
    } catch (err: any) {
      alert("Prose Stylist encountered an issue: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSensoryDeepening = async () => {
    if (!activeChapter) return;
    if (!content.trim()) {
      alert("Write some prose first or ask Lady Seraphina to continue writing!");
      return;
    }
    setIsAiLoading(true);
    setAiLoadingMessage("Infusing visceral sensory textures (sight, sound, scent, atmosphere)...");

    try {
      const res = await apiService.writeProse({
        mode: "expand_sensory",
        chapterTitle: activeChapter.title,
        currentContent: content.slice(-1500),
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
        },
        instructions:
          "Take the concluding paragraphs and deeply enrich the sensory immersion, micro-tension, physical reactions, and atmospheric detail.",
        wordGoal: 300,
      });

      if (res.text) {
        const separator = "\n\n";
        const newText = content + separator + res.text.trim();
        handleContentChange(newText);
        setAiNotification("Sensory immersion infused into the manuscript.");
        setTimeout(() => setAiNotification(null), 4000);
      }
    } catch (err: any) {
      alert("Sensory expansion failed: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleShowDontTell = async () => {
    if (!activeChapter) return;
    setIsAiLoading(true);
    setAiLoadingMessage("Transforming passive exposition into active visceral drama...");

    try {
      const res = await apiService.writeProse({
        mode: "show_not_tell",
        chapterTitle: activeChapter.title,
        currentContent: content.slice(-1800),
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
        },
        instructions:
          "Convert internal explanations into dramatic action beats, physical body language, subtextual glances, and environmental resonance.",
        wordGoal: 350,
      });

      if (res.text) {
        const separator = "\n\n";
        const newText = content + separator + res.text.trim();
        handleContentChange(newText);
        setAiNotification("Show-don't-tell transformation applied.");
        setTimeout(() => setAiNotification(null), 4000);
      }
    } catch (err: any) {
      alert("Stylist action failed: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAutoTypeset = async () => {
    if (!content.trim()) return;
    setIsAiLoading(true);
    setAiLoadingMessage("Typesetting Sovereign is formatting quotes, em-dashes, and scene breaks...");

    try {
      const res = await apiService.autoFormatText({
        rawText: content,
        preset: book.formattingSettings?.fontPreset || "standard_trade",
      });

      if (res.formattedText) {
        handleContentChange(res.formattedText);
        setAiNotification("Manuscript successfully typeset to publishing standards!");
        setTimeout(() => setAiNotification(null), 4000);
      }
    } catch (err: any) {
      alert("Typesetting formatting failed: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleEditorialCritique = async () => {
    if (!activeChapter || !content.trim()) {
      alert("Please write or paste chapter content before running an editorial critique.");
      return;
    }
    setIsCritiquing(true);
    setSideDrawerTab("critique");

    try {
      const critique = await apiService.critiqueChapter({
        chapterTitle: activeChapter.title,
        content: content,
        bookContext: {
          title: book.title,
          genre: book.genre,
          tone: book.tone,
        },
      });

      setCritiqueResult(critique);
    } catch (err: any) {
      alert("Editorial critique error: " + err.message);
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleApplyLineEdit = (original: string, suggestion: string) => {
    if (content.includes(original)) {
      const updated = content.replace(original, suggestion);
      handleContentChange(updated);
      setAiNotification("Line edit applied to manuscript!");
      setTimeout(() => setAiNotification(null), 3000);
    } else {
      alert("Original phrase not found in text (it may have been modified).");
    }
  };

  // Footnote & Claim Verification Handlers
  const handleVerifyClaim = async () => {
    if (!claimToVerify.trim()) return;
    setIsVerifyingClaim(true);
    try {
      const res = await apiService.verifyFact({
        claim: claimToVerify.trim(),
        context: `${book.title} - Chapter: ${activeChapter?.title || ""}`,
      });
      setClaimVerificationResult(res);
    } catch (e: any) {
      alert("Verification error: " + e.message);
    } finally {
      setIsVerifyingClaim(false);
    }
  };

  const handleAddVerifiedFootnote = () => {
    if (!claimVerificationResult || !activeChapter) return;
    const nextNum = (activeChapter.footnotes?.length || 0) + 1;
    const newFn: FootnoteReference = {
      id: `fn-${Date.now()}`,
      number: nextNum,
      marker: `[^${nextNum}]`,
      title: claimToVerify,
      sourceName: claimVerificationResult.sources?.[0]?.title || "Google Search Grounded Reference",
      sourceUrl: claimVerificationResult.sources?.[0]?.uri || "",
      description: claimVerificationResult.explanation,
      verifiedWithGoogle: claimVerificationResult.verdict === "Verified",
      chapterNumber: activeChapter.number,
    };

    const updatedChapters = book.chapters.map((ch) =>
      ch.id === activeChapter.id
        ? { ...ch, footnotes: [...(ch.footnotes || []), newFn] }
        : ch
    );

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });

    insertTextAtCursor(` [^${nextNum}]`);
    setClaimToVerify("");
    setClaimVerificationResult(null);
    setAiNotification(`Footnote [^${nextNum}] created & citation inserted!`);
    setTimeout(() => setAiNotification(null), 3500);
  };

  const handleAddManualFootnote = (title: string, desc: string) => {
    if (!activeChapter) return;
    const nextNum = (activeChapter.footnotes?.length || 0) + 1;
    const newFn: FootnoteReference = {
      id: `fn-${Date.now()}`,
      number: nextNum,
      marker: `[^${nextNum}]`,
      title: title || "Author Citation Note",
      sourceName: "Author Reference Note",
      description: desc || "Reference note description...",
      verifiedWithGoogle: false,
      chapterNumber: activeChapter.number,
    };

    const updatedChapters = book.chapters.map((ch) =>
      ch.id === activeChapter.id
        ? { ...ch, footnotes: [...(ch.footnotes || []), newFn] }
        : ch
    );

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });

    insertTextAtCursor(` [^${nextNum}]`);
    setAiNotification(`Footnote [^${nextNum}] added to chapter.`);
    setTimeout(() => setAiNotification(null), 3000);
  };

  const handleDeleteFootnote = (fnId: string) => {
    if (!activeChapter) return;
    const updatedChapters = book.chapters.map((ch) =>
      ch.id === activeChapter.id
        ? { ...ch, footnotes: (ch.footnotes || []).filter((fn) => fn.id !== fnId) }
        : ch
    );
    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
  };

  // Generate In-Chapter Illustration
  const handleGenerateChapterIllustration = async () => {
    if (!artPrompt.trim()) return;
    setIsGeneratingArt(true);
    setAiNotification(null);

    try {
      const res = await apiService.generateIllustration({
        prompt: artPrompt,
        style: artStyle,
        aspectRatio: "16:9",
        sceneContext: `Chapter ${activeChapter?.number}: ${activeChapter?.title} in ${book.title}`,
      });

      if (!res.imageUrl) {
        throw new Error(
          "Image generation returned no visual. Please verify a billing-enabled Gemini API key is active in Settings -> Secrets."
        );
      }

      const newIllustration: ChapterIllustration = {
        id: `ill-${Date.now()}`,
        title: artPrompt.slice(0, 40),
        prompt: artPrompt,
        enhancedPrompt: res.enhancedPrompt,
        style: artStyle,
        aspectRatio: "16:9",
        imageUrl: res.imageUrl,
        caption: `Scene plate for ${activeChapter?.title}`,
        placement: artPlacement,
        sourceType: "ai_generated",
        createdAt: new Date().toISOString(),
      };

      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id === activeChapter?.id) {
          return {
            ...ch,
            illustrations: [...(ch.illustrations || []), newIllustration],
          };
        }
        return ch;
      });

      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });

      setShowArtGenerator(false);
      setArtPrompt("");
      setSideDrawerTab("art");
      setAiNotification("Art plate bound to chapter!");
      setTimeout(() => setAiNotification(null), 4000);
    } catch (err: any) {
      setAiNotification(err?.message || "Art generation failed. Check that a billing-enabled Gemini API key is active.");
      setTimeout(() => setAiNotification(null), 8000);
    } finally {
      setIsGeneratingArt(false);
    }
  };

  // Upload Illustration File(s) directly to active chapter
  const handleUploadChapterIllustrationFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChapter) return;
    const fileArray = Array.from(files);
    e.target.value = "";

    setIsUploadingChapterArt(true);
    try {
      const added: ChapterIllustration[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        const processed = await processUploadedImageFile(fileArray[i]);
        added.push({
          id: `ill-ch-up-${Date.now()}-${i}`,
          title: processed.cleanTitle,
          prompt: `Uploaded artwork (${processed.fileName})`,
          style: "uploaded_artwork",
          aspectRatio: processed.aspectRatio,
          imageUrl: processed.dataUrl,
          caption: processed.cleanTitle,
          placement: "header",
          plateType: "illustration",
          sourceType: "uploaded_file",
          fileName: processed.fileName,
          fileSizeBytes: processed.fileSizeBytes,
          mimeType: processed.mimeType,
          width: processed.width,
          height: processed.height,
          createdAt: new Date().toISOString(),
        });
      }

      const updatedChapters = book.chapters.map((ch) =>
        ch.id === activeChapter.id
          ? { ...ch, illustrations: [...(ch.illustrations || []), ...added] }
          : ch
      );

      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });
      setAiNotification(
        `Uploaded ${added.length} illustration${added.length > 1 ? "s" : ""} to Chapter ${activeChapter.number}!`
      );
      setTimeout(() => setAiNotification(null), 4000);
    } catch (err: any) {
      setAiNotification(err?.message || "Failed to upload illustration.");
      setTimeout(() => setAiNotification(null), 6000);
    } finally {
      setIsUploadingChapterArt(false);
    }
  };

  const handleDeleteChapterIllustration = (illId: string) => {
    if (!activeChapter) return;
    const updatedChapters = book.chapters.map((ch) =>
      ch.id === activeChapter.id
        ? { ...ch, illustrations: (ch.illustrations || []).filter((i) => i.id !== illId) }
        : ch
    );
    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
    setAiNotification("Illustration removed from chapter.");
    setTimeout(() => setAiNotification(null), 3000);
  };

  const handleUpdateChapterIllustrationPlacement = (
    illId: string,
    placement: ChapterIllustration["placement"]
  ) => {
    if (!activeChapter) return;
    const updatedChapters = book.chapters.map((ch) =>
      ch.id === activeChapter.id
        ? {
            ...ch,
            illustrations: (ch.illustrations || []).map((i) =>
              i.id === illId ? { ...i, placement } : i
            ),
          }
        : ch
    );
    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAttachVaultIllustrationToChapter = (vaultIll: ChapterIllustration) => {
    if (!activeChapter) return;
    const updatedVault = (book.mediaLibrary || []).filter((i) => i.id !== vaultIll.id);
    const updatedChapters = book.chapters.map((ch) =>
      ch.id === activeChapter.id
        ? { ...ch, illustrations: [...(ch.illustrations || []), vaultIll] }
        : ch
    );
    onUpdateBook({
      ...book,
      mediaLibrary: updatedVault,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
    setAiNotification(`Attached "${vaultIll.title}" to Chapter ${activeChapter.number}!`);
    setTimeout(() => setAiNotification(null), 3500);
  };

  if (!activeChapter) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-4" />
        <h2 className="text-xl font-serif font-bold text-stone-300">No Chapters in Manuscript</h2>
        <p className="text-sm text-stone-500 mb-4">Create a chapter in Chapter Builder to begin writing.</p>
        <button
          onClick={() => onNavigateToTab("outline")}
          className="px-4 py-2 bg-amber-500 text-stone-950 font-medium rounded-xl text-sm"
        >
          Open Chapter Builder
        </button>
      </div>
    );
  }

  // If Focus Mode is activated, render the distraction-free minimalist workspace
  if (isFocusMode) {
    return (
      <FocusModeEditor
        book={book}
        activeChapter={activeChapter}
        content={content}
        onContentChange={handleContentChange}
        onSelectChapter={(chapterId) => setSelectedChapterId(chapterId)}
        onExitFocusMode={() => setIsFocusMode(false)}
        onContinueWriting={handleContinueWriting}
        isAiLoading={isAiLoading}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Chapter Selection & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-stone-800">
        {/* Left: Chapter Switcher & Info */}
        <div className="flex items-center space-x-3">
          <select
            value={activeChapter.id}
            onChange={(e) => setSelectedChapterId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 font-serif font-bold text-sm sm:text-base focus:outline-none focus:border-amber-500"
          >
            {book.chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                CH {ch.number}: {ch.title}
              </option>
            ))}
          </select>

          {/* Chapter navigation arrows */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => prevChapter && setSelectedChapterId(prevChapter.id)}
              disabled={!prevChapter}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 transition-colors"
              title="Previous Chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => nextChapter && setSelectedChapterId(nextChapter.id)}
              disabled={!nextChapter}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 transition-colors"
              title="Next Chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Chapter Word Count, Reading Time, Footnote Protection, Originality & Focus Mode Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-stone-400 flex-wrap gap-y-2">
          {/* Footnote Attribution Shield Button */}
          {totalBookAlertCount > 0 ? (
            <button
              onClick={() => setSideDrawerTab("footnotes")}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 text-xs font-bold animate-pulse cursor-pointer shadow-md shadow-rose-950/40"
              title="Click to inspect and fix false author attribution citations"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{totalBookAlertCount} Attribution Alert{totalBookAlertCount > 1 ? "s" : ""}</span>
            </button>
          ) : (
            <button
              onClick={() => setSideDrawerTab("footnotes")}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs transition-colors cursor-pointer"
              title="Footnote & Citation Provenance Verifier"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Citations ({activeChapter.footnotes?.length || 0})</span>
            </button>
          )}

          {/* Compact Originality Meter Pill */}
          <button
            onClick={() => onNavigateToTab("publishing")}
            className="hover:opacity-90 transition-opacity"
            title="Click to view Originality Audit & Provenance Royalty Vault"
          >
            <OriginalityMeter compact book={book} onUpdateBook={onUpdateBook} />
          </button>

          <div className="flex items-center space-x-2 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 font-mono">
            <span className="text-stone-200 font-bold">{chapterWords.toLocaleString()}</span>
            <span>/ {targetWords.toLocaleString()} w</span>
            <span className="text-stone-500">({chapterProgress}%)</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>~{readingTimeMins} min read</span>
          </div>

          <button
            onClick={() => setIsSubstackModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-300 border border-orange-500/40 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Generate Substack Article & Deep Dive for this Chapter"
          >
            <Share2 className="w-3.5 h-3.5 text-orange-400" />
            <span>Generate Substack Article</span>
          </button>

          <button
            id="focus-mode-toggle-btn"
            onClick={() => setIsFocusMode(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-all shadow-sm cursor-pointer"
            title="Enter Distraction-Free Focus Mode (Hides sidebar and navigation, Esc to exit)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Focus Mode</span>
            <span className="text-[10px] opacity-70 font-mono hidden sm:inline px-1 py-0.2 rounded bg-amber-500/20">Esc</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Manuscript Canvas (Left/Center) + Realm Co-Pilot Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Writing Studio Canvas */}
        <div className="lg:col-span-8 space-y-4">
          {/* Formatting & Fast Co-Pilot Toolbar */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-sm">
            {/* Standard Text Formatting Helpers */}
            <div className="flex items-center space-x-1 flex-wrap gap-y-1">
              <button
                onClick={() => insertTextAtCursor("\n## ", "\n")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-serif font-bold transition-colors"
                title="Scene Heading"
              >
                H2
              </button>
              <button
                onClick={() => insertTextAtCursor("**", "**")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => insertTextAtCursor("*", "*")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs italic transition-colors"
                title="Italic"
              >
                I
              </button>
              <button
                onClick={() => insertTextAtCursor('“', '”')}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                title="Smart Dialogue Quotes"
              >
                “”
              </button>
              <button
                onClick={() => insertTextAtCursor("—")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors font-mono"
                title="Em Dash"
              >
                —
              </button>
              <button
                onClick={() => insertTextAtCursor("\n\n* * *\n\n")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                title="Scene Break Ornament"
              >
                * * *
              </button>
            </div>

            {/* Realm Masters AI Action Buttons */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <button
                type="button"
                onClick={handleDraftFullChapterFromOutline}
                disabled={isAiLoading}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Draft full prose for this chapter from outline beats and citations"
              >
                <Zap className="w-3.5 h-3.5 text-stone-950" />
                <span>{content.trim() ? "⚡ Re-Draft Chapter" : "✨ Draft Full Chapter"}</span>
              </button>

              <button
                onClick={handleContinueWriting}
                disabled={isAiLoading}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-all"
                title="Lady Seraphina writes the next scene"
              >
                <Feather className="w-3.5 h-3.5" />
                <span>Continue Scene</span>
              </button>

              <button
                onClick={() => setIsSubstackModalOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-medium transition-colors"
                title="Generate Substack Companion Article"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Substack Article</span>
              </button>

              <button
                onClick={handleSensoryDeepening}
                disabled={isAiLoading}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
                title="Deepen sensory immersion"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sensory Boost</span>
              </button>

              <button
                onClick={handleShowDontTell}
                disabled={isAiLoading}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium transition-colors"
                title="Show Don't Tell conversion"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Show Don't Tell</span>
              </button>

              <button
                onClick={handleAutoTypeset}
                disabled={isAiLoading}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition-colors"
                title="Typeset & Standardize Formatting"
              >
                <Type className="w-3.5 h-3.5" />
                <span>Auto-Typeset</span>
              </button>

              <button
                onClick={handleEditorialCritique}
                disabled={isCritiquing}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
                title="Inquisitor's Editorial Critique"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Audit & Score</span>
              </button>
            </div>
          </div>

          {/* AI Activity Notification Toast */}
          {aiNotification && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-fadeIn">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{aiNotification}</span>
              </div>
              <button
                onClick={() => setAiNotification(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* AI Loading Banner */}
          {isAiLoading && (
            <div className="p-3 rounded-xl bg-stone-900 border border-amber-500/30 text-xs flex items-center space-x-3 text-amber-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>{aiLoadingMessage}</span>
            </div>
          )}

          {/* In-Chapter Illustration Header Preview (if exists) */}
          {activeChapter.illustrations && activeChapter.illustrations.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden border border-stone-800 group shadow-lg">
              <img
                src={activeChapter.illustrations[0].imageUrl}
                alt={activeChapter.illustrations[0].title}
                className="w-full h-48 sm:h-64 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent p-4 flex flex-col justify-end">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Chapter Visual Plate • {activeChapter.illustrations[0].style}
                </div>
                <div className="text-sm font-serif text-stone-100 italic">
                  {activeChapter.illustrations[0].caption || activeChapter.illustrations[0].prompt}
                </div>
              </div>
            </div>
          )}

          {/* Main Manuscript Writing Area */}
          <div className="relative rounded-2xl bg-stone-900 border border-stone-800 p-6 sm:p-10 shadow-inner">
            {/* Chapter Heading Display */}
            <div className="text-center mb-8 border-b border-stone-800/80 pb-6">
              <div className="text-xs uppercase tracking-widest font-mono text-amber-400/80 mb-1">
                {activeChapter.act}
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
                Chapter {activeChapter.number}: {activeChapter.title}
              </h2>
              {activeChapter.setting && (
                <div className="text-xs text-stone-400 mt-1 italic">
                  Setting: {activeChapter.setting} • POV: {activeChapter.pov}
                </div>
              )}
            </div>

            {/* Writing Textarea with rich font styling */}
            {!content.trim() && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">Chapter blueprint is ready to draft</p>
                    <p className="text-stone-300 mt-0.5 line-clamp-2">
                      {activeChapter.summary || "No summary specified. You can draft directly from the outline & tone."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDraftFullChapterFromOutline}
                  disabled={isAiLoading}
                  className="shrink-0 flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Draft Full Chapter</span>
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="The scene begins here... Let the story flow, or click 'Draft Full Chapter' to generate the initial prose draft."
              rows={22}
              className="w-full bg-transparent border-0 text-stone-200 text-base sm:text-lg leading-relaxed font-serif focus:outline-none resize-y placeholder-stone-600"
              style={{
                lineHeight: "1.8",
                letterSpacing: "0.01em",
              }}
            />
          </div>

          {/* Bottom Manuscript Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    hasUnsavedChanges ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span>
                  {autoSaveEnabled
                    ? "Auto-save ON"
                    : hasUnsavedChanges
                    ? "Unsaved changes"
                    : "Saved (Auto-save OFF)"}
                </span>
                {onManualSave && hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={onManualSave}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                )}
                <span>•</span>
                <span>{content.length.toLocaleString()} characters</span>
              </div>

              <div className="hidden sm:block h-3.5 w-px bg-stone-800" />

              {/* Real-time Flesch-Kincaid Readability Indicator & 5-Session Recharts Sparkline */}
              <ReadabilityBadge content={content} chapterId={activeChapter.id} />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowArtGenerator(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-medium transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Illustrate Scene</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Realm Master Co-Pilot Drawer (5 Tabs: Beats, Citations, Codex, Critique, Art) */}
        <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
          {/* Drawer Tabs */}
          <div className="grid grid-cols-5 border-b border-stone-800 text-center bg-stone-950/60 text-[11px] font-medium">
            <button
              onClick={() => setSideDrawerTab("beats")}
              className={`py-3 transition-colors ${
                sideDrawerTab === "beats"
                  ? "text-amber-400 border-b-2 border-amber-400 bg-stone-900 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Beats
            </button>
            <button
              onClick={() => setSideDrawerTab("footnotes")}
              className={`py-3 transition-colors flex items-center justify-center space-x-1 ${
                sideDrawerTab === "footnotes"
                  ? "text-amber-400 border-b-2 border-amber-400 bg-stone-900 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Cite</span>
              {chapterAlertCount > 0 ? (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Attribution Alert" />
              ) : activeChapter.footnotes && activeChapter.footnotes.length > 0 ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : null}
            </button>
            <button
              onClick={() => setSideDrawerTab("codex")}
              className={`py-3 transition-colors ${
                sideDrawerTab === "codex"
                  ? "text-amber-400 border-b-2 border-amber-400 bg-stone-900 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Codex
            </button>
            <button
              onClick={() => setSideDrawerTab("critique")}
              className={`py-3 transition-colors flex items-center justify-center space-x-1 ${
                sideDrawerTab === "critique"
                  ? "text-amber-400 border-b-2 border-amber-400 bg-stone-900 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>Audit</span>
              {critiqueResult && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </button>
            <button
              onClick={() => setSideDrawerTab("art")}
              className={`py-3 transition-colors ${
                sideDrawerTab === "art"
                  ? "text-amber-400 border-b-2 border-amber-400 bg-stone-900 font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Art ({activeChapter.illustrations?.length || 0})
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-4 max-h-[600px] overflow-y-auto space-y-4 text-xs">
            {/* Tab 1: Beats & Blueprint */}
            {sideDrawerTab === "beats" && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase font-bold text-amber-400 mb-1">
                    Scene Objective & Goal
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-200">
                    {activeChapter.goal || "No explicit goal set."}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase font-bold text-rose-400 mb-1">
                    Central Conflict / Obstacle
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-200">
                    {activeChapter.conflict || "No obstacle specified."}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase font-bold text-amber-500 mb-1">
                    Ending Cliffhanger Hook
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-200">
                    {activeChapter.cliffhanger || "No cliffhanger assigned."}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase font-bold text-stone-400 mb-1">
                    Author Notes
                  </div>
                  <textarea
                    value={activeChapter.notes || ""}
                    onChange={(e) => {
                      const updated = book.chapters.map((ch) =>
                        ch.id === activeChapter.id ? { ...ch, notes: e.target.value } : ch
                      );
                      onUpdateBook({ ...book, chapters: updated });
                    }}
                    placeholder="Jot down continuity reminders, secret motives, or foreshadowing clues..."
                    rows={4}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* Tab: Footnotes & Citation Verification Suite */}
            {sideDrawerTab === "footnotes" && (
              <FootnoteVerificationSuite
                book={book}
                activeChapter={activeChapter}
                onUpdateBook={onUpdateBook}
                onInsertMarkerAtCursor={(marker) => insertTextAtCursor(marker)}
              />
            )}

            {/* Tab 2: World Codex Quick Reference */}
            {sideDrawerTab === "codex" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="font-semibold text-stone-300">World Elements</span>
                  <button
                    onClick={() => onNavigateToTab("codex")}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Open Codex →
                  </button>
                </div>

                {book.loreEntries.length === 0 ? (
                  <div className="text-center py-8 text-stone-500">
                    No lore entries recorded yet. Visit the World Codex tab to build your lore bible.
                  </div>
                ) : (
                  book.loreEntries.map((lore) => (
                    <div
                      key={lore.id}
                      className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-stone-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-stone-200">{lore.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                          {lore.category}
                        </span>
                      </div>
                      <p className="text-stone-400 text-[11px] line-clamp-2">{lore.description}</p>
                      {lore.secretsOrFlaws && (
                        <div className="text-[10px] text-amber-400/80 mt-1 italic">
                          Secret: {lore.secretsOrFlaws}
                        </div>
                      )}
                      <button
                        onClick={() => insertTextAtCursor(lore.name)}
                        className="mt-2 text-[10px] text-amber-400 hover:text-amber-300 font-mono"
                      >
                        + Insert Name
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Editorial Audit Results & Line Edits */}
            {sideDrawerTab === "critique" && (
              <div className="space-y-4">
                {isCritiquing ? (
                  <div className="text-center py-12 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
                    <p className="text-stone-300 font-serif">High Inquisitor Thorne is auditing your chapter...</p>
                    <p className="text-[11px] text-stone-500">Checking pacing, dialogue subtext, and line-level flow.</p>
                  </div>
                ) : critiqueResult ? (
                  <div className="space-y-4">
                    {/* Score Gauges */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400 uppercase font-mono">Readability</div>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          {critiqueResult.readabilityScore}/100
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400 uppercase font-mono">Pacing</div>
                        <div className="text-xl font-bold font-mono text-blue-400">
                          {critiqueResult.pacingScore}/100
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400 uppercase font-mono">Dialogue Tension</div>
                        <div className="text-xl font-bold font-mono text-purple-400">
                          {critiqueResult.dialogueScore}/100
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                        <div className="text-[10px] text-stone-400 uppercase font-mono">Sensory Depth</div>
                        <div className="text-xl font-bold font-mono text-amber-400">
                          {critiqueResult.sensoryScore}/100
                        </div>
                      </div>
                    </div>

                    {/* Verdict */}
                    <div className="p-3 rounded-xl bg-stone-950 border border-blue-500/30 text-stone-200">
                      <div className="text-[10px] font-mono uppercase font-bold text-blue-400 mb-1">
                        Executive Editorial Verdict
                      </div>
                      <p className="leading-relaxed">{critiqueResult.overallVerdict}</p>
                    </div>

                    {/* Line Edits */}
                    {critiqueResult.lineEdits && critiqueResult.lineEdits.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono uppercase font-bold text-stone-400">
                          Recommended Polish ({critiqueResult.lineEdits.length})
                        </div>
                        {critiqueResult.lineEdits.map((edit, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5"
                          >
                            <div className="line-through text-rose-400/80 text-[11px]">
                              "{edit.original}"
                            </div>
                            <div className="text-emerald-400 text-[11px] font-medium">
                              "{edit.suggestion}"
                            </div>
                            <div className="text-[10px] text-stone-500 italic">{edit.reason}</div>
                            <button
                              onClick={() => handleApplyLineEdit(edit.original, edit.suggestion)}
                              className="mt-1 flex items-center space-x-1 text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              <span>Apply Rewrite</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Quick Link to Full Council Suite */}
                    <div className="pt-2 border-t border-stone-800">
                      <button
                        onClick={() => onNavigateToTab("council")}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Open Full Council Polish Pipeline →</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <CheckCircle className="w-8 h-8 text-stone-600 mx-auto" />
                    <p className="text-stone-400">No active audit for this chapter.</p>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <button
                        onClick={handleEditorialCritique}
                        className="px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-medium"
                      >
                        Run Inquisitor Audit
                      </button>
                      <button
                        onClick={() => onNavigateToTab("council")}
                        className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center justify-center space-x-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Realm Council Chapter Polish</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Chapter Visual Plates & Media Controls */}
            {sideDrawerTab === "art" && (
              <div className="space-y-3">
                <input
                  ref={chapterArtUploadRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  multiple
                  onChange={handleUploadChapterIllustrationFiles}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => chapterArtUploadRef.current?.click()}
                    disabled={isUploadingChapterArt}
                    className="py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    {isUploadingChapterArt ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Upload File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowArtGenerator(true)}
                    className="py-2 px-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Generate</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToTab("art")}
                  className="w-full py-1.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 text-[11px] font-medium flex items-center justify-between transition-colors"
                >
                  <span>Open Full Illustration & Media Manager</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>

                {activeChapter.illustrations && activeChapter.illustrations.length > 0 ? (
                  activeChapter.illustrations.map((ill) => (
                    <div
                      key={ill.id}
                      className="rounded-xl overflow-hidden border border-stone-800 bg-stone-950"
                    >
                      <div className="relative">
                        <img
                          src={ill.imageUrl}
                          alt={ill.title}
                          className="w-full h-32 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteChapterIllustration(ill.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 hover:bg-rose-600 text-stone-200 hover:text-white transition-colors"
                          title="Delete illustration from chapter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2.5 space-y-1.5">
                        <div className="font-bold text-stone-200 text-xs truncate">{ill.title}</div>
                        <div className="text-[10px] text-stone-400 line-clamp-2">
                          {ill.caption || ill.prompt}
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                          <span className="text-[9px] font-mono text-stone-500 uppercase">
                            Placement:
                          </span>
                          <select
                            value={ill.placement}
                            onChange={(e) =>
                              handleUpdateChapterIllustrationPlacement(
                                ill.id,
                                e.target.value as ChapterIllustration["placement"]
                              )
                            }
                            className="rounded bg-stone-900 border border-stone-800 text-purple-300 text-[10px] font-mono px-1.5 py-0.5 focus:outline-none"
                          >
                            <option value="header">Header</option>
                            <option value="inline">Inline</option>
                            <option value="fullpage">Full Page</option>
                            <option value="tail">Tail</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-stone-500 text-xs border border-dashed border-stone-800 rounded-xl">
                    No visual plates attached to this chapter yet.
                  </div>
                )}

                {/* Quick Attach from Unassigned Media Vault */}
                {book.mediaLibrary && book.mediaLibrary.length > 0 && (
                  <div className="pt-2 border-t border-stone-800 space-y-2">
                    <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase text-sky-400 font-bold">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Media Vault ({book.mediaLibrary.length} Unassigned)</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {book.mediaLibrary.map((vIll) => (
                        <div
                          key={vIll.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <img
                              src={vIll.imageUrl}
                              alt={vIll.title}
                              className="w-9 h-9 rounded object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[11px] text-stone-200 truncate">{vIll.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAttachVaultIllustrationToChapter(vIll)}
                            className="px-2 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/40 text-sky-300 text-[10px] font-bold shrink-0"
                          >
                            + Attach
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Illustration Generator Modal */}
      {showArtGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">Grand Visualist Morgana</h3>
                  <p className="text-xs text-stone-400">Chapter Scene Illustration Forge</p>
                </div>
              </div>
              <button
                onClick={() => setShowArtGenerator(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Scene Illustration Prompt
                </label>
                <textarea
                  value={artPrompt}
                  onChange={(e) => setArtPrompt(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-purple-500 focus:outline-none"
                  placeholder="Describe the moment, atmosphere, character expressions, lighting, and composition..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">Art Style</label>
                  <select
                    value={artStyle}
                    onChange={(e) => setArtStyle(e.target.value)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-purple-500 focus:outline-none"
                  >
                    <optgroup label="Artistic Styles">
                      <option value="cinematic_digital">Cinematic Digital Art</option>
                      <option value="epic_oil_painting">Epic Fantasy Oil Painting</option>
                      <option value="gothic_woodcut">Victorian Woodcut Engraving</option>
                      <option value="storybook_watercolor">Classic Storybook Watercolor</option>
                      <option value="cyberpunk_concept">Cyberpunk / Sci-Fi Concept</option>
                      <option value="dark_charcoal">Dark Noir Charcoal Sketch</option>
                    </optgroup>
                    <optgroup label="Diagrams, Flowcharts & Tables">
                      <option value="workflow_chart">📊 Workflow & Process Flowchart</option>
                      <option value="comparison_matrix">⚖️ Comparative Analysis Table</option>
                      <option value="system_architecture">🔄 System Architecture & Network</option>
                      <option value="infographic_table">📋 Structured Infographic & Metrics</option>
                      <option value="technical_schematic">📐 Technical Blueprint & Schematic</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">Book Placement</label>
                  <select
                    value={artPlacement}
                    onChange={(e) => setArtPlacement(e.target.value as any)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="header">Chapter Top Header</option>
                    <option value="inline">Mid-Scene Plate</option>
                    <option value="fullpage">Full Page Print Plate</option>
                    <option value="tail">Chapter Tail Vignette</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3 border-t border-stone-800 pt-4">
              <button
                onClick={() => setShowArtGenerator(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateChapterIllustration}
                disabled={isGeneratingArt || !artPrompt.trim()}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-stone-100 font-bold text-xs transition-all disabled:opacity-50"
              >
                {isGeneratingArt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering Visual...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Forge Illustration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Substack Article Modal */}
      {activeChapter && (
        <SubstackArticleModal
          isOpen={isSubstackModalOpen}
          onClose={() => setIsSubstackModalOpen(false)}
          book={book}
          chapter={activeChapter}
        />
      )}
    </div>
  );
};
