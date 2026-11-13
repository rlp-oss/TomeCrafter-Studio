import { RealmAgent } from "../types";

export const REALM_AGENTS: RealmAgent[] = [
  {
    id: "architect",
    name: "Archon Vael",
    title: "Master of Structure & Plot Architecture",
    realm: "The Obsidian Citadel of Plot",
    icon: "LayoutGrid",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description:
      "Guardian of narrative tension, 3-act and 5-act beat sheets, pacing curves, cliffhangers, and structural blueprints for any literary genre.",
    specialties: [
      "Save-the-Cat & Hero's Journey Beat Sheets",
      "Chapter Breakdowns & Pacing Calculus",
      "Mystery Grid & Clue Distribution",
      "Subplot Weaving & Climax Escalation",
    ],
    promptStarters: [
      "Generate a 10-chapter outline for a high-stakes turning point",
      "Analyze the narrative pacing and identify sagging middle beats",
      "Design a shocking mid-point reveal with three layered clues",
      "Help me balance the protagonist's internal arc with external conflict",
    ],
    quote: "A story without structural bones is merely mist; let us construct an indestructible spine.",
  },
  {
    id: "stylist",
    name: "Lady Seraphina",
    title: "Sovereign of Voice & Prose Styling",
    realm: "The Gilded Spire of Eloquence",
    icon: "Feather",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description:
      "Sculptor of lyrical rhythms, distinctive character voices, visceral sensory immersion, and razor-sharp dialogue with rich subtext.",
    specialties: [
      "Visceral Sensory Immersion (5 senses)",
      "Show-Don't-Tell Dynamic Transformations",
      "Dialogue Subtext & Distinct Cadences",
      "Rhythm, Cadence, & Voice Palette",
    ],
    promptStarters: [
      "Rewrite this paragraph to heighten tension and visceral dread",
      "Infuse this romantic dialogue with double entendre and emotional subtext",
      "Expand this duel scene with cinematic slow-motion sensory details",
      "Continue writing the next 500 words in high gothic style",
    ],
    quote: "Every sentence must pulse with breath, tension, and the unmistakable texture of truth.",
  },
  {
    id: "editor",
    name: "High Inquisitor Thorne",
    title: "Grand Sovereign of Polish & Editorial Rigor",
    realm: "The Glass Sanctum of Precision",
    icon: "CheckCircle2",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description:
      "Relentless seeker of plot holes, continuity drift, clunky exposition, passive voice, repetition, and pacing bottlenecks.",
    specialties: [
      "Deep Developmental & Structural Audits",
      "Line-by-Line Polish & Micro-tension",
      "Continuity & Timeline Verification",
      "Readability & Flow Optimization",
    ],
    promptStarters: [
      "Critique this chapter for narrative stakes and pacing stalls",
      "Identify clunky exposition and recommend natural dialogue embeds",
      "Scan for overused words, passive voice, and weak adverbs",
      "Review character agency: Is the protagonist acting or merely reacting?",
    ],
    quote: "Perfection is achieved not when there is nothing more to add, but when nothing can be taken away.",
  },
  {
    id: "scholar",
    name: "Archivist Elendur",
    title: "Master of Lore & Worldbuilding Scholarship",
    realm: "The Grand Athenaeum of Worlds",
    icon: "Compass",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    description:
      "Architect of hard/soft magic systems, speculative science, ancient histories, geopolitics, language dialects, and character bibles.",
    specialties: [
      "Magic Systems & Hard Tech Feasibility",
      "Geopolitical Factions & Cultural Norms",
      "Historical Verisimilitude & Authenticity",
      "Character Psychology & Deep Bibles",
    ],
    promptStarters: [
      "Create a magic system based on sound resonance with steep biological costs",
      "Design a clandestine criminal syndicate with unique hand-signs and rituals",
      "Flesh out an ancient sunken city with architectural and cultural remnants",
      "Draft a comprehensive character profile with subconscious flaw and core trauma",
    ],
    quote: "A world must breathe before its inhabitants speak; history is the bedrock of every motive.",
  },
  {
    id: "artisan",
    name: "Grand Visualist Morgana",
    title: "Director of Aesthetics & Illustration",
    realm: "The Prismatic Atelier of Visions",
    icon: "Sparkles",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    description:
      "Visionary of bespoke book cover art, chapter header engravings, character portraiture, atmospheric scene plates, and typography.",
    specialties: [
      "Atmospheric Book Cover Composition",
      "Chapter Header Woodcut & Engraving Motifs",
      "Photorealistic & Painterly Scene Plates",
      "Visual Continuity & Aesthetic Palette",
    ],
    promptStarters: [
      "Design a high-contrast moody book cover prompt for a gothic fantasy",
      "Generate an intricate chapter header plate of an antique alchemical laboratory",
      "Create a dramatic character portrait with volumetric candlelight lighting",
      "Draft visual styling guidelines for a cyberpunk neon noir novel",
    ],
    quote: "Before the first word is read, the cover whispers the soul of the odyssey.",
  },
  {
    id: "publisher",
    name: "Imperator Cassian",
    title: "Strategist of Publishing & Typesetting",
    realm: "The Sovereign Hall of Distribution",
    icon: "BookOpenCheck",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    description:
      "Master of Amazon KDP optimization, high-converting blurbs, IngramSpark margins, spine width calculation, and agent query letters.",
    specialties: [
      "Amazon KDP & IngramSpark Compliance",
      "Hypnotic Back-Cover Blurb Engineering",
      "7 High-Traffic Keywords & BISAC Category Selection",
      "Literary Agent Query Letters & Book Proposals",
    ],
    promptStarters: [
      "Craft a 3-act bestselling sales blurb with hook, conflict, and stakes",
      "Generate 7 high-volume low-competition Amazon search keyword phrases",
      "Draft a query letter to top literary agents for traditional representation",
      "Calculate print spine width and typesetting margins for 6x9 trade format",
    ],
    quote: "A masterpiece unread is a tragedy; let us prepare your manuscript to conquer the world.",
  },
];
