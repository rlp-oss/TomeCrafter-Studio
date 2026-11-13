import React, { useState, useMemo } from "react";
import {
  Activity,
  Gauge,
  Info,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Sparkles,
  Zap,
  HelpCircle,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import {
  calculateReadability,
  ReadabilityMetrics,
  getReadabilitySessionHistory,
  ReadabilitySessionPoint,
} from "../utils/readability";
import { ReadabilitySparkline } from "./ReadabilitySparkline";

interface ReadabilityBadgeProps {
  content: string;
  chapterId?: string;
  className?: string;
  showCompact?: boolean;
}

export const ReadabilityBadge: React.FC<ReadabilityBadgeProps> = ({
  content,
  chapterId = "active",
  className = "",
  showCompact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const metrics: ReadabilityMetrics = useMemo(
    () => calculateReadability(content),
    [content]
  );

  const sessionHistory: ReadabilitySessionPoint[] = useMemo(
    () => getReadabilitySessionHistory(chapterId, metrics),
    [chapterId, metrics]
  );

  // Determine badge styling based on Flesch-Kincaid Grade
  const getGradeBadgeColor = (grade: number) => {
    if (grade <= 6.5) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (grade <= 9.0) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    if (grade <= 12.0) return "bg-sky-500/20 text-sky-300 border-sky-500/40";
    return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  };

  const getPacingFeedback = (asl: number) => {
    if (asl === 0) return "No text yet";
    if (asl < 12) return "Brisk & Action-Packed (short sentences)";
    if (asl <= 20) return "Balanced & Commercial (optimal novel pacing)";
    if (asl <= 26) return "Atmospheric & Literary (longer cadences)";
    return "Dense & Complex (consider breaking up long clauses)";
  };

  const getTargetBenchmark = (grade: number) => {
    if (grade <= 5.5) return "Middle Grade / Accessible Fiction";
    if (grade <= 8.5) return "Young Adult & Commercial Best-Sellers";
    if (grade <= 11.5) return "Adult Literary Fiction & High Fantasy";
    return "Scholarly / Specialized Historical Prose";
  };

  const firstSession = sessionHistory[0];
  const lastSession = sessionHistory[sessionHistory.length - 1];
  const sessionDelta = Math.round((lastSession.grade - firstSession.grade) * 10) / 10;

  return (
    <div className={`relative inline-flex items-center space-x-2 ${className}`}>
      {/* Interactive Trigger Button */}
      <button
        type="button"
        id="readability-score-indicator"
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 hover:border-amber-500/50 transition-all text-xs cursor-pointer shadow-sm group"
        title="View Flesch-Kincaid Readability & 5-Session Trend"
      >
        <Activity className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
        
        <div className="flex items-center space-x-1.5">
          <span className="text-stone-400 font-sans">Readability:</span>
          <span
            className={`font-mono font-bold px-1.5 py-0.2 rounded border text-[11px] ${getGradeBadgeColor(
              metrics.fleschKincaidGrade
            )}`}
          >
            {metrics.gradeLevelLabel}
          </span>
        </div>

        {!showCompact && (
          <span className="text-[11px] text-stone-400 font-mono hidden md:inline">
            ({metrics.fleschReadingEase}/100)
          </span>
        )}

        {showDetails ? (
          <ChevronUp className="w-3 h-3 text-stone-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-stone-400" />
        )}
      </button>

      {/* Sparkline Inline in Footer */}
      <ReadabilitySparkline
        data={sessionHistory}
        width={showCompact ? 60 : 76}
        height={20}
        showTrendLabel={!showCompact}
      />

      {/* Detailed Readability Inspector Popover */}
      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 w-84 sm:w-96 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-4 sm:p-5 z-50 text-xs space-y-4 animate-fadeIn backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Gauge className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-serif font-bold text-stone-100 text-sm">
                    Flesch-Kincaid Readability
                  </h4>
                  <p className="text-[10px] text-stone-400">
                    Real-time prose complexity & session tracking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Grade Level Card */}
              <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  Grade Level
                </span>
                <div className="flex items-baseline space-x-1.5 my-1">
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {metrics.fleschKincaidGrade.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-stone-400">U.S. Grade</span>
                </div>
                <span className="text-[10px] text-stone-400 truncate">
                  {getTargetBenchmark(metrics.fleschKincaidGrade)}
                </span>
              </div>

              {/* Reading Ease Card */}
              <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  Reading Ease
                </span>
                <div className="flex items-baseline space-x-1.5 my-1">
                  <span className="text-xl font-bold font-mono text-stone-100">
                    {metrics.fleschReadingEase}
                  </span>
                  <span className="text-[11px] text-stone-400">/ 100</span>
                </div>
                <span className={`text-[10px] font-medium ${metrics.readingEaseColor}`}>
                  {metrics.complexityLevel}
                </span>
              </div>
            </div>

            {/* 5-Session Readability Trend Sparkline Section */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-semibold text-stone-200">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Last 5 Writing Sessions Trend</span>
                </div>
                <div className="flex items-center space-x-1 font-mono text-[11px]">
                  {sessionDelta > 0 ? (
                    <span className="text-sky-400 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" />+{sessionDelta.toFixed(1)} Grade
                    </span>
                  ) : sessionDelta < 0 ? (
                    <span className="text-emerald-400 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-0.5" />{sessionDelta.toFixed(1)} Grade
                    </span>
                  ) : (
                    <span className="text-stone-400 flex items-center">
                      <Minus className="w-3 h-3 mr-0.5" />Steady
                    </span>
                  )}
                </div>
              </div>

              {/* Recharts Expanded Trend Chart */}
              <div className="h-28 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sessionHistory}
                    margin={{ top: 8, right: 12, left: -24, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="session"
                      stroke="#78716c"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: "#44403c" }}
                    />
                    <YAxis
                      stroke="#78716c"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: "#44403c" }}
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                      tickFormatter={(val) => `G${val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const pt = payload[0].payload as ReadabilitySessionPoint;
                          return (
                            <div className="bg-stone-900 border border-stone-700 rounded-xl p-2 text-xs shadow-2xl text-stone-100 font-sans space-y-1">
                              <p className="font-serif font-bold text-amber-400">{pt.name}</p>
                              <div className="font-mono text-[11px] space-y-0.5">
                                <div className="flex justify-between space-x-3 text-stone-300">
                                  <span>Grade Level:</span>
                                  <strong className="text-amber-300">
                                    Grade {pt.grade.toFixed(1)}
                                  </strong>
                                </div>
                                <div className="flex justify-between space-x-3 text-stone-400">
                                  <span>Reading Ease:</span>
                                  <span>{pt.readingEase} / 100</span>
                                </div>
                                <div className="flex justify-between space-x-3 text-stone-400">
                                  <span>Word Count:</span>
                                  <span>{pt.words.toLocaleString()} w</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={8.0} stroke="#78716c" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="grade"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
                      dot={{ r: 3, fill: "#f59e0b", stroke: "#1c1917", strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: "#ffffff", stroke: "#f59e0b", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-stone-400 italic">
                Dashed line indicates optimal commercial novel benchmark (Grade 8.0).
              </p>
            </div>

            {/* Reading Ease Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-400">Ease Scale:</span>
                <span className={`font-medium ${metrics.readingEaseColor}`}>
                  {metrics.readingEaseLabel}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden border border-stone-700/50">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, metrics.fleschReadingEase))}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                <span>0 (Dense)</span>
                <span>50 (Literary)</span>
                <span>65 (Commercial)</span>
                <span>100 (Easy)</span>
              </div>
            </div>

            {/* Syntactic Metrics List */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/80 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Avg Sentence Length:</span>
                <span className="font-mono text-stone-200 font-medium">
                  {metrics.avgSentenceLength} words/sentence
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Pacing Cadence:</span>
                <span className="text-amber-300/90 font-medium text-[10px] text-right">
                  {getPacingFeedback(metrics.avgSentenceLength)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-stone-800/60 pt-1.5">
                <span className="text-stone-400">Avg Syllables / Word:</span>
                <span className="font-mono text-stone-200 font-medium">
                  {metrics.avgSyllablesPerWord}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Complex Words (3+ syl):</span>
                <span className="font-mono text-stone-200 font-medium">
                  {metrics.words > 0
                    ? `${Math.round((metrics.complexWords / metrics.words) * 100)}% (${metrics.complexWords})`
                    : "0%"}
                </span>
              </div>
            </div>

            {/* Author Target Benchmark Insight */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] flex items-start space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Author Tip:</strong> Most commercial fiction bestsellers target{" "}
                <strong>Grade 6.0 – 8.5</strong> (Reading Ease 60–75) for effortless page-turning immersion.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
