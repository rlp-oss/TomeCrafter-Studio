// Zero-Cost Local Mode: Firebase App Check & reCAPTCHA network calls disabled.

export type AppCheckKeySource = "env" | "firebase-config" | "runtime-api" | "none";

export interface AppCheckConfigResolution {
  siteKey: string | null;
  source: AppCheckKeySource;
}

export function sanitizeRecaptchaSiteKey(_raw: unknown): string | null {
  return null;
}

export function resolveBuildTimeAppCheckConfig(): AppCheckConfigResolution {
  return { siteKey: null, source: "none" };
}

export async function fetchRuntimeAppCheckSiteKey(): Promise<string | null> {
  return null;
}

export function initializeFirebaseAppCheck(
  _app?: unknown,
  _explicitSiteKey?: string | null
): null {
  return null;
}

export async function ensureFirebaseAppCheckInitialized(
  _app?: unknown
): Promise<null> {
  return null;
}
