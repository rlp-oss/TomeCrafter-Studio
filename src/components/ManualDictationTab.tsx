import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Copy,
  Check,
  Clipboard,
  Trash2,
  Save,
  Cloud,
  CloudCheck,
  Sparkles,
  Volume2,
  Clock,
  FileText,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Quote,
} from "lucide-react";
import { Book, Chapter } from "../types";

interface ManualDictationTabProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  onNavigateToEditor: (chapterId?: string) => void;
  isCloudSynced?: boolean;
}

// Check for Web Speech API SpeechRecognition
const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const ManualDictationTab: React.FC<ManualDictationTabProps> = ({
  book,
  onUpdateBook,
  onNavigateToEditor,
  isCloudSynced = true,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    book.chapters[0]?.id || ""
  );
  const [dictationText, setDictationText] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [micSupported, setMicSupported] = useState<boolean>(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [recognitionLang, setRecognitionLang] = useState<string>("en-US");
  const [copied, setCopied] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("Manual Save Mode");
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (!SpeechRecognition) {
      setMicSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLang;

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        if (final) {
          setDictationText((prev) => {
            const separator = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
            return prev + separator + final.trimStart();
          });
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event error:", event.error);
        if (event.error === "not-allowed") {
          setMicError("Microphone permission denied. Please allow microphone access in your browser.");
          setIsListening(false);
        } else if (event.error === "no-speech") {
          // Soft timeout, keep listening if active
        } else {
          setMicError(`Dictation notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimTranscript("");
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setMicSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [recognitionLang]);

  // Speaking timer
  useEffect(() => {
    if (isListening) {
      if (!sessionStartTime) setSessionStartTime(Date.now());
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Auto-Save effect
  useEffect(() => {
    if (!isAutoSaveEnabled || !dictationText.trim()) return;

    setAutoSaveStatus("Saving changes...");
    const timeout = setTimeout(() => {
      setAutoSaveStatus("Auto-saved to cloud");
      setLastSavedTime(new Date());
    }, 1200);

    return () => clearTimeout(timeout);
  }, [dictationText, isAutoSaveEnabled]);

  // Toggle Microphone
  const toggleListening = () => {
    setMicError(null);
    if (!SpeechRecognition || !recognitionRef.current) {
      setMicError("Web Speech API is not supported in this browser. Please use Google Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setInterimTranscript("");
    } else {
      try {
        recognitionRef.current.lang = recognitionLang;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.error("Error starting speech recognition:", err);
        setMicError("Failed to start microphone. Please check permissions.");
        setIsListening(false);
      }
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(dictationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setDictationText((prev) => (prev ? prev + "\n\n" + text : text));
      }
    } catch (err) {
      alert("Please allow clipboard permissions or paste directly with Ctrl+V / Cmd+V.");
    }
  };

  // Insert punctuation macro
  const insertText = (str: string) => {
    setDictationText((prev) => prev + str);
  };

  // Append dictation into selected chapter
  const handleAppendToChapter = () => {
    if (!dictationText.trim()) return;
    const targetChapter = book.chapters.find((c) => c.id === selectedChapterId) || book.chapters[0];
    if (!targetChapter) return;

    const updatedChapters = book.chapters.map((ch) => {
      if (ch.id === targetChapter.id) {
        const newContent = ch.content
          ? ch.content + "\n\n" + dictationText.trim()
          : dictationText.trim();
        return {
          ...ch,
          content: newContent,
          wordCount: newContent.split(/\s+/).filter(Boolean).length,
        };
      }
      return ch;
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });

    setDictationText("");
    setAutoSaveStatus(`Appended to Chapter ${targetChapter.number}!`);
    onNavigateToEditor(targetChapter.id);
  };

  // Create new chapter from dictation
  const handleCreateNewChapterFromDictation = () => {
    if (!dictationText.trim()) return;
    const nextNumber = book.chapters.length + 1;
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      number: nextNumber,
      act: `Act ${Math.ceil(nextNumber / 4)}`,
      title: `Dictated Chapter ${nextNumber}`,
      summary: "Created via manual voice dictation suite.",
      goal: "Develop scene narrative from live voice transcription.",
      conflict: "Expanding pacing and character dynamics.",
      cliffhanger: "Unresolved narrative branch.",
      pov: book.author || "Third Person",
      setting: "Story Realm",
      targetWords: 3000,
      wordCount: dictationText.split(/\s+/).filter(Boolean).length,
      content: dictationText.trim(),
      status: "draft",
      illustrations: [],
    };

    onUpdateBook({
      ...book,
      chapters: [...book.chapters, newChapter],
      updatedAt: new Date().toISOString(),
    });

    setDictationText("");
    onNavigateToEditor(newChapter.id);
  };

  // Metrics
  const words = dictationText.trim().split(/\s+/).filter(Boolean).length;
  const chars = dictationText.length;
  const readingTimeMin = Math.ceil(words / 200);

  // Format timer
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border border-stone-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Mic className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-100">
              Manual Entry & Voice Dictation Suite
            </h1>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl">
            Draft your manuscript via real-time speech-to-text voice recognition, fast paste buffers, and one-click chapter injection.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-stone-950/80 border border-stone-800 text-xs">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-stone-300 font-mono text-[11px]">{autoSaveStatus}</span>
          </div>

          <button
            onClick={() => setDictationText("")}
            disabled={!dictationText}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-rose-400 disabled:opacity-40 transition-colors"
            title="Clear text"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {micError && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{micError}</span>
          </div>
          <button onClick={() => setMicError(null)} className="text-amber-400 hover:text-amber-100">✕</button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dictation Box & Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs">
            {/* Dictation Language Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-stone-400 text-[11px]">Language:</span>
              <select
                value={recognitionLang}
                onChange={(e) => setRecognitionLang(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-AU">English (Australia)</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
                <option value="de-DE">Deutsch</option>
                <option value="ja-JP">日本語 (Japanese)</option>
              </select>
            </div>

            {/* Quick Macro Insert Buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => insertText(" “")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-[11px]"
                title='Insert open quote “'
              >
                “
              </button>
              <button
                onClick={() => insertText("” ")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-[11px]"
                title='Insert close quote ”'
              >
                ”
              </button>
              <button
                onClick={() => insertText("— ")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-[11px]"
                title="Insert em-dash —"
              >
                —
              </button>
              <button
                onClick={() => insertText("… ")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-[11px]"
                title="Insert ellipsis …"
              >
                …
              </button>
              <button
                onClick={() => insertText("\n\n* * *\n\n")}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-[11px]"
                title="Insert scene break"
              >
                * * *
              </button>
            </div>

            {/* Copy & Paste Tools */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePaste}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                title="Paste clipboard text"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={!dictationText}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-40 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
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

          {/* Primary Speech Dictation / Manual Editor Box */}
          <div className="relative rounded-2xl bg-stone-900 border border-stone-800 shadow-xl overflow-hidden focus-within:border-amber-500/60 transition-all">
            {/* Live Recording Pulse Banner */}
            {isListening && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300 animate-pulse">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                  </span>
                  <span className="font-semibold">Microphone Listening... Speak freely</span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(elapsedSeconds)}</span>
                </div>
              </div>
            )}

            <textarea
              value={dictationText}
              onChange={(e) => setDictationText(e.target.value)}
              placeholder="Start speaking into the microphone or type/paste your manuscript notes here in real-time..."
              className="w-full h-96 p-6 bg-transparent text-stone-100 font-serif text-base sm:text-lg leading-relaxed focus:outline-none resize-none placeholder:text-stone-600"
            />

            {/* Interim Transcript Floating Bubble */}
            {interimTranscript && (
              <div className="px-6 py-2 bg-stone-950/80 border-t border-stone-800 text-stone-400 text-sm italic font-serif">
                <span className="text-amber-400/80">Transcribing: </span>"{interimTranscript}"
              </div>
            )}

            {/* Bottom Status Bar */}
            <div className="px-6 py-3 bg-stone-950/60 border-t border-stone-800/80 flex flex-wrap items-center justify-between text-xs text-stone-400">
              <div className="flex items-center space-x-4 font-mono">
                <span><strong>{words.toLocaleString()}</strong> words</span>
                <span>•</span>
                <span><strong>{chars.toLocaleString()}</strong> characters</span>
                <span>•</span>
                <span>~{readingTimeMin} min read</span>
              </div>

              {/* Big Mic Toggle Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-sans font-bold shadow-lg transition-all ${
                  isListening
                    ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                    : "bg-amber-500 hover:bg-amber-400 text-stone-950"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Dictation</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Start Voice Dictation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Insertion & Destination Controls */}
        <div className="space-y-4">
          {/* Destination 1: Append to Existing Chapter */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center space-x-2 text-stone-200 font-serif font-bold text-sm">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Send Dictation to Chapter</span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-stone-400">Choose Target Chapter:</label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              >
                {book.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Chapter {ch.number}: {ch.title} ({ch.wordCount || 0} w)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAppendToChapter}
              disabled={!dictationText.trim()}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs flex items-center justify-center space-x-2 disabled:opacity-40 transition-colors"
            >
              <span>Append to Chapter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination 2: Create Brand New Chapter */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
            <div className="flex items-center space-x-2 text-stone-200 font-serif font-bold text-sm">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Create New Chapter</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Creates Chapter {book.chapters.length + 1} with the dictated transcript as the primary drafted content.
            </p>

            <button
              onClick={handleCreateNewChapterFromDictation}
              disabled={!dictationText.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-2 disabled:opacity-40 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Chapter {book.chapters.length + 1}</span>
            </button>
          </div>

          {/* Dictation Voice Tips */}
          <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-2 text-xs text-stone-400">
            <div className="flex items-center space-x-1.5 text-stone-300 font-semibold text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Pro Voice Dictation Commands:</span>
            </div>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-stone-400 font-sans">
              <li>Say <strong>"comma"</strong> or <strong>"period"</strong> for punctuation.</li>
              <li>Say <strong>"new line"</strong> or <strong>"new paragraph"</strong> to break lines.</li>
              <li>Say <strong>"open quotes"</strong> / <strong>"close quotes"</strong> for dialogue.</li>
              <li>Dictate in quiet spaces with an external or headset mic for highest accuracy.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
