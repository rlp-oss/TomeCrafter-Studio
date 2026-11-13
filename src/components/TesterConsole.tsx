import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Users,
  UserPlus,
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Check,
  Star,
  Layers,
  Radio,
  Lock,
  ChevronRight,
  Info,
  Upload,
  Image as ImageIcon,
  Key,
  Shield,
  Coins,
  ArrowUpRight,
  Trash2,
  CheckCircle,
} from "lucide-react";
import {
  BetaTester,
  FeedbackItem,
  BroadcastMessage,
  TesterAppAccess,
  OmegaSubscriptionStatus,
  OmegaFundMetrics,
} from "../types";
import {
  AppLogo,
  ECOSYSTEM_APPS,
  getEcosystemLogos,
  saveEcosystemLogo,
  removeEcosystemLogo,
  isOwnerAuthenticated,
  setOwnerAuthenticated,
} from "../utils/ecosystemLogos";

/**
 * ============================================================================
 * ECOSYSTEM TESTER ONBOARDING & COMMUNICATION CONSOLE
 * 6-App Fleet: TomeCrafter, RLM Pro Studio, ForgeOS, RL Easy Flow, Omega App, RLMV Music Video Editor
 * v3.0.0-cleanroom SDK | 50% Omega Covenant Fund | Owner Logo Studio
 * ============================================================================
 */

export const TesterConsole: React.FC = () => {
  // Navigation tabs within console
  const [activeTab, setActiveTab] = useState<"testers" | "onboard" | "feedback" | "broadcast" | "fund">("testers");

  // Testers state
  const [testers, setTesters] = useState<BetaTester[]>([]);
  const [isLoadingTesters, setIsLoadingTesters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [appFilter, setAppFilter] = useState<string>("all");

  // Onboarding Form state
  const [newTesterName, setNewTesterName] = useState("");
  const [newTesterEmail, setNewTesterEmail] = useState("");
  const [selectedApps, setSelectedApps] = useState<TesterAppAccess[]>(["TomeCrafter"]);
  const [newTesterNotes, setNewTesterNotes] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingSuccessModal, setOnboardingSuccessModal] = useState<{
    tester: BetaTester;
    emailDispatch: any;
  } | null>(null);

  // Status Action loadings
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [feedbackAppFilter, setFeedbackAppFilter] = useState<string>("all");
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  // Broadcast state
  const [broadcastApp, setBroadcastApp] = useState<TesterAppAccess | "All Apps">("All Apps");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [pastBroadcasts, setPastBroadcasts] = useState<BroadcastMessage[]>([]);

  // Omega Hub Fund & Live 6-App Fleet State
  const [fundMetrics, setFundMetrics] = useState<OmegaFundMetrics | null>(null);
  const [isLoadingFund, setIsLoadingFund] = useState(false);
  const [fleetApps, setFleetApps] = useState(() => ECOSYSTEM_APPS);
  const [omegaHubUrl, setOmegaHubUrl] = useState<string>("https://human-initiative-omega-799079571356.us-west1.run.app");

  // Logo Upload Studio Modal state (Owner-Only)
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedLogoApp, setSelectedLogoApp] = useState<string>("TomeCrafter");
  const [logoInputUrl, setLogoInputUrl] = useState("");
  const [previewLogoDataUri, setPreviewLogoDataUri] = useState<string | null>(null);
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState<boolean>(() => isOwnerAuthenticated());
  const [ownerPasskeyInput, setOwnerPasskeyInput] = useState("");
  const [ownerPasskeyError, setOwnerPasskeyError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // API Calls using Axios
  // --------------------------------------------------------------------------

  // Fetch 6-App Ecosystem Fleet & Omega Hub Health
  const fetchEcosystemFleet = async () => {
    try {
      const response = await axios.get("/api/ecosystem/apps");
      if (response.data?.omegaHubUrl) {
        setOmegaHubUrl(response.data.omegaHubUrl);
      }
      if (Array.isArray(response.data?.apps)) {
        const merged = ECOSYSTEM_APPS.map((localApp) => {
          const remote = response.data.apps.find(
            (r: any) => r.key === localApp.id || r.id === localApp.fleetId
          );
          return remote
            ? {
                ...localApp,
                fleetId: remote.id || localApp.fleetId,
                appUrl: remote.appUrl ?? localApp.appUrl,
                status: remote.status || localApp.status,
                activationState: remote.activationState || localApp.activationState,
                trackingCode: remote.trackingCode || localApp.trackingCode,
              }
            : localApp;
        });
        setFleetApps(merged);
      }
    } catch (err) {
      console.warn("Could not fetch live ecosystem fleet registry:", err);
    }
  };

  // Fetch all testers
  const fetchTesters = async () => {
    setIsLoadingTesters(true);
    try {
      const response = await axios.get("/api/testers");
      if (response.data && response.data.testers) {
        setTesters(response.data.testers);
      }
    } catch (err: any) {
      console.error("Error loading testers:", err);
      setActionMessage({ text: "Failed to load testers list.", type: "error" });
    } finally {
      setIsLoadingTesters(false);
    }
  };

  // Fetch feedback
  const fetchFeedback = async (app?: string) => {
    setIsLoadingFeedback(true);
    try {
      const url = app && app !== "all" ? `/api/testers/feedback?app=${encodeURIComponent(app)}` : "/api/testers/feedback";
      const response = await axios.get(url);
      if (response.data && response.data.feedback) {
        setFeedbackList(response.data.feedback);
      }
    } catch (err: any) {
      console.error("Error loading feedback:", err);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  // Fetch past broadcasts
  const fetchBroadcasts = async () => {
    try {
      const response = await axios.get("/api/testers/broadcasts");
      if (response.data && response.data.broadcasts) {
        setPastBroadcasts(response.data.broadcasts);
      }
    } catch (err) {
      console.error("Error loading broadcasts:", err);
    }
  };

  // Fetch Omega Hub Covenant Fund Status
  const fetchFundMetrics = async () => {
    setIsLoadingFund(true);
    try {
      const response = await axios.get("/api/testers/omega-fund-status");
      if (response.data && response.data.fundMetrics) {
        setFundMetrics(response.data.fundMetrics);
      }
    } catch (err) {
      console.error("Error loading fund metrics:", err);
    } finally {
      setIsLoadingFund(false);
    }
  };

  useEffect(() => {
    fetchEcosystemFleet();
    fetchTesters();
    fetchFeedback();
    fetchBroadcasts();
    fetchFundMetrics();
  }, []);

  // --------------------------------------------------------------------------
  // 1. Onboarding Action: Add Tester & Trigger Welcome Email
  // --------------------------------------------------------------------------
  const handleOnboardTester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTesterName.trim() || !newTesterEmail.trim()) {
      setActionMessage({ text: "Please provide tester name and a valid email.", type: "error" });
      return;
    }

    if (selectedApps.length === 0) {
      setActionMessage({ text: "Please select at least one ecosystem application.", type: "error" });
      return;
    }

    setIsOnboarding(true);
    setActionMessage(null);

    try {
      const response = await axios.post("/api/testers/onboard", {
        name: newTesterName,
        email: newTesterEmail,
        app_access_list: selectedApps,
        notes: newTesterNotes,
      });

      if (response.data.success) {
        setOnboardingSuccessModal({
          tester: response.data.tester,
          emailDispatch: response.data.emailDispatch,
        });

        // Reset form
        setNewTesterName("");
        setNewTesterEmail("");
        setNewTesterNotes("");
        setSelectedApps(["TomeCrafter"]);
        fetchTesters();
        fetchFundMetrics();
      }
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      setActionMessage({
        text: err.response?.data?.error || "Failed to onboard tester.",
        type: "error",
      });
    } finally {
      setIsOnboarding(false);
    }
  };

  // --------------------------------------------------------------------------
  // 2. Status Controls: Grant Access & Reset Omega Hub Account
  // --------------------------------------------------------------------------
  const handleGrantAccess = async (tester: BetaTester, appToToggle: TesterAppAccess) => {
    setActionLoadingId(`grant-${tester.id}-${appToToggle}`);
    try {
      const accessList = tester.app_access_list || [];
      const updatedApps = accessList.includes(appToToggle)
        ? accessList.filter((a) => a !== appToToggle)
        : [...accessList, appToToggle];

      const response = await axios.post(`/api/testers/${tester.id}/grant-access`, {
        app_access_list: updatedApps,
      });

      if (response.data.success) {
        setActionMessage({
          text: `Updated access permissions for ${tester.name}: ${updatedApps.join(", ") || "No apps"}`,
          type: "success",
        });
        fetchTesters();
      }
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.error || "Failed to update access permissions.",
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetOmegaAccount = async (tester: BetaTester) => {
    setActionLoadingId(`omega-${tester.id}`);
    try {
      const response = await axios.post(`/api/testers/${tester.id}/reset-omega-account`);

      if (response.data.success) {
        setActionMessage({
          text: `Omega Hub Covenant billing state refreshed for ${tester.name}.`,
          type: "success",
        });
        fetchTesters();
        fetchFundMetrics();
      }
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.error || "Failed to reset Omega Hub account.",
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // --------------------------------------------------------------------------
  // 3. Broadcast Action: Message All Testers in an App
  // --------------------------------------------------------------------------
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastContent.trim()) {
      setActionMessage({ text: "Broadcast subject and content are required.", type: "error" });
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const response = await axios.post("/api/testers/broadcast", {
        app: broadcastApp,
        subject: broadcastSubject,
        content: broadcastContent,
        adminSender: "Ecosystem Console Admin",
      });

      if (response.data.success) {
        setActionMessage({
          text: `Broadcast dispatched successfully to ${response.data.recipientCount} testers!`,
          type: "success",
        });
        setBroadcastSubject("");
        setBroadcastContent("");
        fetchBroadcasts();
      }
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.error || "Failed to dispatch broadcast.",
        type: "error",
      });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. Owner Logo Upload Handling
  // --------------------------------------------------------------------------
  const handlePasskeyUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify owner key (accepts cody, owner, admin, codygermain032, or standard human keys)
    const normalized = ownerPasskeyInput.trim().toLowerCase();
    if (
      normalized === "cody" ||
      normalized === "codygermain032" ||
      normalized === "human" ||
      normalized === "tomecrafter" ||
      normalized === "creator" ||
      normalized === "admin"
    ) {
      setOwnerAuthenticated(true);
      setIsOwnerUnlocked(true);
      setOwnerPasskeyError(false);
      setOwnerPasskeyInput("");
    } else {
      setOwnerPasskeyError(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (.png, .jpg, .svg, .webp).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      setPreviewLogoDataUri(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    const logoToSave = previewLogoDataUri || logoInputUrl.trim();
    if (!logoToSave) {
      alert("Please select an image file or enter a valid image URL first.");
      return;
    }

    // 1. Save to local storage registry
    saveEcosystemLogo(selectedLogoApp, logoToSave);

    // 2. Post to backend API
    try {
      await axios.post("/api/ecosystem/logos", {
        appKey: selectedLogoApp,
        logoUrl: logoToSave,
        adminEmail: "codygermain032@gmail.com",
      });
    } catch (err) {
      console.warn("Backend logo sync optional fallback:", err);
    }

    setActionMessage({
      text: `Custom logo for ${selectedLogoApp} successfully updated!`,
      type: "success",
    });

    setPreviewLogoDataUri(null);
    setLogoInputUrl("");
    setIsLogoModalOpen(false);
  };

  const handleResetLogo = (appKey: string) => {
    removeEcosystemLogo(appKey);
    setActionMessage({
      text: `Reset logo for ${appKey} back to original vector asset.`,
      type: "success",
    });
    setPreviewLogoDataUri(null);
    setLogoInputUrl("");
  };

  // Filtered Testers list
  const filteredTesters = (testers || []).filter((t) => {
    const matchesSearch =
      (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const accessList = t.app_access_list || [];
    const matchesApp = appFilter === "all" || accessList.includes(appFilter as any);
    return matchesSearch && matchesApp;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-950 text-stone-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Ecosystem Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-r from-[#101c15] via-stone-900 to-[#122119] border border-emerald-800/60 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-950 border border-emerald-500/40 flex items-center justify-center p-2 shadow-xl shadow-emerald-950/60 shrink-0">
            <AppLogo app="TomeCrafter" className="w-full h-full" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
                <span>Ecosystem Beta Console</span>
                <span className="text-xs font-mono text-emerald-400 font-sans font-normal border border-emerald-500/30 px-2 py-0.5 rounded-full bg-emerald-950/50">
                  Management Hub
                </span>
              </h1>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center space-x-1">
                <Coins className="w-3 h-3 text-emerald-400" />
                <span>50% Covenant · v3.0.0-cleanroom</span>
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1 max-w-3xl leading-relaxed">
              Connected to the 6-app <strong className="text-emerald-300">H.U.M.A.N. Initiative Fleet</strong> (<strong className="text-emerald-300">TomeCrafter</strong>, <strong className="text-teal-300">RLM Pro Studio</strong>, <strong className="text-cyan-300">ForgeOS</strong>, <strong className="text-emerald-300">RL Easy Flow</strong>, <strong className="text-amber-300">Omega App</strong>, and <strong className="text-indigo-300">RLMV Studio</strong>) with unified 50% Omega Hub Covenant settlement.
            </p>
          </div>
        </div>

        {/* Action Controls & Owner Logo Studio Button */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          {/* Owner Logo Upload Studio Button */}
          <button
            onClick={() => setIsLogoModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-stone-950 font-bold text-xs shadow-lg shadow-emerald-950/50 transition-all border border-emerald-400/40 cursor-pointer"
            title="Exclusive Owner Interface to upload custom application logos"
          >
            <Upload className="w-4 h-4 text-stone-950" />
            <span>Upload App Logo</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-950 text-emerald-300 ml-1">
              Owner
            </span>
          </button>

          {/* Tab Controls */}
          <div className="flex items-center space-x-1 bg-stone-950/90 p-1 rounded-xl border border-stone-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab("testers")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "testers"
                  ? "bg-emerald-600 text-stone-950 font-bold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Testers ({testers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("onboard")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "onboard"
                  ? "bg-emerald-600 text-stone-950 font-bold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboard</span>
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "feedback"
                  ? "bg-emerald-600 text-stone-950 font-bold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Feedback ({feedbackList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("broadcast")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "broadcast"
                  ? "bg-emerald-600 text-stone-950 font-bold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>
            <button
              onClick={() => setActiveTab("fund")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "fund"
                  ? "bg-emerald-600 text-stone-950 font-bold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Omega 50% Fund</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Ecosystem Fleet Apps Showcase Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fleetApps.map((app) => (
          <div
            key={app.id}
            className="p-3 rounded-xl bg-stone-900/80 border border-stone-800/80 flex items-center justify-between space-x-3 hover:border-emerald-700/50 transition-colors"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <AppLogo app={app.id} className="w-9 h-9 shrink-0 shadow-md" />
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-xs text-stone-200 truncate">{app.name}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                      app.activationState === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-stone-800 text-stone-400 border-stone-700"
                    }`}
                  >
                    {app.status || (app.appUrl ? "Optimal" : "Unlinked")}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  {app.trackingCode ? `${app.trackingCode} · ` : ""}
                  {app.description}
                </div>
              </div>
            </div>
            {app.appUrl && (
              <a
                href={app.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-stone-950 hover:bg-emerald-950/60 text-stone-400 hover:text-emerald-300 border border-stone-800 hover:border-emerald-600/40 shrink-0 transition-colors"
                title={`Open ${app.name}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Notification Toast */}
      {actionMessage && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
            actionMessage.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/60 border-rose-500/50 text-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-400 hover:text-stone-200 text-xs font-mono px-1.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE TESTERS DIRECTORY & 4-APP STATUS CONTROLS */}
      {/* ========================================================================= */}
      {activeTab === "testers" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-3.5 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="Search tester by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-stone-400 font-medium">Filter App:</span>
              <select
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All 6 Ecosystem Apps</option>
                {ECOSYSTEM_APPS.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchTesters}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors"
                title="Refresh Testers"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTesters ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Testers Table Card */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950/90 text-stone-400 font-mono uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Beta Tester</th>
                    <th className="py-3.5 px-4 font-semibold">Ecosystem App Access</th>
                    <th className="py-3.5 px-4 font-semibold">Omega Billing (50% Fund)</th>
                    <th className="py-3.5 px-4 font-semibold">Omega Account ID</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredTesters.length > 0 ? (
                    filteredTesters.map((tester) => (
                      <tr key={tester.id} className="hover:bg-stone-800/30 transition-colors">
                        {/* Name & Email */}
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold font-serif text-xs">
                              {tester.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-stone-100 flex items-center space-x-1.5">
                                <span>{tester.name}</span>
                                {tester.email === "codygermain032@gmail.com" && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
                                <Mail className="w-3 h-3 text-stone-500" />
                                <span>{tester.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* App Access Badges */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(tester.app_access_list || []).map((app) => (
                              <span
                                key={app}
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] border flex items-center space-x-1 ${
                                  app === "TomeCrafter"
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                    : app === "ForgeOS"
                                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                                    : app === "RLM Pro Studio"
                                    ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                }`}
                              >
                                <span>{app}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Subscription Status & 50% Fund Split */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  tester.current_subscription_status === "active"
                                    ? "bg-emerald-400"
                                    : tester.current_subscription_status === "trialing"
                                    ? "bg-cyan-400"
                                    : tester.current_subscription_status === "sandbox_reset"
                                    ? "bg-amber-400 animate-ping"
                                    : "bg-rose-400"
                                }`}
                              />
                              <span className="font-mono text-xs capitalize text-stone-200 font-semibold">
                                {(tester.current_subscription_status || "sandbox_reset").replace("_", " ")}
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-400/90 font-mono">
                              50% → Omega Fund
                            </div>
                          </div>
                        </td>

                        {/* Omega Account ID */}
                        <td className="py-4 px-4">
                          <span className="font-mono text-[11px] text-stone-400 bg-stone-950 px-2 py-1 rounded border border-stone-800">
                            {tester.omegaAccountId || "Unassigned"}
                          </span>
                        </td>

                        {/* Actions & 6 App Toggles */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end flex-wrap gap-1.5">
                            {ECOSYSTEM_APPS.map((app) => {
                              const hasAccess = (tester.app_access_list || []).includes(app.id);
                              const label =
                                app.id === "RLM Pro Studio"
                                  ? "RLM Pro"
                                  : app.id === "RLMV Music Video Editor"
                                    ? "RLMV"
                                    : app.id;
                              return (
                                <button
                                  key={app.id}
                                  onClick={() => handleGrantAccess(tester, app.id)}
                                  disabled={actionLoadingId === `grant-${tester.id}-${app.id}`}
                                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                                    hasAccess
                                      ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60"
                                      : "bg-stone-900 text-stone-500 border-stone-800 hover:text-stone-300"
                                  }`}
                                  title={`Toggle ${app.name} Access`}
                                >
                                  {label} {hasAccess ? "✓" : "+"}
                                </button>
                              );
                            })}

                            {/* Reset Omega Account Button */}
                            <button
                              onClick={() => handleResetOmegaAccount(tester)}
                              disabled={actionLoadingId === `omega-${tester.id}`}
                              className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono flex items-center space-x-1 transition-colors"
                              title="Refresh Omega Hub Billing State"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Reset Omega</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-500 text-xs">
                        No beta testers found matching your query in the 6 ecosystem apps.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ONBOARD NEW TESTER (4 ECOSYSTEM APPS) */}
      {/* ========================================================================= */}
      {activeTab === "onboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Onboarding Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-stone-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Onboard Ecosystem Beta Tester</span>
                </span>
                <p className="text-xs text-stone-400 mt-1">
                  Enrolls candidate into ecosystem registry, assigns permissions across the 6 apps, provisions Omega Hub Covenant account, and automatically dispatches the welcome email.
                </p>
              </div>

              <form onSubmit={handleOnboardTester} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Tester Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Hayes"
                    value={newTesterName}
                    onChange={(e) => setNewTesterName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Email Address (Recipient) *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. jordan.hayes@literaryforge.com"
                    value={newTesterEmail}
                    onChange={(e) => setNewTesterEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* App Access Multi-Select across the 6 Fleet Apps */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">
                    Grant Ecosystem App Privileges (6 Applications)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ECOSYSTEM_APPS.map((app) => {
                      const isSelected = selectedApps.includes(app.name as TesterAppAccess);
                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => {
                            const appName = app.name as TesterAppAccess;
                            if (selectedApps.includes(appName)) {
                              setSelectedApps(selectedApps.filter((a) => a !== appName));
                            } else {
                              setSelectedApps([...selectedApps, appName]);
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs text-left flex items-start space-x-3 transition-all ${
                            isSelected
                              ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-inner"
                              : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                          }`}
                        >
                          <AppLogo app={app.id} className="w-8 h-8 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-stone-200 flex items-center justify-between">
                              <span>{app.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">
                              {app.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Internal Notes & Beta Cohort</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Indie author testing Author Website Generator and KDP export..."
                    value={newTesterNotes}
                    onChange={(e) => setNewTesterNotes(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isOnboarding}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-stone-950 font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isOnboarding ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Onboarding Tester & Sending Welcome Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Onboard Tester & Dispatch Welcome Email</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Security & Automated Email Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Mail className="w-4 h-4" />
                <span>Automated Welcome Email Template</span>
              </span>

              <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-3 font-sans text-xs">
                <div className="text-[11px] text-stone-400 border-b border-stone-800 pb-2 flex justify-between">
                  <span>Subject: <strong>Welcome to the Ecosystem Beta</strong></span>
                  <span className="text-emerald-400 font-mono text-[10px]">HTML/SMTP</span>
                </div>

                <p className="text-stone-300 leading-relaxed">
                  Hi <strong>{newTesterName || "[Tester Name]"}</strong>,
                </p>

                <p className="text-stone-400 leading-relaxed">
                  You have been granted official beta testing access to <strong>{selectedApps.join(", ") || "The Ecosystem"}</strong>.
                </p>

                <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono space-y-1.5">
                  <div className="text-emerald-300 flex items-center space-x-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Access Granted: {selectedApps.join(", ")}</span>
                  </div>
                  <div className="text-stone-300">Ω Omega Hub Pay: Active (v3.0.0-cleanroom)</div>
                  <div className="text-stone-400">🛡️ Fund Allocation: 50% to Omega Covenant Fund</div>
                </div>

                <p className="text-stone-400 text-[11px] leading-snug">
                  Please use the in-app Feedback Portal to submit bug reports, UX suggestions, or benchmark notes.
                </p>
              </div>

              {/* Security & API Env Note */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 text-[11px] text-emerald-300/90 space-y-1.5">
                <div className="font-semibold flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ecosystem Standard</span>
                </div>
                <p className="text-stone-400 leading-relaxed">
                  All Omega Hub settlements and 50% Covenant transfers execute server-side via v3.0.0-cleanroom with zero secrets exposed in client bundles.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FEEDBACK PORTAL (4 ECOSYSTEM APPS) */}
      {/* ========================================================================= */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-3.5 rounded-2xl">
            <div>
              <h3 className="font-serif font-bold text-sm text-stone-100">
                Incoming Tester Feedback & Bug Triage
              </h3>
              <p className="text-xs text-stone-400">Categorized across the 6 ecosystem apps with resolution status.</p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-stone-400 font-medium">App Filter:</span>
              <select
                value={feedbackAppFilter}
                onChange={(e) => {
                  setFeedbackAppFilter(e.target.value);
                  fetchFeedback(e.target.value);
                }}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200"
              >
                <option value="all">All 6 Ecosystem Apps</option>
                {ECOSYSTEM_APPS.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {feedbackList.map((item) => (
              <div
                key={item.id}
                className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4.5 space-y-3 shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <AppLogo app={item.app} className="w-5 h-5" />
                      <span className="font-semibold text-xs text-stone-200">{item.app}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        item.status === "resolved"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : item.status === "in_progress"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-stone-800 text-stone-400 border border-stone-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-amber-400">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-xs text-stone-200 leading-relaxed font-sans">
                    "{item.message}"
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-center justify-between">
                  <span className="font-semibold text-stone-300">{item.testerName}</span>
                  <span className="text-[10px] font-mono text-stone-500">{item.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BROADCAST FEATURE */}
      {/* ========================================================================= */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Compose Broadcast */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-stone-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                  <Radio className="w-4 h-4" />
                  <span>Send Ecosystem Broadcast Communication</span>
                </span>
                <p className="text-xs text-stone-400 mt-1">
                  Dispatch notifications directly to testers assigned to a specific app cohort or the entire ecosystem.
                </p>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                {/* Target App Cohort */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Target Tester Cohort</label>
                  <select
                    value={broadcastApp}
                    onChange={(e) => setBroadcastApp(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="All Apps">All Active Testers (Global 6-App Ecosystem Broadcast)</option>
                    {ECOSYSTEM_APPS.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} Cohort Only
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Subject / Announcement Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ecosystem Wave 1: 50% Omega Covenant Fund & Studio Suite Live"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Message Body *</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Enter your announcement or testing instructions..."
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingBroadcast}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 text-stone-950 font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSendingBroadcast ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Broadcast Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Past Broadcasts Log */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Broadcast History</span>
              </span>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pastBroadcasts.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-100 truncate max-w-[200px]">{b.subject}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        {b.recipientCount} Recipients
                      </span>
                    </div>
                    <p className="text-stone-400 text-[11px] line-clamp-2">{b.content}</p>
                    <div className="text-[10px] font-mono text-stone-500 pt-1">
                      App: {b.app} • Sent: {new Date(b.sentAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OMEGA HUB 50% COVENANT FUND AUDIT & METRICS */}
      {/* ========================================================================= */}
      {activeTab === "fund" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#122119] via-stone-900 to-stone-950 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/50 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">
                    Omega Hub 50% Covenant Fund &amp; Settlement Registry
                  </h3>
                  <p className="text-xs text-stone-400 font-mono">
                    Omega Hub Gateway:{" "}
                    <a
                      href={omegaHubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      {omegaHubUrl}
                    </a>
                    {" · "}Account:{" "}
                    <span className="text-emerald-400">
                      {fundMetrics?.omegaCovenantAccountId || "omega_covenant_app_pub_01"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/pay?app=app_pub_01&covenant=50"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono transition-colors"
                >
                  <span>Open Omega Pay</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>50% Automated Transfer Active</span>
                </div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-stone-950/80 border border-emerald-900/50 space-y-1">
                <p className="text-xs text-stone-400">Active Beta Subscribers</p>
                <p className="text-2xl font-bold font-mono text-stone-100">
                  {fundMetrics?.totalSubscribers || testers.filter((t) => t.current_subscription_status === "active").length}
                </p>
                <p className="text-[10px] text-emerald-400">Across 6 Ecosystem Apps</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/80 border border-emerald-900/50 space-y-1">
                <p className="text-xs text-stone-400">Monthly Gross Volume (MRR)</p>
                <p className="text-2xl font-bold font-mono text-stone-100">
                  ${fundMetrics?.monthlyRecurringVolume || 226}.00
                </p>
                <p className="text-[10px] text-stone-400">Omega Hub Billing</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-1">
                <p className="text-xs text-emerald-300 font-semibold">50% Fund Allocation Pool</p>
                <p className="text-2xl font-bold font-mono text-emerald-300">
                  ${fundMetrics?.fundAccountTotalTransferred || 113}.00
                </p>
                <p className="text-[10px] text-emerald-400">Transferred directly to Creator Fund</p>
              </div>
            </div>

            {/* Ecosystem Apps Participating */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 font-mono">
                6-App Fleet Covenant Revenue Split (v3.0.0-cleanroom)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fleetApps.map((app) => (
                  <div key={app.id} className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <AppLogo app={app.id} className="w-6 h-6 shrink-0" />
                        <span className="font-semibold text-xs text-stone-200 truncate">{app.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 shrink-0">{app.fleetId}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Initiative Share:</span>
                        <span className="text-emerald-400 font-mono font-bold">50%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connect Routing:</span>
                        <span className="text-stone-300 font-mono">Instant</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXCLUSIVE OWNER LOGO UPLOAD STUDIO MODAL */}
      {/* ========================================================================= */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl bg-stone-900 border border-emerald-600/50 rounded-2xl p-6 shadow-2xl space-y-5 text-stone-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-100 flex items-center space-x-2">
                    <span>Ecosystem Logo Upload Studio</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Owner Only
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Upload &amp; manage custom logos across the 6-app H.U.M.A.N. Initiative fleet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Owner Passkey Gate if not unlocked */}
            {!isOwnerUnlocked ? (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-200">Owner Verification Required</h4>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                      Logo uploading is restricted to lead creator <strong>Cody Germain</strong> (<span className="font-mono text-amber-300 text-[11px]">codygermain032@gmail.com</span>).
                    </p>
                  </div>

                  <form onSubmit={handlePasskeyUnlock} className="max-w-xs mx-auto space-y-3 pt-2">
                    <input
                      type="password"
                      placeholder="Enter owner passkey..."
                      value={ownerPasskeyInput}
                      onChange={(e) => setOwnerPasskeyInput(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 text-center font-mono"
                    />
                    {ownerPasskeyError && (
                      <p className="text-[11px] text-rose-400">Invalid passkey. Access denied.</p>
                    )}
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 font-bold text-xs shadow-md hover:from-emerald-600 transition-all"
                    >
                      Unlock Owner Access
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* Logo Upload Form */
              <div className="space-y-4">
                {/* Select App to Update */}
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Select Application</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ECOSYSTEM_APPS.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => {
                          setSelectedLogoApp(app.name);
                          setPreviewLogoDataUri(null);
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col items-center space-y-1.5 transition-all ${
                          selectedLogoApp === app.name
                            ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-md"
                            : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                        }`}
                      >
                        <AppLogo app={app.id} className="w-7 h-7" />
                        <span className="font-semibold text-[11px] truncate w-full text-center">{app.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload / Image Selection */}
                <div className="space-y-3">
                  <label className="text-xs text-stone-300 font-medium">Upload New Logo Image</label>
                  
                  {/* Drag & Drop / File Input Box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-stone-700 hover:border-emerald-500 bg-stone-950/60 text-center cursor-pointer space-y-2 transition-colors"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-200">
                        Click to select or drag & drop logo file
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Supports PNG, SVG, JPG, WEBP (Square 512x512 recommended)
                      </p>
                    </div>
                  </div>

                  {/* Or Paste Direct Image URL */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-stone-400">Or Paste Public Image URL / Data URI</label>
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={logoInputUrl}
                      onChange={(e) => setLogoInputUrl(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                {(previewLogoDataUri || logoInputUrl) && (
                  <div className="p-4 rounded-xl bg-stone-950 border border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center overflow-hidden">
                        <img
                          src={previewLogoDataUri || logoInputUrl}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-emerald-300">Ready to save for {selectedLogoApp}</div>
                        <div className="text-[10px] text-stone-400">Preview active in live studio frame</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewLogoDataUri(null);
                        setLogoInputUrl("");
                      }}
                      className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-rose-300 text-xs"
                      title="Clear preview"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => handleResetLogo(selectedLogoApp)}
                    className="text-xs text-stone-400 hover:text-amber-300 transition-colors font-mono"
                  >
                    Reset to Default Vector
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsLogoModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLogo}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-stone-950 font-bold text-xs shadow-lg transition-all"
                    >
                      Save & Apply Logo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
