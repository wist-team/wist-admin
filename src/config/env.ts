// EXPO_PUBLIC_* variables are inlined into the JS bundle at build/update time
// (EAS environment variables with "sensitive" visibility, or a local .env).
// They are deliberately baked in — see PLAN.md decisions 2 and 14.

export const env = {
  adminKey: process.env.EXPO_PUBLIC_WIST_ADMIN_KEY ?? '',
  /** Only needed by the Sensitivities segment (Release 2); optional until then. */
  portalKey: process.env.EXPO_PUBLIC_WIST_PORTAL_KEY ?? '',
} as const;

/** Keys the app cannot run without. Empty array means the build is configured. */
export function missingKeys(): string[] {
  return env.adminKey ? [] : ['EXPO_PUBLIC_WIST_ADMIN_KEY'];
}
