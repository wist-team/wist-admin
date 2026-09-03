import { HOSTS } from '../api/hosts';

/** Union of the keys seen in syft_thread_content across sender types. All optional. */
export interface ThreadContent {
  // user
  userResponse?: string;
  userImage?: string;
  syftVisionDescription?: string;
  adjustingHistoricMeal?: boolean;
  sendStatus?: string;
  // syft-bot
  syftResponse?: string;
  messageText?: string;
  apiVersion?: string | number;
  proactive?: boolean;
  proactiveRuleId?: string;
  structuredAssumptions?: unknown;
  actions?: unknown;
  // syft-data
  mealName?: string;
  message?: string;
  nutritionData?: unknown;
  nutritionDataNested?: unknown;
  symptomData?: unknown;
  assumptions?: unknown;
  per_meal_metrics?: unknown;
  userData?: unknown;
  alcoholUnits?: number;
  [key: string]: unknown;
}

export type ParsedContent =
  | { ok: true; content: ThreadContent }
  | { ok: false; raw: string | null; error: string };

export function parseThreadContent(raw: string | null | undefined): ParsedContent {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: false, raw: raw ?? null, error: 'empty' };
  }
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ok: true, content: value as ThreadContent };
    }
    return { ok: false, raw, error: 'not an object' };
  } catch (e) {
    return { ok: false, raw, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Build 26 rule: bare filenames live in the S3 bucket; absolute URLs pass through. */
export function mealImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${HOSTS.mealImages}/${image}`;
}

export function legacyMealImageUrl(image: string | null | undefined): string | null {
  if (!image || image.startsWith('http')) return null;
  return `${HOSTS.legacyImages}/${image}`;
}
