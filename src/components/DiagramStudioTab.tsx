import React, { useState, useRef } from "react";
import { Book, Chapter, ChapterIllustration, DiagramStructurePayload } from "../types";
import { apiService } from "../services/api";
import {
  downloadSingleArtworkFile,
  uploadBlobToGoogleDrive,
  convertUrlToBlob,
} from "../services/googleDrive";
import {
  GitCompare,
  ArrowRight,
  Sparkles,
  Layers,
  Table,
  CheckCircle2,
  Copy,
  PlusCircle,
  Download,
  FileText,
  AlertCircle,
  Workflow,
  ShieldCheck,
  Zap,
  Info,
  Loader2,
  LayoutGrid,
  Image as ImageIcon,
  HardDrive,
} from "lucide-react";

interface DiagramStudioTabProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  defaultChapterId?: string;
  onInsertMarkdownToChapter?: (chapterId: string, markdown: string) => void;
}

const PRESET_DIAGRAM_TEMPLATES = [
  {
    id: "society_vs_human",
    title: "Current Society Workflow vs. H.U.M.A.N. Initiative",
    subtitle: "Comparative Analysis & Systemic Transformation",
    type: "workflow_comparison" as const,
    prompt: "Design a workflow chart that shows the current society workflow and a comparison chart of how my system, the H.U.M.A.N. Initiative, changes that workflow.",
  },
  {
    id: "scarcity_vs_abundance",
    title: "Scarcity Operating System vs. Abundance Protocol",
    subtitle: "Incentive Mechanics & Regenerative Value Flow",
    type: "comparison_matrix" as const,
    prompt: "A side-by-side comparative table analyzing the Legacy Scarcity Operating System vs. the Sovereign Abundance Protocol across economic incentives, creator autonomy, and long-term societal equilibrium.",
  },
  {
    id: "publishing_pipeline",
    title: "Traditional Extraction vs. Sovereign Cleanroom Co-Creation",
    subtitle: "Author Rights, Provenance & Value Retention",
    type: "process_flowchart" as const,
    prompt: "A multi-stage process flowchart contrasting traditional publishing gatekeeping with the Sovereign AI Cleanroom authoring framework and the 50% Human Society Fund pledge.",
  },
  {
    id: "architecture_loop",
    title: "Closed-Loop Sovereign Ecosystem Architecture",
    subtitle: "Node Network, Royalties & Reader Trust",
    type: "system_architecture" as const,
    prompt: "A system architecture node map displaying how inputs, ethical AI validation, cryptographic provenance, direct reader settlement, and the 50% Human Fund create a self-reinforcing regenerative cycle.",
  },
];

export const DiagramStudioTab: React.FC<DiagramStudioTabProps> = ({
  book,
  onUpdateBook,
  defaultChapterId,
  onInsertMarkdownToChapter,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    defaultChapterId || book.chapters[0]?.id || ""
  );
  const [diagramPrompt, setDiagramPrompt] = useState<string>(
    PRESET_DIAGRAM_TEMPLATES[0].prompt
  );
  const [diagramType, setDiagramType] = useState<
    "workflow_comparison" | "process_flowchart" | "comparison_matrix" | "system_architecture" | "infographic_table"
  >("workflow_comparison");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRenderingPlate, setIsRenderingPlate] = useState(false);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [attachedStatus, setAttachedStatus] = useState(false);
  const [insertedToTextStatus, setInsertedToTextStatus] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSavedStatus, setDriveSavedStatus] = useState(false);
  const [downloadedStatus, setDownloadedStatus] = useState(false);
  const [aiImageError, setAiImageError] = useState<string | null>(null);

  // Active generated structure (initialized with high-craft default)
  const [diagramData, setDiagramData] = useState<DiagramStructurePayload>({
    title: "Current Society Workflow vs. The H.U.M.A.N. Initiative Transformation",
    subtitle: "Systemic Workflow Evolution & Paradigm Shift",
    diagramType: "workflow_comparison",
    summary:
      "A direct comparative analysis demonstrating the transition from linear extractive scarcity to the regenerative, sovereign H.U.M.A.N. Initiative framework.",
    comparisonData: {
      leftColumnTitle: "Current Society Workflow (Legacy Scarcity)",
      rightColumnTitle: "H.U.M.A.N. Initiative System (Sovereign Abundance)",
      rows: [
        {
          category: "1. Core Incentive Engine",
          currentSystem: "Linear extraction, platform monopoly rents, fragmented labor",
          humanSystem: "Regenerative circulation, 50% creator fund pledge, sovereign royalties",
          impact: "Eliminates platform monopsony; guarantees fair baseline creator equity",
        },
        {
          category: "2. Production & AI Pipeline",
          currentSystem: "Opaque black-box models, uncredited scraping, hallucination risk",
          humanSystem: "Ethical cleanroom co-creation, cryptographic provenance, fact grounding",
          impact: "Restores immutable author trust and verified human authenticity",
        },
        {
          category: "3. Value Distribution",
          currentSystem: "Middlemen take 80-90% cut, delayed 90-day royalty accounting",
          humanSystem: "Direct reader-to-creator settlement, transparent ledger, mutual fund",
          impact: "Maximizes net retained value for primary intellectual creators",
        },
        {
          category: "4. Systemic Equilibrium",
          currentSystem: "High burnout, synthetic slop saturation, creative depletion",
          humanSystem: "Flourishing cultural commons, sustainable creator longevity",
          impact: "Perpetual cultural vitality and healthy intellectual ecosystem",
        },
      ],
    },
    flowchartSteps: {
      currentFlow: [
        { step: 1, title: "Scarcity Input", desc: "Capital barriers & gatekeeper rationing" },
        { step: 2, title: "Extraction Hub", desc: "Intermediaries capture ~85% of intellectual value" },
        { step: 3, title: "Displaced Distribution", desc: "Diminished author provenance and severed reader link" },
        { step: 4, title: "Ecosystem Decay", desc: "Creative burnout, commoditization, and race to bottom" },
      ],
      humanFlow: [
        { step: 1, title: "Sovereign Inception", desc: "Cleanroom AI tooling & human author primacy" },
        { step: 2, title: "50% Society Pledge", desc: "Automated perpetual fund for creator rights" },
        { step: 3, title: "Verified Provenance", desc: "Grounding citations and zero-hallucination stamping" },
        { step: 4, title: "Abundant Circulation", desc: "Direct reader patronage & sustainable ecosystem" },
      ],
    },
    keyTakeaways: [
      "Replaces zero-sum scarcity with circular economic abundance",
      "Pledges 50% of ecosystem value to verified human rights and cleanroom creators",
      "Restores cryptographic provenance and authorial sovereignty across all media",
    ],
    markdownTable:
      "| Dimension | Current Society Workflow | H.U.M.A.N. Initiative Workflow | Impact & Transformation |\n|---|---|---|---|\n| **Core Engine** | Linear Extraction & Platform Rents | Regenerative Circulation & 50% Pledge | Guarantees Creator Equity |\n| **Production Pipeline** | Black-box exploitation & hallucination | Cleanroom verification & authentic provenance | Full intellectual integrity |\n| **Distribution** | 80-90% Intermediary tollbooths | Direct sovereign settlement | Maximum retained creator value |\n| **Long-Term State** | Creative burnout & cultural slop | Flourishing sovereign ecosystem | Sustainable cultural vitality |",
  });

  const activeChapter = book.chapters.find((c) => c.id === selectedChapterId) || book.chapters[0];

  const handleSelectPreset = (preset: (typeof PRESET_DIAGRAM_TEMPLATES)[0]) => {
    setDiagramPrompt(preset.prompt);
    setDiagramType(preset.type);
  };

  const handleGenerateStructure = async () => {
    if (!diagramPrompt.trim()) return;
    setIsGenerating(true);
    setAttachedStatus(false);
    setInsertedToTextStatus(false);
    setAiImageError(null);

    try {
      const result = await apiService.generateDiagramStructure({
        prompt: diagramPrompt,
        diagramType,
        bookContext: {
          title: book.title,
          genre: book.genre,
          premise: book.premise,
        },
        chapterContext: {
          title: activeChapter?.title || "Active Chapter",
        },
      });

      setDiagramData(result);
    } catch (err: any) {
      setAiImageError("Diagram structure synthesis failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert SVG/DOM Representation to High-Res Image Plate Data URL
  const generateSvgPlateDataUrl = (): string => {
    const title = diagramData.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const subtitle = diagramData.subtitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const leftTitle = diagramData.comparisonData.leftColumnTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const rightTitle = diagramData.comparisonData.rightColumnTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;");

    const rowsSvg = diagramData.comparisonData.rows
      .map((row, idx) => {
        const yOffset = 180 + idx * 75;
        const cat = row.category.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        const curr = row.currentSystem.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        const hum = row.humanSystem.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        const imp = row.impact.replace(/&/g, "&amp;").replace(/</g, "&lt;");

        return `
        <g transform="translate(40, ${yOffset})">
          <rect width="1120" height="65" rx="8" fill="#1c1917" stroke="#292524" stroke-width="1"/>
          <rect width="200" height="65" rx="8" fill="#0c0a09"/>
          <text x="15" y="38" fill="#f59e0b" font-family="sans-serif" font-size="13" font-weight="bold">${cat}</text>
          
          <text x="220" y="30" fill="#f87171" font-family="sans-serif" font-size="11" font-weight="bold">LEGACY:</text>
          <text x="220" y="48" fill="#d6d3d1" font-family="sans-serif" font-size="12">${curr.slice(0, 52)}...</text>
          
          <text x="560" y="30" fill="#34d399" font-family="sans-serif" font-size="11" font-weight="bold">H.U.M.A.N. INITIATIVE:</text>
          <text x="560" y="48" fill="#ecfdf5" font-family="sans-serif" font-size="12" font-weight="500">${hum.slice(0, 52)}...</text>
          
          <rect x="910" y="12" width="195" height="42" rx="6" fill="#064e3b" stroke="#059669" stroke-width="1"/>
          <text x="920" y="36" fill="#a7f3d0" font-family="sans-serif" font-size="11" font-weight="bold">TRANSFORMATION</text>
        </g>`;
      })
      .join("");

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c0a09"/>
          <stop offset="50%" stop-color="#1c1917"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#06b6d4"/>
        </linearGradient>
      </defs>
      
      <rect width="1200" height="675" fill="url(#bg)"/>
      <rect x="20" y="20" width="1160" height="635" rx="16" fill="none" stroke="#292524" stroke-width="2"/>
      
      <!-- Header Badge & Titles -->
      <rect x="40" y="40" width="220" height="26" rx="13" fill="#064e3b" stroke="#059669" stroke-width="1"/>
      <text x="55" y="58" fill="#6ee7b7" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="1">SYSTEMIC WORKFLOW MATRIX</text>
      
      <text x="40" y="98" fill="#fafaf9" font-family="Georgia, serif" font-size="24" font-weight="bold">${title}</text>
      <text x="40" y="124" fill="#a8a29e" font-family="sans-serif" font-size="13">${subtitle}</text>
      
      <!-- Columns Header -->
      <rect x="40" y="140" width="1120" height="32" rx="6" fill="#141210" stroke="#292524" stroke-width="1"/>
      <text x="55" y="161" fill="#78716c" font-family="sans-serif" font-size="11" font-weight="bold">DIMENSION / STAGE</text>
      <text x="260" y="161" fill="#ef4444" font-family="sans-serif" font-size="11" font-weight="bold">◀ ${leftTitle}</text>
      <text x="600" y="161" fill="#10b981" font-family="sans-serif" font-size="11" font-weight="bold">▶ ${rightTitle}</text>
      <text x="950" y="161" fill="#38bdf8" font-family="sans-serif" font-size="11" font-weight="bold">SYSTEM IMPACT</text>
      
      <!-- Rows -->
      ${rowsSvg}
      
      <!-- Footer Note -->
      <rect x="40" y="510" width="1120" height="110" rx="10" fill="#042f2e" stroke="#0f766e" stroke-width="1"/>
      <text x="60" y="538" fill="#5eead4" font-family="sans-serif" font-size="13" font-weight="bold">✦ H.U.M.A.N. INITIATIVE GUARANTEE: 50% REVENUE PLEDGE &amp; CRYPTOGRAPHIC PROVENANCE</text>
      <text x="60" y="564" fill="#ccfbf1" font-family="sans-serif" font-size="12">${diagramData.keyTakeaways[0] || "Restores sovereign creator equity and verified fact grounding."}</text>
      <text x="60" y="588" fill="#ccfbf1" font-family="sans-serif" font-size="12">${diagramData.keyTakeaways[1] || "Eliminates platform monopsony and ensures perpetual intellectual integrity."}</text>
      <text x="60" y="608" fill="#99f6e4" font-family="sans-serif" font-size="11" font-style="italic">TomeCrafter AI Publication Suite • Chapter Plate Figure</text>
    </svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  };

  // Attach Diagram as a Chapter Visual Plate
  const handleAttachAsPlate = async () => {
    if (!activeChapter) return;
    setIsRenderingPlate(true);

    try {
      const plateDataUrl = generateSvgPlateDataUrl();

      const newIll: ChapterIllustration = {
        id: `ill-diagram-${Date.now()}`,
        title: diagramData.title,
        prompt: diagramPrompt,
        enhancedPrompt: diagramData.summary,
        style: "workflow_chart",
        aspectRatio: "16:9",
        imageUrl: plateDataUrl,
        caption: `${diagramData.title} — ${diagramData.subtitle}`,
        placement: "inline",
        plateType: "workflow_chart",
        diagramData: diagramData,
        createdAt: new Date().toISOString(),
      };

      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id === activeChapter.id) {
          return {
            ...ch,
            illustrations: [...(ch.illustrations || []), newIll],
          };
        }
        return ch;
      });

      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });

      setAttachedStatus(true);
      setTimeout(() => setAttachedStatus(false), 4000);
    } catch (err: any) {
      setAiImageError("Failed to attach plate: " + (err?.message || "Unknown error"));
    } finally {
      setIsRenderingPlate(false);
    }
  };

  // Generate AI Image with Gemini Model for this diagram
  const handleGenerateAiDiagramImage = async () => {
    if (!activeChapter) return;
    setIsGeneratingAiImage(true);
    setAiImageError(null);

    try {
      const res = await apiService.generateIllustration({
        prompt: `Infographic and process workflow chart: ${diagramData.title}. Detailed comparison showing left side (Current Society legacy scarcity workflow) vs right side (H.U.M.A.N. Initiative abundance system). Sleek vector UI cards, luminous connection lines, directional arrows, high-contrast dark obsidian background, emerald and cyan accents.`,
        style: "workflow_chart",
        aspectRatio: "16:9",
        sceneContext: `Technical comparative chart for Chapter ${activeChapter.number}: ${activeChapter.title}`,
      });

      if (!res.imageUrl) {
        throw new Error(
          "Gemini image model did not return an infographic image. Confirm a billing-enabled API key is configured in Settings -> Secrets, or use the Vector SVG Plate option."
        );
      }

      const newIll: ChapterIllustration = {
        id: `ill-ai-diag-${Date.now()}`,
        title: diagramData.title,
        prompt: diagramPrompt,
        enhancedPrompt: res.enhancedPrompt,
        style: "workflow_chart",
        aspectRatio: "16:9",
        imageUrl: res.imageUrl,
        caption: `${diagramData.title} — AI Infographic Plate`,
        placement: "header",
        plateType: "workflow_chart",
        diagramData: diagramData,
        createdAt: new Date().toISOString(),
      };

      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id === activeChapter.id) {
          return {
            ...ch,
            illustrations: [...(ch.illustrations || []), newIll],
          };
        }
        return ch;
      });

      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });

      setAttachedStatus(true);
      setTimeout(() => setAttachedStatus(false), 4000);
    } catch (err: any) {
      setAiImageError(err?.message || "AI infographic generation failed. You can still render & attach a crisp Vector SVG Plate.");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Insert Formatted Markdown Table into Chapter Content
  const handleInsertMarkdown = () => {
    if (!activeChapter) return;

    const tableBlock = `\n\n### ${diagramData.title}\n*${diagramData.subtitle}*\n\n${diagramData.markdownTable}\n\n> **Key Structural Insight:** ${diagramData.summary}\n\n`;

    if (onInsertMarkdownToChapter) {
      onInsertMarkdownToChapter(activeChapter.id, tableBlock);
    } else {
      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id === activeChapter.id) {
          return {
            ...ch,
            content: (ch.content || "") + tableBlock,
          };
        }
        return ch;
      });

      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });
    }

    setInsertedToTextStatus(true);
    setTimeout(() => setInsertedToTextStatus(false), 4000);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(diagramData.markdownTable);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2500);
  };

  const handleDownloadDiagramPlate = async () => {
    try {
      const dataUrl = generateSvgPlateDataUrl();
      const filename = `${diagramData.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Plate.svg`;
      await downloadSingleArtworkFile(dataUrl, filename);
      setDownloadedStatus(true);
      setTimeout(() => setDownloadedStatus(false), 3000);
    } catch (e: any) {
      setAiImageError("Download failed: " + (e?.message || "Unknown error"));
    }
  };

  const handleSaveDiagramToDrive = async () => {
    setIsSavingToDrive(true);
    setAiImageError(null);
    try {
      const dataUrl = generateSvgPlateDataUrl();
      const filename = `${diagramData.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Plate.svg`;
      const { blob, mimeType } = await convertUrlToBlob(dataUrl, diagramData.title);
      await uploadBlobToGoogleDrive({
        name: filename,
        blob,
        mimeType,
        description: `Visual diagram and workflow comparison plate: "${diagramData.title}" for book "${book.title}"`,
      });
      setDriveSavedStatus(true);
      setTimeout(() => setDriveSavedStatus(false), 4000);
    } catch (err: any) {
      setAiImageError("Failed to save diagram to Google Drive: " + (err?.message || "Unknown error"));
    } finally {
      setIsSavingToDrive(false);
    }
  };

  return (
    <div className="space-y-8">
      {aiImageError && (
        <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300">Diagram Studio Notice</div>
              <p className="text-amber-100/90 mt-0.5 leading-relaxed">{aiImageError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiImageError(null)}
            className="text-amber-400 hover:text-amber-200 font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Preset Archetype Selector */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Workflow className="w-4 h-4" />
            </span>
            <h3 className="font-serif font-bold text-base text-stone-100">
              Preset Structure & Guardrail Templates
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            Maintains Logical Flow & Systems Integrity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_DIAGRAM_TEMPLATES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className="text-left p-3.5 rounded-xl border border-stone-800 hover:border-emerald-500/50 bg-stone-950/60 hover:bg-emerald-950/20 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-stone-200 group-hover:text-emerald-300 transition-colors line-clamp-1">
                  {preset.title}
                </div>
                <div className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                  {preset.subtitle}
                </div>
              </div>
              <div className="mt-3 flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400/80 group-hover:text-emerald-300">
                <span>Load Preset</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Synthesis Control Box */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
              Diagram / Comparison Workflow Prompt
            </label>
            <textarea
              value={diagramPrompt}
              onChange={(e) => setDiagramPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-3 text-xs focus:border-emerald-500 focus:outline-none placeholder-stone-600"
              placeholder="e.g. Design a workflow chart that shows the current society workflow and a comparison chart of how my system, the H.U.M.A.N. Initiative, changes that workflow..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                Target Chapter
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
              >
                {book.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Ch {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                Diagram Structure Type
              </label>
              <select
                value={diagramType}
                onChange={(e) => setDiagramType(e.target.value as any)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="workflow_comparison">Dual-Column Comparative Workflow</option>
                <option value="comparison_matrix">Multi-Row Comparative Matrix</option>
                <option value="process_flowchart">Step-by-Step Transformation Pipeline</option>
                <option value="system_architecture">Closed-Loop System Network</option>
                <option value="infographic_table">Structured Infographic & Metrics</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-800 pt-4">
          <div className="flex items-center space-x-2 text-xs text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Structural Guardrails active: Prevents generic landscape artwork and enforces strict dual-track workflow logic.
            </span>
          </div>

          <button
            onClick={handleGenerateStructure}
            disabled={isGenerating || !diagramPrompt.trim()}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Structuring Diagram Logic...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Synthesize Diagram & Comparison Table</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Interactive Diagram & Matrix Viewer */}
      <div className="p-6 sm:p-8 rounded-2xl bg-stone-950 border border-stone-800 shadow-2xl space-y-6">
        {/* Header Display */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-5">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              <span>✦ Guardrailed Visual Architecture</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">
              {diagramData.title}
            </h2>
            <p className="text-xs text-stone-400 mt-1">{diagramData.subtitle}</p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAttachAsPlate}
              disabled={isRenderingPlate}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all"
              title="Save SVG graphic plate into chapter illustrations"
            >
              {isRenderingPlate ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : attachedStatus ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{attachedStatus ? "Attached to Chapter!" : "Attach Visual Plate"}</span>
            </button>

            <button
              onClick={handleGenerateAiDiagramImage}
              disabled={isGeneratingAiImage}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all"
              title="Generate AI rendering with Gemini image model"
            >
              {isGeneratingAiImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>Generate AI Image Plate</span>
            </button>

            <button
              onClick={handleInsertMarkdown}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all"
              title="Insert Markdown comparison table into chapter manuscript"
            >
              {insertedToTextStatus ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{insertedToTextStatus ? "Inserted in Manuscript!" : "Insert Table in Text"}</span>
            </button>

            <button
              onClick={handleDownloadDiagramPlate}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-semibold transition-all"
              title="Download standalone vector SVG diagram plate"
            >
              {downloadedStatus ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{downloadedStatus ? "Downloaded SVG!" : "Download SVG"}</span>
            </button>

            <button
              onClick={handleSaveDiagramToDrive}
              disabled={isSavingToDrive}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/40 text-sky-200 text-xs font-semibold transition-all disabled:opacity-50"
              title="Save vector diagram plate directly to your Google Drive"
            >
              {isSavingToDrive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : driveSavedStatus ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{driveSavedStatus ? "Saved to Drive!" : "Save to Drive"}</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs transition-all"
              title="Copy Markdown Table"
            >
              {copiedStatus ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 flex items-start space-x-3 text-xs text-stone-300">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{diagramData.summary}</p>
        </div>

        {/* Dual-Track Flowchart Step Visualizer */}
        {diagramData.flowchartSteps && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center space-x-2">
              <Workflow className="w-3.5 h-3.5 text-emerald-400" />
              <span>Step-by-Step Workflow Pipeline Comparison</span>
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Legacy Scarcity Flow */}
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 space-y-3">
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span>{diagramData.comparisonData.leftColumnTitle}</span>
                </div>

                <div className="space-y-2.5">
                  {diagramData.flowchartSteps.currentFlow.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-red-900/60 text-red-300 border border-red-700/50 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {step.step}
                      </div>
                      <div className="flex-1 p-2.5 rounded-lg bg-stone-900/90 border border-stone-800">
                        <div className="text-xs font-bold text-stone-200">{step.title}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* H.U.M.A.N. Initiative Flow */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{diagramData.comparisonData.rightColumnTitle}</span>
                </div>

                <div className="space-y-2.5">
                  {diagramData.flowchartSteps.humanFlow.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {step.step}
                      </div>
                      <div className="flex-1 p-2.5 rounded-lg bg-stone-900/90 border border-emerald-900/40">
                        <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                          <span>{step.title}</span>
                          {step.step === 2 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              50% Fund
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-300 mt-0.5">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Structured Comparison Matrix Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center space-x-2">
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>Comparative Analysis Matrix</span>
          </h4>

          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-900 border-b border-stone-800 text-stone-400">
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] w-1/4">
                    Dimension / Stage
                  </th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-red-400 w-1/3">
                    {diagramData.comparisonData.leftColumnTitle}
                  </th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-emerald-400 w-1/3">
                    {diagramData.comparisonData.rightColumnTitle}
                  </th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-cyan-400">
                    Systemic Impact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 bg-stone-950">
                {diagramData.comparisonData.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-stone-900/40 transition-colors"
                  >
                    <td className="p-3.5 font-semibold text-amber-400 align-top">
                      {row.category}
                    </td>
                    <td className="p-3.5 text-stone-300 align-top">
                      <div className="p-2 rounded bg-red-950/20 border border-red-900/30 text-stone-300">
                        {row.currentSystem}
                      </div>
                    </td>
                    <td className="p-3.5 text-stone-100 align-top font-medium">
                      <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-200">
                        {row.humanSystem}
                      </div>
                    </td>
                    <td className="p-3.5 text-cyan-300 align-top">
                      <div className="p-2 rounded bg-cyan-950/20 border border-cyan-900/40 text-cyan-200 text-[11px]">
                        {row.impact}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Takeaways & Pledge Guarantee */}
        {diagramData.keyTakeaways && diagramData.keyTakeaways.length > 0 && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-2">
            <div className="text-xs font-bold text-emerald-300 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Core Architectural Pillars & Sovereign Takeaways</span>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-300 pl-5 list-disc marker:text-emerald-400">
              {diagramData.keyTakeaways.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
