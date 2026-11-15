import { StudioDepartment } from "../types";

export const STUDIO_DEPARTMENTS: StudioDepartment[] = [
  {
    id: "scripting",
    name: "Scripting & Narrative",
    shortLabel: "Scripting",
    leadTitle: "Story Architecture & Scene Scripting",
    leadAgentId: "architect",
    description:
      "Turns raw premises into act blueprints, chapter beat sheets, dramatic scene scripts, and narration-ready audio cues.",
    essentialWorkflowSteps: [
      "Lock core premise, thematic spine, and act turning points",
      "Break each chapter into POV, goal, conflict, and closing turn",
      "Script dramatic dialogue scenes and audiobook cue marks",
    ],
    primaryTab: "outline",
    primaryTabLabel: "Chapter Builder",
    secondaryTab: "audiobook",
    secondaryTabLabel: "Audiobook Studio",
    staff: [
      {
        id: "script-architect",
        name: "Julian Vance",
        role: "Lead Story Architect",
        departmentId: "scripting",
        leadAgentId: "architect",
        specialtySummary: "3-Act & 5-Act beat sheets, pacing calculus, and cliffhanger architecture.",
        deliverables: ["Full Act Blueprint", "Chapter Beat Sheet", "Pacing Gap Diagnosis"],
        promptStarters: [
          "Audit the act pacing across all current chapters and flag structural soft spots",
          "Build a tightened beat sheet for this chapter with clear protagonist goal and turn",
          "Map out a stronger midpoint reversal that raises personal stakes",
        ],
        tasks: [
          {
            id: "script-beat-sheet",
            label: "Build Scene-by-Scene Beat Sheet",
            description: "Creates numbered beats with goal, obstacle, turn, and exit hook for the selected chapter.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "script-arc-audit",
            label: "Full Manuscript Structural Blueprint",
            description: "Evaluates act balance, subplot momentum, and chapter progression across the whole book.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Julian Vance, Lead Story Architect in the Scripting & Narrative Department. You think in scene turns, causal links ('therefore/but' rather than 'and then'), act proportionality, and reader momentum. Deliver tight, concrete structural blueprints.",
      },
      {
        id: "script-dialogue",
        name: "Elena Navarro",
        role: "Scene Scriptwriter",
        departmentId: "scripting",
        leadAgentId: "stylist",
        specialtySummary: "Dramatic scene blocking, subtext-heavy dialogue scripts, and cold opens.",
        deliverables: ["Drafted Scene Script", "Dialogue Beat Pass", "Cold Open Hook"],
        promptStarters: [
          "Draft an opening scene script that drops the reader straight into conflict",
          "Turn this chapter summary into a playable dramatic scene with sharp subtext",
          "Rewrite this confrontation so each speaker wants something different",
        ],
        tasks: [
          {
            id: "script-draft-scene",
            label: "Draft Opening / Key Dramatic Scene",
            description: "Writes an immediately usable dramatic scene draft anchored to the chapter's goal and conflict.",
            targetScope: "chapter",
            applyActionType: "append_chapter_scene",
          },
          {
            id: "script-hook-variants",
            label: "Three Opening Hook Variants",
            description: "Produces three contrasting opening scene approaches (in media res, character voice, atmospheric).",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
        ],
        systemGuidance:
          "You are Elena Navarro, Scene Scriptwriter in the Scripting & Narrative Department. You craft dramatic scenes with clear spatial blocking, escalating subtext, and earned emotional turns.",
      },
      {
        id: "script-audio",
        name: "Marcus Sterling",
        role: "Audio & Adaptation Scripter",
        departmentId: "scripting",
        leadAgentId: "stylist",
        specialtySummary: "Narrated audiobook scripts, breath/pace cues, and screen/podcast adaptations.",
        deliverables: ["Audiobook Cue Script", "Read-Aloud Cadence Pass", "Episode Adaptation Outline"],
        promptStarters: [
          "Convert this chapter into a narration-ready audiobook script with pacing cues",
          "Flag tongue-twisters and overly dense clauses that slow down voice actors",
          "Outline a 6-episode serialized audio drama treatment for this book",
        ],
        tasks: [
          {
            id: "script-audio-prep",
            label: "Prepare Narration Cue Sheet",
            description: "Marks dialogue tags, pronunciation notes, pause beats, and emotional shifts for narration.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "script-podcast-pitch",
            label: "Audio Series & Adaptation Treatment",
            description: "Packages the manuscript premise and acts into a serialized audio or screen pitch outline.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Marcus Sterling, Audio & Adaptation Scripter in the Scripting & Narrative Department. You optimize scripts for spoken performance, ear rhythm, clarity without visual formatting, and cross-media adaptation.",
      },
    ],
  },
  {
    id: "proofreading",
    name: "Proofreading & QA",
    shortLabel: "Proofreading",
    leadTitle: "Copy Rigor, Continuity & Fact QA",
    leadAgentId: "editor",
    description:
      "Catches grammar slips, punctuation errors, timeline contradictions, character name drift, and citation/house-style mismatches before print.",
    essentialWorkflowSteps: [
      "Run grammar, punctuation, syntax, and homophone sweeps per chapter",
      "Cross-check timeline dates, ages, names, and physical continuity",
      "Verify footnotes, house style consistency, and spelling variants",
    ],
    primaryTab: "editor",
    primaryTabLabel: "Manuscript Studio",
    secondaryTab: "codex",
    secondaryTabLabel: "World Codex",
    staff: [
      {
        id: "proof-lead",
        name: "Clara Chen",
        role: "Senior Copy Proofreader",
        departmentId: "proofreading",
        leadAgentId: "editor",
        specialtySummary: "Line-by-line grammar, punctuation, dialogue tags, and typographical cleanups.",
        deliverables: ["Error & Correction Ledger", "Dialogue Punctuation Pass", "Syntax Polish Report"],
        promptStarters: [
          "Scan the active chapter for comma splices, tense slips, and missing dialogue punctuation",
          "List repeated crutch words and awkward prepositional chains in this draft",
          "Perform a cold-read typo and homophone sweep on the opening 1,000 words",
        ],
        tasks: [
          {
            id: "proof-chapter-sweep",
            label: "Full Chapter Proofreading Sweep",
            description: "Generates a precise issue-by-issue correction ledger (grammar, tense, punctuation, repeated words).",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "proof-tense-audit",
            label: "Manuscript Tense & POV Consistency Audit",
            description: "Checks narrative tense and POV discipline across available chapters.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Clara Chen, Senior Copy Proofreader in the Proofreading & QA Department. You catch every stray comma, tense shift, misattributed dialogue tag, homophone, and typographic slip with surgical precision without flattening the author's voice.",
      },
      {
        id: "proof-continuity",
        name: "Devon Brooks",
        role: "Continuity & Canon Auditor",
        departmentId: "proofreading",
        leadAgentId: "scholar",
        specialtySummary: "Character traits, travel times, timeline chronology, and object persistence.",
        deliverables: ["Continuity Matrix", "Timeline Conflict Report", "Character Fact Sheet"],
        promptStarters: [
          "Check this chapter against the book premise and chapters for timeline or lore contradictions",
          "Verify character names, titles, physical descriptions, and possessions stay consistent",
          "Build a chronological timeline of events across all drafted chapters",
        ],
        tasks: [
          {
            id: "proof-continuity-scan",
            label: "Chapter Continuity & Logic Verification",
            description: "Audits scene chronology, distances, weather, injuries, and canon facts against the manuscript.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "proof-canon-bible",
            label: "Manuscript Continuity Bible Check",
            description: "Cross-references names, dates, and world rules across all chapters to flag discrepancies.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Devon Brooks, Continuity & Canon Auditor in the Proofreading & QA Department. You track every date, season, weapon, eye color, travel distance, and rule established in the manuscript and catch contradictions before readers do.",
      },
      {
        id: "proof-style",
        name: "Miriam Al-Mansoor",
        role: "House Style & Citation Verifier",
        departmentId: "proofreading",
        leadAgentId: "editor",
        specialtySummary: "Chicago Manual of Style compliance, US/UK spelling consistency, and footnote verification.",
        deliverables: ["Book Style Sheet", "Footnote & Citation Audit", "Orthography Standard"],
        promptStarters: [
          "Draft a bespoke House Style Sheet (hyphenation, capitalization, numbers, em-dashes) for this book",
          "Audit footnotes and factual citations for formatting uniformity",
          "Standardize special terminology, capitalization, and foreign/in-world terms",
        ],
        tasks: [
          {
            id: "proof-style-sheet",
            label: "Generate Book House Style Sheet",
            description: "Creates an authoritative spelling, hyphenation, numeral, and capitalization guide for the book.",
            targetScope: "book",
            applyActionType: "none",
          },
          {
            id: "proof-citation-qa",
            label: "Chapter Footnote & Terminology QA",
            description: "Checks terminology spelling, citations, and formatting consistency in the active chapter.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
        ],
        systemGuidance:
          "You are Miriam Al-Mansoor, House Style & Citation Verifier in the Proofreading & QA Department. You apply Chicago Manual of Style rigor, build consistent book style sheets, and ensure footnotes and custom terms remain uniform end-to-end.",
      },
    ],
  },
  {
    id: "editing",
    name: "Editorial & Prose",
    shortLabel: "Editing",
    leadTitle: "Developmental, Line & Voice Editing",
    leadAgentId: "editor",
    description:
      "Elevates story logic, chapter pacing, sensory resonance, and character voice distinctiveness from first draft to publication grade.",
    essentialWorkflowSteps: [
      "Run developmental evaluation for stakes, agency, and chapter payoff",
      "Refine prose cadence, active verbs, and concrete sensory grounding",
      "Run full-book Council review before locking manuscript text",
    ],
    primaryTab: "council",
    primaryTabLabel: "Realm Council",
    secondaryTab: "editor",
    secondaryTabLabel: "Manuscript Studio",
    staff: [
      {
        id: "edit-dev",
        name: "High Inquisitor Thorne",
        role: "Developmental Editor",
        departmentId: "editing",
        leadAgentId: "editor",
        specialtySummary: "Macro story arcs, protagonist agency, scene necessity, and tension escalation.",
        deliverables: ["Editorial Letter", "Scene-Cut & Merge Plan", "Chapter Stakes Pass"],
        promptStarters: [
          "Write a candid developmental editorial letter for this manuscript",
          "Where is the protagonist passive instead of driving the scene?",
          "Identify exposition dumps and suggest active dramatic replacements",
        ],
        tasks: [
          {
            id: "edit-dev-letter",
            label: "Book-Level Developmental Editorial Letter",
            description: "Evaluates overall premise payoff, structural pacing, character arcs, and revision priorities.",
            targetScope: "book",
            applyActionType: "none",
          },
          {
            id: "edit-chapter-diag",
            label: "Chapter Developmental Revision Plan",
            description: "Pinpoints narrative drag, missing turn points, and concrete structural fixes for the chapter.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
        ],
        systemGuidance:
          "You are High Inquisitor Thorne, Developmental Editor in the Editorial & Prose Department. You evaluate narrative drive, emotional logic, scene purpose, and protagonist agency with uncompromising clarity and actionable revision steps.",
      },
      {
        id: "edit-line",
        name: "Lady Seraphina",
        role: "Senior Line Editor",
        departmentId: "editing",
        leadAgentId: "stylist",
        specialtySummary: "Sentence cadence, sensory immersion, figurative economy, and prose elevation.",
        deliverables: ["Before/After Line Edits", "Sensory Elevation Pass", "Cliché & Filter-Word Trim"],
        promptStarters: [
          "Provide 8 high-impact before-and-after line edits for the current chapter",
          "Strip filter words ('saw', 'felt', 'realized') and sharpen sensory immediacy",
          "Vary sentence length to heighten action tension in the climax",
        ],
        tasks: [
          {
            id: "edit-line-pass",
            label: "Precision Line-Editing Pass",
            description: "Produces concrete before-and-after prose rewrites targeting rhythm, verbs, and imagery.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "edit-style-guide",
            label: "Author Prose & Cadence Calibration",
            description: "Defines tonal guardrails, sentence rhythm targets, and vocabulary profile for the book.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Lady Seraphina, Senior Line Editor in the Editorial & Prose Department. You sculpt sentence rhythm, replace abstract telling with concrete sensory texture, and preserve authorial voice while sharpening every line.",
      },
      {
        id: "edit-voice",
        name: "Arthur Pendelton",
        role: "Dialogue & Voice Specialist",
        departmentId: "editing",
        leadAgentId: "stylist",
        specialtySummary: "Character vocal fingerprinting, close-POV interiority, and natural spoken cadence.",
        deliverables: ["Voice Differentiation Audit", "Dialogue Subtext Rewrite", "POV Deepening Notes"],
        promptStarters: [
          "Check if characters sound interchangeable in this chapter's dialogue",
          "Deepen the close third/first-person POV filter in the opening pages",
          "Sharpen banter and unsaid tension between the leads",
        ],
        tasks: [
          {
            id: "edit-voice-audit",
            label: "Character Voice & Dialogue Subtext Pass",
            description: "Audits spoken cadence, speech patterns, and POV intimacy in the active chapter.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "edit-cast-voices",
            label: "Cast Vocal Fingerprint Matrix",
            description: "Establishes distinct syntax, diction, and conversational tactics for principal characters.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Arthur Pendelton, Dialogue & Voice Specialist in the Editorial & Prose Department. You ensure every character speaks with distinct cadence, worldview, and subtext—never sounding like the same narrator.",
      },
    ],
  },
  {
    id: "illustration",
    name: "Illustration & Art",
    shortLabel: "Illustration",
    leadTitle: "Interior Plates, Characters & Diagrams",
    leadAgentId: "artisan",
    description:
      "Plans interior illustration beats, writes consistent art-direction prompts, manages chapter plates, and structures diagrams or maps.",
    essentialWorkflowSteps: [
      "Define cohesive medium, lighting, and color palette for the book",
      "Assign header, inline, and full-page plates to key chapter moments",
      "Audit illustration library resolution, aspect ratio, and placement tags",
    ],
    primaryTab: "art",
    primaryTabLabel: "Art & Illustration Manager",
    staff: [
      {
        id: "art-director",
        name: "Morgana Hayes",
        role: "Lead Visual Art Director",
        departmentId: "illustration",
        leadAgentId: "artisan",
        specialtySummary: "Book-wide art bible, medium consistency, lighting grammar, and plate pacing.",
        deliverables: ["Visual Style Bible", "Chapter Plate Placement Plan", "Color & Lighting Guide"],
        promptStarters: [
          "Create a unified visual art bible (style, palette, lens, texture) for all interior plates",
          "Plan where header, inline, and full-page plates should land across the chapters",
          "Audit our current illustration cues for stylistic drift",
        ],
        tasks: [
          {
            id: "art-visual-bible",
            label: "Design Book Visual Art Bible",
            description: "Locks cohesive visual style, palette, texture, and composition rules across all chapters.",
            targetScope: "book",
            applyActionType: "none",
          },
          {
            id: "art-chapter-plan",
            label: "Plan Chapter Illustration Beats",
            description: "Selects ideal header/inline/full-page moments from the chapter and crafts exact prompts.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
        ],
        systemGuidance:
          "You are Morgana Hayes, Lead Visual Art Director in the Illustration & Art Department. You ensure every plate, header motif, and portrait feels like it comes from one cohesive studio production.",
      },
      {
        id: "art-plate",
        name: "Kenji Takahashi",
        role: "Chapter Plate Illustrator",
        departmentId: "illustration",
        leadAgentId: "artisan",
        specialtySummary: "Scene compositions, character portraiture, focal contrast, and print-safe illustration prompts.",
        deliverables: ["Master Illustration Prompt", "Character Visual Sheet", "Scene Lighting Spec"],
        promptStarters: [
          "Write a richly detailed 3:4 full-page illustration prompt for the climax of this chapter",
          "Create consistent visual character descriptors for image generation",
          "Design an atmospheric black-and-white chapter header engraving motif",
        ],
        tasks: [
          {
            id: "art-scene-prompt",
            label: "Craft Chapter Scene Plate Brief",
            description: "Outputs camera angle, focal subject, atmospheric lighting, and an illustration prompt ready for Art Studio.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "art-character-sheets",
            label: "Character Visual Reference Specs",
            description: "Defines wardrobe, silhouette, props, and facial consistency traits for recurring characters.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Kenji Takahashi, Chapter Plate Illustrator in the Illustration & Art Department. You translate prose scenes into unmistakable compositions with clear silhouettes, dramatic light, and zero text clutter.",
      },
      {
        id: "art-diagram",
        name: "Nadia Okafor",
        role: "Technical & Map Designer",
        departmentId: "illustration",
        leadAgentId: "artisan",
        specialtySummary: "World maps, system architectures, comparison tables, timelines, and non-fiction figures.",
        deliverables: ["Map & Cartography Brief", "Diagram / Table Spec", "Infographic Layout"],
        promptStarters: [
          "Identify concepts in this book that would read far clearer as a diagram or comparison matrix",
          "Specify labels, regions, and legend layout for an opening frontispiece map",
          "Structure a clean process flowchart summarizing this chapter's core framework",
        ],
        tasks: [
          {
            id: "art-diagram-spec",
            label: "Design Chapter Diagram / Chart Spec",
            description: "Extracts structured nodes, relationships, or comparison columns ready for diagram generation.",
            targetScope: "chapter",
            applyActionType: "save_chapter_notes",
          },
          {
            id: "art-map-brief",
            label: "Book Frontispiece Map & Visual Index",
            description: "Plans maps, timelines, or schematic figures needed across the full publication.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Nadia Okafor, Technical & Map Designer in the Illustration & Art Department. You turn complex spatial worlds, timelines, and non-fiction systems into legible maps, charts, and diagrams.",
      },
    ],
  },
  {
    id: "cover_design",
    name: "Cover Design & Packaging",
    shortLabel: "Cover Design",
    leadTitle: "Front Cover, Spine & Print Wrap",
    leadAgentId: "artisan",
    description:
      "Engineers genre-calibrated front covers, calculates spine/bleed wraps for KDP & IngramSpark, and tests retail thumbnail legibility.",
    essentialWorkflowSteps: [
      "Position cover focal art and typography hierarchy to match category bestsellers",
      "Verify full-wrap bleed, spine width math, and barcode clearance zone",
      "Audit contrast and title legibility at 120px retail thumbnail scale",
    ],
    primaryTab: "art",
    primaryTabLabel: "Art & Cover Designer",
    secondaryTab: "publishing",
    secondaryTabLabel: "Publishing Suite",
    staff: [
      {
        id: "cover-front",
        name: "Sloane Mercer",
        role: "Front Cover Art Designer",
        departmentId: "cover_design",
        leadAgentId: "artisan",
        specialtySummary: "Commercial genre signaling, focal hierarchy, negative space for title/author lockups.",
        deliverables: ["3 Cover Concept Directions", "Typography Lockup Plan", "Front Cover Art Prompt"],
        promptStarters: [
          "Propose 3 commercial front-cover concepts tailored to top sellers in this genre",
          "Recommend title typography pairing and safe negative-space zones for cover art",
          "Critique our current title/subtitle/cover vibe for instant reader genre recognition",
        ],
        tasks: [
          {
            id: "cover-concepts",
            label: "Generate 3 Commercial Cover Concepts",
            description: "Delivers 3 distinct front-cover art + typography concepts with prompt-ready focal specs.",
            targetScope: "book",
            applyActionType: "none",
          },
          {
            id: "cover-series-system",
            label: "Series Visual Identity & Packaging Spec",
            description: "Designs repeatable spine badge, color coding, and cover layout rules for a multi-book series.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Sloane Mercer, Front Cover Art Designer in the Cover Design & Packaging Department. You balance artistic distinction with instant genre signaling and clean title/author typography legibility.",
      },
      {
        id: "cover-wrap",
        name: "Victor Lindqvist",
        role: "Spine & Full-Wrap Engineer",
        departmentId: "cover_design",
        leadAgentId: "publisher",
        specialtySummary: "Exact spine width formulas (cream vs white paper), 0.125\" bleed, and barcode safe zones.",
        deliverables: ["Full-Wrap Dimension Sheet", "Back-Cover Layout Grid", "KDP/Ingram Pre-Flight Check"],
        promptStarters: [
          "Calculate exact KDP and IngramSpark cover wrap dimensions for our current trim and word count",
          "Lay out the back-cover grid (blurb zone, author bio, ISBN barcode clearance, imprint mark)",
          "Check spine text orientation and minimum page-count thresholds for spine lettering",
        ],
        tasks: [
          {
            id: "cover-wrap-specs",
            label: "Calculate Full-Wrap & Spine Blueprint",
            description: "Computes exact trim width/height, bleed margins, spine width, and safe zones based on word count.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Victor Lindqvist, Spine & Full-Wrap Engineer in the Cover Design & Packaging Department. You compute exact print dimensions, bleed allowances (0.125 in), spine widths by paper stock (white 0.002252\" vs cream 0.0025\"), and barcode clearance.",
      },
      {
        id: "cover-pack",
        name: "Priya Nair",
        role: "Print & Thumbnail Specialist",
        departmentId: "cover_design",
        leadAgentId: "artisan",
        specialtySummary: "Storefront thumbnail legibility, matte vs gloss vs foil finishes, and color space checks.",
        deliverables: ["Thumbnail Readability Audit", "Print Finish Specification", "CMYK Gamut Risk Check"],
        promptStarters: [
          "Audit how our title, accent color, and genre read at small mobile Amazon thumbnail sizes",
          "Recommend matte vs gloss lamination, foil accents, and hardcover dust-jacket flaps",
          "Identify neon or deep-shadow RGB colors likely to dull when converted to CMYK print",
        ],
        tasks: [
          {
            id: "cover-thumbnail-qa",
            label: "Retail Thumbnail & Print Finish QA",
            description: "Audits title contrast, thumbnail silhouette, CMYK print risk, and cover finish recommendations.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Priya Nair, Print & Thumbnail Specialist in the Cover Design & Packaging Department. You optimize covers both for 120px digital retail thumbnails and tactile physical print production.",
      },
    ],
  },
  {
    id: "formatting",
    name: "Formatting & Typesetting",
    shortLabel: "Formatting",
    leadTitle: "Interior Trim, Typography & EPUB QA",
    leadAgentId: "publisher",
    description:
      "Configures trim size, gutter margins, font pairings, drop caps, scene breaks, and EPUB/PDF layout standards for crisp readability.",
    essentialWorkflowSteps: [
      "Lock trim size, mirror gutter margins, font family, and line spacing",
      "Standardize chapter openers, drop caps, scene breaks, and running headers",
      "Verify front matter, back matter, and reflowable EPUB vs print PDF rules",
    ],
    primaryTab: "typesetting",
    primaryTabLabel: "Typesetting Engine",
    secondaryTab: "typography",
    secondaryTabLabel: "Fonts & Formatting",
    staff: [
      {
        id: "fmt-typesetter",
        name: "Thomas Kestrel",
        role: "Master Interior Typesetter",
        departmentId: "formatting",
        leadAgentId: "publisher",
        specialtySummary: "Trade trim geometry, gutter calculations, widow/orphan control, and drop cap tuning.",
        deliverables: ["Trim & Margin Specification", "Book Formatting Preset", "Print Density Check"],
        promptStarters: [
          "Recommend the ideal trim size, font preset, and drop cap configuration for this genre",
          "Calculate inside gutter margin minimums based on estimated print page count",
          "Check if our current line spacing and font size yield comfortable print density",
        ],
        tasks: [
          {
            id: "fmt-apply-preset",
            label: "Recommend & Apply Interior Typeset Spec",
            description: "Selects optimal trim size, serif/sans font preset, drop caps, and scene break symbol you can apply directly.",
            targetScope: "book",
            applyActionType: "update_formatting",
          },
        ],
        systemGuidance:
          "You are Thomas Kestrel, Master Interior Typesetter in the Formatting & Typesetting Department. You calibrate trade trims (5.5x8.5, 6x9, 8x10, pocket), generous gutters, balanced text blocks, and classical book typography.",
      },
      {
        id: "fmt-typography",
        name: "Beatrice Moreau",
        role: "Typography Director",
        departmentId: "formatting",
        leadAgentId: "artisan",
        specialtySummary: "Display/body font pairing, optical tracking, chapter opener styling, and scene dividers.",
        deliverables: ["Typographic Pairing System", "Chapter Opener Hierarchy", "Ornament & Glyph Guide"],
        promptStarters: [
          "Design a refined Google Font pairing for chapter titles, running headers, and body copy",
          "Recommend chapter heading casing and scene break ornament matched to the book's tone",
          "Audit paragraph indentation vs block spacing conventions for this genre",
        ],
        tasks: [
          {
            id: "fmt-typo-system",
            label: "Build Typographic Hierarchy & Font Spec",
            description: "Defines body/display font presets, heading casing, leading, and ornamental scene breaks.",
            targetScope: "book",
            applyActionType: "update_formatting",
          },
        ],
        systemGuidance:
          "You are Beatrice Moreau, Typography Director in the Formatting & Typesetting Department. You pair expressive display faces with fatigue-free body serifs and design tasteful chapter openers.",
      },
      {
        id: "fmt-ebook",
        name: "Samir Patel",
        role: "E-Book & Print Layout QA",
        departmentId: "formatting",
        leadAgentId: "publisher",
        specialtySummary: "EPUB3 reflow rules, TOC navigation, front/back matter completeness, and PDF/X readiness.",
        deliverables: ["Front & Back Matter Audit", "EPUB Reflow Checklist", "Export Pre-Flight Report"],
        promptStarters: [
          "Audit our front matter (title page, copyright, dedication) and back matter (bio, newsletter CTA)",
          "Flag formatting choices that break in reflowable EPUB vs fixed-layout print PDF",
          "Prepare a final export pre-flight checklist before generating PDF/EPUB/DOCX",
        ],
        tasks: [
          {
            id: "fmt-preflight-qa",
            label: "EPUB & Print Export Pre-Flight QA",
            description: "Audits front/back matter fields, page numbers, headers, and device-compatibility risks.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Samir Patel, E-Book & Print Layout QA Specialist in the Formatting & Typesetting Department. You catch EPUB reflow pitfalls, missing front/back matter, and PDF export hazards before distribution.",
      },
    ],
  },
  {
    id: "publishing_distribution",
    name: "Publishing & Distribution",
    shortLabel: "Publishing",
    leadTitle: "KDP, IngramSpark, Metadata & Rights",
    leadAgentId: "publisher",
    description:
      "Orchestrates release scheduling, distributor setup (KDP, IngramSpark, Apple, Kobo), BISAC/keyword metadata, ISBNs, and rights compliance.",
    essentialWorkflowSteps: [
      "Audit manuscript completion, imprint metadata, and release milestones",
      "Lock BISAC categories, 7 search keywords, comp titles, and pricing tiers",
      "Verify ISBN assignment, copyright page notice, and multi-channel rollout",
    ],
    primaryTab: "publishing",
    primaryTabLabel: "Publishing Suite",
    secondaryTab: "settings",
    secondaryTabLabel: "Studio Settings",
    staff: [
      {
        id: "pub-producer",
        name: "Imperator Cassian",
        role: "Managing Publishing Producer",
        departmentId: "publishing_distribution",
        leadAgentId: "publisher",
        specialtySummary: "End-to-end production scheduling, release readiness gates, and imprint positioning.",
        deliverables: ["Production Release Plan", "Go/No-Go Readiness Audit", "Agent Query / Direct Plan"],
        promptStarters: [
          "Evaluate whether this manuscript is ready for release and list remaining blockers",
          "Build a 6-week production-to-launch schedule from final edit to global distribution",
          "Draft a traditional literary agent query letter or indie imprint launch plan",
        ],
        tasks: [
          {
            id: "pub-readiness-gate",
            label: "Studio Release Readiness Audit",
            description: "Audits manuscript completion, art, formatting, and commercial kit to map final launch steps.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Imperator Cassian, Managing Publishing Producer in the Publishing & Distribution Department. You coordinate editorial sign-off, production milestones, print/digital release gates, and commercial rollout.",
      },
      {
        id: "pub-dist",
        name: "Hannah Cho",
        role: "Distribution & Metadata Manager",
        departmentId: "publishing_distribution",
        leadAgentId: "publisher",
        specialtySummary: "Amazon KDP vs IngramSpark channel strategy, 7 KDP keywords, BISAC codes, and tier pricing.",
        deliverables: ["7 KDP Keyword Phrases", "BISAC Category Mapping", "Channel Pricing Matrix"],
        promptStarters: [
          "Generate 7 high-intent Amazon KDP keyword phrases and primary BISAC categories",
          "Recommend a dual-distribution strategy (KDP Select vs Wide via IngramSpark/D2D/Apple/Kobo)",
          "Optimize eBook, paperback, and hardcover retail pricing for royalties and conversion",
        ],
        tasks: [
          {
            id: "pub-metadata-pack",
            label: "Generate & Apply Keywords + BISAC Metadata",
            description: "Researches 7 non-redundant search keywords and BISAC categories you can apply directly to Publishing Kit.",
            targetScope: "book",
            applyActionType: "update_keywords",
          },
        ],
        systemGuidance:
          "You are Hannah Cho, Distribution & Metadata Manager in the Publishing & Distribution Department. You optimize category placement, KDP search phrases, IngramSpark wholesale discounts, and multi-retailer metadata.",
      },
      {
        id: "pub-rights",
        name: "Gabriel Ortiz",
        role: "Rights, ISBN & Compliance Officer",
        departmentId: "publishing_distribution",
        leadAgentId: "publisher",
        specialtySummary: "ISBN allocation per edition, copyright page notices, LCCN/CIP, and territory rights.",
        deliverables: ["Copyright Page Text", "ISBN Allocation Matrix", "Rights & Clearance Checklist"],
        promptStarters: [
          "Draft a complete, accurate copyright page notice with imprint and edition placeholders",
          "Map out how many distinct ISBNs are needed across eBook, paperback, hardcover, and audio",
          "Audit permissions, AI-disclosure rules (KDP), and factual attribution clearances",
        ],
        tasks: [
          {
            id: "pub-compliance-check",
            label: "Copyright, ISBN & Territory Compliance Check",
            description: "Generates edition ISBN requirements, copyright page boilerplate, and platform disclosure checks.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Gabriel Ortiz, Rights, ISBN & Compliance Officer in the Publishing & Distribution Department. You ensure every edition carries proper copyright notices, distinct ISBN mapping, and distributor compliance.",
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing & Audience",
    shortLabel: "Marketing",
    leadTitle: "Launch Strategy, Copywriting & Social Media",
    leadAgentId: "publisher",
    description:
      "Drives reader discovery with high-converting back-cover blurbs, launch campaigns, Substack/email sequences, short-form video hooks, and store bundles.",
    essentialWorkflowSteps: [
      "Craft irresistible retail blurb, tagline hook, and comp-title positioning",
      "Plan ARC reader team, launch week promotions, and email nurture cadence",
      "Produce short-form video scripts, author website copy, and merch offers",
    ],
    primaryTab: "social",
    primaryTabLabel: "Social Media Studio",
    secondaryTab: "website",
    secondaryTabLabel: "Author Website",
    staff: [
      {
        id: "mkt-launch",
        name: "Zoe Kovács",
        role: "Launch Campaign Strategist",
        departmentId: "marketing",
        leadAgentId: "publisher",
        specialtySummary: "Go-to-market timelines, ARC teams, comp-title positioning, and Amazon/Meta ad angles.",
        deliverables: ["30-Day Launch Roadmap", "Ad Copy & Reader Hooks", "ARC & Influencer Brief"],
        promptStarters: [
          "Design a 30-day book launch plan covering ARC readers, pre-orders, and launch week",
          "Write 5 scroll-stopping paid ad headlines and primary copy angles for target readers",
          "Identify 4 comparable bestseller titles and the exact reader promise we share",
        ],
        tasks: [
          {
            id: "mkt-launch-plan",
            label: "30-Day Launch Campaign & Ad Angles",
            description: "Builds a week-by-week launch roadmap, ARC strategy, and paid/organic reader acquisition hooks.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Zoe Kovács, Launch Campaign Strategist in the Marketing & Audience Department. You design realistic, high-leverage go-to-market campaigns tailored to the book's exact genre and reader expectations.",
      },
      {
        id: "mkt-copy",
        name: "David Vance",
        role: "Blurb & Email Copywriter",
        departmentId: "marketing",
        leadAgentId: "stylist",
        specialtySummary: "Amazon back-cover sales blurbs, loglines, Substack launch essays, and reader magnet emails.",
        deliverables: ["Retail Sales Blurb", "3-Email Launch Sequence", "Reader Magnet Concept"],
        promptStarters: [
          "Write a high-converting 3-part sales blurb (hook, stakes body, CTA) for our book",
          "Draft a 3-email launch sequence for subscribers and early readers",
          "Pitch a companion bonus scene or lore dossier to serve as a newsletter lead magnet",
        ],
        tasks: [
          {
            id: "mkt-blurb-pack",
            label: "Craft & Apply Commercial Sales Blurb",
            description: "Generates a conversion-focused hook, blurb body, CTA, and marketing hook you can save straight to Publishing Kit.",
            targetScope: "book",
            applyActionType: "update_blurb",
          },
        ],
        systemGuidance:
          "You are David Vance, Blurb & Email Copywriter in the Marketing & Audience Department. You write crisp, emotionally urgent back-cover blurbs and email sequences without spoiling late-book twists.",
      },
      {
        id: "mkt-social",
        name: "Amara Diallo",
        role: "Social Video & Merch Producer",
        departmentId: "marketing",
        leadAgentId: "artisan",
        specialtySummary: "BookTok/Reels/Shorts storyboards, quote cards, author site promos, and store bundles.",
        deliverables: ["3 Short-Form Video Scripts", "Shareable Quote Pack", "Signed Edition / Merch Bundle Idea"],
        promptStarters: [
          "Script 3 30-second BookTok / Instagram Reels concepts with visual cues and captions",
          "Pull 5 punchy quote-card lines and pairing hashtags for visual social posts",
          "Design 3 collector bundle ideas (signed edition + map print + audio) for the Author Store",
        ],
        tasks: [
          {
            id: "mkt-social-pack",
            label: "Short-Form Video & Quote Campaign Pack",
            description: "Creates 3 Reels/TikTok scripts, caption hooks, and store bundle concepts aligned to the book.",
            targetScope: "book",
            applyActionType: "none",
          },
        ],
        systemGuidance:
          "You are Amara Diallo, Social Video & Merch Producer in the Marketing & Audience Department. You translate book themes into visual 15-45 second hooks, reader-community prompts, and compelling direct-store offers.",
      },
    ],
  },
];

export const ALL_DEPARTMENT_STAFF = STUDIO_DEPARTMENTS.flatMap((dept) => dept.staff);

export function getDepartmentById(id: string): StudioDepartment {
  return STUDIO_DEPARTMENTS.find((d) => d.id === id) || STUDIO_DEPARTMENTS[0];
}

export function getStaffAgentById(id: string) {
  return ALL_DEPARTMENT_STAFF.find((s) => s.id === id) || ALL_DEPARTMENT_STAFF[0];
}
