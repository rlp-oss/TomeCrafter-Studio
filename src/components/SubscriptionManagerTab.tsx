import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Coins,
  Layers,
  Check,
  Plus,
  RefreshCw,
  Clock,
  BookOpen,
  Mic,
  Video,
  Globe,
  Sliders,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Award,
  ChevronRight,
  Radio,
  Download,
  Flame,
  X,
} from "lucide-react";
import {
  SubscriptionTier,
  ModularTabAddon,
  UserSubscriptionState,
  SubscriptionPlanId,
} from "../types";
import {
  SUBSCRIPTION_TIERS,
  MODULAR_TAB_ADDONS,
  getStoredUserSubscription,
  saveStoredUserSubscription,
} from "../utils/subscriptionStorage";

interface SubscriptionManagerTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const SubscriptionManagerTab: React.FC<SubscriptionManagerTabProps> = ({
  onNavigateTab,
}) => {
  const [subState, setSubState] = useState<UserSubscriptionState>(() => getStoredUserSubscription());
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state changes to storage
  useEffect(() => {
    saveStoredUserSubscription(subState);
  }, [subState]);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const currentPlan =
    SUBSCRIPTION_TIERS.find((t) => t.id === subState.currentPlanId) || SUBSCRIPTION_TIERS[0];

  // Handle plan switch
  const handleSelectPlan = async (planId: SubscriptionPlanId) => {
    if (planId === subState.currentPlanId) return;
    setIsUpdating(true);

    try {
      const response = await axios.post("/api/subscription/update-plan", {
        planId,
        addonIds: subState.activeAddonTabIds,
        billingInterval,
        customerEmail: "codygermain032@gmail.com",
      });

      if (response.data?.success) {
        const updated: UserSubscriptionState = {
          ...subState,
          currentPlanId: planId,
          billingInterval,
        };
        saveStoredUserSubscription(updated);
        setSubState(getStoredUserSubscription());
        showToast(
          `Switched to ${
            SUBSCRIPTION_TIERS.find((t) => t.id === planId)?.name
          } plan! 50% ($${(
            (billingInterval === "annual"
              ? SUBSCRIPTION_TIERS.find((t) => t.id === planId)!.priceAnnualMonthlyUsd
              : SUBSCRIPTION_TIERS.find((t) => t.id === planId)!.priceMonthlyUsd) * 0.5
          ).toFixed(2)}/mo) routed to Creator Fund.`
        );
      }
    } catch (e) {
      showToast("Plan update completed (Local Mode)");
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle selectable add-on tabs
  const handleToggleAddon = async (addonId: string) => {
    const isCurrentlyActive = subState.activeAddonTabIds.includes(addonId);
    const newAddonIds = isCurrentlyActive
      ? subState.activeAddonTabIds.filter((id) => id !== addonId)
      : [...subState.activeAddonTabIds, addonId];

    setIsUpdating(true);
    try {
      await axios.post("/api/subscription/update-plan", {
        planId: subState.currentPlanId,
        addonIds: newAddonIds,
        billingInterval,
        customerEmail: "codygermain032@gmail.com",
      });

      const updated: UserSubscriptionState = {
        ...subState,
        activeAddonTabIds: newAddonIds,
        billingInterval,
      };
      saveStoredUserSubscription(updated);
      setSubState(getStoredUserSubscription());

      const addon = MODULAR_TAB_ADDONS.find((a) => a.id === addonId);
      if (!isCurrentlyActive) {
        showToast(`Added '${addon?.name}' to your subscription (+ $${addon?.monthlyPriceUsd}/mo)!`);
      } else {
        showToast(`Removed '${addon?.name}' from your subscription.`);
      }
    } catch (e) {
      showToast("Add-on updated (Local Mode)");
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate usage percentages
  const wordsPercent = Math.min(
    100,
    Math.round((subState.usage.aiProseWordsUsed / (subState.usage.aiProseWordsLimit || 1)) * 100)
  );
  const artPercent = Math.min(
    100,
    Math.round((subState.usage.coverArtRendersUsed / (subState.usage.coverArtRendersLimit || 1)) * 100)
  );
  const productsPercent = Math.min(
    100,
    Math.round((subState.usage.storeProductsListed / (subState.usage.storeProductsLimit || 1)) * 100)
  );
  const exportsPercent = Math.min(
    100,
    Math.round((subState.usage.exportsUsedThisMonth / (subState.usage.exportsLimitThisMonth || 1)) * 100)
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-950 text-stone-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Fund Routing Guarantee */}
      <div className="bg-gradient-to-r from-stone-900 via-[#19150e] to-stone-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                Tiered Subscription & Modular Tabs
              </span>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center space-x-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>50% Creator Fund Protocol</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-serif font-bold text-stone-100">
              Your Workspace Plan & Generation Quota
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-3xl leading-relaxed">
              Competitive generation limits with no artificial throttling. Choose a base tier or customize your workflow by selecting individual modular add-on tabs. Exactly 50% of every subscription is automatically allocated to the Creator Fund.
            </p>
          </div>

          {/* Current Plan Summary Card */}
          <div className="bg-stone-950/90 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shrink-0 min-w-[260px] shadow-xl space-y-2">
            <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider flex items-center justify-between">
              <span>Active Plan</span>
              <span className="text-emerald-400 font-bold">● Active</span>
            </div>
            <div className="text-xl font-bold font-serif text-amber-400">{currentPlan.name}</div>
            <div className="text-xs text-stone-300 font-mono">
              Total:{" "}
              <span className="text-stone-100 font-bold text-sm">
                ${subState.totalMonthlyChargeUsd.toFixed(2)}/mo
              </span>
            </div>
            <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg">
              🛡️ ${subState.fundContributionMonthlyUsd.toFixed(2)}/mo to Creator Fund
            </div>
          </div>
        </div>

        {/* Real-Time Generation Limits Tracker */}
        <div className="border-t border-stone-800/80 pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-300 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Monthly Generation Limits & Usage</span>
            </h3>
            <div className="text-[11px] font-mono text-stone-400 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span>Resets in 18 days</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AI Prose Words */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-300 font-medium">AI Prose Words</span>
                <span className="font-mono text-amber-400 font-bold">
                  {subState.usage.aiProseWordsUsed.toLocaleString()} /{" "}
                  {subState.usage.aiProseWordsLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${wordsPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-stone-500 flex justify-between">
                <span>{(subState.usage.aiProseWordsLimit - subState.usage.aiProseWordsUsed).toLocaleString()} words remaining</span>
                <span>{wordsPercent}%</span>
              </div>
            </div>

            {/* Cover Art Renders */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-300 font-medium">Cover Art & Renders</span>
                <span className="font-mono text-amber-400 font-bold">
                  {subState.usage.coverArtRendersUsed} / {subState.usage.coverArtRendersLimit}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${artPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-stone-500 flex justify-between">
                <span>{subState.usage.coverArtRendersLimit - subState.usage.coverArtRendersUsed} renders remaining</span>
                <span>{artPercent}%</span>
              </div>
            </div>

            {/* Store Products Listed */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-300 font-medium">Store & Merch Slots</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {subState.usage.storeProductsListed} / {subState.usage.storeProductsLimit}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${productsPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-stone-500 flex justify-between">
                <span>{subState.usage.storeProductsLimit - subState.usage.storeProductsListed} slots free</span>
                <span>{productsPercent}%</span>
              </div>
            </div>

            {/* Monthly Exports */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-300 font-medium">Print/ePub Exports</span>
                <span className="font-mono text-amber-400 font-bold">
                  {subState.usage.exportsUsedThisMonth} / {subState.usage.exportsLimitThisMonth}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${exportsPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-stone-500 flex justify-between">
                <span>{subState.usage.exportsLimitThisMonth - subState.usage.exportsUsedThisMonth} exports left</span>
                <span>{exportsPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center justify-between shadow-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Monthly / Annual Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-lg font-serif font-bold text-stone-100">Select Base Subscription Tier</h2>
          <p className="text-xs text-stone-400">
            Scale your AI generative limits as your literary catalogue expands.
          </p>
        </div>

        <div className="flex items-center bg-stone-900 p-1 rounded-xl border border-stone-800 self-start sm:self-auto">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              billingInterval === "monthly"
                ? "bg-amber-500 text-stone-950 font-bold shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingInterval("annual")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              billingInterval === "annual"
                ? "bg-amber-500 text-stone-950 font-bold shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500 text-stone-950 font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Base Subscription Tiers (3-Tier Matrix) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const isCurrent = subState.currentPlanId === tier.id;
          const displayPrice =
            billingInterval === "annual" ? tier.priceAnnualMonthlyUsd : tier.priceMonthlyUsd;

          return (
            <div
              key={tier.id}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                isCurrent
                  ? "bg-gradient-to-b from-[#211a10] to-stone-900 border-2 border-amber-500 shadow-2xl shadow-amber-950/50"
                  : "bg-stone-900/90 border border-stone-800 hover:border-stone-700 shadow-xl"
              }`}
            >
              {/* Badges */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-lg text-stone-100">{tier.name}</span>
                  {tier.badgeLabel && (
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        tier.isPopular
                          ? "bg-amber-500 text-stone-950"
                          : "bg-stone-800 text-stone-300 border border-stone-700"
                      }`}
                    >
                      {tier.badgeLabel}
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-400 min-h-[36px] leading-relaxed">{tier.tagline}</p>

                {/* Price Display */}
                <div className="space-y-1 py-2 border-y border-stone-800/80">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-serif font-bold text-stone-100">
                      ${displayPrice}
                    </span>
                    <span className="text-xs text-stone-400 font-mono">/ month</span>
                  </div>
                  {tier.priceMonthlyUsd > 0 && (
                    <div className="text-[11px] font-mono text-emerald-400">
                      🛡️ ${(displayPrice * 0.5).toFixed(2)}/mo directly to Creator Fund
                    </div>
                  )}
                </div>

                {/* Generation Limits Spotlight */}
                <div className="space-y-1.5 text-xs text-stone-300 bg-stone-950/70 p-3 rounded-xl border border-stone-800/80">
                  <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                    Generation Quota:
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">AI Prose Words:</span>
                    <span className="font-mono font-bold text-stone-200">
                      {tier.limits.monthlyAiProseWords.toLocaleString()} / mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Cover Art Renders:</span>
                    <span className="font-mono font-bold text-stone-200">
                      {tier.limits.monthlyCoverArtRenders} / mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Manuscripts:</span>
                    <span className="font-mono font-bold text-stone-200">
                      {tier.limits.activeManuscriptsLimit} active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Store Products:</span>
                    <span className="font-mono font-bold text-stone-200">
                      {tier.limits.storeProductsLimit === 999 ? "Unlimited" : `${tier.limits.storeProductsLimit} slots`}
                    </span>
                  </div>
                </div>

                {/* Included Features */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-mono uppercase text-stone-400">What's Included:</div>
                  {tier.features.map((feat, idx) => (
                    <div key={idx} className="text-xs text-stone-300 flex items-start space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isCurrent || isUpdating}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-2 ${
                    isCurrent
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default"
                      : "bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer"
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Current Active Plan</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Upgrade to {tier.name}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: SELECTABLE MODULAR ADD-ON TABS */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-stone-800">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-stone-100">
              Selectable Add-On Tabs & Workflow Modules
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Build your ideal author workspace by selecting standalone tabs. Add only what you need to your existing subscription.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULAR_TAB_ADDONS.map((addon) => {
            const isSelected = subState.activeAddonTabIds.includes(addon.id);
            const isAutoIncludedInMaster =
              subState.currentPlanId === "guild_master" && addon.isIncludedInMaster;

            return (
              <div
                key={addon.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  isAutoIncludedInMaster
                    ? "bg-stone-900/60 border-emerald-500/40"
                    : isSelected
                    ? "bg-[#1f1910] border-amber-500 shadow-lg"
                    : "bg-stone-900/90 border-stone-800 hover:border-stone-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">
                        {addon.category}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-stone-100 mt-0.5">{addon.name}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-serif text-amber-400">
                        +${addon.monthlyPriceUsd}
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">/ month</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed font-sans">{addon.description}</p>

                  <div className="space-y-1 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                    {addon.unlocksFeatures.map((feat, idx) => (
                      <div key={idx} className="text-[11px] text-stone-400 flex items-start space-x-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-emerald-400">
                    🛡️ +${(addon.monthlyPriceUsd * 0.5).toFixed(2)} to Creator Fund
                  </div>

                  {isAutoIncludedInMaster ? (
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                      Included in Guild Master
                    </span>
                  ) : (
                    <button
                      onClick={() => handleToggleAddon(addon.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isSelected
                          ? "bg-amber-500 text-stone-950 shadow"
                          : "bg-stone-800 hover:bg-stone-700 text-stone-200"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Add-On</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Plan</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
