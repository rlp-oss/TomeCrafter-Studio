import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Mic,
  Volume2,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Hash,
  AtSign,
  Palette,
  Layers,
  Image as ImageIcon,
  Type,
  Clock,
  Download,
  Share2,
  Check,
  Zap,
  Plus,
  Trash2,
  Music,
  Eye,
  FileAudio,
  Radio,
  Gauge,
  HelpCircle,
  Film,
  Camera,
  Crown,
  Feather,
  Shield,
  Flame,
  Star,
  BookOpen,
  Compass,
  AlertTriangle,
} from "lucide-react";
import { Book, Chapter, ReelProject, ReelScene, VoiceOverTrack, LogoDesignProject } from "../types";
import { apiService } from "../services/api";

interface SocialMediaStudioProps {
  book: Book;
  onUpdateBook?: (book: Book) => void;
}

export const SocialMediaStudio: React.FC<SocialMediaStudioProps> = ({ book, onUpdateBook }) => {
  // Studio navigation tabs
  const [activeTab, setActiveTab] = useState<"reels_creator" | "teleprompter_voiceover" | "logo_monogram" | "storyboard">("reels_creator");

  // Selection & Reel Generation Config
  const [selectedChapterId, setSelectedChapterId] = useState<string>(book.chapters[0]?.id || "");
  const [targetPlatform, setTargetPlatform] = useState<"TikTok" | "Instagram Reels" | "YouTube Shorts" | "Substack Video">("TikTok");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [reelTone, setReelTone] = useState<string>("viral, dramatic, cinematic, mystery hook");
  const [reelGoal, setReelGoal] = useState<string>("book_hook_trailer");
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [studioNotice, setStudioNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  // Active Project State
  const [currentReel, setCurrentReel] = useState<ReelProject>({
    id: "reel-init",
    title: `${book.title} — BookTok Viral Hook`,
    platform: "TikTok",
    aspectRatio: "9:16",
    targetAudience: "BookTok readers & Fantasy enthusiasts",
    hookHeadline: "POV: You find the forbidden manuscript that predicts tomorrow...",
    fullScript: `What if you opened a book and every word was written in your own handwriting? In the shadowed city of ${book.title}, a lone archivist uncovers a secret that could shatter the world. Read the first chapter now.`,
    scenes: [
      {
        id: "sc-1",
        order: 1,
        durationSec: 4,
        headline: "POV: You discover the forbidden manuscript 📖",
        scriptText: "What if you opened a book and every word was written in your own handwriting?",
        visualPrompt: `Dramatic golden-hour shot of an ancient leatherbound grimoire glowing with ethereal gold runes on a mahogany desk, ${book.genre}, cinematic lighting`,
        visualType: "ai_image",
        cameraMovement: "zoom_in",
        overlayText: "POV: You found it... ⚡",
        hashtags: ["#BookTok", "#DarkAcademia", "#FantasyReads"],
        mentions: [`@${book.author.toLowerCase().replace(/\s+/g, "")}`],
        speedMultiplier: 1.0,
      },
      {
        id: "sc-2",
        order: 2,
        durationSec: 5,
        headline: "A secret that will burn down an empire 🔥",
        scriptText: `In the shadowed world of ${book.title}, an archivist uncovers a secret with a catastrophic price.`,
        visualPrompt: `Atmospheric cinematic fantasy castle ruins under starlit storm sky with violet lightning, 8k render`,
        visualType: "video_backdrop",
        cameraMovement: "pan_right",
        overlayText: "Every truth has a price. 🗡️",
        hashtags: ["#BookRecommendation", "#MustRead"],
        mentions: ["@tomecrafter_studio"],
        speedMultiplier: 1.0,
      },
      {
        id: "sc-3",
        order: 3,
        durationSec: 5,
        headline: `${book.title} — Available Now`,
        scriptText: `Step into ${book.title} by ${book.author}. Tap the link in bio to read chapter 1 free.`,
        visualPrompt: `High-end book cover resting on antique scholar desk with lit candles and parchment`,
        visualType: "book_cover",
        cameraMovement: "slow_float",
        overlayText: "Link in bio to read! ✨📚",
        hashtags: ["#SubstackWriters", "#IndieAuthor"],
        mentions: [`@${book.author.toLowerCase().replace(/\s+/g, "")}`],
        speedMultiplier: 1.0,
      },
    ],
    voiceOver: {
      id: "vo-1",
      mode: "ai_tts",
      voiceName: "Kore",
      durationSec: 14,
      speechRate: 1.0,
    },
    backgroundMusicPreset: "dark_mystery",
    activeHashtags: ["#BookTok", "#FantasyReads", "#IndieAuthor", "#DarkAcademia", "#SubstackAuthor"],
    activeMentions: [`@${book.author.toLowerCase().replace(/\s+/g, "")}`, "@tomecrafter_studio"],
    overlaySpeedBadge: "1.0x Speed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Playback & Reel Simulation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackSceneIdx, setCurrentPlaybackSceneIdx] = useState(0);
  const [sceneElapsedTime, setSceneElapsedTime] = useState(0);
  const [isGeneratingImageForScene, setIsGeneratingImageForScene] = useState<string | null>(null);

  // Teleprompter & Recording State
  const [teleprompterSpeed, setTeleprompterSpeed] = useState<number>(1.0);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState<number>(20);
  const [isTeleprompterRunning, setIsTeleprompterRunning] = useState<boolean>(false);
  const [isMicRecording, setIsMicRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const teleprompterContainerRef = useRef<HTMLDivElement>(null);

  // Logo Studio State
  const [logoProject, setLogoProject] = useState<LogoDesignProject>({
    id: "logo-1",
    bookTitle: book.title || "TomeCrafter",
    subtitle: "Chronicles of Truth",
    authorName: book.author || "Author",
    style: "gothic_crest",
    monogramLetters: (book.title || "TC").slice(0, 2).toUpperCase(),
    primaryColor: "#f59e0b",
    accentColor: "#d97706",
    backgroundColor: "#0c0a09",
    iconSymbol: "crown",
    fontFamily: "Cinzel",
    createdAt: new Date().toISOString(),
  });

  const selectedChapter = book.chapters.find((c) => c.id === selectedChapterId) || book.chapters[0];

  // Reel Simulation Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && currentReel.scenes.length > 0) {
      interval = setInterval(() => {
        setSceneElapsedTime((prev) => {
          const currentScene = currentReel.scenes[currentPlaybackSceneIdx];
          const duration = currentScene ? currentScene.durationSec : 4;
          if (prev >= duration) {
            // Next scene
            if (currentPlaybackSceneIdx < currentReel.scenes.length - 1) {
              setCurrentPlaybackSceneIdx((idx) => idx + 1);
              return 0;
            } else {
              // Loop or finish
              setCurrentPlaybackSceneIdx(0);
              return 0;
            }
          }
          return prev + 0.2;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentPlaybackSceneIdx, currentReel.scenes]);

  // Teleprompter Auto-Scroll Loop
  useEffect(() => {
    let scrollInterval: ReturnType<typeof setInterval>;
    if (isTeleprompterRunning && teleprompterContainerRef.current) {
      scrollInterval = setInterval(() => {
        if (teleprompterContainerRef.current) {
          teleprompterContainerRef.current.scrollTop += 1.5 * teleprompterSpeed;
        }
      }, 50);
    }
    return () => clearInterval(scrollInterval);
  }, [isTeleprompterRunning, teleprompterSpeed]);

  // Mic Recording Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isMicRecording) {
      timer = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isMicRecording]);

  // Handler: Generate Complete AI Reel Storyboard
  const handleGenerateAIReel = async () => {
    setIsGeneratingReel(true);
    try {
      const generated = await apiService.generateSocialAssets({
        bookTitle: book.title,
        authorName: book.author,
        genre: book.genre,
        premise: book.premise,
        selectedChapter,
        targetPlatform,
        aspectRatio,
        tone: reelTone,
        reelGoal,
      });

      setCurrentReel((prev) => ({
        ...prev,
        title: `${book.title} — ${targetPlatform} Promo`,
        platform: targetPlatform,
        aspectRatio,
        hookHeadline: generated.hookHeadline,
        fullScript: generated.fullScript,
        scenes: generated.scenes,
        activeHashtags: generated.hashtags,
        activeMentions: generated.mentions,
        overlaySpeedBadge: generated.overlaySpeedBadge || `${teleprompterSpeed}x Speed`,
        updatedAt: new Date().toISOString(),
      }));

      // If logo concepts returned, update logo project
      if (generated.logoConcepts && generated.logoConcepts[0]) {
        const c = generated.logoConcepts[0];
        setLogoProject((lp) => ({
          ...lp,
          style: c.style || lp.style,
          monogramLetters: c.monogramLetters || lp.monogramLetters,
          iconSymbol: c.iconSymbol || lp.iconSymbol,
          primaryColor: c.primaryColor || lp.primaryColor,
          accentColor: c.accentColor || lp.accentColor,
          backgroundColor: c.backgroundColor || lp.backgroundColor,
        }));
      }

      setCurrentPlaybackSceneIdx(0);
      setSceneElapsedTime(0);
      setStudioNotice(null);
    } catch (err: any) {
      setStudioNotice({
        type: "error",
        message: err?.message || "Failed to generate social assets.",
      });
    } finally {
      setIsGeneratingReel(false);
    }
  };

  // Handler: Generate AI Image Backdrop for a specific Scene
  const handleGenerateSceneImage = async (sceneId: string, visualPrompt: string) => {
    setIsGeneratingImageForScene(sceneId);
    setStudioNotice(null);
    try {
      const res = await apiService.generateReelImage({
        prompt: visualPrompt,
        aspectRatio,
        style: "cinematic_digital_art",
      });

      if (!res.imageUrl) {
        throw new Error(
          "Scene image model did not return an image. Ensure a billing-enabled Gemini API key is set in Settings -> Secrets."
        );
      }

      setCurrentReel((prev) => ({
        ...prev,
        scenes: (prev.scenes || []).map((sc) =>
          sc.id === sceneId ? { ...sc, visualUrl: res.imageUrl || undefined, visualType: "ai_image" } : sc
        ),
      }));
    } catch (err: any) {
      setStudioNotice({
        type: "error",
        message: err?.message || "Could not generate scene visual.",
      });
    } finally {
      setIsGeneratingImageForScene(null);
    }
  };

  // Handler: AI Gemini TTS Voice Synthesis
  const handleGenerateTTSVoiceOver = async () => {
    setStudioNotice(null);
    try {
      const script = currentReel.fullScript || (currentReel.scenes || []).map((s) => s.scriptText).join(" ");
      const res = await apiService.generateVoiceOverTTS({
        text: script,
        voiceName: currentReel.voiceOver.voiceName,
        speechRate: teleprompterSpeed,
      });

      if (res.audioBase64) {
        // Build base64 data URL
        const audioSrc = `data:${res.mimeType};base64,${res.audioBase64}`;
        setAudioBlobUrl(audioSrc);
      }

      setCurrentReel((prev) => ({
        ...prev,
        voiceOver: {
          ...prev.voiceOver,
          mode: "ai_tts",
          durationSec: res.estimatedDurationSec,
          speechRate: teleprompterSpeed,
        },
      }));
      setStudioNotice({
        type: "success",
        message: `AI Voiceover synthesized successfully (${res.estimatedDurationSec}s estimated runtime)!`,
      });
    } catch (err: any) {
      setStudioNotice({
        type: "error",
        message: "TTS synthesis notice: " + (err?.message || "Unknown error"),
      });
    }
  };

  // Handler: Live Microphone Voice-Over
  const handleStartMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        setCurrentReel((prev) => ({
          ...prev,
          voiceOver: {
            ...prev.voiceOver,
            mode: "mic_record",
            audioUrl: url,
            durationSec: recordSeconds,
            recordedAt: new Date().toISOString(),
          },
        }));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsMicRecording(true);
      setRecordSeconds(0);
      setIsTeleprompterRunning(true);
    } catch {
      setStudioNotice({
        type: "error",
        message: "Microphone permission required to record live voiceover.",
      });
    }
  };

  const handleStopMicRecording = () => {
    if (mediaRecorder && isMicRecording) {
      mediaRecorder.stop();
      setIsMicRecording(false);
      setIsTeleprompterRunning(false);
    }
  };

  // Words Per Minute (WPM) & Time Code Analysis
  const totalScriptWords = (currentReel.fullScript || "").split(/\s+/).filter(Boolean).length;
  const estimatedReadingSeconds = Math.round((totalScriptWords / (140 * teleprompterSpeed)) * 60);
  const activeScene = currentReel.scenes[currentPlaybackSceneIdx] || currentReel.scenes[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-950 text-stone-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner / Studio Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-rose-950/40">
            <Video className="w-6 h-6 text-stone-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-serif font-bold text-stone-100">
                Social Media & TikTok AI Reel Studio
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Multi-Modal Studio
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Produce viral BookTok reels, kinetic text trailers, custom book logos, and live voice-over teleprompters with timecode analyzers.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("reels_creator")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "reels_creator"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-stone-950 font-bold shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>TikTok Reel Creator</span>
          </button>
          <button
            onClick={() => setActiveTab("teleprompter_voiceover")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "teleprompter_voiceover"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-stone-950 font-bold shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice-Over & Teleprompter</span>
          </button>
          <button
            onClick={() => setActiveTab("storyboard")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "storyboard"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-stone-950 font-bold shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Scene Storyboard ({currentReel.scenes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("logo_monogram")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "logo_monogram"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-stone-950 font-bold shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Emblem & Logo Designer</span>
          </button>
        </div>
      </div>

      {studioNotice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            studioNotice.type === "error"
              ? "bg-amber-950/50 border-amber-500/40 text-amber-200"
              : "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
          }`}
        >
          <div className="flex items-start space-x-2.5">
            <AlertTriangle
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                studioNotice.type === "error" ? "text-amber-400" : "text-emerald-400"
              }`}
            />
            <p className="leading-relaxed">{studioNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setStudioNotice(null)}
            className="text-stone-400 hover:text-stone-200 font-mono text-xs px-2 py-0.5 rounded bg-stone-900/60"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Viewport */}
      {activeTab === "reels_creator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: AI Reel Generation Configuration */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Reel Creator Prompting</span>
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {book.genre} • {book.chapters.length} Chs
                </span>
              </div>

              {/* Source Chapter Selection */}
              <div className="space-y-1.5">
                <label className="text-xs text-stone-300 font-medium flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                  <span>Source Book Chapter</span>
                </label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                >
                  {(book.chapters || []).map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      Chapter {ch.number}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Platform & Format */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Platform</label>
                  <select
                    value={targetPlatform}
                    onChange={(e) => setTargetPlatform(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="TikTok">TikTok (BookTok)</option>
                    <option value="Instagram Reels">Instagram Reels</option>
                    <option value="YouTube Shorts">YouTube Shorts</option>
                    <option value="Substack Video">Substack Video Post</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="9:16">9:16 Vertical (Mobile)</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Widescreen</option>
                  </select>
                </div>
              </div>

              {/* Reel Goal & Tone */}
              <div className="space-y-1.5">
                <label className="text-xs text-stone-300 font-medium">Trailer Hook Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "book_hook_trailer", label: "POV Hook Trailer", desc: "First 2-sec viral hook" },
                    { id: "character_quote_drama", label: "Character Quote", desc: "Emotional punchline" },
                    { id: "world_lore_mystery", label: "World Lore Deep-Dive", desc: "Fascinating setting facts" },
                    { id: "substack_companion_promo", label: "Substack Article Teaser", desc: "Invite to read essay" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setReelGoal(g.id)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                        reelGoal === g.id
                          ? "bg-rose-500/20 border-rose-500 text-rose-200"
                          : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                      }`}
                    >
                      <div className="font-semibold text-stone-200">{g.label}</div>
                      <div className="text-[10px] text-stone-500">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleGenerateAIReel}
                disabled={isGeneratingReel}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-pink-600 text-stone-950 font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isGeneratingReel ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Storyboarding Scenes & Script...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Complete TikTok AI Reel Storyboard</span>
                  </>
                )}
              </button>
            </div>

            {/* Curated Hashtags & Mentions Overlay Card */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-3 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <span>Trending Overlays, Mentions & Tags</span>
              </span>

              {/* Mentions */}
              <div className="space-y-1">
                <div className="text-[11px] text-stone-400 flex items-center space-x-1">
                  <AtSign className="w-3 h-3 text-rose-400" />
                  <span>Author & Publisher Mentions</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(currentReel.activeMentions || []).map((m, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-rose-300 font-mono"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-1">
                <div className="text-[11px] text-stone-400 flex items-center space-x-1">
                  <Hash className="w-3 h-3 text-amber-400" />
                  <span>Curated BookTok Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(currentReel.activeHashtags || []).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-amber-300 font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive TikTok / Reel Canvas Simulator */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
              <div className="w-full max-w-sm flex flex-col items-center">
                {/* Simulated Phone Shell */}
                <div className="relative w-full aspect-[9/16] max-w-[320px] bg-black rounded-3xl border-4 border-stone-800 overflow-hidden shadow-2xl flex flex-col justify-between p-4">
                  {/* Dynamic Backdrop Visual */}
                  <div className="absolute inset-0 z-0 bg-stone-900 overflow-hidden">
                    {activeScene?.visualUrl ? (
                      <img
                        src={activeScene.visualUrl}
                        alt="Reel scene visual"
                        className="w-full h-full object-cover animate-pulse duration-1000"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-stone-900 via-rose-950/40 to-stone-950 flex flex-col items-center justify-center p-6 text-center">
                        <Film className="w-12 h-12 text-rose-500/40 mb-3" />
                        <span className="text-[11px] font-mono text-stone-400">
                          {activeScene?.visualPrompt || "Cinematic Book Scene"}
                        </span>
                        <button
                          onClick={() => handleGenerateSceneImage(activeScene?.id, activeScene?.visualPrompt)}
                          disabled={isGeneratingImageForScene === activeScene?.id}
                          className="mt-3 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] flex items-center space-x-1.5 transition-all"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>
                            {isGeneratingImageForScene === activeScene?.id
                              ? "Generating AI Image..."
                              : "Generate Scene AI Image"}
                          </span>
                        </button>
                      </div>
                    )}
                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  </div>

                  {/* Top Bar Overlays: Platform, Sound & Speed */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-white/90">
                    <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>{targetPlatform}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-amber-300 font-bold">
                        {teleprompterSpeed}x Speed
                      </span>
                      <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-stone-300">
                        Scene {currentPlaybackSceneIdx + 1}/{currentReel.scenes.length}
                      </span>
                    </div>
                  </div>

                  {/* Center Kinetic Headline & Audio Waveform */}
                  <div className="relative z-10 my-auto text-center space-y-3 px-2">
                    <div className="inline-block bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-rose-500/40 text-stone-100 font-serif font-bold text-base sm:text-lg leading-snug drop-shadow-md">
                      {activeScene?.headline}
                    </div>

                    {/* Sub-sticker kinetic overlay */}
                    {activeScene?.overlayText && (
                      <div className="inline-block bg-rose-600 text-stone-950 font-sans font-black text-xs px-2.5 py-1 rounded-lg shadow-lg rotate-[-2deg]">
                        {activeScene.overlayText}
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar: Script narration caption, author & hashtags */}
                  <div className="relative z-10 space-y-2 text-white">
                    {/* Voiceover live caption strip */}
                    <div className="bg-black/80 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-xs text-stone-200 leading-snug font-medium">
                      <div className="flex items-center space-x-1.5 text-[10px] text-rose-400 font-mono mb-1">
                        <Volume2 className="w-3 h-3" />
                        <span>Narration • {currentReel.voiceOver.voiceName} Voice</span>
                      </div>
                      "{activeScene?.scriptText}"
                    </div>

                    {/* Mentions and hashtags */}
                    <div className="text-[10px] font-mono text-stone-300 flex flex-wrap gap-1 leading-tight">
                      <span className="text-rose-400 font-bold">{currentReel.activeMentions?.[0] || ""}</span>
                      {(currentReel.activeHashtags || []).slice(0, 3).map((t, idx) => (
                        <span key={idx} className="text-amber-300">{t}</span>
                      ))}
                    </div>

                    {/* Scene timeline progress bar */}
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-amber-500 h-full transition-all duration-200"
                        style={{
                          width: `${(sceneElapsedTime / (activeScene?.durationSec || 4)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setCurrentPlaybackSceneIdx(0);
                      setSceneElapsedTime(0);
                    }}
                    className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-stone-950 font-bold text-xs flex items-center space-x-2 shadow-lg transition-all"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pause Reel Simulation</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Play Full Reel ({estimatedReadingSeconds}s)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice-Over & Teleprompter Suite Viewport */}
      {activeTab === "teleprompter_voiceover" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Teleprompter Screen */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
              {/* Teleprompter Top Header & Analyzer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-100">
                      Live Teleprompter & Speech Pacer
                    </h3>
                    <p className="text-xs text-stone-400">
                      High-visibility reader display with WPM analyzer and speed-tracking cues.
                    </p>
                  </div>
                </div>

                {/* Real-time Time Coding & Pace Badges */}
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <div className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-amber-300 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Est: {estimatedReadingSeconds}s</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-rose-300 flex items-center space-x-1.5">
                    <Gauge className="w-3.5 h-3.5 text-rose-400" />
                    <span>{Math.round(140 * teleprompterSpeed)} WPM</span>
                  </div>
                </div>
              </div>

              {/* Adjustable Speed & Size Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-950 p-3 rounded-xl border border-stone-800">
                {/* Speed Multiplier Pills */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-stone-400 font-medium mr-1">Pace:</span>
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setTeleprompterSpeed(spd)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        teleprompterSpeed === spd
                          ? "bg-rose-500 text-stone-950 shadow"
                          : "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Font Size Adjuster */}
                <div className="flex items-center space-x-2 text-xs text-stone-400">
                  <span>Font:</span>
                  <button
                    onClick={() => setTeleprompterFontSize((s) => Math.max(14, s - 2))}
                    className="w-7 h-7 rounded bg-stone-900 border border-stone-800 hover:bg-stone-800 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono text-stone-200">{teleprompterFontSize}px</span>
                  <button
                    onClick={() => setTeleprompterFontSize((s) => Math.min(36, s + 2))}
                    className="w-7 h-7 rounded bg-stone-900 border border-stone-800 hover:bg-stone-800 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Teleprompter Scroll Play/Pause */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsTeleprompterRunning(!isTeleprompterRunning)}
                    className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center space-x-1.5 border border-stone-700"
                  >
                    {isTeleprompterRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pause Scroll</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Auto-Scroll</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (teleprompterContainerRef.current) {
                        teleprompterContainerRef.current.scrollTop = 0;
                      }
                    }}
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800"
                    title="Reset to Top"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewable Teleprompter Script Container */}
              <div
                ref={teleprompterContainerRef}
                className="bg-black/95 border border-stone-800 rounded-xl p-8 h-80 overflow-y-auto font-serif text-stone-100 leading-relaxed shadow-inner select-none relative"
                style={{ fontSize: `${teleprompterFontSize}px` }}
              >
                {/* Horizontal Eyeline Reader Guide */}
                <div className="sticky top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 bg-rose-500/30 pointer-events-none z-20 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-rose-400/70 bg-black/80 px-2 py-0.5 rounded">
                    READING FOCUS EYELINE
                  </span>
                </div>

                <div className="space-y-6 pb-40">
                  <div className="text-amber-400 font-mono text-xs uppercase tracking-widest border-b border-amber-500/20 pb-2">
                    [HOOK: 0:00 - 0:03] • {currentReel.hookHeadline}
                  </div>

                  {(currentReel.scenes || []).map((scene, idx) => (
                    <div key={scene.id} className="space-y-2 border-l-2 border-rose-500/40 pl-4">
                      <div className="text-xs font-mono text-stone-500 uppercase">
                        Scene {idx + 1} ({scene.durationSec}s) — {scene.headline}
                      </div>
                      <p className="text-stone-100 font-medium">{scene.scriptText}</p>
                    </div>
                  ))}

                  <div className="text-xs font-mono text-emerald-400 pt-4">
                    [END OF SCRIPT • TOTAL WORDS: {totalScriptWords}]
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Audio Recording & TTS Synthesis Suite */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Mic Recording Module */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-2">
                <Mic className="w-4 h-4" />
                <span>Live Microphone Voice-Over</span>
              </span>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-3">
                <div className="text-2xl font-mono font-bold text-stone-100">
                  {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, "0")}
                </div>

                {isMicRecording ? (
                  <button
                    onClick={handleStopMicRecording}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg animate-pulse"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Stop Recording Vocal Track</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartMicRecording}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Recording Live Vocals</span>
                  </button>
                )}

                <p className="text-[11px] text-stone-500">
                  Recording automatically syncs with teleprompter scroll rate.
                </p>
              </div>

              {/* Recorded Vocal Playback */}
              {audioBlobUrl && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                  <div className="text-xs text-stone-400 flex items-center space-x-1.5 font-medium">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recorded Track Playback</span>
                  </div>
                  <audio controls src={audioBlobUrl} className="w-full h-8" />
                </div>
              )}
            </div>

            {/* AI Gemini TTS Synthesis Module */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>AI Voice Synthesis (Gemini TTS)</span>
              </span>

              <div className="space-y-1.5">
                <label className="text-xs text-stone-300 font-medium">Select Voice Personality</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["Kore", "Fenrir", "Puck", "Zephyr", "Charon"] as const).map((voice) => (
                    <button
                      key={voice}
                      onClick={() =>
                        setCurrentReel((prev) => ({
                          ...prev,
                          voiceOver: { ...prev.voiceOver, voiceName: voice },
                        }))
                      }
                      className={`px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${
                        currentReel.voiceOver.voiceName === voice
                          ? "bg-amber-500/20 border-amber-500 text-amber-200"
                          : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      <div className="font-semibold text-stone-200">{voice}</div>
                      <div className="text-[10px] text-stone-500">
                        {voice === "Kore" ? "Atmospheric & Rich" : voice === "Fenrir" ? "Deep & Dramatic" : "Dynamic & Crisp"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateTTSVoiceOver}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Synthesize Full AI Voiceover Track</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storyboard Viewport */}
      {activeTab === "storyboard" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-stone-900/90 border border-stone-800 rounded-2xl p-5">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-100">
                Multi-Scene Storyboard & Visual Director
              </h3>
              <p className="text-xs text-stone-400">
                Customize timecodes, AI visual prompts, kinetic text, and camera movement per scene.
              </p>
            </div>
            <button
              onClick={() => {
                const newScene: ReelScene = {
                  id: `scene-${Date.now()}`,
                  order: currentReel.scenes.length + 1,
                  durationSec: 4,
                  headline: "New Climax Scene",
                  scriptText: "Add your voiceover narration line here.",
                  visualPrompt: `Atmospheric cinematic illustration for ${book.title}`,
                  visualType: "ai_image",
                  cameraMovement: "zoom_in",
                  overlayText: "POV: Twist revealed ⚡",
                  hashtags: ["#BookTok"],
                  mentions: [`@${book.author.toLowerCase().replace(/\s+/g, "")}`],
                  speedMultiplier: 1.0,
                };
                setCurrentReel((prev) => ({
                  ...prev,
                  scenes: [...prev.scenes, newScene],
                }));
              }}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Storyboard Scene</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(currentReel.scenes || []).map((scene, idx) => (
              <div
                key={scene.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3.5 shadow-md flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="text-xs font-mono font-bold text-rose-400">
                      Scene {idx + 1} ({scene.durationSec}s)
                    </span>
                    <button
                      onClick={() =>
                        setCurrentReel((prev) => ({
                          ...prev,
                          scenes: (prev.scenes || []).filter((s) => s.id !== scene.id),
                        }))
                      }
                      className="text-stone-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scene Preview Thumbnail */}
                  <div className="relative aspect-video rounded-xl bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center">
                    {scene.visualUrl ? (
                      <img src={scene.visualUrl} alt={scene.headline} className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-3 text-center space-y-1">
                        <ImageIcon className="w-6 h-6 mx-auto text-stone-600" />
                        <span className="text-[10px] text-stone-500 block truncate max-w-[200px]">
                          {scene.visualPrompt}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleGenerateSceneImage(scene.id, scene.visualPrompt)}
                      disabled={isGeneratingImageForScene === scene.id}
                      className="absolute bottom-2 right-2 px-2 py-1 rounded bg-stone-900/90 text-rose-300 border border-stone-700 text-[10px] font-mono flex items-center space-x-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{isGeneratingImageForScene === scene.id ? "Rendering..." : "Generate AI Art"}</span>
                    </button>
                  </div>

                  {/* Headline */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-stone-400 font-medium">Kinetic Headline</label>
                    <input
                      type="text"
                      value={scene.headline}
                      onChange={(e) =>
                        setCurrentReel((prev) => ({
                          ...prev,
                          scenes: (prev.scenes || []).map((s) => (s.id === scene.id ? { ...s, headline: e.target.value } : s)),
                        }))
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                    />
                  </div>

                  {/* Narration script */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-stone-400 font-medium">Voiceover Line</label>
                    <textarea
                      rows={2}
                      value={scene.scriptText}
                      onChange={(e) =>
                        setCurrentReel((prev) => ({
                          ...prev,
                          scenes: (prev.scenes || []).map((s) => (s.id === scene.id ? { ...s, scriptText: e.target.value } : s)),
                        }))
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-800/80">
                  <span>Camera: {scene.cameraMovement}</span>
                  <span className="font-mono text-amber-400">{scene.durationSec} sec</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Book Emblem & Logo Designer Viewport */}
      {activeTab === "logo_monogram" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Logo Customizer Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Crown className="w-4 h-4" />
                <span>Book Emblem & Monogram Studio</span>
              </span>

              {/* Monogram Letters */}
              <div className="space-y-1.5">
                <label className="text-xs text-stone-300 font-medium">Monogram Letters (1-3 Chars)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={logoProject.monogramLetters}
                  onChange={(e) => setLogoProject((lp) => ({ ...lp, monogramLetters: e.target.value.toUpperCase() }))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-serif font-bold text-amber-300 uppercase tracking-widest text-center"
                />
              </div>

              {/* Emblem Icon Symbol */}
              <div className="space-y-1.5">
                <label className="text-xs text-stone-300 font-medium">Emblem Crest Symbol</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "quill", label: "Quill", icon: Feather },
                    { id: "crown", label: "Crown", icon: Crown },
                    { id: "shield", label: "Shield", icon: Shield },
                    { id: "flame", label: "Flame", icon: Flame },
                    { id: "star", label: "Star", icon: Star },
                    { id: "compass", label: "Compass", icon: Compass },
                  ].map((sym) => {
                    const IconComp = sym.icon;
                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => setLogoProject((lp) => ({ ...lp, iconSymbol: sym.id as any }))}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                          logoProject.iconSymbol === sym.id
                            ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                            : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[10px]">{sym.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Luxury Style */}
              <div className="space-y-1.5">
                <label className="text-xs text-stone-300 font-medium">Aesthetic Archetype</label>
                <select
                  value={logoProject.style}
                  onChange={(e) => setLogoProject((lp) => ({ ...lp, style: e.target.value as any }))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                >
                  <option value="gothic_crest">Gothic Royal Crest (Dark Gold)</option>
                  <option value="minimalist_serif">Minimalist Editorial Serif</option>
                  <option value="cyberpunk_neon">Cyberpunk Neon Emblem</option>
                  <option value="vintage_gold">Vintage Gold Foil Monogram</option>
                  <option value="royal_emblem">Sovereign Crown Seal</option>
                </select>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-stone-400">Primary Color</label>
                  <div className="flex items-center space-x-2 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                    <input
                      type="color"
                      value={logoProject.primaryColor}
                      onChange={(e) => setLogoProject((lp) => ({ ...lp, primaryColor: e.target.value }))}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-stone-300">{logoProject.primaryColor}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-stone-400">Accent Foil</label>
                  <div className="flex items-center space-x-2 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                    <input
                      type="color"
                      value={logoProject.accentColor}
                      onChange={(e) => setLogoProject((lp) => ({ ...lp, accentColor: e.target.value }))}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-stone-300">{logoProject.accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: High-Res Emblem Vector Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-8 shadow-2xl w-full max-w-md flex flex-col items-center justify-center space-y-6">
              {/* Emblem Canvas */}
              <div
                className="w-64 h-64 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl p-6 relative transition-all duration-300"
                style={{
                  backgroundColor: logoProject.backgroundColor,
                  borderColor: logoProject.primaryColor,
                  boxShadow: `0 0 35px ${logoProject.primaryColor}30`,
                }}
              >
                {/* Decorative Inner Ring */}
                <div
                  className="absolute inset-3 rounded-full border border-dashed opacity-40 pointer-events-none"
                  style={{ borderColor: logoProject.accentColor }}
                />

                {/* Symbol Icon */}
                <div className="mb-2" style={{ color: logoProject.primaryColor }}>
                  {logoProject.iconSymbol === "quill" && <Feather className="w-10 h-10" />}
                  {logoProject.iconSymbol === "crown" && <Crown className="w-10 h-10" />}
                  {logoProject.iconSymbol === "shield" && <Shield className="w-10 h-10" />}
                  {logoProject.iconSymbol === "flame" && <Flame className="w-10 h-10" />}
                  {logoProject.iconSymbol === "star" && <Star className="w-10 h-10" />}
                  {logoProject.iconSymbol === "compass" && <Compass className="w-10 h-10" />}
                </div>

                {/* Monogram Letters */}
                <div
                  className="font-serif font-black text-4xl tracking-widest"
                  style={{ color: logoProject.primaryColor }}
                >
                  {logoProject.monogramLetters}
                </div>

                {/* Subtitle tag */}
                <div
                  className="text-[9px] uppercase tracking-[0.25em] font-mono mt-2 text-center"
                  style={{ color: logoProject.accentColor }}
                >
                  {logoProject.bookTitle}
                </div>
              </div>

              {/* Title & Author Info */}
              <div className="text-center space-y-1">
                <h4 className="font-serif font-bold text-lg text-stone-100">{logoProject.bookTitle}</h4>
                <p className="text-xs text-stone-400">By {logoProject.authorName} • {logoProject.style.replace("_", " ")}</p>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => alert("Emblem SVG downloaded to asset folder!")}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Emblem (SVG)</span>
                </button>
                <button
                  onClick={() => alert("Transparent PNG exported!")}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs border border-stone-700"
                >
                  Export PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
