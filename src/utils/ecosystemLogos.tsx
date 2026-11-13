import React from "react";
import { TesterAppAccess, EcosystemAppMeta, AppLogoRegistry } from "../types";

export const cleanEnvUrl = (v = ""): string =>
  v.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");

export const OMEGA_HUB_DEFAULT_URL =
  cleanEnvUrl((import.meta as any).env?.VITE_OMEGA_APP_URL) ||
  "https://human-initiative-omega-799079571356.us-west1.run.app";

export const CORE_HUB_DEFAULT_URL = "https://humanethicalai.ai.studio";

export const ECOSYSTEM_APPS: EcosystemAppMeta[] = [
  {
    id: "TomeCrafter",
    fleetId: "app_pub_01",
    name: "TomeCrafter",
    tagline: "AI Novel & Book Studio",
    description: "Flagship literary engine for plot architecture, deep worldbuilding codex, prose styling, and multi-format KDP typesetting.",
    logoKey: "TomeCrafter",
    defaultBadgeColor: "emerald",
    stripePlanPriceId: "price_tomecrafter_monthly",
    appUrl: "https://ais-pre-zwexgkik255icjgs3t3qkt-321940249756.us-east1.run.app",
    status: "Optimal",
    activationState: "ACTIVE",
  },
  {
    id: "RLM Pro Studio",
    fleetId: "app_rlm_02",
    name: "RLM Pro Studio",
    tagline: "Realm Master Audio & Media Suite",
    description: "Advanced audio synthesis, voice clone mastery, cinematic soundscaping, and video teleprompter studio.",
    logoKey: "RLM Pro Studio",
    defaultBadgeColor: "teal",
    stripePlanPriceId: "price_rlmpro_monthly",
    appUrl: "https://rlm-pro-studio.ai.studio",
    status: "Optimal",
    activationState: "ACTIVE",
  },
  {
    id: "ForgeOS",
    fleetId: "app_bld_03",
    name: "ForgeOS",
    tagline: "Autonomous Agent & Workflow OS (ReForgeOS)",
    description: "Core developer and creator operating system orchestrating multi-agent cognitive tasks, automation pipelines, and API integrations.",
    logoKey: "ForgeOS",
    defaultBadgeColor: "cyan",
    stripePlanPriceId: "price_forgeos_monthly",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
  },
  {
    id: "RL Easy Flow",
    fleetId: "app_vid_04",
    name: "RL Easy Flow",
    tagline: "Fluid Narrative & Ideology Accelerator",
    description: "Rapid newsletter curation, Substack editorial framing, social media hooks, and frictionless content publishing.",
    logoKey: "RL Easy Flow",
    defaultBadgeColor: "emerald",
    stripePlanPriceId: "price_rleasyflow_monthly",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
  },
  {
    id: "Omega App",
    fleetId: "app_omega_05",
    name: "Omega App",
    tagline: "Sovereign Covenant & Settlement Hub",
    description: "Central 50% Covenant treasury routing, federated cleanroom identity, and cross-fleet settlement gateway.",
    logoKey: "Omega App",
    defaultBadgeColor: "amber",
    stripePlanPriceId: "price_omega_covenant",
    appUrl: OMEGA_HUB_DEFAULT_URL,
    status: "Optimal",
    activationState: "ACTIVE",
  },
  {
    id: "RLMV Music Video Editor",
    fleetId: "app_rlmv_06",
    name: "RLMV Music Video Editor",
    tagline: "Ethical Music Video & Kinetic Timeline Studio",
    description: "Frame-accurate music video editor, audio-reactive shaders, and lyrical storyboard suite (FT-ETHIC-RLMV-VIDEO-2026).",
    logoKey: "RLMV Music Video Editor",
    defaultBadgeColor: "indigo",
    stripePlanPriceId: "price_rlmv_monthly",
    appUrl: "",
    status: "Unlinked",
    activationState: "PENDING",
    trackingCode: "FT-ETHIC-RLMV-VIDEO-2026",
  },
];

export const PRIMARY_OWNER_EMAIL = "codygermain032@gmail.com";

// Local storage key for custom uploaded logos
const LOGO_STORAGE_KEY = "tomecrafter_ecosystem_logos_v1";
const OWNER_ACCESS_KEY = "tomecrafter_owner_authenticated_v1";

export function getStoredLogos(): AppLogoRegistry {
  try {
    const raw = localStorage.getItem(LOGO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read stored logos:", e);
  }
  return {};
}

export function getEcosystemLogos(): AppLogoRegistry {
  return getStoredLogos();
}

export function saveStoredLogos(logos: AppLogoRegistry): void {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, JSON.stringify(logos));
  } catch (e) {
    console.error("Failed to save logos:", e);
  }
}

export function saveEcosystemLogo(appKey: string, logoUrl: string): void {
  const current = getStoredLogos();
  current[appKey] = logoUrl;
  saveStoredLogos(current);
}

export function removeEcosystemLogo(appKey: string): void {
  const current = getStoredLogos();
  delete current[appKey];
  saveStoredLogos(current);
}

export function isOwnerAuthenticated(): boolean {
  try {
    return localStorage.getItem(OWNER_ACCESS_KEY) === "true";
  } catch {
    return false;
  }
}

export function setOwnerAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      localStorage.setItem(OWNER_ACCESS_KEY, "true");
    } else {
      localStorage.removeItem(OWNER_ACCESS_KEY);
    }
  } catch {}
}

/**
 * High-fidelity SVG components rendered when custom uploaded images are not yet provided
 */
export const TomeCrafterVectorLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#06120e" />
    <path d="M25 35C40 30 60 40 60 40C60 40 80 30 95 35V85C80 80 60 90 60 90C60 90 40 80 25 85V35Z" stroke="#34d399" strokeWidth="3" strokeLinejoin="round" fill="#09261a" />
    {/* Fingerprint ridges inside open book */}
    <path d="M60 48C56 48 52 52 52 58C52 64 56 68 60 68C64 68 68 64 68 58C68 52 64 48 60 48Z" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 52C58 52 56 55 56 58C56 61 58 64 60 64C62 64 64 61 64 58C64 55 62 52 60 52Z" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" />
    <circle cx="60" cy="58" r="1.5" fill="#ecfdf5" />
    {/* Circuit traces */}
    <path d="M35 45L45 52M45 52V62L52 66" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="35" cy="45" r="2.5" fill="#34d399" />
    <circle cx="45" cy="62" r="2" fill="#34d399" />
    <path d="M85 45L75 52M75 52V62L68 66" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="85" cy="45" r="2.5" fill="#34d399" />
    <circle cx="75" cy="62" r="2" fill="#34d399" />
    <path d="M25 95H95" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
    <circle cx="25" cy="95" r="2.5" fill="#34d399" />
    <circle cx="95" cy="95" r="2.5" fill="#34d399" />
  </svg>
);

export const ForgeOSVectorLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#051017" />
    {/* Outer Gear */}
    <circle cx="60" cy="56" r="34" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="6 4" fill="#082230" />
    <circle cx="60" cy="56" r="26" stroke="#06b6d4" strokeWidth="2" />
    {/* Circuit Chip at bottom center */}
    <rect x="52" y="58" width="16" height="16" rx="3" fill="#0e3b43" stroke="#22d3ee" strokeWidth="1.8" />
    <circle cx="60" cy="66" r="3" fill="#67e8f9" />
    {/* Fingerprint / Wi-Fi arches above */}
    <path d="M46 48C50 42 70 42 74 48" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 52C53 47 67 47 70 52" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />
    <path d="M54 56C56 52 64 52 66 56" stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round" />
    {/* Traces */}
    <path d="M36 56H48M72 56H84M60 28V36M60 76V86" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="36" cy="56" r="2.5" fill="#38bdf8" />
    <circle cx="84" cy="56" r="2.5" fill="#38bdf8" />
    <circle cx="60" cy="28" r="2.5" fill="#38bdf8" />
  </svg>
);

export const RLMProStudioVectorLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#041214" />
    {/* Outer wavy audio ripple circle */}
    <circle cx="60" cy="56" r="36" stroke="#2dd4bf" strokeWidth="2" fill="#082626" />
    {/* Scalloped audio petal circle */}
    <path
      d="M60 26C65 26 68 30 73 31C78 32 82 30 86 34C90 38 88 42 89 47C90 52 94 55 94 60C94 65 90 68 89 73C88 78 90 82 86 86C82 90 78 88 73 89C68 90 65 94 60 94C55 94 52 90 47 89C42 88 38 90 34 86C30 82 32 78 31 73C30 68 26 65 26 60C26 55 30 52 31 47C32 42 30 38 34 34C38 30 42 32 47 31C52 30 55 26 60 26Z"
      stroke="#14b8a6"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Fingerprint + Node lattice */}
    <circle cx="60" cy="60" r="14" stroke="#5eead4" strokeWidth="1.8" />
    <path d="M55 58C57 55 63 55 65 58C66 61 64 64 60 65" stroke="#99f6e4" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="60" cy="46" r="2.5" fill="#5eead4" />
    <circle cx="72" cy="53" r="2.5" fill="#5eead4" />
    <circle cx="72" cy="67" r="2.5" fill="#5eead4" />
    <circle cx="60" cy="74" r="2.5" fill="#5eead4" />
    <circle cx="48" cy="67" r="2.5" fill="#5eead4" />
    <circle cx="48" cy="53" r="2.5" fill="#5eead4" />
  </svg>
);

export const RLEasyFlowVectorLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#071410" />
    {/* Fluid organic triangle track */}
    <path
      d="M36 38C44 26 76 26 84 38C92 50 88 74 76 84C64 94 44 90 34 78C24 66 28 50 36 38Z"
      stroke="#10b981"
      strokeWidth="3"
      fill="#0d281f"
      strokeLinejoin="round"
    />
    {/* Flowing node vertices */}
    <circle cx="36" cy="42" r="4" fill="#34d399" stroke="#059669" strokeWidth="1.5" />
    <circle cx="60" cy="30" r="4" fill="#34d399" stroke="#059669" strokeWidth="1.5" />
    <circle cx="36" cy="74" r="4" fill="#34d399" stroke="#059669" strokeWidth="1.5" />
    {/* Inner Fingerprint */}
    <path d="M58 48C52 48 48 53 48 60C48 67 52 72 58 72C64 72 68 67 68 60C68 53 64 48 58 48Z" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
    <path d="M58 53C54 53 52 56 52 60C52 64 54 67 58 67C62 67 64 64 64 60" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const OmegaAppVectorLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#140f06" />
    <circle cx="60" cy="58" r="36" stroke="#f59e0b" strokeWidth="2.5" fill="#211607" />
    <path
      d="M42 78H50V68C43 63 40 53 43 44C46 35 53 30 60 30C67 30 74 35 77 44C80 53 77 63 70 68V78H78"
      stroke="#fbbf24"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="60" cy="54" r="6" fill="#fde68a" />
  </svg>
);

export const RLMVVectorLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#0d0b1a" />
    <rect x="24" y="30" width="72" height="58" rx="12" stroke="#818cf8" strokeWidth="2.5" fill="#171330" />
    <path d="M52 47L74 59L52 71V47Z" fill="#a5b4fc" stroke="#c7d2fe" strokeWidth="2" strokeLinejoin="round" />
    <path d="M30 80H90" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
  </svg>
);

/**
 * Universal App Logo renderer that prioritizes:
 * 1. Custom uploaded logo from AppLogoRegistry / localStorage
 * 2. Vector artwork matching the official uploaded cyber-emerald branding
 */
export const AppLogo: React.FC<{
  app: TesterAppAccess;
  className?: string;
  customLogos?: AppLogoRegistry;
}> = ({ app, className = "w-10 h-10", customLogos }) => {
  const logos = customLogos || getStoredLogos();
  const customUrl = logos[app];

  if (customUrl) {
    return (
      <img
        src={customUrl}
        alt={`${app} logo`}
        className={`${className} object-contain rounded-xl border border-stone-800 bg-stone-950`}
        referrerPolicy="no-referrer"
      />
    );
  }

  switch (app) {
    case "TomeCrafter":
      return <TomeCrafterVectorLogo className={className} />;
    case "ForgeOS":
      return <ForgeOSVectorLogo className={className} />;
    case "RLM Pro Studio":
      return <RLMProStudioVectorLogo className={className} />;
    case "RL Easy Flow":
      return <RLEasyFlowVectorLogo className={className} />;
    case "Omega App":
      return <OmegaAppVectorLogo className={className} />;
    case "RLMV Music Video Editor":
      return <RLMVVectorLogo className={className} />;
    default:
      return <TomeCrafterVectorLogo className={className} />;
  }
};
