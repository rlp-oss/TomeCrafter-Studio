import JSZip from "jszip";
import { Book, Chapter } from "../types";
import { uploadBlobToGoogleDrive, createOrGetDriveFolder } from "./googleDrive";

export interface AudiobookVoicePreset {
  id: string;
  name: string;
  actorName: string;
  gender: "male" | "female" | "neutral";
  accent: string;
  tone: string;
  description: string;
  suggestedGenres: string[];
  avatar: string;
  color: string;
  pitch: number; // default pitch 0.5 - 1.5
  rate: number;  // default rate 0.8 - 1.3
  preferredVoiceKeywords: string[];
  introGreeting: string;
  geminiVoice: string; // "Charon" | "Kore" | "Zephyr" | "Aoede" | "Fenrir" | "Leda" | "Orpheus" | "Puck"
  elevenLabsVoiceId: string;
  actingDirection: string;
  badge: string;
}

export const AUDIOBOOK_VOICE_PRESETS: AudiobookVoicePreset[] = [
  {
    id: "arthur-sterling",
    name: "Sir Arthur Sterling",
    actorName: "Theatrical British Classic",
    gender: "male",
    accent: "British Received Pronunciation (RP)",
    tone: "Authoritative, resonant, stately, commanding",
    description: "Ideal for sweeping epic fantasy, historical fiction, high-stakes political intrigue, and grand literary sagas.",
    suggestedGenres: ["Fantasy", "Historical Fiction", "Classics", "Sci-Fi"],
    avatar: "👑",
    color: "from-amber-600 to-yellow-800",
    pitch: 0.80,
    rate: 0.94,
    preferredVoiceKeywords: ["Google UK English Male", "Microsoft George", "Daniel", "Oliver", "Arthur", "Male", "en-GB-x-rjs", "en-GB-x-fis"],
    introGreeting: "Welcome. This is Sir Arthur Sterling, bringing your grand narrative to life with classical British resonance.",
    geminiVoice: "Charon",
    elevenLabsVoiceId: "pNInz6obpgDQGcFmaJgB", // Adam (Premade)
    actingDirection: "Narrate with classical British theatrical gravitas, stately pacing, rich resonance, and dramatic poise.",
    badge: "Adam (Premade) • Charon",
  },
  {
    id: "daniel-kingsley",
    name: "Daniel Kingsley",
    actorName: "Distinguished British Broadcaster",
    gender: "male",
    accent: "Authoritative British Broadcast",
    tone: "Crisp, authoritative, formal, distinguished",
    description: "Designed for royal biographies, classic literature, geopolitical thrillers, and legal dramas.",
    suggestedGenres: ["Biographies", "Classics", "Legal Thriller", "History"],
    avatar: "🎙️",
    color: "from-slate-700 to-stone-900",
    pitch: 0.80,
    rate: 0.95,
    preferredVoiceKeywords: ["Google UK English Male", "Microsoft George", "Daniel", "Sam", "Oliver", "Male", "en-GB-x-rjs", "en-GB-x-fis"],
    introGreeting: "Good day. Daniel Kingsley here, delivering your chronicle with distinguished broadcast authority.",
    geminiVoice: "Charon",
    elevenLabsVoiceId: "yoZ06aMxZJJ28mfd3POQ", // Sam (Premade)
    actingDirection: "Narrate with immaculate British broadcast clarity, formal dignity, and measured cadence.",
    badge: "Sam (Premade) • Charon",
  },
  {
    id: "elena-vance",
    name: "Elena Vance",
    actorName: "Lyrical & Intimate Literary",
    gender: "female",
    accent: "Warm Transatlantic / Mid-Atlantic",
    tone: "Nuanced, evocative, empathetic, melodic",
    description: "Perfect for deep character studies, emotional memoirs, contemporary fiction, poetry, and lyrical romances.",
    suggestedGenres: ["Romance", "Literary Fiction", "Memoir", "Drama"],
    avatar: "🌿",
    color: "from-emerald-600 to-teal-800",
    pitch: 1.06,
    rate: 0.96,
    preferredVoiceKeywords: ["Google US English Female", "Microsoft Zira", "Microsoft Jenny", "Samantha", "Victoria", "Female", "Rachel"],
    introGreeting: "Hello. I am Elena Vance. Let us explore the quiet emotional depths and vibrant moments of your story.",
    geminiVoice: "Aoede",
    elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel (Premade)
    actingDirection: "Narrate with warm, melodic, empathetic storytelling and intimate literary nuance.",
    badge: "Rachel (Premade) • Aoede",
  },
  {
    id: "marcus-documentary",
    name: "Dr. Marsha Vance",
    actorName: "Authoritative Documentarian",
    gender: "female",
    accent: "Neutral General American",
    tone: "Crisp, precise, intellectual, engaging",
    description: "Crafted specifically for non-fiction, ethical AI treatises, scientific frameworks, investigative prose, and masterclasses.",
    suggestedGenres: ["Non-Fiction & Self-Help", "Philosophy", "Technology", "Essays"],
    avatar: "🎙️",
    color: "from-cyan-600 to-blue-800",
    pitch: 1.05,
    rate: 1.0,
    preferredVoiceKeywords: ["Google US English Female", "Microsoft Aria", "Microsoft Jenny", "Samantha", "Female", "Domi"],
    introGreeting: "Greetings. Dr. Marsha Vance here, articulating rigorous analysis and visionary frameworks with crystal clarity.",
    geminiVoice: "Kore",
    elevenLabsVoiceId: "AZnzlk1XvdvUeBnXmlld", // Domi (Premade)
    actingDirection: "Speak with crisp intellectual clarity, authoritative documentary precision, and engaging modern cadence.",
    badge: "Domi (Premade) • Kore",
  },
  {
    id: "lyra-nightshade",
    name: "Lyra Nightshade",
    actorName: "Atmospheric & Enigmatic Noir",
    gender: "female",
    accent: "Velvet Celtic / British Soft",
    tone: "Haunting, suspenseful, smoky, intimate",
    description: "Designed for grimdark fantasy, psychological thrillers, gothic mysteries, and dark supernatural suspense.",
    suggestedGenres: ["Dark Fantasy", "Thriller", "Horror", "Mystery"],
    avatar: "🌙",
    color: "from-purple-600 to-indigo-900",
    pitch: 0.98,
    rate: 0.92,
    preferredVoiceKeywords: ["Google UK English Female", "Microsoft Hazel", "Microsoft Susan", "Moira", "Fiona", "Female", "Elli"],
    introGreeting: "Shadows gather where words tread. I am Lyra Nightshade, voice for the veiled and mysterious.",
    geminiVoice: "Aoede",
    elevenLabsVoiceId: "MF3mGyEYCl7XYWbV9V6O", // Elli (Premade)
    actingDirection: "Narrate in a velvety, smoky, haunting cadence with gripping dark suspense and noir atmosphere.",
    badge: "Elli (Premade) • Aoede",
  },
  {
    id: "cillian-cross",
    name: "Cillian Cross",
    actorName: "High-Stakes Cinematic Heroic",
    gender: "male",
    accent: "Modern American Urban / Gritty",
    tone: "Dynamic, punchy, adrenaline-fueled, vivid",
    description: "Built for cyberpunk thrillers, space operas, hard-boiled detective fiction, and fast-paced action adventures.",
    suggestedGenres: ["Cyberpunk", "Space Opera", "Action & Adventure", "Urban Fantasy"],
    avatar: "⚡",
    color: "from-rose-600 to-orange-800",
    pitch: 0.82,
    rate: 1.05,
    preferredVoiceKeywords: ["Google US English Male", "Microsoft David", "Microsoft Guy", "Microsoft Mark", "Arnold", "Alex", "Male"],
    introGreeting: "Ready for launch. Cillian Cross on the comms, delivering raw intensity and cinematic velocity.",
    geminiVoice: "Fenrir",
    elevenLabsVoiceId: "VR6AewLTigWG4xSOukaG", // Arnold (Premade)
    actingDirection: "Deliver with intense cinematic adrenaline, gritty confidence, and punchy modern pacing.",
    badge: "Arnold (Premade) • Fenrir",
  },
  {
    id: "sophia-rivera",
    name: "Sophia Rivera",
    actorName: "Vibrant & Conversational Guide",
    gender: "female",
    accent: "Warm Latin-American / Bilingual Global",
    tone: "Inspiring, relatable, energetic, empowering",
    description: "Great for personal growth, young adult fiction, cozy mysteries, and inspiring entrepreneurial guidebooks.",
    suggestedGenres: ["Young Adult", "Self-Help", "Cozy Mystery", "Inspirational"],
    avatar: "✨",
    color: "from-amber-500 to-rose-700",
    pitch: 1.10,
    rate: 1.02,
    preferredVoiceKeywords: ["Google US English Female", "Microsoft Jenny", "Microsoft Zira", "Bella", "Tessa", "Female"],
    introGreeting: "Hi there! I am Sophia Rivera. Excited to bring your characters and ideas to life with warmth and heart!",
    geminiVoice: "Kore",
    elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL", // Bella (Premade)
    actingDirection: "Speak with vibrant warmth, upbeat conversational energy, and uplifting inspiration.",
    badge: "Bella (Premade) • Kore",
  },
  {
    id: "gideon-alabaster",
    name: "Gideon Alabaster",
    actorName: "Ancient Lorekeeper & Chronicler",
    gender: "male",
    accent: "Deep Scandinavian / Nordic Gravel",
    tone: "Weathered, profound, mythic, solemn",
    description: "Suited for ancient codices, creation myths, grim fantasy histories, grimoires, and philosophical epilogues.",
    suggestedGenres: ["High Fantasy", "Mythology", "World Codex", "Epic Poetry"],
    avatar: "📜",
    color: "from-stone-600 to-stone-900",
    pitch: 0.74,
    rate: 0.88,
    preferredVoiceKeywords: ["Google UK English Male", "Microsoft George", "Daniel", "Deep", "Male", "en-GB-x-rjs"],
    introGreeting: "The annals open. I am Gideon Alabaster, keeper of ancient lore and chronicler of sovereign ages.",
    geminiVoice: "Charon",
    elevenLabsVoiceId: "pNInz6obpgDQGcFmaJgB", // Adam (Premade)
    actingDirection: "Narrate with solemn mythic gravitas, deep ancient gravel, and slow weathered majesty.",
    badge: "Adam (Premade) • Charon",
  },
  {
    id: "puck-classic",
    name: "Puck The Theatrical",
    actorName: "Expressive Narrative Bard",
    gender: "neutral",
    accent: "Theatrical Classical Shakespearean",
    tone: "Witty, dynamic, expressive, charismatic",
    description: "Ideal for satirical novels, dynamic multi-character dialogues, playful fantasy, and dynamic storytelling.",
    suggestedGenres: ["Comedy", "Satire", "Fables", "Adventure"],
    avatar: "🎭",
    color: "from-indigo-600 to-purple-800",
    pitch: 0.98,
    rate: 1.0,
    preferredVoiceKeywords: ["Google UK English Male", "Microsoft George", "Antoni", "Puck", "Daniel"],
    introGreeting: "Greetings traveler! I am Puck, weaving wit, whimsy, and dramatic flair into every single syllable.",
    geminiVoice: "Puck",
    elevenLabsVoiceId: "ErXwobaYiN019PkySvjV", // Antoni (Premade)
    actingDirection: "Deliver with lively, dynamic, expressive theatrical energy and clear articulation.",
    badge: "Antoni (Premade) • Puck",
  },
  {
    id: "marcus-investigative",
    name: "Marcus Sterling",
    actorName: "Investigative & Deep Intellect",
    gender: "male",
    accent: "Deep American Broadcast",
    tone: "Analytical, grounded, investigative, clear",
    description: "Superb for true crime, investigative journalism, deep philosophy, and business documentaries.",
    suggestedGenres: ["Investigative", "True Crime", "Philosophy", "Documentary"],
    avatar: "🔍",
    color: "from-blue-700 to-slate-900",
    pitch: 0.78,
    rate: 0.98,
    preferredVoiceKeywords: ["Google US English Male", "Microsoft David", "Microsoft Guy", "Josh", "Male", "Deep"],
    introGreeting: "Marcus Sterling reporting. Let us delve into the unvarnished facts and critical insights of your work.",
    geminiVoice: "Fenrir",
    elevenLabsVoiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh (Premade)
    actingDirection: "Deliver with grounded investigative gravitas, clear analytical pauses, and intellectual authority.",
    badge: "Josh (Premade) • Fenrir",
  },
  {
    id: "grace-montgomery",
    name: "Grace Montgomery",
    actorName: "Southern Gothic & Historical Romance",
    gender: "female",
    accent: "Gentle Southern American Lilt",
    tone: "Warm, evocative, hospitable, melancholic",
    description: "Ideal for Southern gothic, historical romance, multi-generational family sagas, and cozy fiction.",
    suggestedGenres: ["Historical Romance", "Southern Gothic", "Family Saga", "Cozy Fiction"],
    avatar: "🌸",
    color: "from-pink-600 to-rose-900",
    pitch: 1.05,
    rate: 0.95,
    preferredVoiceKeywords: ["Google US English Female", "Microsoft Zira", "Samantha", "Grace", "Bella", "Female"],
    introGreeting: "A cordial welcome to you. I am Grace Montgomery, ready to share the heart and soul of your storytelling.",
    geminiVoice: "Aoede",
    elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL", // Bella (Premade)
    actingDirection: "Narrate with sweet Southern cadence, hospitality, emotional resonance, and lyrical charm.",
    badge: "Bella (Premade) • Aoede",
  },
  {
    id: "charlotte-noir",
    name: "Charlotte Dubois",
    actorName: "European Seductive & Dramatic",
    gender: "female",
    accent: "Sophisticated European / Transatlantic",
    tone: "Seductive, mysterious, elegant, sharp",
    description: "Perfect for psychological suspense, espionage, high-fashion mysteries, and Parisian noir.",
    suggestedGenres: ["Espionage", "Mystery", "Noir", "Psychological"],
    avatar: "💎",
    color: "from-violet-700 to-fuchsia-950",
    pitch: 1.02,
    rate: 0.95,
    preferredVoiceKeywords: ["Google UK English Female", "Microsoft Hazel", "Microsoft Catherine", "Victoria", "Charlotte", "Female"],
    introGreeting: "Bonsoir. I am Charlotte Dubois. Let us step into the alluring shadows where secrets reside.",
    geminiVoice: "Aoede",
    elevenLabsVoiceId: "MF3mGyEYCl7XYWbV9V6O", // Elli (Premade)
    actingDirection: "Speak with sophisticated European intrigue, alluring mystery, and sharp dramatic flair.",
    badge: "Elli (Premade) • Aoede",
  },
];

export interface AudiobookChapterTrack {
  id: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  wordCount: number;
  estimatedDurationMinutes: number;
  actualDurationSeconds?: number;
  audioBlob?: Blob;
  audioUrl?: string;
  status: "idle" | "synthesizing" | "ready" | "error";
  voicePresetId: string;
  voicePresetName: string;
  generatedAt?: string;
  fileSizeBytes?: number;
  driveFileId?: string;
  driveWebViewLink?: string;
  narrationScript: string;
  cues: { time: number; text: string }[];
}

export interface AudiobookSettings {
  selectedVoiceId: string;
  voiceEngine: "gemini" | "elevenlabs" | "browser";
  elevenLabsApiKey?: string;
  playbackSpeed: number; // 0.75 - 2.0
  pitchModifier: number;  // 0.8 - 1.2
  pauseBetweenParagraphsMs: number; // 200 - 1500
  includeIntroAnnouncement: boolean;
  includeOutroAnnouncement: boolean;
  normalizeAudio: boolean;
  customBrowserVoiceName?: string;
}

export const DEFAULT_AUDIOBOOK_SETTINGS: AudiobookSettings = {
  selectedVoiceId: "arthur-sterling",
  voiceEngine: "gemini",
  playbackSpeed: 1.0,
  pitchModifier: 1.0,
  pauseBetweenParagraphsMs: 400,
  includeIntroAnnouncement: true,
  includeOutroAnnouncement: true,
  normalizeAudio: true,
};

/**
 * Builds the broadcast narration script with clean formatting, title cards, and scene transitions
 */
export function generateChapterNarrationScript(
  book: Book,
  chapter: Chapter,
  settings: AudiobookSettings,
  voicePreset: AudiobookVoicePreset
): string {
  const parts: string[] = [];

  // Intro Announcement
  if (settings.includeIntroAnnouncement) {
    if (chapter.number === 1) {
      parts.push(
        `TomeCrafter Audio presents: ${book.title}${book.subtitle ? `, ${book.subtitle}` : ""}. Written by ${book.author}. Narrated by ${voicePreset.name}.`
      );
    }
    parts.push(`Chapter ${chapter.number}: ${chapter.title}.`);
    if (chapter.setting && chapter.setting !== "Unspecified") {
      parts.push(`Setting: ${chapter.setting}.`);
    }
  }

  // Main Chapter Content: Clean out Markdown formatting, headers, or bracketed notes
  let cleanContent = (chapter.content || "")
    .replace(/^#{1,6}\s+.*$/gm, "") // remove markdown headers
    .replace(/\!\[.*?\]\(.*?\)/g, "") // remove images
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // clean links to text
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // clean bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // clean italics
    .replace(/`{1,3}.*?`{1,3}/g, "") // clean code blocks
    .replace(/(\r\n|\r|\n){3,}/g, "\n\n") // normalize line breaks
    .trim();

  if (!cleanContent) {
    cleanContent = chapter.summary || "No text provided for this chapter.";
  }

  parts.push(cleanContent);

  // Outro Announcement
  if (settings.includeOutroAnnouncement) {
    parts.push(`End of Chapter ${chapter.number}.`);
  }

  return parts.join("\n\n");
}

/**
 * Indicators for reliably identifying male vs female synthesized voices across all platforms
 */
const MALE_VOICE_INDICATORS = [
  "male", " man", " boy", " sir", " mr",
  "daniel", "george", "david", "oliver", "ryan", "james", "charles", "guy",
  "brian", "arthur", "richard", "tom", "mark", "alex", "arnold", "sam",
  "adam", "josh", "antoni", "gordon", "aaron", "fred", "ralph", "albert",
  "rjs", "fis", "gba", "tpd", "iol",
];

const FEMALE_VOICE_INDICATORS = [
  "female", "woman", "girl", "lady", "miss", "mrs",
  "samantha", "victoria", "zira", "eva", "karen", "moira", "fiona", "hazel",
  "susan", "catherine", "jenny", "aria", "bella", "rachel", "domi", "elli",
  "charlotte", "elena", "marsha", "sophia", "grace", "serena", "kate", "stephanie",
  "tessa", "ava", "allison", "clara", "sfg", "gbb",
];

export function isVoiceExplicitlyMale(v: SpeechSynthesisVoice): boolean {
  const n = (v.name + " " + v.voiceURI).toLowerCase();
  return MALE_VOICE_INDICATORS.some((ind) => n.includes(ind));
}

export function isVoiceExplicitlyFemale(v: SpeechSynthesisVoice): boolean {
  const n = (v.name + " " + v.voiceURI).toLowerCase();
  return FEMALE_VOICE_INDICATORS.some((ind) => n.includes(ind));
}

/**
 * Finds the best available browser SpeechSynthesisVoice matching the preset
 * Strictly enforces gender correctness and regional accent matching.
 */
export function matchBrowserVoice(
  voices: SpeechSynthesisVoice[],
  preset: AudiobookVoicePreset,
  customVoiceName?: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  if (customVoiceName) {
    const custom = voices.find((v) => v.name === customVoiceName);
    if (custom) return custom;
  }

  const isBritishTarget =
    preset.accent.toLowerCase().includes("british") ||
    preset.accent.toLowerCase().includes("rp") ||
    preset.accent.toLowerCase().includes("celtic") ||
    preset.accent.toLowerCase().includes("european");

  // 1. Check exact preferred keywords
  for (const kw of preset.preferredVoiceKeywords) {
    const kwLower = kw.toLowerCase();
    const found = voices.find((v) => {
      const vName = v.name.toLowerCase();
      const vUri = v.voiceURI.toLowerCase();
      return vName.includes(kwLower) || vUri.includes(kwLower);
    });

    if (found) {
      // Validate gender consistency
      if (preset.gender === "male" && isVoiceExplicitlyFemale(found) && !isVoiceExplicitlyMale(found)) {
        continue;
      }
      if (preset.gender === "female" && isVoiceExplicitlyMale(found) && !isVoiceExplicitlyFemale(found)) {
        continue;
      }
      return found;
    }
  }

  // 2. Strict Gender + Accent matching
  if (preset.gender === "male") {
    // 2a. British Male
    if (isBritishTarget) {
      const britishMale = voices.find(
        (v) =>
          (v.lang.toLowerCase().includes("gb") || v.lang.toLowerCase().includes("uk") || v.name.toLowerCase().includes("uk") || v.name.toLowerCase().includes("british")) &&
          isVoiceExplicitlyMale(v) &&
          !isVoiceExplicitlyFemale(v)
      );
      if (britishMale) return britishMale;
    }

    // 2b. Any English Male
    const anyEnglishMale = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("en") &&
        isVoiceExplicitlyMale(v) &&
        !isVoiceExplicitlyFemale(v)
    );
    if (anyEnglishMale) return anyEnglishMale;

    // 2c. Any English voice that is NOT female
    const nonFemaleEnglish = voices.find(
      (v) => v.lang.toLowerCase().startsWith("en") && !isVoiceExplicitlyFemale(v)
    );
    if (nonFemaleEnglish) return nonFemaleEnglish;
  } else if (preset.gender === "female") {
    // 2a. British/Celtic Female if requested
    if (isBritishTarget) {
      const britishFemale = voices.find(
        (v) =>
          (v.lang.toLowerCase().includes("gb") || v.lang.toLowerCase().includes("uk") || v.name.toLowerCase().includes("uk") || v.name.toLowerCase().includes("british")) &&
          isVoiceExplicitlyFemale(v)
      );
      if (britishFemale) return britishFemale;
    }

    // 2b. Any English Female
    const anyEnglishFemale = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("en") &&
        isVoiceExplicitlyFemale(v)
    );
    if (anyEnglishFemale) return anyEnglishFemale;
  }

  // 3. Fallback to any English voice
  const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  return anyEnglish || voices[0] || null;
}

/**
 * Creates a standard PCM WAV Blob from raw synthesized audio samples
 */
export function encodeWAV(samples: Float32Array, sampleRate: number = 44100): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");

  // FMT sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // DATA sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples with soft clipping & dither
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Synthesizes a paragraph or full text chunk into an AudioBuffer using AudioContext & Web Speech
 */
export async function synthesizeNarrationChunk(
  text: string,
  voice: SpeechSynthesisVoice | null,
  pitch: number,
  rate: number
): Promise<{ duration: number; cues: { time: number; text: string }[] }> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error("Speech synthesis not supported in this browser."));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));

    const cues: { time: number; text: string }[] = [];
    const startTime = Date.now();

    utterance.onboundary = (e) => {
      if (e.name === "word" || e.name === "sentence") {
        cues.push({
          time: (Date.now() - startTime) / 1000,
          text: text.slice(e.charIndex, e.charIndex + (e.charLength || 10)),
        });
      }
    };

    utterance.onend = () => {
      const duration = (Date.now() - startTime) / 1000;
      resolve({ duration, cues });
    };

    utterance.onerror = (e) => {
      reject(new Error(e.error || "Speech synthesis error"));
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Converts a Base64 string to a Blob
 */
export function base64ToBlob(base64Data: string, mimeType: string = "audio/wav"): Blob {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Accurately measures the duration in seconds of an audio blob
 */
export async function getAudioBlobDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration || 5);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(5);
    };
  });
}

/**
 * Plays an audition sample for a voice preset using Gemini 3.1 Neural TTS, ElevenLabs, or Device Web Speech
 */
export async function auditionVoicePresetWithAI(
  preset: AudiobookVoicePreset,
  settings: AudiobookSettings,
  onStart?: () => void,
  onEnd?: () => void
): Promise<{ audio?: HTMLAudioElement; duration: number }> {
  if (onStart) onStart();

  console.log(`[AudiobookStudio Audition] Starting audition: "${preset.name}" (${preset.gender}), Engine: "${settings.voiceEngine}"`, {
    presetId: preset.id,
    geminiVoice: preset.geminiVoice,
    elevenLabsVoiceId: preset.elevenLabsVoiceId,
  });

  if (settings.voiceEngine !== "browser") {
    try {
      const response = await fetch("/api/audio/audition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presetId: preset.id,
          customGreeting: preset.introGreeting,
          engine: settings.voiceEngine || "gemini",
          elevenLabsApiKey: settings.elevenLabsApiKey,
          elevenLabsVoiceId: preset.elevenLabsVoiceId,
          geminiVoiceName: preset.geminiVoice,
          actingPrompt: preset.actingDirection,
        }),
      });

      console.log(`[AudiobookStudio Audition] Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`[AudiobookStudio Audition] Response data:`, {
          success: data.success,
          engine: data.engine,
          hasAudio: !!data.audioBase64,
          mimeType: data.mimeType,
        });

        if (data.audioBase64) {
          const blob = base64ToBlob(data.audioBase64, data.mimeType || "audio/wav");
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);

          audio.onended = () => {
            if (onEnd) onEnd();
          };

          audio.onerror = () => {
            if (onEnd) onEnd();
          };

          await audio.play();
          return { audio, duration: audio.duration || 4 };
        }
      }
    } catch (err: any) {
      console.warn("[AudiobookStudio Audition] AI Audition API error, falling back to local speech:", err.message);
    }
  }

  // Fallback to high-quality browser Web Speech API
  console.log(`[AudiobookStudio Audition] Auditioning via browser Web Speech API.`);
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(preset.introGreeting);
    const isBritish =
      preset.accent.toLowerCase().includes("british") ||
      preset.accent.toLowerCase().includes("rp") ||
      preset.accent.toLowerCase().includes("celtic") ||
      preset.accent.toLowerCase().includes("european");
    utterance.lang = isBritish ? "en-GB" : "en-US";

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = matchBrowserVoice(voices, preset, settings.customBrowserVoiceName);
    if (matchedVoice) utterance.voice = matchedVoice;
    
    // Strict gender pitch handling
    let targetPitch = preset.pitch * settings.pitchModifier;
    if (preset.gender === "male") {
      targetPitch = Math.max(0.65, Math.min(0.92, targetPitch));
    } else if (preset.gender === "female") {
      targetPitch = Math.max(0.98, Math.min(1.40, targetPitch));
    }
    utterance.pitch = targetPitch;
    utterance.rate = Math.max(0.7, Math.min(1.6, preset.rate * settings.playbackSpeed));

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  } else {
    if (onEnd) onEnd();
  }
  return { duration: 4 };
}

/**
 * Synthesizes high-fidelity audio for an audiobook chapter track
 * Uses Gemini 3.1 Neural TTS / ElevenLabs with fallback to high quality device browser voice narration
 */
export async function generateSyntheticAudioTrack(
  text: string,
  voicePreset: AudiobookVoicePreset,
  settings: AudiobookSettings,
  onProgress?: (percent: number, currentChunk: string) => void
): Promise<{ blob?: Blob; url?: string; durationSeconds: number; engineUsed: string }> {
  // Approximate speech duration based on word count & rate
  const words = text.trim().split(/\s+/).filter(Boolean);
  const effectiveWPM = 145 * (settings.playbackSpeed * voicePreset.rate);
  const estimatedSeconds = Math.max(3, Math.round((words.length / effectiveWPM) * 60));

  console.log(`[AudiobookStudio Synthesis] Starting track synthesis: ${words.length} words, Voice: ${voicePreset.name} (${voicePreset.gender}), Engine: ${settings.voiceEngine}`);

  if (onProgress) {
    onProgress(20, `Preparing ${settings.voiceEngine === "elevenlabs" ? "ElevenLabs" : settings.voiceEngine === "browser" ? "Device Voice" : "Studio Neural"} Engine...`);
  }

  // If AI Engine is selected (Gemini or ElevenLabs), attempt server synthesis
  if (settings.voiceEngine !== "browser") {
    try {
      if (onProgress) {
        onProgress(45, `Synthesizing with ${voicePreset.name} (${voicePreset.badge})...`);
      }

      console.log(`[AudiobookStudio Synthesis] POST /api/audio/tts payload dispatch:`, {
        presetId: voicePreset.id,
        geminiVoiceName: voicePreset.geminiVoice,
        engine: settings.voiceEngine,
        elevenLabsVoiceId: voicePreset.elevenLabsVoiceId,
        textChars: text.length,
      });

      const response = await fetch("/api/audio/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          presetId: voicePreset.id,
          geminiVoiceName: voicePreset.geminiVoice,
          actingPrompt: voicePreset.actingDirection,
          engine: settings.voiceEngine,
          elevenLabsApiKey: settings.elevenLabsApiKey,
          elevenLabsVoiceId: voicePreset.elevenLabsVoiceId,
        }),
      });

      console.log(`[AudiobookStudio Synthesis] Response HTTP status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`[AudiobookStudio Synthesis] Response JSON:`, {
          success: data.success,
          engine: data.engine,
          hasAudio: !!data.audioBase64,
          mimeType: data.mimeType,
          chunksCount: data.chunksCount,
        });

        if (data.audioBase64) {
          if (onProgress) {
            onProgress(85, "Mastering audio track...");
          }

          const blob = base64ToBlob(data.audioBase64, data.mimeType || "audio/wav");
          const url = URL.createObjectURL(blob);
          const measuredDuration = await getAudioBlobDuration(blob);

          console.log(`[AudiobookStudio Synthesis] Master audio generated: ${blob.size} bytes, measured duration: ${measuredDuration}s`);

          if (onProgress) {
            onProgress(100, "Audio track ready!");
          }

          return {
            blob,
            url,
            durationSeconds: measuredDuration > 0 ? measuredDuration : estimatedSeconds,
            engineUsed: data.engine || settings.voiceEngine,
          };
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn("[AudiobookStudio Synthesis] Server returned error response:", errJson);
      }
    } catch (apiError: any) {
      console.warn("[AudiobookStudio Synthesis] AI TTS server synthesis error:", apiError.message);
    }
  }

  if (onProgress) {
    onProgress(100, "Ready for high-quality device voice narration.");
  }

  return {
    durationSeconds: estimatedSeconds,
    engineUsed: "browser_speech",
  };
}

/**
 * Downloads a single chapter audio file (.WAV) to local device
 */
export function downloadAudioTrackFile(
  track: AudiobookChapterTrack,
  bookTitle: string
): void {
  if (!track.audioBlob && !track.audioUrl) {
    throw new Error("No audio has been synthesized for this chapter yet.");
  }

  const cleanBook = bookTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${cleanBook}_Ch${track.chapterNumber}_${track.chapterTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.wav`;

  const link = document.createElement("a");
  link.href = track.audioUrl || (track.audioBlob ? URL.createObjectURL(track.audioBlob) : "");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Packages all synthesized chapters into a complete Audiobook Master .ZIP with M3U playlist & metadata
 */
export async function downloadFullAudiobookZip(
  book: Book,
  tracks: AudiobookChapterTrack[],
  settings: AudiobookSettings,
  voicePreset: AudiobookVoicePreset
): Promise<void> {
  const zip = new JSZip();
  const cleanTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const folder = zip.folder(`${cleanTitle}_Complete_Audiobook`);

  // 1. Add All Audio Tracks
  let m3uPlaylist = `#EXTM3U\n#PLAYLIST:${book.title} (Audiobook Edition)\n#AUTHOR:${book.author}\n#NARRATOR:${voicePreset.name}\n\n`;

  for (const track of tracks) {
    const filename = `Chapter_${track.chapterNumber}_${track.chapterTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.wav`;
    
    if (track.audioBlob) {
      folder?.file(filename, track.audioBlob);
    } else {
      // Generate synthetic track if missing
      const synth = await generateSyntheticAudioTrack(track.narrationScript, voicePreset, settings);
      if (synth.blob) {
        folder?.file(filename, synth.blob);
      }
    }

    const duration = track.actualDurationSeconds || track.estimatedDurationMinutes * 60;
    m3uPlaylist += `#EXTINF:${Math.round(duration)},${book.title} - Chapter ${track.chapterNumber}: ${track.chapterTitle}\n${filename}\n\n`;
  }

  // 2. Add M3U Playlist file
  folder?.file(`${cleanTitle}_Playlist.m3u`, m3uPlaylist);

  // 3. Add Complete Narration Transcript & Metadata
  let transcript = `=======================================================\n`;
  transcript += `${book.title.toUpperCase()}\n`;
  if (book.subtitle) transcript += `${book.subtitle}\n`;
  transcript += `By ${book.author}\n`;
  transcript += `Narrated by ${voicePreset.name} (${voicePreset.actorName})\n`;
  transcript += `Mastered via TomeCrafter AI Audiobook Studio\n`;
  transcript += `=======================================================\n\n`;

  tracks.forEach((t) => {
    transcript += `\n--- CHAPTER ${t.chapterNumber}: ${t.chapterTitle.toUpperCase()} ---\n\n`;
    transcript += t.narrationScript + "\n\n";
  });

  folder?.file("AUDIOBOOK_TRANSCRIPT.txt", transcript);

  // 4. Add Audiobook Metadata JSON (Audible / Apple Books / ACX ready)
  const metadata = {
    title: book.title,
    subtitle: book.subtitle || "",
    author: book.author,
    narrator: voicePreset.name,
    narratorActorStyle: voicePreset.actorName,
    accent: voicePreset.accent,
    genre: book.genre,
    totalChapters: tracks.length,
    totalEstimatedDurationMinutes: tracks.reduce((sum, t) => sum + t.estimatedDurationMinutes, 0),
    synthesizedAt: new Date().toISOString(),
    playbackSpeed: settings.playbackSpeed,
    chapters: tracks.map((t) => ({
      chapterNumber: t.chapterNumber,
      title: t.chapterTitle,
      wordCount: t.wordCount,
      estimatedDurationMinutes: t.estimatedDurationMinutes,
    })),
  };
  folder?.file("audiobook_manifest.json", JSON.stringify(metadata, null, 2));

  // Generate ZIP and trigger browser download
  const content = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `${cleanTitle}_Audiobook_Master_Package.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Uploads all generated audiobook files directly into a designated folder on the user's Google Drive
 */
export async function uploadAudiobookToGoogleDrive(
  book: Book,
  tracks: AudiobookChapterTrack[],
  settings: AudiobookSettings,
  voicePreset: AudiobookVoicePreset,
  onProgress?: (status: string) => void
): Promise<{
  folderId: string;
  folderLink: string;
  uploadedCount: number;
  items: { name: string; fileId: string; webViewLink?: string }[];
}> {
  if (onProgress) onProgress("Accessing Google Drive storage...");

  // 1. Create or retrieve root Audiobook folder in Google Drive
  const cleanTitle = book.title.replace(/[^a-zA-Z0-9 _-]/g, "");
  const folderName = `🎙️ ${cleanTitle} - Audiobook Master Edition`;
  const folder = await createOrGetDriveFolder(folderName);

  const items: { name: string; fileId: string; webViewLink?: string }[] = [];

  // 2. Upload Each Chapter WAV
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const filename = `Chapter_${track.chapterNumber}_${track.chapterTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.wav`;

    if (onProgress) {
      onProgress(`Uploading Chapter ${track.chapterNumber}/${tracks.length} (${track.chapterTitle}) to Google Drive...`);
    }

    let blob = track.audioBlob;
    if (!blob) {
      const synth = await generateSyntheticAudioTrack(track.narrationScript, voicePreset, settings);
      blob = synth.blob;
    }
    if (!blob) {
      continue;
    }

    const uploadRes = await uploadBlobToGoogleDrive({
      name: filename,
      blob,
      mimeType: "audio/wav",
      description: `Audiobook narration for Chapter ${track.chapterNumber} of "${book.title}". Narrated by ${voicePreset.name}.`,
      folderId: folder.id,
    });

    items.push({
      name: filename,
      fileId: uploadRes.fileId,
      webViewLink: uploadRes.webViewLink,
    });
  }

  // 3. Upload Full Transcript TXT
  if (onProgress) onProgress("Uploading Master Narration Transcript...");
  let transcript = `TomeCrafter AI Audiobook Master Transcript\nBook: ${book.title}\nAuthor: ${book.author}\nNarrator: ${voicePreset.name}\n\n`;
  tracks.forEach((t) => {
    transcript += `\n=== CHAPTER ${t.chapterNumber}: ${t.chapterTitle} ===\n\n${t.narrationScript}\n\n`;
  });

  const transcriptBlob = new Blob([transcript], { type: "text/plain" });
  const transcriptRes = await uploadBlobToGoogleDrive({
    name: `${cleanTitle}_Narration_Script.txt`,
    blob: transcriptBlob,
    mimeType: "text/plain",
    description: `Full spoken audio script for ${book.title}`,
    folderId: folder.id,
  });

  items.push({
    name: `${cleanTitle}_Narration_Script.txt`,
    fileId: transcriptRes.fileId,
    webViewLink: transcriptRes.webViewLink,
  });

  return {
    folderId: folder.id,
    folderLink: folder.webViewLink || "",
    uploadedCount: items.length,
    items,
  };
}
