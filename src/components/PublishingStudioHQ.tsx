import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Feather,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Loader2,
  Megaphone,
  MessageSquare,
  Palette,
  PenTool,
  Play,
  Send,
  UserCheck,
  AlertCircle,
  Columns3,
  Users,
} from "lucide-react";
import {
  Book,
  Chapter,
  DepartmentId,
  DepartmentStaffAgent,
  StudioDepartment,
  StudioDeliverableResult,
} from "../types";
import { STUDIO_DEPARTMENTS } from "../data/studioDepartments";
import { apiService } from "../services/api";
import { ActiveTab } from "./Navbar";
import { AgentTaskKanbanBoard } from "./AgentTaskKanbanBoard";

interface PublishingStudioHQProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onSelectTab: (tab: ActiveTab) => void;
  onNavigateToEditor: (chapterId?: string) => void;
  onOpenExportModal: () => void;
}

interface StaffChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: string;
}

type ReadinessLevel = "Ready" | "In Progress" | "Needs Setup";

interface DepartmentStatusSummary {
  level: ReadinessLevel;
  detail: string;
}

function getDepartmentIcon(id: DepartmentId) {
  switch (id) {
    case "scripting":
      return <LayoutGrid className="w-4 h-4" />;
    case "proofreading":
      return <ClipboardCheck className="w-4 h-4" />;
    case "editing":
      return <Feather className="w-4 h-4" />;
    case "illustration":
      return <ImageIcon className="w-4 h-4" />;
    case "cover_design":
      return <Palette className="w-4 h-4" />;
    case "formatting":
      return <Layers className="w-4 h-4" />;
    case "publishing_distribution":
      return <BookOpenCheck className="w-4 h-4" />;
    case "marketing":
      return <Megaphone className="w-4 h-4" />;
    default:
      return <PenTool className="w-4 h-4" />;
  }
}

function computeBookWordCount(book: Book): number {
  return (book.chapters || []).reduce((sum, ch) => {
    const words = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
    return sum + Math.max(words, ch.wordCount || 0);
  }, 0);
}

function evaluateDepartmentReadiness(
  deptId: DepartmentId,
  book: Book
): DepartmentStatusSummary {
  const chapters = book.chapters || [];
  const draftedChapters = chapters.filter(
    (ch) => (ch.content || "").trim().length > 80
  );
  const polishedChapters = chapters.filter(
    (ch) => ch.status === "polished" || ch.status === "final"
  );
  const allIllustrationsCount =
    (book.mediaLibrary?.length || 0) +
    chapters.reduce((sum, ch) => sum + (ch.illustrations?.length || 0), 0);
  const hasCover = Boolean(
    book.coverImageUrl || book.coverImage || book.frontCoverImage
  );

  switch (deptId) {
    case "scripting": {
      if (chapters.length === 0) {
        return { level: "Needs Setup", detail: "No chapters outlined" };
      }
      const outlined = chapters.filter((c) => Boolean(c.goal || c.summary)).length;
      if (outlined === chapters.length && draftedChapters.length > 0) {
        return { level: "Ready", detail: `${chapters.length} chapters mapped` };
      }
      return {
        level: "In Progress",
        detail: `${outlined}/${chapters.length} chapters beat-mapped`,
      };
    }
    case "proofreading": {
      if (draftedChapters.length === 0) {
        return { level: "Needs Setup", detail: "Draft prose required" };
      }
      const checked = chapters.filter(
        (c) => c.status === "review" || c.status === "polished" || c.status === "final"
      ).length;
      if (checked === chapters.length && chapters.length > 0) {
        return { level: "Ready", detail: `${checked} chapters proof-cleared` };
      }
      return {
        level: "In Progress",
        detail: `${draftedChapters.length} chapters ready for QA`,
      };
    }
    case "editing": {
      if (draftedChapters.length === 0) {
        return { level: "Needs Setup", detail: "No drafted chapters" };
      }
      if (polishedChapters.length === chapters.length && chapters.length > 0) {
        return { level: "Ready", detail: `All ${chapters.length} chapters polished` };
      }
      return {
        level: "In Progress",
        detail: `${polishedChapters.length}/${chapters.length} polished`,
      };
    }
    case "illustration": {
      if (allIllustrationsCount === 0) {
        return { level: "Needs Setup", detail: "0 interior plates" };
      }
      if (allIllustrationsCount >= Math.max(1, Math.min(3, chapters.length))) {
        return { level: "Ready", detail: `${allIllustrationsCount} plates in library` };
      }
      return {
        level: "In Progress",
        detail: `${allIllustrationsCount} plate(s) attached`,
      };
    }
    case "cover_design": {
      if (hasCover) {
        return { level: "Ready", detail: "Cover artwork assigned" };
      }
      return { level: "Needs Setup", detail: "Cover art not set" };
    }
    case "formatting": {
      const fmt = book.formattingSettings;
      if (fmt?.trimSize && fmt?.fontPreset && fmt?.copyrightText) {
        return {
          level: "Ready",
          detail: `${fmt.trimSize} · ${fmt.googleFontFamily || fmt.fontPreset}`,
        };
      }
      if (fmt?.trimSize) {
        return { level: "In Progress", detail: `${fmt.trimSize} trim configured` };
      }
      return { level: "Needs Setup", detail: "Interior trim unset" };
    }
    case "publishing_distribution": {
      const kit = book.publishingKit;
      const kwCount = kit?.amazonKeywords?.length || 0;
      const bisacCount = kit?.bisacCategories?.length || 0;
      if (kwCount >= 3 && bisacCount >= 1 && kit?.salesBlurb?.body) {
        return { level: "Ready", detail: `${kwCount} keywords · ${bisacCount} BISAC` };
      }
      if (kwCount > 0 || bisacCount > 0) {
        return { level: "In Progress", detail: "Metadata partial" };
      }
      return { level: "Needs Setup", detail: "Metadata & BISAC needed" };
    }
    case "marketing": {
      const kit = book.publishingKit;
      if (kit?.salesBlurb?.hook && kit?.salesBlurb?.body && kit?.marketingHook) {
        return { level: "Ready", detail: "Sales blurb & hook ready" };
      }
      if (kit?.salesBlurb?.hook || kit?.salesBlurb?.body) {
        return { level: "In Progress", detail: "Blurb drafted, expand hooks" };
      }
      return { level: "Needs Setup", detail: "Launch copy needed" };
    }
  }
}

export const PublishingStudioHQ: React.FC<PublishingStudioHQProps> = ({
  book,
  onUpdateBook,
  onSelectTab,
  onNavigateToEditor,
  onOpenExportModal,
}) => {
  const [studioView, setStudioView] = useState<"kanban" | "workbench">("kanban");
  const [activeDeptId, setActiveDeptId] = useState<DepartmentId>("scripting");
  const activeDepartment: StudioDepartment = useMemo(
    () =>
      STUDIO_DEPARTMENTS.find((d) => d.id === activeDeptId) ||
      STUDIO_DEPARTMENTS[0],
    [activeDeptId]
  );

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    STUDIO_DEPARTMENTS[0].staff[0].id
  );

  const activeStaff: DepartmentStaffAgent = useMemo(() => {
    return (
      activeDepartment.staff.find((s) => s.id === selectedStaffId) ||
      activeDepartment.staff[0]
    );
  }, [activeDepartment, selectedStaffId]);

  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    STUDIO_DEPARTMENTS[0].staff[0].tasks[0].id
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    book.chapters?.[0]?.id || ""
  );
  const [customBrief, setCustomBrief] = useState<string>("");
  const [workspaceMode, setWorkspaceMode] = useState<"deliverables" | "consult">(
    "deliverables"
  );

  const [isRunningTask, setIsRunningTask] = useState<boolean>(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [appliedDeliverableIds, setAppliedDeliverableIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const deliverablesStorageKey = `tomecrafter_studio_deliverables_${book.id}`;
  const [deliverables, setDeliverables] = useState<StudioDeliverableResult[]>(() => {
    try {
      const saved = localStorage.getItem(`tomecrafter_studio_deliverables_${book.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Reload per-book deliverable archive when active book switches
  useEffect(() => {
    try {
      const saved = localStorage.getItem(deliverablesStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDeliverables(Array.isArray(parsed) ? parsed : []);
      } else {
        setDeliverables([]);
      }
    } catch {
      setDeliverables([]);
    }
    setSelectedChapterId(book.chapters?.[0]?.id || "");
    setTaskError(null);
    setAppliedNotice(null);
  }, [book.id, deliverablesStorageKey]);

  // Persist deliverables cleanly
  useEffect(() => {
    try {
      localStorage.setItem(
        deliverablesStorageKey,
        JSON.stringify(deliverables.slice(0, 24))
      );
    } catch {
      // ignore quota issues
    }
  }, [deliverables, deliverablesStorageKey]);

  // Keep selectedStaffId & selectedTaskId synchronized with active department/staff
  const handleSelectDepartment = (deptId: DepartmentId) => {
    setActiveDeptId(deptId);
    const dept =
      STUDIO_DEPARTMENTS.find((d) => d.id === deptId) || STUDIO_DEPARTMENTS[0];
    const firstStaff = dept.staff[0];
    setSelectedStaffId(firstStaff.id);
    setSelectedTaskId(firstStaff.tasks[0]?.id || "");
    setTaskError(null);
    setAppliedNotice(null);
  };

  const handleSelectStaff = (staff: DepartmentStaffAgent) => {
    setSelectedStaffId(staff.id);
    setSelectedTaskId(staff.tasks[0]?.id || "");
    setTaskError(null);
    setAppliedNotice(null);
  };

  const handleOpenTaskInWorkbench = (
    departmentId: DepartmentId,
    staffId: string,
    taskId?: string
  ) => {
    setActiveDeptId(departmentId);
    const dept =
      STUDIO_DEPARTMENTS.find((d) => d.id === departmentId) ||
      STUDIO_DEPARTMENTS[0];
    const staff =
      dept.staff.find((s) => s.id === staffId) || dept.staff[0];
    setSelectedStaffId(staff.id);
    setSelectedTaskId(taskId || staff.tasks[0]?.id || "");
    setWorkspaceMode("deliverables");
    setStudioView("workbench");
    setTaskError(null);
    setAppliedNotice(null);
  };

  const activeTask = useMemo(() => {
    return (
      activeStaff.tasks.find((t) => t.id === selectedTaskId) ||
      activeStaff.tasks[0]
    );
  }, [activeStaff, selectedTaskId]);

  // Chat state keyed per specialist staff ID
  const [staffChats, setStaffChats] = useState<Record<string, StaffChatMessage[]>>(
    {}
  );
  const [chatInput, setChatInput] = useState<string>("");
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  const currentChatHistory: StaffChatMessage[] = useMemo(() => {
    const existing = staffChats[activeStaff.id];
    if (existing && existing.length > 0) return existing;
    return [
      {
        id: `intro-${activeStaff.id}`,
        role: "agent",
        text: `${activeStaff.name} (${activeStaff.role}, ${activeDepartment.name}) ready on "${book.title}". ${activeStaff.specialtySummary}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
  }, [staffChats, activeStaff, activeDepartment.name, book.title]);

  const totalWords = useMemo(() => computeBookWordCount(book), [book]);
  const targetWords = book.targetWordCount || 50000;
  const wordCompletionPct = Math.min(
    100,
    Math.round((totalWords / Math.max(1, targetWords)) * 100)
  );

  const departmentStatuses = useMemo(() => {
    const map: Record<DepartmentId, DepartmentStatusSummary> = {} as Record<
      DepartmentId,
      DepartmentStatusSummary
    >;
    for (const dept of STUDIO_DEPARTMENTS) {
      map[dept.id] = evaluateDepartmentReadiness(dept.id, book);
    }
    return map;
  }, [book]);

  const readyDepartmentsCount = useMemo(
    () =>
      Object.values(departmentStatuses).filter((s) => s.level === "Ready")
        .length,
    [departmentStatuses]
  );

  const selectedChapter: Chapter | undefined = useMemo(
    () => (book.chapters || []).find((c) => c.id === selectedChapterId),
    [book.chapters, selectedChapterId]
  );

  const currentDepartmentDeliverables = useMemo(
    () => deliverables.filter((d) => d.departmentId === activeDepartment.id),
    [deliverables, activeDepartment.id]
  );
  const latestDeliverable = currentDepartmentDeliverables[0] || null;

  const handleRunTask = async () => {
    if (!activeTask) return;
    setIsRunningTask(true);
    setTaskError(null);
    setAppliedNotice(null);

    try {
      const result = await apiService.runStudioDepartmentTask({
        departmentId: activeDepartment.id,
        departmentName: activeDepartment.name,
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        staffGuidance: activeStaff.systemGuidance,
        taskId: activeTask.id,
        taskLabel: activeTask.label,
        taskDescription: activeTask.description,
        applyActionType: activeTask.applyActionType,
        customBrief: customBrief.trim() || undefined,
        bookContext: {
          title: book.title,
          subtitle: book.subtitle,
          author: book.author,
          genre: book.genre,
          tone: book.tone,
          targetAudience: book.targetAudience,
          premise: book.premise,
          currentWordCount: totalWords,
          targetWordCount: targetWords,
          chapterCount: (book.chapters || []).length,
          trimSize: book.formattingSettings?.trimSize,
          fontPreset: book.formattingSettings?.fontPreset,
          googleFontFamily: book.formattingSettings?.googleFontFamily,
          hasCover: Boolean(
            book.coverImageUrl || book.coverImage || book.frontCoverImage
          ),
          illustrationsCount:
            (book.mediaLibrary?.length || 0) +
            (book.chapters || []).reduce(
              (s, c) => s + (c.illustrations?.length || 0),
              0
            ),
          salesBlurbHook: book.publishingKit?.salesBlurb?.hook,
          amazonKeywords: book.publishingKit?.amazonKeywords || [],
          chaptersSummary: (book.chapters || []).map((c) => ({
            number: c.number,
            title: c.title,
            wordCount: c.wordCount || 0,
            status: c.status,
            summary: c.summary,
          })),
        },
        chapterContext: selectedChapter
          ? {
              id: selectedChapter.id,
              number: selectedChapter.number,
              title: selectedChapter.title,
              goal: selectedChapter.goal,
              conflict: selectedChapter.conflict,
              summary: selectedChapter.summary,
              wordCount: selectedChapter.wordCount,
              content: selectedChapter.content,
            }
          : null,
      });

      setDeliverables((prev) => [result, ...prev]);
    } catch (err: any) {
      setTaskError(
        err?.message || "Unable to complete department production task."
      );
    } finally {
      setIsRunningTask(false);
    }
  };

  const handleApplyDeliverableToBook = (item: StudioDeliverableResult) => {
    const data = item.applyableData || {};
    const now = new Date().toISOString();
    let updatedBook: Book = { ...book, updatedAt: now };
    const appliedParts: string[] = [];

    // 1. Update Blurb & Marketing Hook
    if (
      data.salesBlurbHook ||
      data.salesBlurbBody ||
      data.salesBlurbCta ||
      data.marketingHook ||
      data.launchStrategy
    ) {
      updatedBook = {
        ...updatedBook,
        publishingKit: {
          ...updatedBook.publishingKit,
          salesBlurb: {
            hook:
              data.salesBlurbHook ||
              updatedBook.publishingKit?.salesBlurb?.hook ||
              "",
            body:
              data.salesBlurbBody ||
              updatedBook.publishingKit?.salesBlurb?.body ||
              "",
            callToAction:
              data.salesBlurbCta ||
              updatedBook.publishingKit?.salesBlurb?.callToAction ||
              "",
          },
          marketingHook:
            data.marketingHook || updatedBook.publishingKit?.marketingHook,
          launchStrategy:
            data.launchStrategy || updatedBook.publishingKit?.launchStrategy,
        },
      };
      appliedParts.push("Sales Blurb & Launch Copy");
    }

    // 2. Update KDP Keywords & BISAC
    if (
      (Array.isArray(data.keywords) && data.keywords.length > 0) ||
      (Array.isArray(data.bisacCategories) && data.bisacCategories.length > 0)
    ) {
      updatedBook = {
        ...updatedBook,
        publishingKit: {
          ...updatedBook.publishingKit,
          amazonKeywords:
            Array.isArray(data.keywords) && data.keywords.length > 0
              ? data.keywords.slice(0, 7)
              : updatedBook.publishingKit?.amazonKeywords || [],
          bisacCategories:
            Array.isArray(data.bisacCategories) &&
            data.bisacCategories.length > 0
              ? data.bisacCategories.slice(0, 3)
              : updatedBook.publishingKit?.bisacCategories || [],
        },
      };
      appliedParts.push("KDP Keywords & BISAC");
    }

    // 3. Update Interior Formatting Settings
    if (
      data.trimSize ||
      data.fontPreset ||
      typeof data.dropCaps === "boolean" ||
      data.sceneBreakSymbol
    ) {
      const validTrim =
        data.trimSize === "6x9" ||
        data.trimSize === "5.5x8.5" ||
        data.trimSize === "8x10" ||
        data.trimSize === "pocket"
          ? data.trimSize
          : updatedBook.formattingSettings?.trimSize || "6x9";
      const validFont =
        data.fontPreset === "garamond" ||
        data.fontPreset === "baskerville" ||
        data.fontPreset === "caslon" ||
        data.fontPreset === "merriweather" ||
        data.fontPreset === "cinzel" ||
        data.fontPreset === "courier" ||
        data.fontPreset === "inter"
          ? data.fontPreset
          : updatedBook.formattingSettings?.fontPreset || "garamond";

      updatedBook = {
        ...updatedBook,
        formattingSettings: {
          ...updatedBook.formattingSettings,
          trimSize: validTrim,
          fontPreset: validFont,
          dropCaps:
            typeof data.dropCaps === "boolean"
              ? data.dropCaps
              : updatedBook.formattingSettings?.dropCaps ?? true,
          sceneBreakSymbol:
            data.sceneBreakSymbol ||
            updatedBook.formattingSettings?.sceneBreakSymbol ||
            "* * *",
        },
      };
      appliedParts.push("Interior Formatting Specs");
    }

    // 4. Apply Publisher Imprint & Author Bio (from structured data or deliverable text)
    const markdownText = item.deliverableMarkdown || "";
    const detectedImprint =
      data.publisherImprint ||
      (markdownText.includes("Rhythm Logic Publishing")
        ? "Rhythm Logic Publishing • Red Deer, Alberta, Canada"
        : undefined);
    if (
      detectedImprint &&
      (!updatedBook.publishingKit?.publisherImprint ||
        updatedBook.publishingKit.publisherImprint === "Aether & Iron Press" ||
        Boolean(data.publisherImprint))
    ) {
      updatedBook = {
        ...updatedBook,
        publishingKit: {
          ...updatedBook.publishingKit,
          publisherImprint: detectedImprint,
        },
      };
      appliedParts.push("Publisher Imprint");
    }

    const masterAuthorBio =
      "C.W. (Cody) Germain is an independent software systems architect and founder based in Red Deer, Alberta, Canada, building cleanroom AI systems, C2PA provenance infrastructure, and equitable economic frameworks.";
    const detectedBio =
      data.authorBio ||
      (markdownText.includes("independent software systems architect")
        ? masterAuthorBio
        : undefined);
    if (
      detectedBio &&
      (!updatedBook.formattingSettings?.authorBio?.trim() ||
        updatedBook.formattingSettings.authorBio.toLowerCase().includes("speculative fiction") ||
        Boolean(data.authorBio))
    ) {
      updatedBook = {
        ...updatedBook,
        formattingSettings: {
          ...updatedBook.formattingSettings,
          authorBio: detectedBio,
        },
      };
      appliedParts.push("Author Bio");
    }

    if (data.genre) {
      updatedBook = {
        ...updatedBook,
        genre: data.genre,
      };
      appliedParts.push("Book Genre");
    }

    // 5. Update Target Chapter Notes or Append Scene Prose
    const targetChapId = item.chapterId || selectedChapterId || updatedBook.chapters?.[0]?.id;
    const fallbackNoteBody =
      appliedParts.length === 0 && !data.chapterNotes && !data.coverPrompt && !data.chapterProseAddition
        ? [
            item.executiveSummary,
            ...(item.checklist || []).map(
              (c) => `• ${c.item}: ${c.actionNote}`
            ),
            markdownText ? `\n${markdownText.slice(0, 2400)}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "";

    const effectiveChapterNotes = data.chapterNotes || fallbackNoteBody;

    if (
      targetChapId &&
      (effectiveChapterNotes || data.coverPrompt || data.chapterProseAddition)
    ) {
      updatedBook = {
        ...updatedBook,
        chapters: (updatedBook.chapters || []).map((ch) => {
          if (ch.id !== targetChapId) return ch;
          const noteAppend = [
            effectiveChapterNotes
              ? `[${item.staffName} — ${item.taskLabel}]\n${effectiveChapterNotes}`
              : "",
            data.coverPrompt ? `[Visual Prompt]\n${data.coverPrompt}` : "",
          ]
            .filter(Boolean)
            .join("\n\n");

          const nextNotes = noteAppend
            ? ch.notes
              ? `${ch.notes}\n\n${noteAppend}`
              : noteAppend
            : ch.notes;

          let nextContent = ch.content || "";
          let nextWordCount = ch.wordCount || 0;
          if (data.chapterProseAddition && data.chapterProseAddition.trim()) {
            nextContent = nextContent.trim()
              ? `${nextContent.trim()}\n\n${data.chapterProseAddition.trim()}`
              : data.chapterProseAddition.trim();
            nextWordCount = nextContent.trim().split(/\s+/).filter(Boolean).length;
          }

          return {
            ...ch,
            notes: nextNotes,
            content: nextContent,
            wordCount: nextWordCount,
          };
        }),
      };

      updatedBook.currentWordCount = computeBookWordCount(updatedBook);
      if (data.chapterProseAddition) {
        appliedParts.push("Chapter Scene Draft");
      } else {
        appliedParts.push("Production Notes");
      }
    }

    if (appliedParts.length > 0) {
      onUpdateBook(updatedBook);
      setAppliedDeliverableIds((prev) => ({ ...prev, [item.id]: true }));
      setAppliedNotice(`Applied to "${book.title}": ${appliedParts.join(", ")}`);
    }
  };

  const handleSendChat = async (overrideMessage?: string) => {
    const text = (overrideMessage ?? chatInput).trim();
    if (!text || isSendingChat) return;

    const userMsg: StaffChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextHistory = [...currentChatHistory, userMsg];
    setStaffChats((prev) => ({
      ...prev,
      [activeStaff.id]: nextHistory,
    }));
    if (!overrideMessage) setChatInput("");
    setIsSendingChat(true);

    try {
      const res = await apiService.chatWithAgent({
        agentId: activeStaff.leadAgentId,
        staffAgent: {
          id: activeStaff.id,
          name: activeStaff.name,
          role: activeStaff.role,
          departmentName: activeDepartment.name,
          systemGuidance: activeStaff.systemGuidance,
        },
        message: text,
        bookContext: {
          title: book.title,
          subtitle: book.subtitle,
          author: book.author,
          genre: book.genre,
          premise: book.premise,
          tone: book.tone,
          currentWordCount: totalWords,
          targetWordCount: targetWords,
        },
        chapterContext: selectedChapter
          ? {
              title: selectedChapter.title,
              goal: selectedChapter.goal,
              summary: selectedChapter.summary,
              content: selectedChapter.content,
            }
          : undefined,
        chatHistory: nextHistory.slice(-8).map((m) => ({
          role: m.role,
          text: m.text,
        })),
      });

      const replyMsg: StaffChatMessage = {
        id: `a-${Date.now()}`,
        role: "agent",
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setStaffChats((prev) => ({
        ...prev,
        [activeStaff.id]: [...nextHistory, replyMsg],
      }));
    } catch (err: any) {
      const errorMsg: StaffChatMessage = {
        id: `err-${Date.now()}`,
        role: "agent",
        text: `Unable to reach ${activeStaff.name}: ${err?.message || "Connection error"}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setStaffChats((prev) => ({
        ...prev,
        [activeStaff.id]: [...nextHistory, errorMsg],
      }));
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const canApplyDeliverable = (d?: StudioDeliverableResult | null): boolean => {
    if (!d) return false;
    return Boolean(
      d.applyableData ||
        d.deliverableMarkdown?.trim() ||
        d.executiveSummary?.trim() ||
        (d.checklist && d.checklist.length > 0)
    );
  };

  return (
    <div className="space-y-6">
      {/* Studio Operations Header */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-amber-400">
              <span>Publishing House Operations</span>
              <span className="text-stone-600">·</span>
              <span className="text-stone-400">8 Departments</span>
              <span className="text-stone-600">·</span>
              <span className="text-stone-400">24 Staff Specialists</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 mt-1">
              {book.title} — Production Studio
            </h1>
            <p className="text-sm text-stone-400 mt-1 max-w-2xl">
              Coordinate scripting, proofreading, editorial craft, illustration, cover design, interior formatting, distribution, and launch marketing from one production floor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onSelectTab("outline")}
              className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors flex items-center space-x-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>Chapter Builder</span>
            </button>
            <button
              onClick={() => onNavigateToEditor(selectedChapter?.id)}
              className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors flex items-center space-x-1.5"
            >
              <Feather className="w-3.5 h-3.5 text-amber-400" />
              <span>Manuscript Editor</span>
            </button>
            <button
              onClick={onOpenExportModal}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Package</span>
            </button>
          </div>
        </div>

        {/* Deterministic Studio Production KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-stone-800">
          <div className="px-3.5 py-3 rounded-lg bg-stone-950 border border-stone-800">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
              Manuscript Progress
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-mono font-semibold tabular-nums text-stone-100">
                {totalWords.toLocaleString()}
              </span>
              <span className="text-xs font-mono tabular-nums text-amber-400">
                {wordCompletionPct}% of {targetWords.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-3 rounded-lg bg-stone-950 border border-stone-800">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
              Chapters Structured
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-mono font-semibold tabular-nums text-stone-100">
                {(book.chapters || []).length}
              </span>
              <span className="text-xs font-mono tabular-nums text-stone-400">
                {(book.chapters || []).filter((c) => (c.content || "").trim().length > 80).length} drafted
              </span>
            </div>
          </div>

          <div className="px-3.5 py-3 rounded-lg bg-stone-950 border border-stone-800">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
              Departments Ready
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-mono font-semibold tabular-nums text-stone-100">
                {readyDepartmentsCount} / {STUDIO_DEPARTMENTS.length}
              </span>
              <span className="text-xs font-mono tabular-nums text-stone-400">
                Live book audit
              </span>
            </div>
          </div>

          <div className="px-3.5 py-3 rounded-lg bg-stone-950 border border-stone-800">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
              Studio Deliverables
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-mono font-semibold tabular-nums text-stone-100">
                {deliverables.length}
              </span>
              <span className="text-xs font-mono text-stone-400">
                Saved for book
              </span>
            </div>
          </div>
        </div>

        {/* Studio Workspace Switcher: Agent Task Dashboard (Kanban) vs Department Workbench */}
        <div className="mt-5 pt-4 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 rounded-lg bg-stone-950 border border-stone-800 self-start">
            <button
              onClick={() => setStudioView("kanban")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-2 ${
                studioView === "kanban"
                  ? "bg-amber-500 text-stone-950 font-semibold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Agent Task Dashboard</span>
            </button>
            <button
              onClick={() => setStudioView("workbench")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-2 ${
                studioView === "workbench"
                  ? "bg-amber-500 text-stone-950 font-semibold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Department Workbench</span>
            </button>
          </div>

          <div className="text-xs text-stone-400">
            {studioView === "kanban"
              ? "Drag cards or step stages across departments to track production status and pending tasks."
              : `Active team: ${activeDepartment.name} · ${activeStaff.name}`}
          </div>
        </div>
      </section>

      {studioView === "kanban" ? (
        <AgentTaskKanbanBoard
          book={book}
          deliverables={deliverables}
          onRunTaskInWorkbench={handleOpenTaskInWorkbench}
          onSelectTab={onSelectTab}
        />
      ) : (
      /* Main Production Floor: 8-Department Directory + Active Workbench */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Directory: All 8 Publishing Departments */}
        <aside className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-xl p-3 space-y-1.5">
          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-stone-400">
            <span>Publishing Departments</span>
            <span>Status</span>
          </div>

          {STUDIO_DEPARTMENTS.map((dept, index) => {
            const isSelected = dept.id === activeDepartment.id;
            const status = departmentStatuses[dept.id];
            const statusColor =
              status.level === "Ready"
                ? "text-emerald-400"
                : status.level === "In Progress"
                ? "text-amber-400"
                : "text-stone-500";

            return (
              <button
                key={dept.id}
                onClick={() => handleSelectDepartment(dept.id)}
                className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-stone-950 border-amber-500/60"
                    : "bg-transparent border-transparent hover:bg-stone-950/60 hover:border-stone-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <span
                      className={`mt-0.5 shrink-0 ${
                        isSelected ? "text-amber-400" : "text-stone-400"
                      }`}
                    >
                      {getDepartmentIcon(dept.id)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-stone-100 truncate">
                        <span className="font-mono text-xs text-stone-500 mr-1.5 tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {dept.name}
                      </div>
                      <div className="text-xs text-stone-400 truncate mt-0.5">
                        {dept.staff.length} specialists · {status.detail}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-mono shrink-0 mt-0.5 ${statusColor}`}
                  >
                    {status.level}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Workbench: Department Workflows, 3 Staff Specialists, Deliverables & Consultation */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Department Header & Essential Workflow */}
          <section className="bg-stone-900 border border-stone-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-amber-400">
                  {getDepartmentIcon(activeDepartment.id)}
                  <span className="uppercase tracking-wider">
                    {activeDepartment.leadTitle}
                  </span>
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-100 mt-1">
                  {activeDepartment.name}
                </h2>
                <p className="text-sm text-stone-400 mt-1">
                  {activeDepartment.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    onSelectTab(activeDepartment.primaryTab as ActiveTab)
                  }
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors flex items-center space-x-1.5"
                >
                  <span>Open {activeDepartment.primaryTabLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                {activeDepartment.secondaryTab && (
                  <button
                    onClick={() =>
                      onSelectTab(activeDepartment.secondaryTab as ActiveTab)
                    }
                    className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors flex items-center space-x-1.5"
                  >
                    <span>{activeDepartment.secondaryTabLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Numbered Essential Workflow */}
            <div className="mt-4 pt-4 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeDepartment.essentialWorkflowSteps.map((step, i) => (
                <div key={i} className="text-xs text-stone-300 leading-relaxed">
                  <span className="font-mono text-amber-400 mr-1.5">
                    0{i + 1}.
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </section>

          {/* Department Staff Roster (3 Experts per Department) */}
          <section className="bg-stone-900 border border-stone-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-stone-400">
                Department Staff Roster — Select Specialist
              </h3>
              <span className="text-xs text-stone-500 font-mono">
                {activeDepartment.staff.length} Experts Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeDepartment.staff.map((staff) => {
                const isStaffActive = staff.id === activeStaff.id;
                return (
                  <button
                    key={staff.id}
                    onClick={() => handleSelectStaff(staff)}
                    className={`text-left p-3.5 rounded-lg border transition-colors ${
                      isStaffActive
                        ? "bg-stone-950 border-amber-500/70"
                        : "bg-stone-950/60 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif font-semibold text-sm text-stone-100 truncate">
                        {staff.name}
                      </span>
                      {isStaffActive && (
                        <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-amber-400 mt-0.5 truncate">
                      {staff.role}
                    </div>
                    <p className="text-xs text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                      {staff.specialtySummary}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-stone-800/80 text-[11px] text-stone-500 truncate">
                      {staff.deliverables.join(" · ")}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Active Specialist Workbench: Deliverable Runner vs Team Consultation */}
          <section className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
            {/* Sub-mode switcher bar */}
            <div className="px-5 py-3.5 bg-stone-950 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-serif font-bold text-stone-100">
                  {activeStaff.name}
                  <span className="font-sans font-normal text-stone-400 text-xs ml-2">
                    {activeStaff.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-stone-900 border border-stone-800 rounded-lg p-1 self-start sm:self-auto">
                <button
                  onClick={() => setWorkspaceMode("deliverables")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                    workspaceMode === "deliverables"
                      ? "bg-amber-500 text-stone-950 font-semibold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Production Deliverable</span>
                </button>
                <button
                  onClick={() => setWorkspaceMode("consult")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                    workspaceMode === "consult"
                      ? "bg-amber-500 text-stone-950 font-semibold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Direct Consultation</span>
                </button>
              </div>
            </div>

            {workspaceMode === "deliverables" ? (
              <div className="p-5 space-y-5">
                {/* Task Configuration Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                      Workflow Task
                    </label>
                    <select
                      value={activeTask?.id || ""}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                    >
                      {activeStaff.tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.label}
                        </option>
                      ))}
                    </select>
                    {activeTask && (
                      <p className="text-xs text-stone-400 mt-1.5">
                        {activeTask.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                      Target Chapter Context
                    </label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      disabled={(book.chapters || []).length === 0}
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    >
                      {(book.chapters || []).length === 0 ? (
                        <option value="">Whole Book (No Chapters Yet)</option>
                      ) : (
                        <>
                          <option value="">Whole Manuscript Overview</option>
                          {(book.chapters || []).map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              Ch {ch.number}: {ch.title} ({ch.wordCount || 0}w)
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <p className="text-xs text-stone-500 mt-1.5">
                      {activeTask?.targetScope === "chapter"
                        ? "Chapter excerpt and beats will be inspected directly."
                        : "Analyzes manuscript-wide structure and metadata."}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                    Brief / Creative Direction (Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={customBrief}
                      onChange={(e) => setCustomBrief(e.target.value)}
                      placeholder={`E.g. Focus on ${activeDepartment.shortLabel.toLowerCase()} priorities for "${book.title}"...`}
                      className="flex-1 px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={handleRunTask}
                      disabled={isRunningTask}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 shrink-0"
                    >
                      {isRunningTask ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Producing Deliverable...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Run Specialist Deliverable</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {taskError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{taskError}</span>
                  </div>
                )}

                {appliedNotice && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{appliedNotice}</span>
                  </div>
                )}

                {/* Latest Deliverable Result */}
                {latestDeliverable ? (
                  <div className="pt-4 border-t border-stone-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-mono text-stone-400">
                          {latestDeliverable.staffName} ·{" "}
                          {latestDeliverable.taskLabel}
                          {latestDeliverable.chapterTitle
                            ? ` · ${latestDeliverable.chapterTitle}`
                            : ""}
                        </div>
                        <h4 className="text-base font-serif font-bold text-stone-100 mt-0.5">
                          {latestDeliverable.title}
                        </h4>
                        <p className="text-sm text-stone-300 mt-1">
                          {latestDeliverable.executiveSummary}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {canApplyDeliverable(latestDeliverable) && (
                          <button
                            onClick={() =>
                              handleApplyDeliverableToBook(latestDeliverable)
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-semibold text-xs transition-colors flex items-center space-x-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {appliedDeliverableIds[latestDeliverable.id]
                                ? "Changes Applied"
                                : "Apply Changes"}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleCopy(
                              latestDeliverable.id,
                              latestDeliverable.deliverableMarkdown
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors flex items-center space-x-1.5"
                        >
                          {copiedId === latestDeliverable.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* QA Checklist */}
                    {latestDeliverable.checklist.length > 0 && (
                      <div className="divide-y divide-stone-800 border border-stone-800 rounded-lg bg-stone-950">
                        {latestDeliverable.checklist.map((c, idx) => (
                          <div
                            key={idx}
                            className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-medium text-stone-200">
                                {c.item}
                              </div>
                              <div className="text-stone-400 mt-0.5">
                                {c.actionNote}
                              </div>
                            </div>
                            <span
                              className={`font-mono uppercase text-[10px] shrink-0 mt-0.5 ${
                                c.status === "pass"
                                  ? "text-emerald-400"
                                  : c.status === "action_needed"
                                  ? "text-rose-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {c.status.replace("_", " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Deliverable Output */}
                    <div className="p-4 rounded-lg bg-stone-950 border border-stone-800 text-sm text-stone-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {latestDeliverable.deliverableMarkdown}
                    </div>

                    {/* Action Bar After Manuscript / Deliverable Output */}
                    {canApplyDeliverable(latestDeliverable) && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <span className="text-xs text-stone-400">
                          {appliedDeliverableIds[latestDeliverable.id]
                            ? `Updates synced to "${book.title}". Remember to save or enable Auto-Save.`
                            : `Apply these recommendations and notes directly to "${book.title}".`}
                        </span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() =>
                              handleCopy(
                                latestDeliverable.id,
                                latestDeliverable.deliverableMarkdown
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors flex items-center space-x-1.5"
                          >
                            {copiedId === latestDeliverable.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Output</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleApplyDeliverableToBook(latestDeliverable)
                            }
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-semibold text-xs transition-colors flex items-center space-x-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {appliedDeliverableIds[latestDeliverable.id]
                                ? "Re-Apply Changes"
                                : "Apply Changes"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-stone-950 border border-stone-800 text-center text-xs text-stone-400">
                    Select a specialist task above and run it to generate a department deliverable for{" "}
                    <span className="text-stone-200 font-medium">
                      "{book.title}"
                    </span>
                    .
                  </div>
                )}

                {/* Previous Deliverables in This Department */}
                {currentDepartmentDeliverables.length > 1 && (
                  <div className="pt-3 border-t border-stone-800">
                    <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">
                      Recent {activeDepartment.shortLabel} Deliverables
                    </div>
                    <div className="space-y-1.5">
                      {currentDepartmentDeliverables.slice(1, 4).map((hist) => (
                        <div
                          key={hist.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-xs"
                        >
                          <div className="truncate mr-3">
                            <span className="text-stone-200 font-medium">
                              {hist.title}
                            </span>
                            <span className="text-stone-500 ml-2">
                              {hist.staffName}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleCopy(hist.id, hist.deliverableMarkdown)
                            }
                            className="text-amber-400 hover:text-amber-300 shrink-0 font-mono text-[11px]"
                          >
                            {copiedId === hist.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Direct Specialist Consultation Chat */
              <div className="flex flex-col h-[520px]">
                {/* Quick Prompt Starters */}
                <div className="px-4 py-2.5 bg-stone-950/70 border-b border-stone-800 flex items-center space-x-2 overflow-x-auto scrollbar-none">
                  <span className="text-[11px] font-mono uppercase text-stone-500 shrink-0">
                    Quick Briefs:
                  </span>
                  {activeStaff.promptStarters.map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(starter)}
                      disabled={isSendingChat}
                      className="text-xs whitespace-nowrap px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 border border-stone-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {starter}
                    </button>
                  ))}
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                  {currentChatHistory.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="text-[11px] text-stone-500 mb-1 flex items-center space-x-2">
                          <span>{isUser ? "Author" : activeStaff.name}</span>
                          <span>·</span>
                          <span className="font-mono">{msg.timestamp}</span>
                        </div>
                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 rounded-lg text-sm whitespace-pre-wrap leading-relaxed border ${
                            isUser
                              ? "bg-amber-500/10 border-amber-500/30 text-stone-100"
                              : "bg-stone-950 border-stone-800 text-stone-200"
                          }`}
                        >
                          {msg.text}
                          {!isUser && (
                            <div className="mt-2 pt-2 border-t border-stone-800/80 flex justify-end">
                              <button
                                onClick={() => handleCopy(msg.id, msg.text)}
                                className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center space-x-1"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isSendingChat && (
                    <div className="flex items-center space-x-2 text-xs text-stone-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>{activeStaff.name} is drafting a response...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="p-3 bg-stone-950 border-t border-stone-800 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask ${activeStaff.name} (${activeStaff.role})...`}
                    disabled={isSendingChat}
                    className="flex-1 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isSendingChat || !chatInput.trim()}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors disabled:opacity-50 flex items-center space-x-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
      )}
    </div>
  );
};
