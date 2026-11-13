import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle,
  Sparkles,
  Award,
  DollarSign,
  Users,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  ExternalLink,
  Zap,
  TrendingUp,
  Receipt,
  FileCheck,
  Sliders,
  Send,
  Loader2,
} from "lucide-react";
import { Book, OriginalityReport, TaggedAuthorRoyalty, MicroRoyaltyTransaction } from "../types";
import { apiService } from "../services/api";

interface OriginalityMeterProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  compact?: boolean;
  className?: string;
  onClose?: () => void;
}

export const OriginalityMeter: React.FC<OriginalityMeterProps> = ({
  book,
  onUpdateBook,
  compact = false,
  className = "",
  onClose,
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutPoolAmount, setPayoutPoolAmount] = useState<number>(100);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState<string | null>(null);

  // New Tagged Author Form State
  const [showAddAuthor, setShowAddAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorRole, setNewAuthorRole] = useState<TaggedAuthorRoyalty["role"]>("Influenced By");
  const [newAuthorShare, setNewAuthorShare] = useState<number>(10);
  const [newAuthorWork, setNewAuthorWork] = useState("");
  const [newAuthorOmega, setNewAuthorOmega] = useState("");

  const defaultReport: OriginalityReport = {
    score: 100,
    authorSharePercent: 100,
    is100PercentOriginal: true,
    copyrightStatus: "Certified 100% Original (AI-Assisted Human Author)",
    c2paManifestHash: "0x8a92e109ff8b432a76cd1154e2098bca4401889c1048b",
    humanBadgeRoyaltyTier: "Gold Standard (100% Direct Author Payout)",
    totalMicroRoyaltiesSubmitted: 0,
    taggedAuthors: [],
    recentTransactions: [
      {
        id: "tx-init-100",
        timestamp: new Date().toISOString(),
        recipientName: `${book.author} (Primary Author)`,
        recipientAccount: "omega_acct_author_primary",
        amount: 250.0,
        sharePercent: 100,
        bookTitle: book.title,
        originalityScore: 100,
        status: "Completed (Omega Settlement)",
        txHash: "0x7f4e8b919a23c4d5",
        badgeCertificationId: `CERT-100-${book.author.toUpperCase().replace(/\s+/g, "_")}`,
      },
    ],
    breakdown: {
      originalHumanVoice: 94,
      aiSynthesisNovelty: 6,
      stylisticHomageSimilarity: 0,
      referencedTextPercent: 0,
    },
    analysisNotes:
      "100% Originality Verified. High lexical diversity, authentic author voice, zero uncredited homages. Registered as a Copyrighted Author entitled to 100% direct royalties through the cleanroom vault.",
    lastAuditedAt: new Date().toISOString(),
  };

  const rawReport = book.originalityReport;
  const report: OriginalityReport = rawReport
    ? {
        ...defaultReport,
        ...rawReport,
        taggedAuthors: Array.isArray(rawReport.taggedAuthors) ? rawReport.taggedAuthors : [],
        recentTransactions: Array.isArray(rawReport.recentTransactions) ? rawReport.recentTransactions : [],
        breakdown: {
          ...defaultReport.breakdown,
          ...(rawReport.breakdown || {}),
        },
      }
    : defaultReport;

  const is100 = report.score === 100;

  // Run AI Forensic Originality Audit
  const handleRunAudit = async (targetOverride?: number) => {
    setIsAuditing(true);
    setPayoutSuccessMessage(null);
    try {
      // Gather sample text from chapters
      const sampleText = book.chapters
        .map((ch) => ch.content || "")
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 8000);

      const result = await apiService.auditOriginality({
        title: book.title,
        author: book.author,
        sampleText: sampleText || book.premise,
        taggedAuthors: report.taggedAuthors,
        targetScoreOverride: targetOverride,
      });

      const updatedReport: OriginalityReport = {
        ...report,
        ...result,
        recentTransactions: report.recentTransactions || [],
      };

      onUpdateBook({
        ...book,
        originalityReport: updatedReport,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      alert("Originality audit error: " + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  // Submit Micro-Royalties through Cleanroom Attribution & Omega Hub Settlement
  const handleSubmitMicroRoyalties = async () => {
    if (payoutPoolAmount <= 0) return;
    setIsSubmittingPayout(true);
    setPayoutSuccessMessage(null);

    try {
      const res = await apiService.submitMicroRoyalties({
        bookTitle: book.title,
        authorName: book.author,
        originalityScore: report.score,
        totalPoolAmount: payoutPoolAmount,
        taggedAuthors: report.taggedAuthors,
      });

      const updatedTransactions = [
        ...(res.transactions || []),
        ...(report.recentTransactions || []),
      ].slice(0, 15);

      const newTotal = (report.totalMicroRoyaltiesSubmitted || 0) + payoutPoolAmount;

      const updatedReport: OriginalityReport = {
        ...report,
        totalMicroRoyaltiesSubmitted: newTotal,
        recentTransactions: updatedTransactions,
      };

      onUpdateBook({
        ...book,
        originalityReport: updatedReport,
        updatedAt: new Date().toISOString(),
      });

      setPayoutSuccessMessage(res.message);
    } catch (err: any) {
      alert("Micro-royalty dispatch error: " + err.message);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Add Tagged Author
  const handleAddTaggedAuthor = () => {
    if (!newAuthorName.trim()) return;

    const newAuthor: TaggedAuthorRoyalty = {
      id: `ta-${Date.now()}`,
      name: newAuthorName.trim(),
      role: newAuthorRole,
      sharePercentage: newAuthorShare,
      workReferenced: newAuthorWork.trim() || undefined,
      omegaAccountId: newAuthorOmega.trim() || undefined,
      payoutStatus: "Active",
      totalMicroRoyaltiesReceived: 0,
    };

    const updatedAuthors = [...report.taggedAuthors, newAuthor];
    const totalTaggedShare = updatedAuthors.reduce((acc, a) => acc + (a.sharePercentage || 0), 0);
    const newScore = Math.max(0, Math.min(99, 100 - totalTaggedShare));

    const updatedReport: OriginalityReport = {
      ...report,
      score: newScore,
      authorSharePercent: newScore,
      is100PercentOriginal: false,
      copyrightStatus: "Split Multi-Author Royalty Attribution",
      humanBadgeRoyaltyTier: "Cleanroom Multi-Attribution (Micro-Royalty Split)",
      taggedAuthors: updatedAuthors,
      analysisNotes: `Multi-author attribution active. ${totalTaggedShare}% allocated to ${updatedAuthors.length} tagged author names. Micro-royalties routed via provenance ledger.`,
      breakdown: {
        ...report.breakdown,
        stylisticHomageSimilarity: Math.round(totalTaggedShare * 0.7),
        referencedTextPercent: Math.round(totalTaggedShare * 0.3),
      },
    };

    onUpdateBook({
      ...book,
      originalityReport: updatedReport,
      updatedAt: new Date().toISOString(),
    });

    setNewAuthorName("");
    setNewAuthorWork("");
    setNewAuthorOmega("");
    setShowAddAuthor(false);
  };

  // Remove Tagged Author
  const handleRemoveTaggedAuthor = (id: string) => {
    const updatedAuthors = report.taggedAuthors.filter((a) => a.id !== id);
    const totalTaggedShare = updatedAuthors.reduce((acc, a) => acc + (a.sharePercentage || 0), 0);
    const newScore = updatedAuthors.length === 0 ? 100 : Math.max(0, Math.min(99, 100 - totalTaggedShare));
    const isNow100 = newScore === 100;

    const updatedReport: OriginalityReport = {
      ...report,
      score: newScore,
      authorSharePercent: newScore,
      is100PercentOriginal: isNow100,
      copyrightStatus: isNow100
        ? "Certified 100% Original (AI-Assisted Author)"
        : "Split Multi-Author Royalty Attribution",
      humanBadgeRoyaltyTier: isNow100
        ? "Gold Standard (100% Direct Author Payout)"
        : "Cleanroom Multi-Attribution (Micro-Royalty Split)",
      taggedAuthors: updatedAuthors,
      analysisNotes: isNow100
        ? "100% Originality Restored. Author holds 100% exclusive copyright and direct royalty entitlement."
        : `Attribution updated. ${totalTaggedShare}% allocated to tagged authors.`,
    };

    onUpdateBook({
      ...book,
      originalityReport: updatedReport,
      updatedAt: new Date().toISOString(),
    });
  };

  // Set 100% Originality directly
  const handleSet100Percent = () => {
    handleRunAudit(100);
  };

  // Compact Pill Badge View
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-sm transition-all ${
        is100
          ? "bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/20"
          : "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/20"
      } ${className}`}>
        <div className="flex items-center space-x-1.5">
          <Zap className={`w-3.5 h-3.5 ${is100 ? "text-amber-400" : "text-emerald-400"}`} />
          <span className="font-bold font-mono">{report.score}% Originality</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-stone-900/80 border border-stone-700">
          {is100 ? "100% Author Royalty" : `${report.taggedAuthors.length} Tagged Splits`}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6 shadow-xl ${className}`}>
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${
            is100
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          }`}>
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-serif font-bold text-stone-100">
                Originality Meter & Author Royalty Console
              </h2>
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                is100
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}>
                {is100 ? "100% Full Author Credit" : "Multi-Author Split"}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              C2PA Cleanroom Provenance • Automated Micro-Royalty Routing & Attribution Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleRunAudit()}
            disabled={isAuditing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors disabled:opacity-50"
            title="Scan manuscript for originality, style homages, and author voice"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin text-amber-400" : ""}`} />
            <span>{isAuditing ? "Auditing Manuscript..." : "Re-Audit Text"}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Originality Meter Dial & Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Interactive Score Gauge */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-950 border border-stone-800 text-center space-y-4">
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* SVG Circular Dial */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="10"
                className="text-stone-800"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="10"
                className={is100 ? "text-amber-400 transition-all duration-700" : "text-emerald-400 transition-all duration-700"}
                fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * report.score) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-4xl font-serif font-bold ${is100 ? "text-amber-400" : "text-emerald-400"}`}>
                {report.score}%
              </span>
              <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">
                Originality
              </span>
            </div>
          </div>

          {/* Quick Score Calibrators */}
          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
            <button
              onClick={handleSet100Percent}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                report.score === 100
                  ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                  : "bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800"
              }`}
            >
              🌟 100% (Full Credit)
            </button>
            <button
              onClick={() => handleRunAudit(85)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                report.score === 85
                  ? "bg-emerald-500 text-stone-950 font-bold shadow-md shadow-emerald-500/20"
                  : "bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800"
              }`}
            >
              ⚡ 85% (Split Homage)
            </button>
            <button
              onClick={() => handleRunAudit(70)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                report.score === 70
                  ? "bg-emerald-500 text-stone-950 font-bold shadow-md shadow-emerald-500/20"
                  : "bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800"
              }`}
            >
              👥 70% (Co-Author)
            </button>
          </div>
        </div>

        {/* Right: Copyright Tracking & Royalty Status Banner */}
        <div className="lg:col-span-7 space-y-4">
          {is100 ? (
            /* 100% ORIGINALITY BANNER */
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/60 to-stone-950 border border-amber-500/40 space-y-3 shadow-lg">
              <div className="flex items-center space-x-2 text-amber-400">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-serif font-bold text-sm">
                  100% Originality Verified — Full Copyright Credit
                </span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">
                The author <span className="font-semibold text-amber-300">{book.author}</span> receives{" "}
                <span className="font-bold text-white">100% full credit</span> and is automatically tracked as a{" "}
                <span className="text-amber-400 font-medium">Copyrighted Author (AI-Assisted)</span>.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800">
                  <span className="text-[10px] font-mono text-stone-400 block">Royalty Allocation:</span>
                  <span className="text-emerald-400 font-bold text-sm">100% to Primary Author</span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800">
                  <span className="text-[10px] font-mono text-stone-400 block">Certification Status:</span>
                  <span className="text-amber-300 font-bold text-sm">Gold Tier Direct Vault</span>
                </div>
              </div>
              <div className="text-[11px] text-stone-400 font-mono flex items-center justify-between pt-1 border-t border-amber-950">
                <span>C2PA Provenance: {report.c2paManifestHash.slice(0, 16)}...</span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Zero Copyleft Deductions</span>
                </span>
              </div>
            </div>
          ) : (
            /* < 100% ORIGINALITY MULTI-AUTHOR SPLIT BANNER */
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-stone-950 border border-emerald-500/40 space-y-3 shadow-lg">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Users className="w-5 h-5" />
                <span className="font-serif font-bold text-sm">
                  Multi-Author Attribution & Micro-Royalty Protocol Active
                </span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">
                Meter reads <span className="font-bold text-emerald-300">{report.score}%</span>. The primary author retains{" "}
                <span className="font-bold text-white">{report.score}%</span> credit, and the remaining{" "}
                <span className="font-bold text-emerald-400">{100 - report.score}%</span> is automatically assigned to tagged authors / inspirations to submit micro-royalties through the cleanroom ledger system.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800">
                  <span className="text-[10px] font-mono text-stone-400 block">Author Retained Share:</span>
                  <span className="text-emerald-400 font-bold text-sm">{report.score}% of Net Royalties</span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800">
                  <span className="text-[10px] font-mono text-stone-400 block">Tagged Author Split:</span>
                  <span className="text-amber-300 font-bold text-sm">{100 - report.score}% Micro-Payouts</span>
                </div>
              </div>
              <div className="text-[11px] text-stone-400 font-mono flex items-center justify-between pt-1 border-t border-emerald-950">
                <span>Active Tagged Recipients: {report.taggedAuthors.length}</span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Cleanroom Micro-Routing Ready</span>
                </span>
              </div>
            </div>
          )}

          {/* Lexical Voice Breakdown */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
            <span className="text-[10px] font-mono uppercase text-stone-400 font-bold">
              Lexical & Stylistic Composition Breakdown
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-amber-400 font-bold font-mono">{report.breakdown.originalHumanVoice}%</div>
                <div className="text-[9px] text-stone-400 truncate">Human Voice</div>
              </div>
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-sky-400 font-bold font-mono">{report.breakdown.aiSynthesisNovelty}%</div>
                <div className="text-[9px] text-stone-400 truncate">AI Novelty</div>
              </div>
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-emerald-400 font-bold font-mono">{report.breakdown.stylisticHomageSimilarity}%</div>
                <div className="text-[9px] text-stone-400 truncate">Homage Share</div>
              </div>
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-purple-400 font-bold font-mono">{report.breakdown.referencedTextPercent}%</div>
                <div className="text-[9px] text-stone-400 truncate">References</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tagged Authors & Micro-Royalty Distribution Section */}
      <div className="space-y-4 pt-2 border-t border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="font-serif font-bold text-sm text-stone-100">
              Tagged Authors & Micro-Royalty Split Schedule ({report.taggedAuthors.length})
            </h3>
          </div>
          <button
            onClick={() => setShowAddAuthor(!showAddAuthor)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Tag Author / Influence</span>
          </button>
        </div>

        {/* Add Author Modal / Inline Form */}
        {showAddAuthor && (
          <div className="p-4 rounded-xl bg-stone-950 border border-emerald-500/30 space-y-3 animate-fadeIn">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wide font-mono">
              Add Tagged Author or Literary Homage
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-stone-400 block mb-1">Author Name / Estate</label>
                <input
                  type="text"
                  placeholder="e.g. Neil Gaiman / Estate"
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  className="w-full rounded-lg bg-stone-900 border border-stone-800 px-3 py-1.5 text-stone-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 block mb-1">Attribution Role</label>
                <select
                  value={newAuthorRole}
                  onChange={(e) => setNewAuthorRole(e.target.value as any)}
                  className="w-full rounded-lg bg-stone-900 border border-stone-800 px-3 py-1.5 text-stone-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Influenced By">Influenced By</option>
                  <option value="Co-Author">Co-Author</option>
                  <option value="Sampled Text">Sampled Text</option>
                  <option value="Stylistic Homage">Stylistic Homage</option>
                  <option value="Lore Contributor">Lore Contributor</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-400 block mb-1">Royalty Split Share (%)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newAuthorShare}
                  onChange={(e) => setNewAuthorShare(Number(e.target.value))}
                  className="w-full rounded-lg bg-stone-900 border border-stone-800 px-3 py-1.5 text-stone-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 block mb-1">Referenced Work / Passage</label>
                <input
                  type="text"
                  placeholder="e.g. American Gods thematic tone"
                  value={newAuthorWork}
                  onChange={(e) => setNewAuthorWork(e.target.value)}
                  className="w-full rounded-lg bg-stone-900 border border-stone-800 px-3 py-1.5 text-stone-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddAuthor(false)}
                className="px-3 py-1.5 rounded-lg text-stone-400 hover:text-stone-200 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTaggedAuthor}
                disabled={!newAuthorName.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs disabled:opacity-50"
              >
                Confirm Tag & Split
              </button>
            </div>
          </div>
        )}

        {/* Tagged Authors List */}
        {report.taggedAuthors.length === 0 ? (
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center text-stone-500 text-xs italic">
            No external authors tagged. 100% of royalties are directed to {book.author}. Tagging an author or literary homage will allocate micro-royalties through the attribution ledger.
          </div>
        ) : (
          <div className="space-y-2">
            {report.taggedAuthors.map((ta) => (
              <div
                key={ta.id}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-stone-700 transition-colors text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold font-mono">
                    {ta.sharePercentage}%
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-stone-100">{ta.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-400">
                        {ta.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {ta.workReferenced ? `Ref: ${ta.workReferenced}` : "General stylistic attribution"} •{" "}
                      <span className="font-mono text-[10px] text-emerald-400/80">
                        Omega: {ta.omegaAccountId || "Auto-Routed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-mono text-stone-500 block">Total Dispatched</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      ${(ta.totalMicroRoyaltiesReceived || 0).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveTaggedAuthor(ta.id)}
                    className="p-1.5 text-stone-500 hover:text-rose-400 rounded-lg hover:bg-stone-900"
                    title="Remove tagged author"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Micro-Royalty Payout Submission Dispatcher */}
      <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <DollarSign className="w-4 h-4" />
            <h3 className="font-serif font-bold text-sm text-stone-100">
              Submit Micro-Royalties via Cleanroom Vault
            </h3>
          </div>
          <span className="text-[10px] font-mono text-stone-400">
            Omega Hub & C2PA Micro-Transactions
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full sm:w-auto">
            <label className="text-[10px] font-mono text-stone-400 uppercase block mb-1">
              Royalty Distribution Pool ($ USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-stone-500 text-xs">$</span>
              <input
                type="number"
                min="10"
                step="10"
                value={payoutPoolAmount}
                onChange={(e) => setPayoutPoolAmount(Number(e.target.value))}
                className="w-full rounded-xl bg-stone-900 border border-stone-800 pl-7 pr-3 py-2 text-sm font-mono text-stone-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto sm:self-end">
            <button
              onClick={handleSubmitMicroRoyalties}
              disabled={isSubmittingPayout || payoutPoolAmount <= 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-950/30 disabled:opacity-50"
            >
              {isSubmittingPayout ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Cleanroom Vault...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {is100
                      ? `Disburse $${payoutPoolAmount} to ${book.author} (100%)`
                      : `Dispatch $${payoutPoolAmount} Micro-Royalties (${report.score}% / ${100 - report.score}%)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {payoutSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start space-x-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{payoutSuccessMessage}</span>
          </div>
        )}

        {/* Live Transaction Ledger */}
        {report.recentTransactions && report.recentTransactions.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-stone-400 font-bold">
              <span>Recent Royalty Ledger Payouts</span>
              <span>Total Dispatched: ${(report.totalMicroRoyaltiesSubmitted || 0).toFixed(2)}</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {report.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-stone-900/70 border border-stone-800/80 text-[11px]"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-stone-800 text-stone-400">
                      {tx.sharePercent}%
                    </span>
                    <span className="font-medium text-stone-200 truncate">{tx.recipientName}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-mono font-bold text-emerald-400">+${tx.amount.toFixed(2)}</span>
                    <span className="text-[9px] font-mono text-stone-500 truncate max-w-[80px]">
                      {tx.status.split(" ")[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
