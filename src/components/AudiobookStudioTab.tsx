import React, { useState, useEffect, useRef } from "react";
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Cloud,
  CheckCircle2,
  Sparkles,
  Sliders,
  FileAudio,
  ListMusic,
  FolderArchive,
  RefreshCw,
  AlertCircle,
  Clock,
  ExternalLink,
  Edit3,
  Check,
  Disc,
  Radio,
  FileText,
  Volume1,
  Share2,
  Cpu,
  Key,
  Flame,
  Mic,
  Zap,
} from "lucide-react";
import { Book, Chapter } from "../types";
import {
  AUDIOBOOK_VOICE_PRESETS,
  AudiobookVoicePreset,
  AudiobookChapterTrack,
  AudiobookSettings,
  DEFAULT_AUDIOBOOK_SETTINGS,
  generateChapterNarrationScript,
  matchBrowserVoice,
  generateSyntheticAudioTrack,
  downloadAudioTrackFile,
  downloadFullAudiobookZip,
  uploadAudiobookToGoogleDrive,
  auditionVoicePresetWithAI,
} from "../services/audiobookService";
import { isGoogleDriveAutoSyncEnabled } from "../services/googleDrive";
import { AudioWaveformProgressTracker } from "./AudioWaveformProgressTracker";

interface AudiobookStudioTabProps {
  book: Book;
  onUpdateBook?: (updated: Book) => void;
}

export const AudiobookStudioTab: React.FC<AudiobookStudioTabProps> = ({
  book,
  onUpdateBook,
}) => {
  // Available Browser Voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Settings (forced to free browser Device TTS in Zero-Cost Mode)
  const [settings, setSettings] = useState<AudiobookSettings>(() => {
    try {
      const saved = localStorage.getItem(`tomecrafter_audiobook_settings_${book.id}`);
      if (saved) {
        return { ...DEFAULT_AUDIOBOOK_SETTINGS, ...JSON.parse(saved), voiceEngine: "browser" };
      }
      return DEFAULT_AUDIOBOOK_SETTINGS;
    } catch {
      return DEFAULT_AUDIOBOOK_SETTINGS;
    }
  });

  const selectedVoicePreset =
    AUDIOBOOK_VOICE_PRESETS.find((v) => v.id === settings.selectedVoiceId) ||
    AUDIOBOOK_VOICE_PRESETS[0];

  // Chapter Tracks State
  const [tracks, setTracks] = useState<AudiobookChapterTrack[]>(() => {
    return book.chapters.map((ch) => {
      const words = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
      const estimatedMins = Math.max(1, Math.ceil(words / 150));
      return {
        id: `track-${ch.id}`,
        chapterId: ch.id,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        wordCount: words,
        estimatedDurationMinutes: estimatedMins,
        status: "idle",
        voicePresetId: DEFAULT_AUDIOBOOK_SETTINGS.selectedVoiceId,
        voicePresetName: AUDIOBOOK_VOICE_PRESETS[0].name,
        narrationScript: generateChapterNarrationScript(
          book,
          ch,
          DEFAULT_AUDIOBOOK_SETTINGS,
          AUDIOBOOK_VOICE_PRESETS[0]
        ),
        cues: [],
      };
    });
  });

  // Player State
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAuditioning, setIsAuditioning] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>(settings.elevenLabsApiKey || "");
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);
  const [keyVerifyResult, setKeyVerifyResult] = useState<{
    valid: boolean;
    tier?: string;
    characterCount?: number;
    characterLimit?: number;
    voices?: any[];
    message?: string;
  } | null>(null);

  // Batch Generation & Upload State
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [batchStatusText, setBatchStatusText] = useState<string>("");
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<boolean>(false);
  const [driveUploadResult, setDriveUploadResult] = useState<{
    folderLink: string;
    uploadedCount: number;
  } | null>(null);
  const [driveStatusText, setDriveStatusText] = useState<string>("");
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Script Edit Modal
  const [editingTrack, setEditingTrack] = useState<AudiobookChapterTrack | null>(null);
  const [editedScriptText, setEditedScriptText] = useState<string>("");

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const auditionAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load Browser Voices on Mount
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const vList = window.speechSynthesis.getVoices();
        setAvailableVoices(vList);
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (auditionAudioRef.current) {
        auditionAudioRef.current.pause();
      }
    };
  }, []);

  // Save Settings Changes
  useEffect(() => {
    try {
      localStorage.setItem(`tomecrafter_audiobook_settings_${book.id}`, JSON.stringify(settings));
    } catch {}
  }, [settings, book.id]);

  // Update Narration Scripts when settings or voice changes
  useEffect(() => {
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        const ch = book.chapters.find((c) => c.id === t.chapterId);
        if (!ch) return t;
        return {
          ...t,
          voicePresetId: selectedVoicePreset.id,
          voicePresetName: selectedVoicePreset.name,
          narrationScript: generateChapterNarrationScript(
            book,
            ch,
            settings,
            selectedVoicePreset
          ),
        };
      })
    );
  }, [settings.selectedVoiceId, settings.includeIntroAnnouncement, settings.includeOutroAnnouncement, book]);

  // Real-time Waveform Visualizer Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 48;
      const barWidth = canvas.width / barCount;
      const centerY = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying || isAuditioning) {
          const norm = i / barCount;
          const wave1 = Math.sin(norm * Math.PI * 4 + phase);
          const wave2 = Math.cos(norm * Math.PI * 2 - phase * 1.5);
          barHeight = Math.max(4, Math.abs(wave1 * 0.6 + wave2 * 0.4) * (canvas.height * 0.42));
        } else {
          barHeight = 4 + Math.sin(i * 0.5) * 2;
        }

        const x = i * barWidth;
        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
        gradient.addColorStop(0, "#f59e0b");
        gradient.addColorStop(0.5, "#ec4899");
        gradient.addColorStop(1, "#8b5cf6");

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, centerY - barHeight, barWidth - 2, barHeight * 2);
      }

      if (isPlaying || isAuditioning) {
        phase += 0.08;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isAuditioning]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleVerifyElevenLabsKey = async () => {
    setKeyVerifyResult({
      valid: false,
      message: "ElevenLabs API calls are disabled in Zero-Cost Mode. Use free Device TTS.",
    });
    showToast("Paid ElevenLabs API is disabled in Zero-Cost Mode.");
  };

  // Play / Pause Speech Narration (Supports both synthesized audio files and browser speech)
  const handleTogglePlay = async () => {
    const currentTrack = tracks[activeTrackIndex];
    if (!currentTrack) return;

    // 1. If we have a native audio element playing
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioPlayerRef.current && audioPlayerRef.current.paused && audioPlayerRef.current.src) {
      audioPlayerRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn("Play error:", e));
      return;
    }

    // 2. If browser speech synthesis is currently speaking
    if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // 3. Otherwise start playback cleanly
    startPlayingTrack(activeTrackIndex);
  };

  const playTrackAudio = (url: string, index: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    audio.playbackRate = settings.playbackSpeed;
    audio.volume = isMuted ? 0 : volume;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 60);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      if (index + 1 < tracks.length) {
        setTimeout(() => {
          startPlayingTrack(index + 1);
        }, 1000);
      }
    };

    audio.onerror = () => {
      setIsPlaying(false);
      showToast("Audio playback issue. Falling back to device speech narrator...");
      playDeviceSpeechForTrack(index);
    };

    audio.play().then(() => {
      setIsPlaying(true);
      setActiveTrackIndex(index);
    }).catch((e) => {
      console.warn("Audio element play error:", e);
      playDeviceSpeechForTrack(index);
    });
  };

  const playDeviceSpeechForTrack = (index: number) => {
    const track = tracks[index];
    if (!track) return;

    if (!window.speechSynthesis) {
      showToast("Speech synthesis is not supported on this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const script = track.narrationScript;
    const utterance = new SpeechSynthesisUtterance(script);

    const browserVoice = matchBrowserVoice(
      availableVoices,
      selectedVoicePreset,
      settings.customBrowserVoiceName
    );
    if (browserVoice) utterance.voice = browserVoice;

    utterance.pitch = Math.max(0.5, Math.min(2.0, selectedVoicePreset.pitch * settings.pitchModifier));
    utterance.rate = Math.max(0.5, Math.min(2.0, selectedVoicePreset.rate * settings.playbackSpeed));
    utterance.volume = isMuted ? 0 : volume;

    const estimatedSecs = Math.max(10, Math.round((track.wordCount / (145 * settings.playbackSpeed)) * 60));
    setDuration(estimatedSecs);

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setCurrentTime(Math.min(estimatedSecs, elapsed));
      }
    }, 400);

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      clearInterval(interval);
      setIsPlaying(false);
      setCurrentTime(estimatedSecs);

      if (index + 1 < tracks.length) {
        setTimeout(() => {
          startPlayingTrack(index + 1);
        }, 1000);
      }
    };

    utterance.onerror = (e) => {
      clearInterval(interval);
      setIsPlaying(false);
      console.warn("Device speech playback stopped/interrupted:", e);
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setActiveTrackIndex(index);
  };

  const startPlayingTrack = (index: number) => {
    const track = tracks[index];
    if (!track) return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setActiveTrackIndex(index);
    setCurrentTime(0);

    // If audio is already synthesized and has a generated URL, play the audio directly
    if (track.audioUrl) {
      playTrackAudio(track.audioUrl, index);
      return;
    }

    // Otherwise, play immediately with high-fidelity device browser speech synthesis (no network delay or loop)
    playDeviceSpeechForTrack(index);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = Math.min(duration, Math.max(0, newTime));
    }
  };

  // Audition Voice Preset with High-Fidelity AI (Gemini Neural TTS / ElevenLabs)
  const handleAuditionVoice = async (preset: AudiobookVoicePreset) => {
    // Stop any ongoing auditions
    if (auditionAudioRef.current) {
      auditionAudioRef.current.pause();
      auditionAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (isAuditioning === preset.id) {
      setIsAuditioning(null);
      return;
    }

    setIsAuditioning(preset.id);

    try {
      const result = await auditionVoicePresetWithAI(
        preset,
        settings,
        () => setIsAuditioning(preset.id),
        () => setIsAuditioning(null)
      );
      auditionAudioRef.current = result.audio ?? null;
    } catch (err: any) {
      console.warn("Audition error:", err);
      setIsAuditioning(null);
    }
  };

  // Synthesize Single Chapter Track
  const handleSynthesizeSingleTrack = async (index: number) => {
    const track = tracks[index];
    if (!track) return;

    setTracks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, status: "synthesizing" } : t))
    );

    try {
      showToast(`Mastering Chapter ${track.chapterNumber} with ${selectedVoicePreset.name}...`);
      const synth = await generateSyntheticAudioTrack(
        track.narrationScript,
        selectedVoicePreset,
        settings
      );

      if (synth.url) {
        setTracks((prev) =>
          prev.map((t, idx) =>
            idx === index
              ? {
                  ...t,
                  status: "ready",
                  audioBlob: synth.blob,
                  audioUrl: synth.url,
                  actualDurationSeconds: synth.durationSeconds,
                  generatedAt: new Date().toISOString(),
                  fileSizeBytes: synth.blob?.size,
                }
              : t
          )
        );
        showToast(`✓ Chapter ${track.chapterNumber} audio mastered!`);
      } else {
        setTracks((prev) =>
          prev.map((t, idx) => (idx === index ? { ...t, status: "idle" } : t))
        );
        showToast(`Chapter ${track.chapterNumber} ready for device speech narration.`);
      }
    } catch (err: any) {
      setTracks((prev) =>
        prev.map((t, idx) => (idx === index ? { ...t, status: "error" } : t))
      );
      showToast(`Synthesis notice: ${err.message}`);
    }
  };

  // Synthesize All Chapters Batch
  const handleBatchSynthesizeAll = async () => {
    setIsBatchGenerating(true);
    setBatchProgress(0);

    let masteredCount = 0;
    try {
      const updatedTracks = [...tracks];

      for (let i = 0; i < updatedTracks.length; i++) {
        const track = updatedTracks[i];
        setBatchStatusText(
          `Synthesizing Chapter ${track.chapterNumber} of ${tracks.length}: "${track.chapterTitle}"...`
        );

        setTracks((prev) =>
          prev.map((t, idx) => (idx === i ? { ...t, status: "synthesizing" } : t))
        );

        const synth = await generateSyntheticAudioTrack(
          track.narrationScript,
          selectedVoicePreset,
          settings,
          (pct) => {
            const overall = Math.round(((i + pct / 100) / updatedTracks.length) * 100);
            setBatchProgress(overall);
          }
        );

        if (synth.url) {
          masteredCount++;
          updatedTracks[i] = {
            ...track,
            status: "ready",
            audioBlob: synth.blob,
            audioUrl: synth.url,
            actualDurationSeconds: synth.durationSeconds,
            generatedAt: new Date().toISOString(),
            fileSizeBytes: synth.blob?.size,
          };
        } else {
          updatedTracks[i] = {
            ...track,
            status: "idle",
          };
        }

        setTracks([...updatedTracks]);
        setBatchProgress(Math.round(((i + 1) / updatedTracks.length) * 100));
      }

      if (masteredCount > 0) {
        showToast(`Mastered ${masteredCount} of ${tracks.length} chapter files with ${selectedVoicePreset.name}!`);
      } else {
        showToast(`All ${tracks.length} chapters prepared for instant narration.`);
      }
    } catch (err: any) {
      showToast(`Batch preparation notice: ${err.message}`);
    } finally {
      setIsBatchGenerating(false);
      setBatchStatusText("");
    }
  };

  // Download All Audio as Master ZIP Package
  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadFullAudiobookZip(book, tracks, settings, selectedVoicePreset);
      showToast("Master Audiobook Package (.zip) downloaded successfully!");
    } catch (err: any) {
      showToast(`Failed to download package: ${err.message}`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Upload Audiobook to Google Drive
  const handleUploadToDrive = async () => {
    setIsUploadingToDrive(true);
    setDriveStatusText("Connecting to Google Drive...");

    try {
      const result = await uploadAudiobookToGoogleDrive(
        book,
        tracks,
        settings,
        selectedVoicePreset,
        (status) => setDriveStatusText(status)
      );

      setDriveUploadResult({
        folderLink: result.folderLink,
        uploadedCount: result.uploadedCount,
      });
      showToast(`Uploaded ${result.uploadedCount} audiobook files to Google Drive!`);
    } catch (err: any) {
      showToast(`Google Drive Upload Error: ${err.message}`);
    } finally {
      setIsUploadingToDrive(false);
      setDriveStatusText("");
    }
  };

  // Format Seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Calculate Total Spoken Duration in Hours & Minutes
  const totalWords = book.chapters.reduce(
    (sum, c) => sum + (c.content ? c.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0
  );
  const totalEstimatedHours = (totalWords / (145 * 60 * settings.playbackSpeed)).toFixed(1);

  const activeTrack = tracks[activeTrackIndex] || tracks[0];

  return (
    <div className="space-y-8 animate-fadeIn text-stone-100 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl bg-amber-500 text-stone-950 font-bold shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ElevenLabs API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <h3 className="font-serif font-bold text-stone-100 text-lg">
                  ElevenLabs Studio Configuration
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setKeyVerifyResult(null);
                }}
                className="text-stone-400 hover:text-stone-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Enter your personal ElevenLabs API Key to generate ultra-lifelike audio directly using ElevenLabs' sovereign neural voice models. Your key is stored safely in your browser storage.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase text-amber-400 font-bold">
                  XI API Key
                </label>
                {tempApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempApiKey("");
                      setKeyVerifyResult(null);
                    }}
                    className="text-[10px] font-mono text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear Key
                  </button>
                )}
              </div>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => {
                  setTempApiKey(e.target.value);
                  setKeyVerifyResult(null);
                }}
                placeholder="sk_..."
                className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 outline-none font-mono"
              />
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleVerifyElevenLabsKey}
                disabled={isVerifyingKey || !tempApiKey.trim()}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-xs font-semibold border border-stone-700 cursor-pointer transition-colors"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-400 ${isVerifyingKey ? "animate-spin" : ""}`} />
                <span>{isVerifyingKey ? "Testing Connection..." : "Test & Verify Connection"}</span>
              </button>
            </div>

            {/* Verification Result Feedback */}
            {keyVerifyResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                  keyVerifyResult.valid
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                }`}
              >
                <div className="flex items-center space-x-2 font-bold">
                  {keyVerifyResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {keyVerifyResult.valid
                      ? "Connection Verified & Ready"
                      : "Verification Failed"}
                  </span>
                </div>
                {keyVerifyResult.valid && (
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-stone-300">
                    <div>
                      <span className="text-stone-400">Plan Tier:</span>{" "}
                      <span className="text-amber-400 font-bold capitalize">
                        {keyVerifyResult.tier || "Active"}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400">Quota Used:</span>{" "}
                      <span>
                        {(keyVerifyResult.characterCount || 0).toLocaleString()} /{" "}
                        {(keyVerifyResult.characterLimit || 10000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                {keyVerifyResult.message && !keyVerifyResult.valid && (
                  <p className="text-stone-300 text-[11px]">{keyVerifyResult.message}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-800">
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setKeyVerifyResult(null);
                }}
                className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSettings((s) => ({ ...s, elevenLabsApiKey: tempApiKey }));
                  setShowApiKeyModal(false);
                  showToast(
                    tempApiKey
                      ? "ElevenLabs API Key configured successfully!"
                      : "ElevenLabs API Key removed."
                  );
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg cursor-pointer transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner & Master Metrics */}
      <div className="relative rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900/90 to-amber-950/40 border border-amber-500/20 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold flex items-center space-x-1.5">
                <Headphones className="w-3.5 h-3.5" />
                <span>Audiobook Studio & Voice Forge</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-xs font-mono">
                {book.chapters.length} Chapters • ~{totalEstimatedHours} Hours
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Professional Audiobook Narration
            </h1>

            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Synthesize broadcast-grade audiobook editions with Gemini 3.1 Neural AI and ElevenLabs voice actors,
              theatrical cadence, and direct export to ZIP & Google Drive.
            </p>
          </div>

          {/* Master Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleBatchSynthesizeAll}
              disabled={isBatchGenerating}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-amber-950/40 disabled:opacity-50 cursor-pointer"
            >
              {isBatchGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isBatchGenerating ? `Synthesizing (${batchProgress}%)` : "Synthesize All Chapters"}</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Download Master ZIP containing all Chapter WAVs + M3U playlist"
            >
              <FolderArchive className="w-4 h-4 text-amber-400" />
              <span>{isDownloadingZip ? "Building Package..." : "Download Master (.ZIP)"}</span>
            </button>

            <button
              onClick={handleUploadToDrive}
              disabled={isUploadingToDrive}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Upload entire audiobook edition directly to Google Drive"
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>{isUploadingToDrive ? "Uploading to Drive..." : "Save to Google Drive"}</span>
            </button>
          </div>
        </div>

        {/* Engine Selector Header Toolbar */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <span className="text-xs font-mono text-stone-400">Synthesis Engine:</span>
            <div className="inline-flex rounded-xl bg-stone-950 border border-stone-800 p-1">
              <button
                type="button"
                disabled
                title="Disabled in Zero-Cost Mode to prevent Gemini TTS billing"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 cursor-not-allowed line-through"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Gemini TTS (Disabled)</span>
              </button>

              <button
                type="button"
                disabled
                title="Disabled in Zero-Cost Mode to prevent ElevenLabs billing"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 cursor-not-allowed line-through"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>ElevenLabs (Disabled)</span>
              </button>

              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, voiceEngine: "browser" }))}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Device Web Speech (Free • Active)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar during batch generation */}
        {isBatchGenerating && (
          <div className="mt-6 pt-4 border-t border-stone-800/80 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono text-amber-300">
              <span>{batchStatusText || "Generating audio..."}</span>
              <span>{batchProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Google Drive Upload Result Notification */}
        {driveUploadResult && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center space-x-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Google Drive Sync Complete! </span>
                <span>{driveUploadResult.uploadedCount} audiobook tracks & transcripts saved to your Drive folder.</span>
              </div>
            </div>
            <a
              href={driveUploadResult.folderLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-stone-950 font-bold text-xs hover:bg-emerald-400 transition-colors shrink-0"
            >
              <span>Open in Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. THE MASTER DECK PLAYER (Visualizer & Playback Controls) */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-stone-900 border border-stone-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Vinyl / Cover Art Widget */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border border-stone-700 bg-stone-950 shrink-0 group">
            <img
              src={book.coverImage || book.coverImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"}
              alt={book.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? "scale-105" : ""
              }`}
            />
            {/* Spinning Disc Overlay effect when playing */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                <Disc className="w-12 h-12 text-amber-400 animate-spin" style={{ animationDuration: "4s" }} />
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-mono text-amber-300 text-center truncate">
              {selectedVoicePreset.name} • {selectedVoicePreset.badge}
            </div>
          </div>

          {/* Player Center: Enhanced Interactive Waveform & Info */}
          <div className="flex-1 w-full space-y-4">
            <AudioWaveformProgressTracker
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              audioElement={audioPlayerRef.current}
              trackTitle={activeTrack?.chapterTitle || "Chapter Title"}
              chapterNumber={activeTrack?.chapterNumber || 1}
              voiceName={selectedVoicePreset.name}
              accent={selectedVoicePreset.accent}
              badge={selectedVoicePreset.badge}
              wordCount={activeTrack?.wordCount || 0}
              status={activeTrack?.status || "ready"}
              onTogglePlay={handleTogglePlay}
            />
          </div>
        </div>

        {/* Master Deck Controls Bar */}
        <div className="pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Playback Rate Selector */}
          <div className="flex items-center space-x-1 bg-stone-950 border border-stone-800 rounded-xl p-1 text-xs">
            {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  setSettings((s) => ({ ...s, playbackSpeed: rate }));
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.playbackRate = rate;
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-colors ${
                  settings.playbackSpeed === rate
                    ? "bg-amber-500 text-stone-950 shadow"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Center: Main Transport Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (activeTrackIndex > 0) {
                  startPlayingTrack(activeTrackIndex - 1);
                }
              }}
              disabled={activeTrackIndex === 0}
              className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center disabled:opacity-30 transition-colors"
              title="Previous Chapter"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (audioPlayerRef.current) {
                  audioPlayerRef.current.currentTime = Math.max(0, audioPlayerRef.current.currentTime - 15);
                }
              }}
              className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
              title="Rewind 15s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xl shadow-amber-950/60 transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-stone-950" />
              ) : (
                <Play className="w-6 h-6 fill-stone-950 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                if (audioPlayerRef.current) {
                  audioPlayerRef.current.currentTime = Math.min(duration, audioPlayerRef.current.currentTime + 15);
                }
              }}
              className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
              title="Forward 15s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (activeTrackIndex < tracks.length - 1) {
                  startPlayingTrack(activeTrackIndex + 1);
                }
              }}
              disabled={activeTrackIndex === tracks.length - 1}
              className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center disabled:opacity-30 transition-colors"
              title="Next Chapter"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Volume & Quick Track Action */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5">
              <button
                onClick={() => {
                  const nextMute = !isMuted;
                  setIsMuted(nextMute);
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.muted = nextMute;
                  }
                }}
                className="text-stone-400 hover:text-stone-200"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.volume = val;
                  }
                  if (isMuted) setIsMuted(false);
                }}
                className="w-20 accent-amber-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleSynthesizeSingleTrack(activeTrackIndex)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Synthesize audio file for current chapter"
            >
              <FileAudio className="w-3.5 h-3.5" />
              <span>Master Track</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VOICE PRESET GALLERY (Theatrical Narrators) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center space-x-2">
              <span>Select Narrator Voice Profile</span>
            </h2>
            <p className="text-xs text-stone-400">
              Choose from bespoke theatrical AI voice personas with tailored accents, cadences, and dramatic depth.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {AUDIOBOOK_VOICE_PRESETS.map((preset) => {
            const isSelected = settings.selectedVoiceId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => setSettings((s) => ({ ...s, selectedVoiceId: preset.id }))}
                className={`relative rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer group ${
                  isSelected
                    ? "bg-stone-900 border-amber-500/80 ring-2 ring-amber-500/30 shadow-xl"
                    : "bg-stone-900/70 hover:bg-stone-900 border-stone-800 hover:border-stone-700"
                }`}
              >
                {/* Selected Check Pill */}
                {isSelected && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 shadow">
                    <Check className="w-3 h-3" />
                    <span>Active Voice</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-2xl shadow-lg shrink-0`}
                    >
                      {preset.avatar}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-stone-100 text-base group-hover:text-amber-300 transition-colors">
                        {preset.name}
                      </h3>
                      <p className="text-[11px] font-mono text-amber-400/90 font-medium">
                        {preset.actorName}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {preset.badge}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                      {preset.accent}
                    </span>
                    {preset.suggestedGenres.slice(0, 1).map((g) => (
                      <span
                        key={g}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-950 text-stone-400"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Audition Button & Voice Engine Indicators */}
                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuditionVoice(preset);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isAuditioning === preset.id
                        ? "bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20"
                        : "bg-stone-800 hover:bg-stone-700 text-stone-300"
                    }`}
                  >
                    {isAuditioning === preset.id ? (
                      <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{isAuditioning === preset.id ? "Auditioning..." : "Audition Voice"}</span>
                  </button>

                  <div className="flex items-center space-x-1 text-[10px] font-mono text-stone-400">
                    <span className="px-1.5 py-0.5 rounded bg-stone-950 text-amber-400/90 border border-stone-800">
                      {preset.geminiVoice}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CHAPTER TRACKS & SCRIPT TABLE */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-stone-900 border border-stone-800 overflow-hidden shadow-2xl space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center space-x-2">
              <ListMusic className="w-5 h-5 text-amber-400" />
              <span>Chapter Narration Tracklist ({tracks.length} Chapters)</span>
            </h2>
            <p className="text-xs text-stone-400">
              Manage individual chapter recordings, edit spoken scripts, and export single WAV files.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleBatchSynthesizeAll}
              disabled={isBatchGenerating}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBatchGenerating ? "animate-spin" : ""}`} />
              <span>Re-Synthesize All</span>
            </button>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-3">
          {tracks.map((track, idx) => {
            const isActive = activeTrackIndex === idx;
            return (
              <div
                key={track.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isActive
                    ? "bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/20"
                    : "bg-stone-950/70 border-stone-800 hover:border-stone-700"
                }`}
              >
                {/* Left: Chapter & Title */}
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => {
                      if (isActive && isPlaying) {
                        handleTogglePlay();
                      } else {
                        startPlayingTrack(idx);
                      }
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform active:scale-95 cursor-pointer ${
                      isActive && isPlaying
                        ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30"
                        : "bg-stone-800 hover:bg-stone-700 text-stone-300"
                    }`}
                  >
                    {isActive && isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        Ch {track.chapterNumber}
                      </span>
                      <h4 className="font-serif font-bold text-stone-200 text-sm truncate">
                        {track.chapterTitle}
                      </h4>
                    </div>
                    <div className="text-[11px] text-stone-400 flex items-center space-x-2 pt-0.5">
                      <span>{track.wordCount.toLocaleString()} words</span>
                      <span>•</span>
                      <span>~{track.estimatedDurationMinutes} mins</span>
                      {track.actualDurationSeconds && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono">
                            {formatTime(track.actualDurationSeconds)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {/* Status Indicator */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
                      track.status === "ready"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-500/40"
                        : track.status === "synthesizing"
                        ? "bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse"
                        : "bg-stone-900 text-stone-500 border-stone-800"
                    }`}
                  >
                    {track.status === "ready"
                      ? "✓ Mastered"
                      : track.status === "synthesizing"
                      ? "Synthesizing..."
                      : "Unrendered"}
                  </span>

                  {/* Edit Narration Script */}
                  <button
                    onClick={() => {
                      setEditingTrack(track);
                      setEditedScriptText(track.narrationScript);
                    }}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-colors cursor-pointer"
                    title="View & Edit Spoken Script"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Synthesize Track Button */}
                  <button
                    onClick={() => handleSynthesizeSingleTrack(idx)}
                    disabled={track.status === "synthesizing"}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Synthesize audio for this chapter"
                  >
                    <FileAudio className="w-4 h-4" />
                  </button>

                  {/* Download Single WAV */}
                  <button
                    onClick={() => {
                      try {
                        downloadAudioTrackFile(track, book.title);
                        showToast(`Downloaded Chapter ${track.chapterNumber} WAV!`);
                      } catch (err: any) {
                        showToast(err.message);
                      }
                    }}
                    disabled={!track.audioBlob && !track.audioUrl}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-colors disabled:opacity-30 cursor-pointer"
                    title="Download Chapter WAV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Script Edit Modal */}
      {editingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  Chapter {editingTrack.chapterNumber} Spoken Script
                </span>
                <h3 className="font-serif font-bold text-stone-100 text-lg">
                  {editingTrack.chapterTitle}
                </h3>
              </div>
              <button
                onClick={() => setEditingTrack(null)}
                className="text-stone-400 hover:text-stone-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Customize the exact narration script read by the voice actor. Add pronunciation cues, pauses, or editorial announcements.
            </p>

            <textarea
              rows={12}
              value={editedScriptText}
              onChange={(e) => setEditedScriptText(e.target.value)}
              className="w-full p-4 rounded-2xl bg-stone-950 border border-stone-700 text-stone-100 text-sm leading-relaxed focus:border-amber-500 outline-none font-sans"
            />

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setTracks((prev) =>
                    prev.map((t) =>
                      t.id === editingTrack.id
                        ? { ...t, narrationScript: editedScriptText, status: "idle" }
                        : t
                    )
                  );
                  setEditingTrack(null);
                  showToast("Chapter script updated!");
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg cursor-pointer"
              >
                Save Script Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
