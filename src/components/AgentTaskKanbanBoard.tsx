import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Feather,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Megaphone,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Book,
  CustomStudioTask,
  DepartmentId,
  DepartmentStaffAgent,
  DepartmentTaskDefinition,
  KanbanColumnId,
  StudioDepartment,
  StudioDeliverableResult,
} from "../types";
import { STUDIO_DEPARTMENTS } from "../data/studioDepartments";
import { ActiveTab } from "./Navbar";

interface AgentTaskKanbanBoardProps {
  book: Book;
  deliverables: StudioDeliverableResult[];
  onRunTaskInWorkbench: (
    departmentId: DepartmentId,
    staffId: string,
    taskId?: string
  ) => void;
  onSelectTab: (tab: ActiveTab) => void;
}

interface KanbanCardItem {
  id: string;
  departmentId: DepartmentId;
  departmentName: string;
  departmentShortLabel: string;
  primaryTab: string;
  primaryTabLabel: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  taskId?: string;
  title: string;
  description: string;
  column: KanbanColumnId;
  isManualOverride: boolean;
  isCustom: boolean;
  progressPct: number;
  progressText: string;
  pendingItems: string[];
  deliverableCount: number;
}

const KANBAN_COLUMNS: {
  id: KanbanColumnId;
  title: string;
  subtitle: string;
  accentClass: string;
}[] = [
  {
    id: "pending",
    title: "Pending",
    subtitle: "Queued or awaiting prerequisites",
    accentClass: "text-stone-300",
  },
  {
    id: "in_progress",
    title: "In Progress",
    subtitle: "Active drafting or production",
    accentClass: "text-amber-400",
  },
  {
    id: "review",
    title: "Review & QA",
    subtitle: "Deliverables ready for sign-off",
    accentClass: "text-sky-400",
  },
  {
    id: "completed",
    title: "Completed",
    subtitle: "Verified & studio-ready",
    accentClass: "text-emerald-400",
  },
];

function getDeptIcon(id: DepartmentId) {
  switch (id) {
    case "scripting":
      return <LayoutGrid className="w-3.5 h-3.5" />;
    case "proofreading":
      return <ClipboardCheck className="w-3.5 h-3.5" />;
    case "editing":
      return <Feather className="w-3.5 h-3.5" />;
    case "illustration":
      return <ImageIcon className="w-3.5 h-3.5" />;
    case "cover_design":
      return <Palette className="w-3.5 h-3.5" />;
    case "formatting":
      return <Layers className="w-3.5 h-3.5" />;
    case "publishing_distribution":
      return <BookOpenCheck className="w-3.5 h-3.5" />;
    case "marketing":
      return <Megaphone className="w-3.5 h-3.5" />;
  }
}

function evaluateTaskFromBookState(
  dept: StudioDepartment,
  staff: DepartmentStaffAgent,
  task: DepartmentTaskDefinition,
  book: Book,
  taskDeliverables: StudioDeliverableResult[]
): {
  autoColumn: KanbanColumnId;
  progressPct: number;
  progressText: string;
  pendingItems: string[];
} {
  const chapters = book.chapters || [];
  const totalChapters = chapters.length;
  const outlinedChapters = chapters.filter((c) => Boolean(c.goal || c.summary));
  const draftedChapters = chapters.filter((c) => (c.content || "").trim().length > 80);
  const reviewOrHigherChapters = chapters.filter(
    (c) => c.status === "review" || c.status === "polished" || c.status === "final"
  );
  const polishedChapters = chapters.filter(
    (c) => c.status === "polished" || c.status === "final"
  );
  const finalChapters = chapters.filter((c) => c.status === "final");
  const platesCount =
    (book.mediaLibrary?.length || 0) +
    chapters.reduce((sum, c) => sum + (c.illustrations?.length || 0), 0);
  const hasCover = Boolean(
    book.coverImageUrl || book.coverImage || book.frontCoverImage
  );
  const fmt = book.formattingSettings;
  const kit = book.publishingKit;
  const hasDeliverable = taskDeliverables.length > 0;
  const pendingItems: string[] = [];

  switch (task.id) {
    case "script-beat-sheet":
    case "script-arc-audit": {
      if (totalChapters === 0) {
        pendingItems.push("Outline initial chapters in Chapter Builder");
        return {
          autoColumn: hasDeliverable ? "review" : "pending",
          progressPct: hasDeliverable ? 40 : 0,
          progressText: "0 chapters outlined",
          pendingItems,
        };
      }
      const pct = Math.round((outlinedChapters.length / totalChapters) * 100);
      if (outlinedChapters.length < totalChapters) {
        pendingItems.push(
          `${totalChapters - outlinedChapters.length} chapter(s) missing goal or summary`
        );
      }
      if (hasDeliverable && outlinedChapters.length === totalChapters) {
        return {
          autoColumn: "completed",
          progressPct: 100,
          progressText: `${outlinedChapters.length}/${totalChapters} chapters beat-mapped`,
          pendingItems,
        };
      }
      return {
        autoColumn: hasDeliverable
          ? "review"
          : outlinedChapters.length === totalChapters
          ? "completed"
          : "in_progress",
        progressPct: pct,
        progressText: `${outlinedChapters.length}/${totalChapters} chapters beat-mapped`,
        pendingItems,
      };
    }

    case "script-draft-scene":
    case "script-hook-variants": {
      if (totalChapters === 0) {
        pendingItems.push("Create at least 1 chapter first");
        return {
          autoColumn: "pending",
          progressPct: 0,
          progressText: "0 scenes drafted",
          pendingItems,
        };
      }
      const pct = Math.round((draftedChapters.length / totalChapters) * 100);
      if (draftedChapters.length < totalChapters) {
        pendingItems.push(
          `${totalChapters - draftedChapters.length} chapter(s) still need prose`
        );
      }
      return {
        autoColumn:
          draftedChapters.length === totalChapters
            ? "completed"
            : hasDeliverable
            ? "review"
            : draftedChapters.length > 0
            ? "in_progress"
            : "pending",
        progressPct: pct,
        progressText: `${draftedChapters.length}/${totalChapters} chapters drafted`,
        pendingItems,
      };
    }

    case "script-audio-prep":
    case "script-podcast-pitch": {
      if (draftedChapters.length === 0) {
        pendingItems.push("Draft chapter prose before narration prep");
      }
      if (!hasDeliverable) {
        pendingItems.push("Generate narration cue sheet or audio treatment");
      }
      return {
        autoColumn:
          hasDeliverable && draftedChapters.length > 0
            ? "review"
            : draftedChapters.length > 0
            ? "in_progress"
            : "pending",
        progressPct: hasDeliverable ? 75 : draftedChapters.length > 0 ? 35 : 0,
        progressText: hasDeliverable
          ? `${taskDeliverables.length} cue sheet(s) generated`
          : `${draftedChapters.length} chapters eligible`,
        pendingItems,
      };
    }

    case "proof-chapter-sweep":
    case "proof-tense-audit":
    case "proof-continuity-scan":
    case "proof-canon-bible": {
      if (draftedChapters.length === 0) {
        pendingItems.push("No drafted text available to proofread");
        return {
          autoColumn: "pending",
          progressPct: 0,
          progressText: "0 chapters drafted",
          pendingItems,
        };
      }
      const unproofed = totalChapters - reviewOrHigherChapters.length;
      if (unproofed > 0) {
        pendingItems.push(`${unproofed} chapter(s) still in draft status`);
      }
      if (!hasDeliverable && unproofed > 0) {
        pendingItems.push("Run specialist proofing or continuity sweep");
      }
      const pct = Math.round(
        (reviewOrHigherChapters.length / Math.max(1, totalChapters)) * 100
      );
      return {
        autoColumn:
          unproofed === 0
            ? "completed"
            : hasDeliverable
            ? "review"
            : "in_progress",
        progressPct: pct,
        progressText: `${reviewOrHigherChapters.length}/${totalChapters} in review or higher`,
        pendingItems,
      };
    }

    case "proof-style-sheet":
    case "proof-citation-qa": {
      const footnotesTotal = chapters.reduce(
        (sum, c) => sum + (c.footnotes?.length || 0),
        0
      );
      if (!hasDeliverable) {
        pendingItems.push("Generate book House Style Sheet");
      }
      if (footnotesTotal === 0 && draftedChapters.length === 0) {
        pendingItems.push("Draft chapters or add footnotes to verify");
      }
      return {
        autoColumn: hasDeliverable ? "review" : draftedChapters.length > 0 ? "in_progress" : "pending",
        progressPct: hasDeliverable ? 80 : draftedChapters.length > 0 ? 30 : 0,
        progressText: `${footnotesTotal} footnotes · ${hasDeliverable ? "Style sheet ready" : "No style sheet"}`,
        pendingItems,
      };
    }

    case "edit-dev-letter":
    case "edit-chapter-diag":
    case "edit-line-pass":
    case "edit-style-guide":
    case "edit-voice-audit":
    case "edit-cast-voices": {
      if (draftedChapters.length === 0) {
        pendingItems.push("Draft chapter prose to begin editing");
        return {
          autoColumn: "pending",
          progressPct: 0,
          progressText: "0 chapters drafted",
          pendingItems,
        };
      }
      const unpolished = totalChapters - polishedChapters.length;
      if (unpolished > 0) {
        pendingItems.push(`${unpolished} chapter(s) awaiting polished status`);
      }
      const pct = Math.round(
        (polishedChapters.length / Math.max(1, totalChapters)) * 100
      );
      return {
        autoColumn:
          unpolished === 0
            ? "completed"
            : hasDeliverable
            ? "review"
            : polishedChapters.length > 0
            ? "in_progress"
            : "in_progress",
        progressPct: pct,
        progressText: `${polishedChapters.length}/${totalChapters} chapters polished`,
        pendingItems,
      };
    }

    case "art-visual-bible":
    case "art-chapter-plan":
    case "art-scene-prompt":
    case "art-character-sheets":
    case "art-diagram-spec":
    case "art-map-brief": {
      if (platesCount === 0 && !hasDeliverable) {
        pendingItems.push("No plates in Illustration Manager yet");
        return {
          autoColumn: "pending",
          progressPct: 0,
          progressText: "0 illustrations",
          pendingItems,
        };
      }
      const targetPlates = Math.max(1, Math.min(4, totalChapters || 2));
      const pct = Math.min(100, Math.round((platesCount / targetPlates) * 100));
      if (platesCount < targetPlates) {
        pendingItems.push(
          `Add ${targetPlates - platesCount} more illustration(s) in Art Studio`
        );
      }
      return {
        autoColumn:
          platesCount >= targetPlates
            ? "completed"
            : hasDeliverable
            ? "review"
            : "in_progress",
        progressPct: pct,
        progressText: `${platesCount} illustration(s) in library`,
        pendingItems,
      };
    }

    case "cover-concepts":
    case "cover-series-system":
    case "cover-wrap-specs":
    case "cover-thumbnail-qa": {
      if (!hasCover) {
        pendingItems.push("Front cover image not yet assigned");
      }
      if (!book.coverTitleFont) {
        pendingItems.push("Assign cover display font in Art Studio");
      }
      if (hasCover && hasDeliverable) {
        return {
          autoColumn: "completed",
          progressPct: 100,
          progressText: "Cover assigned & audited",
          pendingItems,
        };
      }
      if (hasCover) {
        return {
          autoColumn: task.id === "cover-concepts" ? "completed" : "review",
          progressPct: task.id === "cover-concepts" ? 100 : 75,
          progressText: "Cover image present",
          pendingItems,
        };
      }
      return {
        autoColumn: hasDeliverable ? "in_progress" : "pending",
        progressPct: hasDeliverable ? 45 : 0,
        progressText: hasDeliverable ? "Brief drafted, awaiting art" : "Cover unset",
        pendingItems,
      };
    }

    case "fmt-apply-preset":
    case "fmt-typo-system":
    case "fmt-preflight-qa": {
      const checks = [
        Boolean(fmt?.trimSize),
        Boolean(fmt?.fontPreset),
        Boolean(fmt?.copyrightText?.trim()),
        Boolean(fmt?.authorBio?.trim()),
      ];
      const passed = checks.filter(Boolean).length;
      if (!fmt?.copyrightText?.trim()) pendingItems.push("Add copyright text");
      if (!fmt?.authorBio?.trim()) pendingItems.push("Add author bio in front/back matter");
      if (finalChapters.length < totalChapters && totalChapters > 0) {
        pendingItems.push(`${totalChapters - finalChapters.length} chapter(s) not marked final`);
      }
      const pct = Math.round((passed / checks.length) * 100);
      return {
        autoColumn:
          passed === checks.length && (hasDeliverable || totalChapters > 0)
            ? "completed"
            : hasDeliverable
            ? "review"
            : passed >= 2
            ? "in_progress"
            : "pending",
        progressPct: pct,
        progressText: `${fmt?.trimSize || "6x9"} · ${fmt?.googleFontFamily || fmt?.fontPreset || "Default"}`,
        pendingItems,
      };
    }

    case "pub-readiness-gate":
    case "pub-metadata-pack":
    case "pub-compliance-check": {
      const kwCount = kit?.amazonKeywords?.length || 0;
      const bisacCount = kit?.bisacCategories?.length || 0;
      const hasIsbnOrImprint = Boolean(kit?.isbn || kit?.publisherImprint);
      if (kwCount < 5) pendingItems.push(`Add ${7 - kwCount} KDP keyword phrases`);
      if (bisacCount === 0) pendingItems.push("Assign BISAC categories");
      if (!hasIsbnOrImprint && task.id === "pub-compliance-check") {
        pendingItems.push("Set ISBN or publisher imprint in Publishing Suite");
      }
      const score =
        (kwCount >= 5 ? 40 : kwCount * 6) +
        (bisacCount > 0 ? 35 : 0) +
        (hasIsbnOrImprint ? 25 : 0);
      return {
        autoColumn:
          score >= 75 && (task.id !== "pub-compliance-check" || hasIsbnOrImprint)
            ? "completed"
            : hasDeliverable
            ? "review"
            : score > 0
            ? "in_progress"
            : "pending",
        progressPct: Math.min(100, score),
        progressText: `${kwCount}/7 keywords · ${bisacCount} BISAC`,
        pendingItems,
      };
    }

    case "mkt-launch-plan":
    case "mkt-blurb-pack":
    case "mkt-social-pack": {
      const hasHook = Boolean(kit?.salesBlurb?.hook?.trim());
      const hasBody = Boolean(kit?.salesBlurb?.body?.trim());
      const hasLaunch = Boolean(kit?.launchStrategy?.trim() || kit?.marketingHook?.trim());
      if (!hasHook || !hasBody) pendingItems.push("Complete retail sales blurb hook & body");
      if (!hasLaunch) pendingItems.push("Define launch strategy or marketing hook");
      const score = (hasHook ? 35 : 0) + (hasBody ? 35 : 0) + (hasLaunch ? 30 : 0);
      return {
        autoColumn:
          score === 100
            ? "completed"
            : hasDeliverable
            ? "review"
            : score > 0
            ? "in_progress"
            : "pending",
        progressPct: score,
        progressText:
          score === 100
            ? "Blurb & launch copy set"
            : hasBody
            ? "Blurb partial"
            : "Marketing copy pending",
        pendingItems,
      };
    }

    default: {
      if (!hasDeliverable) pendingItems.push(`Run ${staff.name}'s ${task.label}`);
      return {
        autoColumn: hasDeliverable ? "review" : "pending",
        progressPct: hasDeliverable ? 75 : 0,
        progressText: hasDeliverable ? "Deliverable generated" : "Not started",
        pendingItems,
      };
    }
  }
}

export const AgentTaskKanbanBoard: React.FC<AgentTaskKanbanBoardProps> = ({
  book,
  deliverables,
  onRunTaskInWorkbench,
  onSelectTab,
}) => {
  const overridesStorageKey = `tomecrafter_kanban_overrides_${book.id}`;
  const customTasksStorageKey = `tomecrafter_kanban_custom_${book.id}`;

  const [columnOverrides, setColumnOverrides] = useState<
    Record<string, KanbanColumnId>
  >(() => {
    try {
      const raw = localStorage.getItem(overridesStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [customTasks, setCustomTasks] = useState<CustomStudioTask[]>(() => {
    try {
      const raw = localStorage.getItem(customTasksStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [departmentFilter, setDepartmentFilter] = useState<
    DepartmentId | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(
    null
  );

  // Add Custom Task form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTaskDeptId, setNewTaskDeptId] =
    useState<DepartmentId>("scripting");
  const [newTaskStaffId, setNewTaskStaffId] = useState<string>(
    STUDIO_DEPARTMENTS[0].staff[0].id
  );
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskDesc, setNewTaskDesc] = useState<string>("");
  const [newTaskColumn, setNewTaskColumn] =
    useState<KanbanColumnId>("pending");

  // Reload per book switch
  useEffect(() => {
    try {
      const rawO = localStorage.getItem(overridesStorageKey);
      setColumnOverrides(rawO ? JSON.parse(rawO) : {});
    } catch {
      setColumnOverrides({});
    }
    try {
      const rawC = localStorage.getItem(customTasksStorageKey);
      const parsed = rawC ? JSON.parse(rawC) : [];
      setCustomTasks(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCustomTasks([]);
    }
  }, [book.id, overridesStorageKey, customTasksStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        overridesStorageKey,
        JSON.stringify(columnOverrides)
      );
    } catch {
      // ignore storage errors
    }
  }, [columnOverrides, overridesStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        customTasksStorageKey,
        JSON.stringify(customTasks)
      );
    } catch {
      // ignore storage errors
    }
  }, [customTasks, customTasksStorageKey]);

  // Build unified list of Kanban cards across all 8 departments
  const allCards: KanbanCardItem[] = useMemo(() => {
    const builtInCards: KanbanCardItem[] = [];

    for (const dept of STUDIO_DEPARTMENTS) {
      for (const staff of dept.staff) {
        for (const task of staff.tasks) {
          const matchingDeliverables = deliverables.filter(
            (d) => d.taskId === task.id || (d.staffId === staff.id && d.taskLabel === task.label)
          );
          const evaluated = evaluateTaskFromBookState(
            dept,
            staff,
            task,
            book,
            matchingDeliverables
          );
          const override = columnOverrides[task.id];
          builtInCards.push({
            id: task.id,
            departmentId: dept.id,
            departmentName: dept.name,
            departmentShortLabel: dept.shortLabel,
            primaryTab: dept.primaryTab,
            primaryTabLabel: dept.primaryTabLabel,
            staffId: staff.id,
            staffName: staff.name,
            staffRole: staff.role,
            taskId: task.id,
            title: task.label,
            description: task.description,
            column: override || evaluated.autoColumn,
            isManualOverride: Boolean(override),
            isCustom: false,
            progressPct:
              override === "completed" ? 100 : evaluated.progressPct,
            progressText: evaluated.progressText,
            pendingItems: evaluated.pendingItems,
            deliverableCount: matchingDeliverables.length,
          });
        }
      }
    }

    const mappedCustomCards: KanbanCardItem[] = customTasks.map((ct) => {
      const dept =
        STUDIO_DEPARTMENTS.find((d) => d.id === ct.departmentId) ||
        STUDIO_DEPARTMENTS[0];
      const staff =
        dept.staff.find((s) => s.id === ct.staffId) || dept.staff[0];
      const col = columnOverrides[ct.id] || ct.column;
      const pct =
        col === "completed"
          ? 100
          : col === "review"
          ? 80
          : col === "in_progress"
          ? 45
          : 0;

      return {
        id: ct.id,
        departmentId: dept.id,
        departmentName: dept.name,
        departmentShortLabel: dept.shortLabel,
        primaryTab: dept.primaryTab,
        primaryTabLabel: dept.primaryTabLabel,
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        title: ct.title,
        description: ct.description || "Custom studio production item",
        column: col,
        isManualOverride: Boolean(columnOverrides[ct.id]),
        isCustom: true,
        progressPct: pct,
        progressText:
          col === "completed"
            ? "Custom task completed"
            : "Custom department task",
        pendingItems: ct.pendingNote ? [ct.pendingNote] : [],
        deliverableCount: 0,
      };
    });

    return [...builtInCards, ...mappedCustomCards];
  }, [book, deliverables, columnOverrides, customTasks]);

  // Per-department summary stats for the 8-department progress strip
  const departmentProgressSummaries = useMemo(() => {
    return STUDIO_DEPARTMENTS.map((dept) => {
      const cards = allCards.filter((c) => c.departmentId === dept.id);
      const completedCount = cards.filter(
        (c) => c.column === "completed"
      ).length;
      const pendingCount = cards.filter((c) => c.column === "pending").length;
      const activeCount = cards.filter(
        (c) => c.column === "in_progress" || c.column === "review"
      ).length;
      const avgPct =
        cards.length > 0
          ? Math.round(
              cards.reduce((sum, c) => sum + c.progressPct, 0) / cards.length
            )
          : 0;
      return {
        dept,
        total: cards.length,
        completedCount,
        pendingCount,
        activeCount,
        avgPct,
      };
    });
  }, [allCards]);

  // Filtered Kanban cards
  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCards.filter((card) => {
      if (departmentFilter !== "all" && card.departmentId !== departmentFilter) {
        return false;
      }
      if (!q) return true;
      return (
        card.title.toLowerCase().includes(q) ||
        card.staffName.toLowerCase().includes(q) ||
        card.departmentName.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q)
      );
    });
  }, [allCards, departmentFilter, searchQuery]);

  const moveCardToColumn = (cardId: string, targetCol: KanbanColumnId) => {
    const isCustom = customTasks.some((ct) => ct.id === cardId);
    if (isCustom) {
      setCustomTasks((prev) =>
        prev.map((ct) => (ct.id === cardId ? { ...ct, column: targetCol } : ct))
      );
    }
    setColumnOverrides((prev) => ({ ...prev, [cardId]: targetCol }));
  };

  const handleStepCard = (
    card: KanbanCardItem,
    direction: "prev" | "next"
  ) => {
    const order: KanbanColumnId[] = [
      "pending",
      "in_progress",
      "review",
      "completed",
    ];
    const idx = order.indexOf(card.column);
    const nextIdx =
      direction === "next"
        ? Math.min(order.length - 1, idx + 1)
        : Math.max(0, idx - 1);
    if (nextIdx !== idx) {
      moveCardToColumn(card.id, order[nextIdx]);
    }
  };

  const handleResetOverrides = () => {
    setColumnOverrides({});
  };

  const handleCreateCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const item: CustomStudioTask = {
      id: `custom-${Date.now()}`,
      departmentId: newTaskDeptId,
      staffId: newTaskStaffId,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      column: newTaskColumn,
      createdAt: new Date().toISOString(),
    };
    setCustomTasks((prev) => [item, ...prev]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setShowAddForm(false);
  };

  const handleDeleteCustomTask = (taskId: string) => {
    setCustomTasks((prev) => prev.filter((t) => t.id !== taskId));
    setColumnOverrides((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const selectedAddDept =
    STUDIO_DEPARTMENTS.find((d) => d.id === newTaskDeptId) ||
    STUDIO_DEPARTMENTS[0];

  const hasOverrides = Object.keys(columnOverrides).length > 0;

  return (
    <div className="space-y-5">
      {/* 8-Department Progress Strip */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-sm font-serif font-bold text-stone-100">
              Department Progress & Pending Load
            </h2>
            <p className="text-xs text-stone-400">
              Click any department to isolate its Kanban workflow cards, or view all 8 teams together.
            </p>
          </div>
          {departmentFilter !== "all" && (
            <button
              onClick={() => setDepartmentFilter("all")}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 self-start sm:self-auto"
            >
              Show All 8 Departments
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {departmentProgressSummaries.map(
            ({ dept, total, completedCount, pendingCount, avgPct }) => {
              const isActive = departmentFilter === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() =>
                    setDepartmentFilter(isActive ? "all" : dept.id)
                  }
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    isActive
                      ? "bg-stone-950 border-amber-500/70"
                      : "bg-stone-950/70 border-stone-800 hover:border-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span
                        className={
                          isActive ? "text-amber-400" : "text-stone-400"
                        }
                      >
                        {getDeptIcon(dept.id)}
                      </span>
                      <span className="text-xs font-medium text-stone-100 truncate">
                        {dept.shortLabel}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-amber-400">
                      {avgPct}%
                    </span>
                  </div>

                  {/* Flat 1D progress bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        avgPct === 100 ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${avgPct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-stone-400">
                    <span>
                      {completedCount}/{total} done
                    </span>
                    <span
                      className={
                        pendingCount > 0 ? "text-stone-300" : "text-stone-500"
                      }
                    >
                      {pendingCount} pending
                    </span>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* Board Toolbar: Search, Filter, Add Custom Task, Reset Auto-Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks, departments, or agents..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) =>
              setDepartmentFilter(e.target.value as DepartmentId | "all")
            }
            className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All 8 Departments ({allCards.length})</option>
            {STUDIO_DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasOverrides && (
            <button
              onClick={handleResetOverrides}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-medium transition-colors flex items-center space-x-1.5"
              title="Recompute all card columns directly from live manuscript & deliverable state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sync Auto-Status</span>
            </button>
          )}
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors flex items-center space-x-1.5"
          >
            {showAddForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department Task</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Add Custom Task Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateCustomTask}
          className="bg-stone-900 border border-amber-500/50 rounded-xl p-4 space-y-3"
        >
          <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
            New Studio Task Card
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">
                Department
              </label>
              <select
                value={newTaskDeptId}
                onChange={(e) => {
                  const deptId = e.target.value as DepartmentId;
                  setNewTaskDeptId(deptId);
                  const d =
                    STUDIO_DEPARTMENTS.find((x) => x.id === deptId) ||
                    STUDIO_DEPARTMENTS[0];
                  setNewTaskStaffId(d.staff[0].id);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
              >
                {STUDIO_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">
                Assigned Specialist
              </label>
              <select
                value={newTaskStaffId}
                onChange={(e) => setNewTaskStaffId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
              >
                {selectedAddDept.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">
                Initial Column
              </label>
              <select
                value={newTaskColumn}
                onChange={(e) =>
                  setNewTaskColumn(e.target.value as KanbanColumnId)
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
              >
                {KANBAN_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title (e.g., Audit Chapter 3 timeline clues)"
              className="px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Short scope or deliverable note (optional)"
              className="px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs"
            >
              Create Task Card
            </button>
          </div>
        </form>
      )}

      {/* 4-Column Interactive Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {KANBAN_COLUMNS.map((col, colIndex) => {
          const colCards = filteredCards.filter((c) => c.column === col.id);
          const isDropTarget = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.id);
              }}
              onDragLeave={() => {
                if (dragOverColumn === col.id) setDragOverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const cardId =
                  e.dataTransfer.getData("text/plain") || draggedCardId;
                if (cardId) {
                  moveCardToColumn(cardId, col.id);
                }
                setDraggedCardId(null);
              }}
              className={`bg-stone-900 border rounded-xl p-3 flex flex-col min-h-[380px] transition-colors ${
                isDropTarget
                  ? "border-amber-500 bg-stone-900/95"
                  : "border-stone-800"
              }`}
            >
              {/* Column Header */}
              <div className="pb-3 mb-3 border-b border-stone-800 flex items-center justify-between">
                <div>
                  <div
                    className={`text-sm font-serif font-bold ${col.accentClass}`}
                  >
                    {col.title}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {col.subtitle}
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-stone-300 bg-stone-950 border border-stone-800 px-2 py-0.5 rounded-md">
                  {colCards.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-2.5 flex-1">
                {colCards.length === 0 ? (
                  <div className="py-10 px-3 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-lg">
                    Drag a card here or move tasks into {col.title}.
                  </div>
                ) : (
                  colCards.map((card) => (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedCardId(card.id);
                        e.dataTransfer.setData("text/plain", card.id);
                      }}
                      onDragEnd={() => {
                        setDraggedCardId(null);
                        setDragOverColumn(null);
                      }}
                      className={`p-3 rounded-lg bg-stone-950 border border-stone-800 hover:border-stone-700 transition-colors cursor-grab active:cursor-grabbing ${
                        draggedCardId === card.id ? "opacity-50" : ""
                      }`}
                    >
                      {/* Top Meta: Department + Agent */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-stone-400">
                        <span className="flex items-center space-x-1.5 text-amber-400 font-medium truncate">
                          {getDeptIcon(card.departmentId)}
                          <span className="truncate">
                            {card.departmentShortLabel}
                          </span>
                        </span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          {card.deliverableCount > 0 && (
                            <span className="font-mono text-[10px] text-emerald-400">
                              {card.deliverableCount} run
                            </span>
                          )}
                          {card.isCustom && (
                            <button
                              onClick={() => handleDeleteCustomTask(card.id)}
                              className="text-stone-500 hover:text-rose-400 transition-colors"
                              title="Delete custom task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Specialist */}
                      <h3 className="text-xs font-semibold text-stone-100 mt-1.5 leading-snug">
                        {card.title}
                      </h3>
                      <div className="text-[11px] text-stone-400 mt-0.5 truncate">
                        {card.staffName} · {card.staffRole}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-stone-400 mb-1">
                          <span className="truncate mr-2">
                            {card.progressText}
                          </span>
                          <span>{card.progressPct}%</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-stone-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              card.column === "completed"
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${card.progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Pending Items */}
                      {card.pendingItems.length > 0 &&
                        card.column !== "completed" && (
                          <div className="mt-2 text-[11px] text-stone-400 leading-snug">
                            <span className="text-stone-500 font-mono">
                              Pending:{" "}
                            </span>
                            {card.pendingItems[0]}
                          </div>
                        )}

                      {card.column === "completed" && (
                        <div className="mt-2 flex items-center space-x-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Verified for production</span>
                        </div>
                      )}

                      {/* Card Footer: Quick Move & Action */}
                      <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between gap-1.5">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleStepCard(card, "prev")}
                            disabled={colIndex === 0}
                            className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors"
                            title="Move to previous stage"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStepCard(card, "next")}
                            disabled={colIndex === KANBAN_COLUMNS.length - 1}
                            className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors"
                            title="Advance to next stage"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              onSelectTab(card.primaryTab as ActiveTab)
                            }
                            className="text-[11px] text-stone-400 hover:text-stone-200 transition-colors flex items-center space-x-0.5"
                            title={`Open ${card.primaryTabLabel}`}
                          >
                            <span>Tool</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          {!card.isCustom && card.taskId ? (
                            <button
                              onClick={() =>
                                onRunTaskInWorkbench(
                                  card.departmentId,
                                  card.staffId,
                                  card.taskId
                                )
                              }
                              className="text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Run</span>
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                onRunTaskInWorkbench(
                                  card.departmentId,
                                  card.staffId
                                )
                              }
                              className="text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center space-x-1"
                            >
                              <span>Dept</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
