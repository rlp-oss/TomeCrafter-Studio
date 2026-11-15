import { FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";
import firebaseConfigJson from "../../firebase-applet-config.json";

const RECAPTCHA_SITE_KEY_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const PLACEHOLDER_KEY_PATTERNS = [
  /^MY_/i,
  /^YOUR_/i,
  /PLACEHOLDER/i,
  /EXAMPLE/i,
  /CHANGE_?ME/i,
  /REPLACE_?/i,
  /^TODO/i,
  /^ENTER_/i,
  /^INSERT_/i,
  /DUMMY/i,
  /FAKE/i,
];

export type AppCheckKeySource = "env" | "firebase-config" | "runtime-api" | "none";

export interface AppCheckConfigResolution {
  siteKey: string | null;
  source: AppCheckKeySource;
}

let appCheckInstance: AppCheck | null = null;
let inFlightInitPromise: Promise<AppCheck | null> | null = null;
let runtimeFetchAttempted = false;

/**
 * Validates and normalizes a reCAPTCHA v3 site key before passing it to Firebase App Check.
 * Rejects empty strings, unreplaced template placeholders, and malformed tokens.
 */
export function sanitizeRecaptchaSiteKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (!cleaned) return null;

  for (const pattern of PLACEHOLDER_KEY_PATTERNS) {
    if (pattern.test(cleaned)) {
      return null;
    }
  }

  if (!RECAPTCHA_SITE_KEY_PATTERN.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Resolves a validated site key from Vite build/dev environment variables
 * (`VITE_FIREBASE_APP_CHECK_SITE_KEY`) or Firebase applet config.
 */
export function resolveBuildTimeAppCheckConfig(): AppCheckConfigResolution {
  const envSiteKey = sanitizeRecaptchaSiteKey(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY);
  if (envSiteKey) {
    return { siteKey: envSiteKey, source: "env" };
  }

  const configSiteKey = sanitizeRecaptchaSiteKey(
    (firebaseConfigJson as Record<string, unknown>).recaptchaSiteKey
  );
  if (configSiteKey) {
    return { siteKey: configSiteKey, source: "firebase-config" };
  }

  return { siteKey: null, source: "none" };
}

/**
 * Fetches the public reCAPTCHA v3 site key from the server runtime environment
 * when secrets are injected after the Vite client bundle was built.
 */
export async function fetchRuntimeAppCheckSiteKey(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch("/api/firebase/app-check-config", {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { siteKey?: unknown } | null;
    return sanitizeRecaptchaSiteKey(payload?.siteKey);
  } catch (error) {
    console.warn("[AppCheck] Unable to fetch runtime App Check configuration:", error);
    return null;
  }
}

/**
 * Idempotently initializes Firebase App Check with ReCaptchaV3Provider if a valid key is available.
 * Never throws at boot if App Check is unconfigured or fails initialization.
 */
export function initializeFirebaseAppCheck(
  app: FirebaseApp,
  explicitSiteKey?: string | null
): AppCheck | null {
  if (typeof window === "undefined") return null;
  if (appCheckInstance) return appCheckInstance;

  const siteKey =
    explicitSiteKey !== undefined
      ? sanitizeRecaptchaSiteKey(explicitSiteKey)
      : resolveBuildTimeAppCheckConfig().siteKey;

  if (!siteKey) {
    return null;
  }

  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    return appCheckInstance;
  } catch (error) {
    console.warn("[AppCheck] Failed to initialize Firebase App Check:", error);
    return null;
  }
}

/**
 * Ensures Firebase App Check is initialized using either build-time env vars
 * or runtime server-injected environment variables (memoized singleton).
 */
export async function ensureFirebaseAppCheckInitialized(
  app: FirebaseApp
): Promise<AppCheck | null> {
  if (typeof window === "undefined") return null;
  if (appCheckInstance) return appCheckInstance;

  const syncInstance = initializeFirebaseAppCheck(app);
  if (syncInstance) return syncInstance;

  if (runtimeFetchAttempted) {
    return appCheckInstance;
  }

  if (!inFlightInitPromise) {
    inFlightInitPromise = (async () => {
      try {
        runtimeFetchAttempted = true;
        const runtimeSiteKey = await fetchRuntimeAppCheckSiteKey();
        if (!runtimeSiteKey) {
          return null;
        }
        return initializeFirebaseAppCheck(app, runtimeSiteKey);
      } finally {
        inFlightInitPromise = null;
      }
    })();
  }

  return inFlightInitPromise;
}
