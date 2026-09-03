// EXPO_PUBLIC_* variables are inlined into the JS bundle at build/update time
// (EAS environment variables with "sensitive" visibility, or a local .env).
// They are deliberately baked in — see PLAN.md decisions 2 and 14.

export const env = {
  adminKey: process.env.EXPO_PUBLIC_WIST_ADMIN_KEY ?? '',
  portalKey: process.env.EXPO_PUBLIC_WIST_PORTAL_KEY ?? '',
} as const;

/** Names of keys that are missing or empty. Empty array means the build is configured. */
export function missingKeys(): string[] {
  const missing: string[] = [];
  if (!env.adminKey) missing.push('EXPO_PUBLIC_WIST_ADMIN_KEY');
  if (!env.portalKey) missing.push('EXPO_PUBLIC_WIST_PORTAL_KEY');
  return missing;
}
