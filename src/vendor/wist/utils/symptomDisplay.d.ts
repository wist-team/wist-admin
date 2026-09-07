// Hand-written types for the vendored user-app helper (symptomDisplay.js). Keep in step with it.

export interface SymptomEntry {
  key: string;
  label: string;
  severity: number | null;
  trend: 'worse' | 'improved' | 'resolved' | 'absent' | string | null;
}

export interface PolarityColor {
  bar: string;
  bg: string;
  fg: string;
}

export const SYMPTOM_CATALOG: Record<string, string>;
export const LEGACY_SYMPTOM_CATALOG: Record<string, string>;
export const POLARITY_COLORS: Record<'negative' | 'positive' | 'neutral', PolarityColor>;

export function symptomDisplayLabel(key: string): string;
export function severityLabel(severity: number | null | undefined): string;
export function polarityDescriptor(polarity: unknown): { kind: 'negative' | 'positive' | 'neutral'; label: string; arrow: string };
export function polarityColors(polarity: unknown): PolarityColor;
export function extractSymptomEntries(symptomData: unknown): SymptomEntry[];
export function hasSymptom(symptomData: unknown): boolean;
export function isAllClearLog(symptomData: unknown): boolean;
export function hasSymptomCard(symptomData: unknown): boolean;
export function isAllClearReport(symptomData: unknown): boolean;
export function symptomCardTitle(symptomData: unknown): string;
export function symptomSummary(symptomData: unknown): string;
export function symptomCardDetail(symptomData: unknown): string;
