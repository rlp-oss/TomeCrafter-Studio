import React from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  XAxis,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { ReadabilitySessionPoint } from "../utils/readability";

interface ReadabilitySparklineProps {
  data: ReadabilitySessionPoint[];
  width?: number;
  height?: number;
  showTrendLabel?: boolean;
  className?: string;
}

export const ReadabilitySparkline: React.FC<ReadabilitySparklineProps> = ({
  data,
  width = 84,
  height = 24,
  showTrendLabel = true,
  className = "",
}) => {
  if (!data || data.length === 0) return null;

  const firstGrade = data[0]?.grade || 0;
  const lastGrade = data[data.length - 1]?.grade || 0;
  const delta = Math.round((lastGrade - firstGrade) * 10) / 10;

  // Determine stroke color and trend badge
  let strokeColor = "#fbbf24"; // Amber default
  let trendIcon = <Minus className="w-3 h-3 text-stone-400" />;
  let trendText = "Steady";
  let trendClass = "text-stone-400";

  if (delta > 0.1) {
    strokeColor = "#38bdf8"; // Sky / higher grade complexity
    trendIcon = <TrendingUp className="w-3 h-3 text-sky-400" />;
    trendText = `+${delta.toFixed(1)} G`;
    trendClass = "text-sky-400";
  } else if (delta < -0.1) {
    strokeColor = "#34d399"; // Emerald / more accessible
    trendIcon = <TrendingDown className="w-3 h-3 text-emerald-400" />;
    trendText = `${delta.toFixed(1)} G`;
    trendClass = "text-emerald-400";
  }

  // Min and max for domain
  const grades = data.map((d) => d.grade);
  const minGrade = Math.max(0, Math.min(...grades) - 0.5);
  const maxGrade = Math.max(...grades) + 0.5;

  return (
    <div
      className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-stone-900/90 border border-stone-700/80 ${className}`}
      title={`5-Session Grade Trend: ${data.map((d) => `S${d.session.replace('S', '')}: ${d.grade}`).join(" → ")}`}
    >
      <div className="flex items-center space-x-1 text-[10px] text-stone-400 font-mono">
        <History className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="hidden xl:inline">5-Session:</span>
      </div>

      {/* Recharts Mini Sparkline Canvas */}
      <div style={{ width: `${width}px`, height: `${height}px` }} className="shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id="readabilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <YAxis domain={[minGrade, maxGrade]} hide />
            <XAxis dataKey="session" hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ReadabilitySessionPoint;
                  return (
                    <div className="bg-stone-950 border border-stone-700 rounded-lg p-1.5 text-[10px] font-mono shadow-xl text-stone-200">
                      <div className="font-bold text-amber-400">{pt.name}</div>
                      <div>Grade: {pt.grade.toFixed(1)}</div>
                      <div className="text-stone-400">Ease: {pt.readingEase}/100</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="grade"
              stroke={strokeColor}
              strokeWidth={1.8}
              fill="url(#readabilityGradient)"
              dot={{ r: 1.5, fill: strokeColor }}
              activeDot={{ r: 3.5, fill: "#ffffff", stroke: strokeColor, strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Delta Label */}
      {showTrendLabel && (
        <div className={`flex items-center space-x-0.5 text-[10px] font-mono font-bold ${trendClass}`}>
          {trendIcon}
          <span>{trendText}</span>
        </div>
      )}
    </div>
  );
};
