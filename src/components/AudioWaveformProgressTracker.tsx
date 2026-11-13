import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Volume2,
  Sparkles,
  Radio,
  Clock,
  Play,
  Pause,
  Disc,
  Activity,
  Zap,
} from "lucide-react";

interface AudioWaveformProgressTrackerProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (timeInSeconds: number) => void;
  audioElement?: HTMLAudioElement | null;
  trackTitle?: string;
  chapterNumber?: number;
  voiceName?: string;
  accent?: string;
  badge?: string;
  wordCount?: number;
  status?: "idle" | "synthesizing" | "ready" | "error";
  onTogglePlay?: () => void;
}

// Generate realistic pseudo-audio waveform profile with peaks, pauses, and cadence
const GENERATED_BARS_COUNT = 84;
const WAVEFORM_AMPLITUDES = (() => {
  const bars: number[] = [];
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < GENERATED_BARS_COUNT; i++) {
    const norm = i / GENERATED_BARS_COUNT;
    // Layered sine waves + pseudo-random voice dynamics simulating spoken sentences
    const envelope = Math.sin(norm * Math.PI) * 0.7 + 0.3;
    const phrasing = Math.sin(norm * Math.PI * 6) * 0.25 + 0.5;
    const noise = pseudoRandom() * 0.4;
    const value = Math.max(0.12, Math.min(1.0, (phrasing * 0.6 + noise * 0.4) * envelope));
    bars.push(value);
  }
  return bars;
})();

export const AudioWaveformProgressTracker: React.FC<AudioWaveformProgressTrackerProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  audioElement,
  trackTitle = "Chapter Narration",
  chapterNumber = 1,
  voiceName = "Daniel Kingsley",
  accent = "British Broadcast",
  badge = "Authoritative British Broadcaster",
  wordCount = 0,
  status = "ready",
  onTogglePlay,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Audio Analyser Refs for live frequency data
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Interaction State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; time: number; percent: number } | null>(null);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const remainingTime = duration > 0 ? Math.max(0, duration - currentTime) : 0;

  // Initialize Web Audio API Analyser if an audio element is active
  useEffect(() => {
    if (!audioElement) return;

    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.8;
          
          audioContextRef.current = ctx;
          analyserRef.current = analyser;
          frequencyDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        }
      }

      if (audioContextRef.current && analyserRef.current && !sourceNodeRef.current) {
        try {
          const source = audioContextRef.current.createMediaElementSource(audioElement);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          sourceNodeRef.current = source;
        } catch {
          // Source already connected in some browser implementations
        }
      }
    } catch (e) {
      console.warn("AudioContext visualizer initialization notice:", e);
    }

    return () => {
      // Keep context alive for smooth playback
    };
  }, [audioElement]);

  // Main Canvas Rendering Loop (60 FPS with dynamic wave animation & active glow)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Extract real frequency data if available, or generate smooth natural oscillation
      let liveAmps: number[] = [];
      if (analyserRef.current && frequencyDataRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        const binCount = frequencyDataRef.current.length;
        for (let i = 0; i < GENERATED_BARS_COUNT; i++) {
          const binIdx = Math.floor((i / GENERATED_BARS_COUNT) * (binCount * 0.75));
          liveAmps.push(frequencyDataRef.current[binIdx] / 255);
        }
      }

      const barCount = GENERATED_BARS_COUNT;
      const barSpacing = width / barCount;
      const barWidth = Math.max(2.5, barSpacing * 0.65);
      const centerY = height / 2;
      const activeBarIndex = Math.floor((progressPercent / 100) * barCount);

      // 1. Draw Background Center Reference Guide Line
      ctx.strokeStyle = "rgba(120, 113, 108, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // 2. Draw Waveform Bars
      for (let i = 0; i < barCount; i++) {
        const x = i * barSpacing + (barSpacing - barWidth) / 2;
        const baseAmp = WAVEFORM_AMPLITUDES[i] || 0.4;
        
        let dynamicAmp = baseAmp;
        if (isPlaying) {
          if (liveAmps.length > 0 && liveAmps[i] !== undefined) {
            dynamicAmp = baseAmp * 0.4 + liveAmps[i] * 0.75;
          } else {
            // Organic speech rhythm oscillation
            const wave1 = Math.sin((i / barCount) * Math.PI * 8 + phase);
            const wave2 = Math.cos((i / barCount) * Math.PI * 4 - phase * 1.5);
            const pulse = (wave1 * 0.5 + wave2 * 0.5) * 0.35 + 0.65;
            dynamicAmp = baseAmp * pulse;
          }
        }

        const barHeight = Math.max(4, dynamicAmp * (height * 0.44));
        const isPast = i < activeBarIndex;
        const isCurrent = i === activeBarIndex;

        // Gradient & Colors
        if (isPast) {
          // Played Waveform: Radiant Amber-to-Rose Glow
          const grad = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
          grad.addColorStop(0, "#fbbf24"); // amber-400
          grad.addColorStop(0.5, "#f59e0b"); // amber-500
          grad.addColorStop(1, "#ec4899"); // pink-500
          ctx.fillStyle = grad;
          ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
          ctx.shadowBlur = isPlaying ? 6 : 2;
        } else if (isCurrent) {
          // Playhead Bar: Bright Accent & Aura
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 12;
        } else {
          // Unplayed Waveform: Sleek Muted Studio Neutral
          ctx.fillStyle = "rgba(120, 113, 108, 0.35)";
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        // Draw Rounded Bar
        const radius = barWidth / 2;
        const topY = centerY - barHeight;
        const barH = barHeight * 2;

        ctx.beginPath();
        ctx.roundRect(x, topY, barWidth, barH, [radius]);
        ctx.fill();
      }

      // 3. Draw Laser Playhead Line
      const playheadX = (progressPercent / 100) * width;
      ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 2);
      ctx.lineTo(playheadX, height - 2);
      ctx.stroke();

      // Reset Shadow
      ctx.shadowBlur = 0;

      // 4. Draw Hover Scrubber Guide Line if active
      if (hoverPosition && !isDragging) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hoverPosition.x, 0);
        ctx.lineTo(hoverPosition.x, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isPlaying) {
        phase += 0.09;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, progressPercent, hoverPosition, isDragging]);

  // Handle Seek from Coordinates
  const handleSeekFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container || duration <= 0) return;

      const rect = container.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percentage = clickX / rect.width;
      const targetTime = percentage * duration;

      onSeek(targetTime);
    },
    [duration, onSeek]
  );

  // Mouse & Touch Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeekFromClientX(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || duration <= 0) return;

    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = (x / rect.width) * 100;
    const time = (x / rect.width) * duration;

    setHoverPosition({ x, time, percent });

    if (isDragging) {
      handleSeekFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      handleSeekFromClientX(e.clientX);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverPosition(null);
    }
  };

  return (
    <div className="w-full space-y-3 select-none">
      {/* Header Info Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] uppercase tracking-wider border border-amber-500/30 flex items-center space-x-1">
            <Radio className={`w-3 h-3 text-amber-400 ${isPlaying ? "animate-pulse" : ""}`} />
            <span>Chapter {chapterNumber}</span>
          </span>
          <h3 className="font-serif font-bold text-stone-100 text-sm truncate max-w-[200px] sm:max-w-xs">
            {trackTitle}
          </h3>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-stone-400">
          <span className="text-amber-400 font-semibold">{voiceName}</span>
          <span>•</span>
          <span>{accent}</span>
          {wordCount > 0 && (
            <>
              <span>•</span>
              <span className="text-stone-300">{wordCount.toLocaleString()} words</span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Waveform Display Deck */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="relative w-full h-24 rounded-2xl bg-stone-950 border border-stone-800 p-2 overflow-hidden cursor-pointer group hover:border-amber-500/50 transition-colors shadow-inner"
      >
        {/* Real-time Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={80}
          className="w-full h-full block"
        />

        {/* Floating Hover Time Tooltip */}
        {hoverPosition && (
          <div
            className="absolute top-1.5 transform -translate-x-1/2 px-2 py-0.5 rounded-md bg-stone-900/95 border border-amber-500/50 text-[10px] font-mono text-amber-300 pointer-events-none shadow-lg z-20 backdrop-blur-sm whitespace-nowrap"
            style={{ left: `${hoverPosition.x}px` }}
          >
            {formatTime(hoverPosition.time)} ({Math.round(hoverPosition.percent)}%)
          </div>
        )}

        {/* Live Playhead Marker Tag */}
        <div
          className="absolute bottom-1.5 transform -translate-x-1/2 px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 font-mono font-bold text-[9px] pointer-events-none shadow-md z-10 transition-all duration-75"
          style={{ left: `${progressPercent}%` }}
        >
          {formatTime(currentTime)}
        </div>

        {/* Ambient Subtle Glow Backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Bottom Timeline Info Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-stone-400">
        <div className="flex items-center space-x-2">
          <span className="text-amber-400 font-bold text-sm">{formatTime(currentTime)}</span>
          <span className="text-stone-600">/</span>
          <span className="text-stone-300">{formatTime(duration)}</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 text-[10px] border border-stone-800">
            {Math.round(progressPercent)}%
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-stone-500">
            Remaining: <span className="text-stone-300 font-semibold">-{formatTime(remainingTime)}</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              status === "ready"
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                : status === "synthesizing"
                ? "bg-amber-950/60 text-amber-300 border-amber-500/30 animate-pulse"
                : "bg-stone-900 text-stone-400 border-stone-800"
            }`}
          >
            {status === "ready" ? "✓ Mastered WAV" : status === "synthesizing" ? "Synthesizing..." : "Interactive Voice"}
          </span>
        </div>
      </div>
    </div>
  );
};
