import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  Sparkles,
  Zap,
  BookOpen,
  Feather,
  Users,
  Compass,
  DollarSign,
  CheckCircle,
  ArrowRight,
  LogIn,
  LogOut,
  Layers,
  Palette,
  FileText,
  Printer,
  ChevronRight,
  Cpu,
  Lock,
  ExternalLink,
  Globe,
  Star,
  Check,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { signInWithGoogle, logOut } from "../services/firebase";

interface LandingPageProps {
  currentUser: FirebaseUser | null;
  onEnterStudio: () => void;
  onOpenProjectModal?: (tab?: "create" | "library") => void;
  onOpenAuthModal?: () => void;
  booksCount?: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onEnterStudio,
  onOpenProjectModal,
  onOpenAuthModal,
  booksCount = 1,
}) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (onOpenAuthModal) {
      onOpenAuthModal();
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setAuthError(err.message || "Failed to sign in with Google. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logOut();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 flex flex-col">
      {/* Top Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand & Badge Status */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md shadow-amber-950/50">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-base text-stone-100 tracking-tight">
                TomeCrafter
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                Studio
              </span>
            </div>
            <p className="text-[10px] text-stone-400 font-mono">
              Autonomous Book Studio
            </p>
          </div>
        </div>

        {/* Right Auth & Launch Actions */}
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-700/80 transition-colors cursor-pointer"
                title="Manage Author Account & Cloud Sync"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-6 h-6 rounded-full ring-1 ring-amber-500/50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
                    {currentUser.displayName?.[0] || "U"}
                  </div>
                )}
                <span className="text-xs text-stone-200 font-medium hidden sm:inline max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
              </button>
              <button
                onClick={handleSignOut}
                className="text-[11px] text-stone-400 hover:text-rose-400 px-2 py-1 transition-colors cursor-pointer"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>{authLoading ? "Connecting..." : "Sign In"}</span>
            </button>
          )}

          <button
            onClick={onEnterStudio}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-md shadow-amber-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Enter Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-4 max-w-4xl mx-auto">
          {/* Studio Badge Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium shadow-lg shadow-amber-950/30 animate-fadeIn">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="font-semibold tracking-wide">Next-Gen Author Architecture</span>
            <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              Autonomous Studio
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-stone-100 tracking-tight leading-[1.15]">
            Sovereign Fiction & Manuscript Studio with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400">
              Autonomous Intelligence
            </span>
          </h1>

          {/* Core Subtitle */}
          <p className="text-base sm:text-lg text-stone-300 leading-relaxed font-sans max-w-3xl mx-auto">
            TomeCrafter is the autonomous AI book creation studio empowering authors to outline, craft, illustrate, typeset, and publish commercial-grade literature.
          </p>

          {/* High-Impact Studio Feature Spotlight */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border-2 border-stone-800 shadow-2xl text-left space-y-3 relative overflow-hidden">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-white">
                  End-to-End Literary Engineering
                </h3>
                <p className="text-xs text-amber-400/90 font-mono">
                  Autonomous Outlining • Worldbuilding Codex • Neural Audiobook • KDP Typesetting
                </p>
              </div>
            </div>

            <p className="text-sm sm:text-base text-stone-200 leading-relaxed">
              TomeCrafter gives authors an uncompromised full-stack workstation. Craft deep narrative lore, generate high-fidelity cover art, master synchronized audiobooks, and export production-ready print wraps directly to Amazon KDP and IngramSpark.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-stone-300">
                  <strong>Multimodal Creation:</strong> Prose writing, character lore codex, and 300 DPI typesetting.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-stone-300">
                  <strong>Full Audio Mastering:</strong> Studio narration, interactive waveforms, and multi-format exports.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-stone-300">
                  <strong>100% Author Sovereignty:</strong> Private data storage, cleanroom vaults, and zero platform locks.
                </span>
              </div>
            </div>
          </div>

          {/* Primary CTA & Project Creation / Launch Block */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5 flex-wrap">
            {onOpenProjectModal && (
              <button
                onClick={() => onOpenProjectModal("create")}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-amber-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create New Project</span>
              </button>
            )}

            {onOpenProjectModal && (
              <button
                onClick={() => onOpenProjectModal("library")}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-md"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Reference Projects ({booksCount})</span>
              </button>
            )}

            {!currentUser ? (
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-sm flex items-center justify-center space-x-2.5 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16c1.8 3.8 5.6 7 10.1 7z"
                  />
                </svg>
                <span>{authLoading ? "Connecting..." : "Sign In with Google"}</span>
              </button>
            ) : (
              <button
                onClick={onEnterStudio}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-medium text-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Launch Studio ({currentUser.displayName || currentUser.email?.split("@")[0]})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {authError && (
            <p className="text-xs text-rose-400 font-medium">{authError}</p>
          )}

          <p className="text-xs text-stone-400 font-mono">
            Direct Cloud Sync with Firebase Firestore • Zero local lock-in • 100% Export Freedom
          </p>
        </section>

        {/* Core Studio Architecture */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              The Sovereign Author Workflow
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mx-auto">
              How TomeCrafter accelerates your writing from raw premise to global distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3 shadow-lg hover:border-amber-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                01
              </div>
              <h3 className="text-base font-serif font-bold text-stone-100">
                1. Architectural Outlining & Codex
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Structure multi-act arcs, define faction politics, and track character profiles with persistent lore context that grounds every scene.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3 shadow-lg hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold font-mono">
                02
              </div>
              <h3 className="text-base font-serif font-bold text-stone-100">
                2. Realm Council & Prose Refinement
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Summon specialized master editor agents for sensory enrichment, pacing calibration, dialogue polish, and originality auditing.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3 shadow-lg hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold font-mono">
                03
              </div>
              <h3 className="text-base font-serif font-bold text-stone-100">
                3. Print, Audio & Digital Publishing
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Generate 300 DPI press-ready cover wraps, synthesized audiobook masters, ePub packages, and custom author storefronts in one click.
              </p>
            </div>
          </div>
        </section>

        {/* App Summary & Comprehensive Studio Tour */}
        <section className="space-y-8 pt-4 border-t border-stone-800/80">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              TomeCrafter Studio Summary & Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mx-auto">
              Everything you need from initial worldbuilding concept to Amazon KDP print publication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Realm Council */}
            <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3 hover:border-amber-500/40 transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-100">
                Realm Council (6 AI Master Personas)
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Collaborate with specialized agents: <strong>Valerius</strong> (Plot Architect), <strong>Ronald</strong> (Prose Stylist), <strong>Selene</strong> (Dialogue), <strong>Theresa</strong> (Lore & Canon), <strong>Cassian</strong> (Publishing & KDP), and <strong>Aethelgard</strong> (Dungeon Master).
              </p>
            </div>

            {/* Feature 2: Chapter Builder & Outline */}
            <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3 hover:border-amber-500/40 transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-100">
                3-Act Chapter Builder & Pacing Map
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Architect dramatic story arcs with chapter-by-chapter POV, setting, narrative goal, conflict, and cliffhanger trackers paired with word-budget meters.
              </p>
            </div>

            {/* Feature 3: Manuscript Studio */}
            <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3 hover:border-amber-500/40 transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Feather className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-100">
                Manuscript Canvas & Typography
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Write in distraction-free focus mode with real-time typography styling (EB Garamond, Cinzel, Playfair), manual dictation, scene analysis, and dialogue polisher.
              </p>
            </div>

            {/* Feature 4: Art & Cover Studio */}
            <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3 hover:border-amber-500/40 transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-100">
                Art Studio & Cover Designer
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Generate high-resolution character portraits, battle scenes, and print-ready book cover jackets with customized display typography.
              </p>
            </div>

            {/* Feature 5: Lore Codex */}
            <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3 hover:border-amber-500/40 transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-100">
                Lore Codex & Worldbuilding Graph
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Maintain deep canon consistency with interactive faction logs, magic rulebooks, artifact registries, and automated continuity checkers.
              </p>
            </div>

            {/* Feature 6: Auto-Typesetting & KDP Suite */}
            <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3 hover:border-amber-500/40 transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-100">
                Auto-Typesetting & KDP Publishing
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Export industry-standard 6x9 print-ready PDFs, clean EPUBs, Amazon KDP metadata blurbs, keywords, and BISAC categories with a single click.
              </p>
            </div>
          </div>
        </section>

        {/* Google / Gmail Sign Up & Sign In Action Banner */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/40 border border-stone-800 text-center space-y-6 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Ready to Craft Your Masterpiece?
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Sign in with your Google / Gmail account to synchronize your manuscripts across devices, protect your creative copyright, and access the full Realm Council.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!currentUser ? (
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-stone-100 text-stone-950 font-bold text-sm flex items-center justify-center space-x-3 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16c1.8 3.8 5.6 7 10.1 7z"
                  />
                </svg>
                <span>{authLoading ? "Connecting..." : "Sign Up / Sign In with Google"}</span>
              </button>
            ) : (
              <button
                onClick={onEnterStudio}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-amber-950/40 transition-all hover:scale-105 active:scale-95"
              >
                <span>Enter Manuscript Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onEnterStudio}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-sm transition-colors"
            >
              Open Studio Directly
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-stone-400 pt-2 font-mono">
            <span className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Manuscript Ownership</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>KDP 300 DPI Typesetting</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Neural Audio & Storefront</span>
            </span>
          </div>
        </section>
      </main>

      {/* Landing Page Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-6 px-4 sm:px-8 text-xs text-stone-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Feather className="w-4 h-4 text-amber-400" />
          <span className="font-serif font-bold text-stone-200">TomeCrafter Studio</span>
          <span>•</span>
          <span className="font-mono text-stone-400">Autonomous Author Suite</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onEnterStudio}
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Launch Studio App
          </button>
          <span>•</span>
          <span className="text-stone-400 font-mono text-[11px]">
            Zero Platform Lock-in • 100% Export Freedom
          </span>
        </div>
      </footer>
    </div>
  );
};
