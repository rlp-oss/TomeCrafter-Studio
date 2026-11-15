import {
  AgentId,
  Book,
  Chapter,
  CritiqueResult,
  LoreEntry,
  PublishingKit,
  ApplyRecommendationsResult,
  CouncilFinalSweepReport,
  FullBookReadAuditResult,
  FootnoteReference,
  SingleFootnoteAuditResult,
  FootnoteAuditResult,
  SubstackArticle,
  ReelProject,
  VoiceOverTrack,
  LogoDesignProject,
  BetaTester,
  FeedbackItem,
  BroadcastMessage,
  AuthorWebsiteConfig,
  DepartmentId,
  StudioApplyActionType,
  StudioDeliverableResult,
} from "../types";

export const apiService = {
  // Send message to Realm Master or Department Staff Specialist
  async chatWithAgent(params: {
    agentId: AgentId;
    staffAgent?: {
      id: string;
      name: string;
      role: string;
      departmentName: string;
      systemGuidance: string;
    };
    message: string;
    bookContext?: Partial<Book>;
    chapterContext?: Partial<Chapter>;
    chatHistory?: { role: "user" | "agent"; text: string }[];
  }): Promise<{ text: string; agentId: AgentId; staffId?: string }> {
    const res = await fetch("/api/agents/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  // Publishing Studio: Run Specialist Department Task
  async runStudioDepartmentTask(params: {
    departmentId: DepartmentId;
    departmentName: string;
    staffId: string;
    staffName: string;
    staffRole: string;
    staffGuidance: string;
    taskId: string;
    taskLabel: string;
    taskDescription: string;
    applyActionType?: StudioApplyActionType;
    customBrief?: string;
    bookContext: Record<string, any>;
    chapterContext?: Partial<Chapter> | null;
  }): Promise<StudioDeliverableResult> {
    const res = await fetch("/api/studio/run-department-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to run department task (${res.status}).`);
    }
    return res.json();
  },

  // Plot Architect: Generate full chapter outline
  async generateOutline(params: {
    title: string;
    genre: string;
    premise: string;
    targetChapterCount?: number;
    targetWordCount?: number;
    tone?: string;
  }): Promise<{
    logline: string;
    theme: string;
    acts: {
      actName: string;
      summary: string;
      chapters: {
        number: number;
        title: string;
        summary: string;
        goal: string;
        conflict: string;
        cliffhanger: string;
        pov: string;
        setting: string;
        targetWords: number;
      }[];
    }[];
  }> {
    const res = await fetch("/api/agents/generate-outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate outline.");
    }
    return res.json();
  },

  // Prose Stylist: Write, expand, continue, or rewrite prose
  async writeProse(params: {
    mode: "write_scene" | "continue" | "expand_sensory" | "show_not_tell" | "dialogue_polish" | "rewrite";
    chapterTitle: string;
    sceneBeats?: string;
    currentContent?: string;
    bookContext?: Partial<Book>;
    instructions?: string;
    wordGoal?: number;
  }): Promise<{ text: string }> {
    const res = await fetch("/api/agents/write-prose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate prose.");
    }
    return res.json();
  },

  // Compile & draft full chapter prose based on outline beats, goals, and footnotes
  async compileChapterProse(params: {
    bookContext: {
      title: string;
      genre: string;
      tone?: string;
      premise?: string;
      author?: string;
    };
    chapter: {
      number: number;
      title: string;
      summary?: string;
      goal?: string;
      conflict?: string;
      cliffhanger?: string;
      pov?: string;
      setting?: string;
      targetWords?: number;
      footnotes?: any[];
    };
    allChaptersOutline?: { number: number; title: string; summary?: string }[];
    targetWordCount?: number;
  }): Promise<{ text: string; wordCount: number }> {
    const res = await fetch("/api/agents/compile-chapter-prose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to compile chapter prose.");
    }
    return res.json();
  },

  // Editorial Director: Critique & Proof Chapter
  async critiqueChapter(params: {
    chapterTitle: string;
    content: string;
    bookContext?: Partial<Book>;
  }): Promise<CritiqueResult> {
    const res = await fetch("/api/agents/critique-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to critique chapter.");
    }
    return res.json();
  },

  // Realm Council: Apply Recommended Changes to Chapter Prose
  async applyChapterRecommendations(params: {
    chapter: Partial<Chapter>;
    bookContext?: Partial<Book>;
    critique?: CritiqueResult | null;
    focusArea?: "all" | "line_edits" | "pacing" | "dialogue" | "sensory" | "voice";
    specialInstructions?: string;
    fullBookDigest?: {
      narrativeSummary?: string;
      globalStyleDirectives?: string[];
      continuityLinks?: string[];
      formattingNotes?: string;
    };
  }): Promise<ApplyRecommendationsResult> {
    const res = await fetch("/api/agents/apply-chapter-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to apply council recommendations.");
    }
    return res.json();
  },

  // Realm Council: Full Book Read Audit (Digest whole book first, then format choices + per-chapter recommendations)
  async performFullBookReadAudit(params: {
    book: Partial<Book>;
  }): Promise<FullBookReadAuditResult> {
    const res = await fetch("/api/agents/full-book-read-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to perform full book read audit.");
    }
    return res.json();
  },

  // Realm Council: Full Manuscript Sovereign Final Sweep
  async performCouncilFinalSweep(params: {
    book: Partial<Book>;
  }): Promise<CouncilFinalSweepReport> {
    const res = await fetch("/api/agents/council-final-sweep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to perform council final sweep.");
    }
    return res.json();
  },

  // Worldbuilding Scholar: Generate deep lore entry
  async generateLore(params: {
    category: string;
    name: string;
    promptHint?: string;
    bookContext?: Partial<Book>;
  }): Promise<Partial<LoreEntry>> {
    const res = await fetch("/api/agents/worldbuilding-lore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate lore.");
    }
    return res.json();
  },

  // Publishing Agent: Complete Commercial Kit
  async generatePublishingKit(params: {
    book: Partial<Book>;
    targetPlatform?: string;
  }): Promise<PublishingKit> {
    const res = await fetch("/api/agents/generate-publishing-kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate publishing kit.");
    }
    return res.json();
  },

  // Art Director: Generate / enhance illustration prompt & generate image
  async generateIllustration(params: {
    prompt: string;
    style?: string;
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    sceneContext?: string;
  }): Promise<{
    enhancedPrompt: string;
    imageUrl: string | null;
    aspectRatio: string;
    style: string;
    isDiagramOrChart?: boolean;
    guardrailsEnforced?: boolean;
  }> {
    const res = await fetch("/api/agents/generate-illustration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create illustration.");
    }
    return res.json();
  },

  // Diagrams, Flowcharts & Tables Architect: Generate rich structured matrix and pipeline data
  async generateDiagramStructure(params: {
    prompt: string;
    diagramType?: "workflow_comparison" | "process_flowchart" | "comparison_matrix" | "system_architecture" | "infographic_table";
    bookContext?: Partial<Book>;
    chapterContext?: Partial<Chapter>;
  }): Promise<import("../types").DiagramStructurePayload> {
    const res = await fetch("/api/agents/generate-diagram-structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate diagram and table structure.");
    }
    return res.json();
  },

  // Typesetting Sovereign: Auto-format raw manuscript
  async autoFormatText(params: {
    rawText: string;
    preset?: string;
    options?: any;
  }): Promise<{ formattedText: string }> {
    const res = await fetch("/api/agents/auto-format-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to auto-format text.");
    }
    return res.json();
  },

  // Build Upon My Idea: Full AI Expansion with Google Search Grounding & Footnotes
  async buildIdea(params: {
    idea: string;
    title?: string;
    genre?: string;
    tone?: string;
    targetChapterCount?: number;
    targetWordCount?: number;
    enableSearchGrounding?: boolean;
    mode?: "comprehensive" | "historical_research" | "sci_fi_feasibility" | "mystery_logic";
    researchTopics?: string;
  }): Promise<any> {
    try {
      const res = await fetch("/api/agents/build-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status}) generating outline.`);
      }
      return await res.json();
    } catch (networkErr: any) {
      console.warn("Primary outline generation network hiccup, attempting recovery...", networkErr);
      // Secondary attempt with timeout guard
      try {
        const resFallback = await fetch("/api/agents/build-idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, enableSearchGrounding: false }),
        });
        if (resFallback.ok) {
          return await resFallback.json();
        }
      } catch {}
      throw new Error(
        networkErr.message?.includes("Failed to fetch")
          ? "Network connection interrupted while contacting AI. Please try again."
          : networkErr.message || "Failed to build idea and generate outline."
      );
    }
  },

  // Fact Verification & Research Grounding
  async verifyFact(params: {
    claim: string;
    context?: string;
    topic?: string;
    genre?: string;
    author?: string;
  }): Promise<any> {
    const res = await fetch("/api/agents/verify-fact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to verify fact.");
    }
    return res.json();
  },

  // Dedicated Footnote & Citation Verification
  async verifyFootnote(params: {
    footnote: Partial<FootnoteReference>;
    authorName?: string;
    bookContext?: Partial<Book>;
  }): Promise<SingleFootnoteAuditResult> {
    const res = await fetch("/api/agents/verify-footnote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to verify footnote.");
    }
    return res.json();
  },

  // Batch Audit Manuscript Footnotes
  async auditManuscriptFootnotes(params: {
    footnotes: Partial<FootnoteReference>[];
    authorName?: string;
    bookContext?: Partial<Book>;
  }): Promise<FootnoteAuditResult> {
    const res = await fetch("/api/agents/audit-manuscript-footnotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to audit manuscript footnotes.");
    }
    return res.json();
  },

  // General text generation helper via Architect agent
  async generateText(params: { prompt: string }): Promise<string> {
    const res = await this.chatWithAgent({
      agentId: "architect",
      message: params.prompt,
    });
    return res.text;
  },

  // Audit Originality Meter & Author Ethical Attribution
  async auditOriginality(params: {
    title: string;
    author: string;
    sampleText?: string;
    taggedAuthors?: any[];
    targetScoreOverride?: number;
  }): Promise<any> {
    const res = await fetch("/api/royalties/audit-originality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to audit originality.");
    }
    return res.json();
  },

  // Submit Micro-Royalties via Cleanroom Vault & Omega Hub Settlement
  async submitMicroRoyalties(params: {
    bookTitle: string;
    authorName: string;
    originalityScore: number;
    totalPoolAmount?: number;
    taggedAuthors?: any[];
  }): Promise<any> {
    const res = await fetch("/api/royalties/submit-micro-royalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit micro-royalties.");
    }
    return res.json();
  },

  // Get Micro-Royalty Ledger
  async getRoyaltyLedger(): Promise<{ ledger: any[] }> {
    const res = await fetch("/api/royalties/ledger");
    if (!res.ok) {
      throw new Error("Failed to fetch royalty ledger.");
    }
    return res.json();
  },

  // Substack Reference Article & Ideology Generator
  async generateSubstackArticle(params: {
    bookContext: Partial<Book>;
    chapter: Partial<Chapter>;
    articleAngle?: string;
    includeDiscussionQuestions?: boolean;
    includeReferenceLinks?: boolean;
    customFocus?: string;
  }): Promise<SubstackArticle> {
    const res = await fetch("/api/agents/generate-substack-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate Substack article.");
    }
    return res.json();
  },

  // Voice-Over Audio Synthesis (Gemini TTS)
  async generateVoiceOverTTS(params: {
    text: string;
    voiceName?: string;
    speechRate?: number;
  }): Promise<{
    success: boolean;
    audioBase64: string | null;
    mimeType: string;
    sampleRate: number;
    voiceName: string;
    text: string;
    estimatedDurationSec: number;
    wordCount: number;
  }> {
    const res = await fetch("/api/agents/generate-voiceover-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate voice-over audio.");
    }
    return res.json();
  },

  // Social Media Studio: Reel & Logo Storyboard Generator
  async generateSocialAssets(params: {
    bookTitle: string;
    authorName: string;
    genre: string;
    premise?: string;
    selectedChapter?: Partial<Chapter>;
    targetPlatform?: string;
    aspectRatio?: string;
    tone?: string;
    reelGoal?: string;
  }): Promise<any> {
    const res = await fetch("/api/agents/generate-social-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate social media assets.");
    }
    return res.json();
  },

  // Social Media Studio: Scene Visual Generator
  async generateReelImage(params: {
    prompt: string;
    aspectRatio?: string;
    style?: string;
  }): Promise<{
    success: boolean;
    imageUrl: string | null;
    enhancedPrompt: string;
    aspectRatio: string;
  }> {
    const res = await fetch("/api/agents/generate-reel-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate reel scene visual.");
    }
    return res.json();
  },

  // Tester Onboarding & Communication Management (Axios & Fetch wrappers)
  async getTesters(): Promise<{ testers: any[] }> {
    const res = await fetch("/api/testers");
    if (!res.ok) throw new Error("Failed to fetch testers.");
    return res.json();
  },

  async onboardTester(params: {
    name: string;
    email: string;
    app_access_list?: string[];
    notes?: string;
  }): Promise<any> {
    const res = await fetch("/api/testers/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to onboard tester.");
    }
    return res.json();
  },

  async grantTesterAccess(testerId: string, app_access_list: string[]): Promise<any> {
    const res = await fetch(`/api/testers/${testerId}/grant-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_access_list }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to grant access.");
    }
    return res.json();
  },

  async resetOmegaAccount(testerId: string): Promise<any> {
    const res = await fetch(`/api/testers/${testerId}/reset-omega-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to reset Omega account.");
    }
    return res.json();
  },

  async getTesterFeedback(app?: string): Promise<{ feedback: any[] }> {
    const url = app && app !== "all" ? `/api/testers/feedback?app=${encodeURIComponent(app)}` : "/api/testers/feedback";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch tester feedback.");
    return res.json();
  },

  async submitTesterFeedback(params: {
    testerId?: string;
    testerName?: string;
    testerEmail?: string;
    app: string;
    category?: string;
    rating?: number;
    message: string;
  }): Promise<any> {
    const res = await fetch("/api/testers/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit feedback.");
    }
    return res.json();
  },

  async broadcastToTesters(params: {
    app: string;
    subject: string;
    content: string;
    adminSender?: string;
  }): Promise<any> {
    const res = await fetch("/api/testers/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to send broadcast.");
    }
    return res.json();
  },

  // Author Website Generator & Design Studio
  async getAuthorWebsite(bookId: string): Promise<{ config: AuthorWebsiteConfig | null }> {
    const res = await fetch(`/api/author-website/${encodeURIComponent(bookId)}`);
    if (!res.ok) throw new Error("Failed to fetch author website config.");
    return res.json();
  },

  async saveAuthorWebsite(bookId: string, config: AuthorWebsiteConfig): Promise<{ success: boolean; config: AuthorWebsiteConfig }> {
    const res = await fetch(`/api/author-website/${encodeURIComponent(bookId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save author website.");
    }
    return res.json();
  },

  async aiEditAuthorWebsite(params: {
    currentConfig: AuthorWebsiteConfig;
    userPrompt: string;
    bookContext?: Partial<Book>;
  }): Promise<{ success: boolean; config: AuthorWebsiteConfig; aiSummary: string }> {
    const res = await fetch("/api/author-website/ai-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to edit author website with AI.");
    }
    return res.json();
  },

  async generateAuthorWebsiteFromBook(params: {
    book: Book;
    genrePreset?: string;
    layout?: string;
  }): Promise<{ success: boolean; config: AuthorWebsiteConfig }> {
    const res = await fetch("/api/author-website/generate-from-book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate author website from book.");
    }
    return res.json();
  },
};
