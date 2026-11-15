import React, { useState, useEffect, useRef } from "react";
import { Target, Calendar, BookOpen, Check, X, RotateCcw } from "lucide-react";
import { Book } from "../types";

interface FooterWordGoalBarProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
}

const PROJECT_PRESETS = [25000, 50000, 80000, 100000, 120000];
const DAILY_PRESETS = [500, 1000, 1500, 2500, 5000];

export function getLocalDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function countBookWords(book: Book): number {
  return (book.chapters || []).reduce(
    (acc, ch) =>
      acc + (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0
  );
}

export const FooterWordGoalBar: React.FC<FooterWordGoalBarProps> = ({
  book,
  onUpdateBook,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"project" | "daily">(
    book.wordGoalMode === "daily" ? "daily" : "project"
  );
  const [projectGoalInput, setProjectGoalInput] = useState<string>(
    String(book.targetWordCount || 60000)
  );
  const [dailyGoalInput, setDailyGoalInput] = useState<string>(
    String(book.dailyWordCountGoal || 1000)
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWords = countBookWords(book);
  const todayKey = getLocalDateKey();
  const hasTodayBaseline = book.dailyWordBaselineDate === todayKey;
  const dailyWords = hasTodayBaseline
    ? Math.max(0, currentWords - (book.dailyWordBaselineCount ?? currentWords))
    : 0;

  const activeMode: "project" | "daily" =
    book.wordGoalMode === "daily" && (book.dailyWordCountGoal || 0) > 0
      ? "daily"
      : "project";

  const projectTarget = book.targetWordCount || 60000;
  const dailyTarget = book.dailyWordCountGoal || 1000;

  const displayedCurrent = activeMode === "daily" ? dailyWords : currentWords;
  const displayedTarget = activeMode === "daily" ? dailyTarget : projectTarget;
  const percentage =
    displayedTarget > 0
      ? Math.min(100, Math.round((displayedCurrent / displayedTarget) * 100))
      : 0;
  const remainingWords = Math.max(0, displayedTarget - displayedCurrent);
  const estPages = Math.max(1, Math.round(currentWords / 250));

  // Sync draft inputs whenever popover opens or active book changes
  useEffect(() => {
    if (isOpen) {
      setSelectedMode(book.wordGoalMode === "daily" ? "daily" : "project");
      setProjectGoalInput(String(book.targetWordCount || 60000));
      setDailyGoalInput(String(book.dailyWordCountGoal || 1000));
      setValidationError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    }
  }, [isOpen, book.id, book.wordGoalMode, book.targetWordCount, book.dailyWordCountGoal]);

  // Dismiss on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeInputValue = selectedMode === "daily" ? dailyGoalInput : projectGoalInput;

  const handleInputChange = (val: string) => {
    setValidationError(null);
    const digitsOnly = val.replace(/[^\d]/g, "");
    if (selectedMode === "daily") {
      setDailyGoalInput(digitsOnly);
    } else {
      setProjectGoalInput(digitsOnly);
    }
  };

  const handlePresetClick = (preset: number) => {
    setValidationError(null);
    if (selectedMode === "daily") {
      setDailyGoalInput(String(preset));
    } else {
      setProjectGoalInput(String(preset));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawValue = selectedMode === "daily" ? dailyGoalInput : projectGoalInput;
    const parsed = parseInt(rawValue, 10);
    const maxLimit = selectedMode === "daily" ? 1000000 : 10000000;

    if (!Number.isFinite(parsed) || parsed < 1) {
      setValidationError("Enter a word count goal of at least 1 word.");
      return;
    }
    if (parsed > maxLimit) {
      setValidationError(`Goal cannot exceed ${maxLimit.toLocaleString()} words.`);
      return;
    }

    if (selectedMode === "daily") {
      onUpdateBook({
        ...book,
        wordGoalMode: "daily",
        dailyWordCountGoal: parsed,
        dailyWordBaselineDate: todayKey,
        dailyWordBaselineCount:
          book.dailyWordBaselineDate === todayKey &&
          typeof book.dailyWordBaselineCount === "number"
            ? book.dailyWordBaselineCount
            : currentWords,
      });
    } else {
      onUpdateBook({
        ...book,
        wordGoalMode: "project",
        targetWordCount: parsed,
      });
    }

    setIsOpen(false);
  };

  const handleResetDailyBaseline = () => {
    const parsedDaily = parseInt(dailyGoalInput, 10);
    const nextDailyGoal =
      Number.isFinite(parsedDaily) && parsedDaily >= 1 && parsedDaily <= 1000000
        ? parsedDaily
        : dailyTarget;

    onUpdateBook({
      ...book,
      wordGoalMode: "daily",
      dailyWordCountGoal: nextDailyGoal,
      dailyWordBaselineDate: todayKey,
      dailyWordBaselineCount: currentWords,
    });
  };

  const presets = selectedMode === "daily" ? DAILY_PRESETS : PROJECT_PRESETS;

  return (
    <div
      ref={containerRef}
      className="relative w-full lg:max-w-md xl:max-w-lg"
    >
      {/* Interactive Word Count Progress Bar Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Configure daily or project word count goal"
        title="Click to customize daily or project-wide word count goal"
        className={`w-full text-left bg-stone-900/90 border rounded-xl px-3.5 py-2 flex flex-col space-y-1.5 shadow-inner transition-all cursor-pointer group ${
          isOpen
            ? "border-amber-500/70 ring-1 ring-amber-500/30 bg-stone-900"
            : "border-stone-800/90 hover:border-amber-500/50 hover:bg-stone-900"
        }`}
      >
        <div className="flex items-center justify-between text-[11px] gap-2">
          <div className="flex items-center space-x-1.5 font-medium min-w-0">
            <Target className="w-3 h-3 text-amber-400/80 group-hover:text-amber-300 shrink-0 transition-colors" />
            {activeMode === "daily" && (
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                Daily
              </span>
            )}
            <span className="text-amber-400 font-mono font-bold truncate">
              {displayedCurrent.toLocaleString()}
            </span>
            <span className="text-stone-500">/</span>
            <span className="text-stone-300 group-hover:text-stone-100 font-mono truncate transition-colors">
              {displayedTarget.toLocaleString()} words
            </span>
            <span className="text-[10px] text-stone-500 font-sans hidden sm:inline shrink-0">
              {activeMode === "daily"
                ? `(${currentWords.toLocaleString()} total)`
                : `(~${estPages} pages)`}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {remainingWords > 0 ? (
              <span className="text-[10px] text-stone-500 hidden sm:inline">
                {remainingWords.toLocaleString()} to goal
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
                Goal Reached!
              </span>
            )}
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                percentage >= 100
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : percentage >= 50
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-stone-800 text-stone-300 border-stone-700"
              }`}
            >
              {percentage}%
            </span>
          </div>
        </div>

        {/* Visual Progress Bar Track & Fill */}
        <div className="relative w-full h-2 rounded-full bg-stone-800 overflow-hidden border border-stone-700/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percentage >= 100
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50"
                : "bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </button>

      {/* Popover Goal Editor */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Word Count Goal Settings"
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[min(92vw,370px)] rounded-2xl bg-stone-900 border border-stone-700/90 shadow-2xl shadow-black/70 p-4 z-50 text-stone-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-100">
                Word Count Goal
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
              aria-label="Close goal editor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Goal Scope Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-950 border border-stone-800 mb-3.5">
            <button
              type="button"
              onClick={() => {
                setSelectedMode("project");
                setValidationError(null);
              }}
              className={`flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-all ${
                selectedMode === "project"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-stone-400 hover:text-stone-200 border border-transparent"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Project Goal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMode("daily");
                setValidationError(null);
              }}
              className={`flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-all ${
                selectedMode === "daily"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-stone-400 hover:text-stone-200 border border-transparent"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Goal</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="footer-word-goal-input"
                  className="text-[11px] text-stone-400 font-medium"
                >
                  {selectedMode === "daily"
                    ? "Target words per day"
                    : "Target total manuscript words"}
                </label>
                <span className="text-[10px] font-mono text-stone-500">
                  {selectedMode === "daily"
                    ? `${dailyWords.toLocaleString()} written today`
                    : `${currentWords.toLocaleString()} current`}
                </span>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  id="footer-word-goal-input"
                  type="text"
                  inputMode="numeric"
                  value={activeInputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={selectedMode === "daily" ? "e.g. 1000" : "e.g. 60000"}
                  className="w-full bg-stone-950 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm font-mono text-stone-100 outline-none transition-colors pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-stone-500">
                  words
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const isSelected = Number(activeInputValue) === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                      isSelected
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-stone-800/80 text-stone-400 border-stone-700/80 hover:text-stone-200 hover:border-stone-600"
                    }`}
                  >
                    {preset >= 10000
                      ? `${preset / 1000}k`
                      : preset.toLocaleString()}
                  </button>
                );
              })}
            </div>

            {selectedMode === "daily" && dailyWords > 0 && (
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-stone-400">
                  Today&apos;s session: {dailyWords.toLocaleString()} words
                </span>
                <button
                  type="button"
                  onClick={handleResetDailyBaseline}
                  className="inline-flex items-center space-x-1 text-stone-400 hover:text-amber-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to 0</span>
                </button>
              </div>
            )}

            {validationError && (
              <p className="text-[11px] text-rose-400">{validationError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-1 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg text-[11px] text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Goal</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
