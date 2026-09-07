// Display helpers for symptomData, shape-agnostic across the symptom-engine
// update. Handles BOTH:
//   new: { symptoms: { bloating_gas: {severity, trend, duration} | null, ...,
//                      other: [{label, severity, ...}] | null }, ... }
//   old: { symptom_type: "...", severity_label: "Mild"/"None", severity_grade }
//
// SYMPTOM_CATALOG mirrors lambda/Symptom-Engine/prompts/symptom_catalog.yaml —
// keep in sync when the canonical taxonomy changes. The 2026-07 taxonomy split
// took this from 17 keys to 21, separating four merged pairs:
//   runny_nose_congestion -> runny_nose + congestion
//   hot_flush_redness     -> hot_flush + redness
//   nausea_reflux         -> nausea + acid_reflux
//   eczema_dry_patches    -> eczema + dry_skin
// Until now this file still held the pre-split 17, so the new keys fell through
// to prettifyKey() and rendered from their raw identifiers.

export const SYMPTOM_CATALOG = {
  headache_migraine: "Headache / Migraine",
  runny_nose: "Runny Nose",
  congestion: "Congestion",
  hot_flush: "Hot Flush",
  redness: "Redness",
  heart_palpitations_jitters: "Heart Palpitations / Jitters",
  constipation: "Constipation",
  bloating_gas: "Bloating & Gas",
  stomach_pain_cramps: "Stomach Pain / Cramps",
  diarrhea_loose_stools: "Diarrhea / Loose Stools",
  fatigue_energy_crash: "Fatigue / Energy Crash",
  nausea: "Nausea",
  acid_reflux: "Acid Reflux",
  anxiety: "Anxiety",
  skin_breakouts_acne: "Skin Breakouts / Acne",
  hives_itchy_welts: "Hives / Itchy Welts",
  eczema: "Eczema",
  dry_skin: "Dry Skin",
  joint_pain: "Joint Pain",
  mouth_itching_tingling: "Mouth Itching / Tingling",
  brain_fog: "Brain Fog",
};

// Retired keys. Never emitted any more, but rows logged before the split still
// carry them, so History must keep resolving them. Mirrors `legacy_symptoms` in
// the backend catalog.
export const LEGACY_SYMPTOM_CATALOG = {
  runny_nose_congestion: "Runny Nose / Congestion",
  hot_flush_redness: "Hot Flush / Redness",
  nausea_reflux: "Nausea / Reflux",
  eczema_dry_patches: "Eczema / Dry Patches",
};

// Structural fields on a `symptoms` dict that are not symptom entries. The
// backend strips `no_symptoms` before storage, but it must never be treated as
// a key here: `value == null` is FALSE for `false` in JavaScript, so a
// `no_symptoms: false` that ever reached the app would render as its own chip.
const NON_SYMPTOM_KEYS = new Set(["other", "no_symptoms"]);

const SEVERITY_LABELS = { 1: "Mild", 2: "Moderate", 3: "Severe" };

function capitalize(s) {
  return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "";
}

function prettifyKey(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function symptomDisplayLabel(key) {
  return SYMPTOM_CATALOG[key] || LEGACY_SYMPTOM_CATALOG[key] || prettifyKey(key);
}

export function severityLabel(severity) {
  return SEVERITY_LABELS[severity] || "";
}

// Semantic descriptor for symptom_polarity — this just normalises the value into
// label/arrow/kind. Use polarityColors() below for the red/green/grey treatment.
export function polarityDescriptor(polarity) {
  const p = String(polarity || "").toLowerCase();
  if (p === "negative") return { kind: "negative", label: "Negative", arrow: "↓" };
  if (p === "positive") return { kind: "positive", label: "Positive", arrow: "↑" };
  return { kind: "neutral", label: "Symptom", arrow: "" };
}

// Red/green/grey colour treatment for symptom polarity, shared by the chat
// symptom card and the History symptom card so they stay consistent. Negative =
// coral/red, positive = green, neutral/unknown = grey. `bar` = accent bar,
// `bg` = card tint, `fg` = title/text accent.
export const POLARITY_COLORS = {
  negative: { bar: "#F47676", bg: "rgba(244, 118, 118, 0.1)", fg: "#F47676" },
  positive: { bar: "#3E9D64", bg: "rgba(125, 201, 150, 0.15)", fg: "#3E9D64" },
  neutral: { bar: "#938E8C", bg: "rgba(147, 142, 140, 0.1)", fg: "#787777" },
};

export function polarityColors(polarity) {
  return POLARITY_COLORS[polarityDescriptor(polarity).kind] || POLARITY_COLORS.neutral;
}

function severityFromLabel(label) {
  if (!label) return null;
  return { mild: 1, moderate: 2, severe: 3 }[String(label).toLowerCase()] ?? null;
}

// Normalised list of reported symptoms:
// [{ key, label, severity (1-3|0|null), trend ("worse"|"improved"|"resolved"|
// "absent"|null) }]. `trend` is what lets the card distinguish a symptom that
// has GONE from one that is present — see symptomCardTitle.
export function extractSymptomEntries(symptomData) {
  if (!symptomData) return [];

  // New nested shape.
  const symptoms = symptomData.symptoms;
  if (symptoms && typeof symptoms === "object") {
    const entries = [];
    for (const [key, value] of Object.entries(symptoms)) {
      if (NON_SYMPTOM_KEYS.has(key) || value == null) continue;
      // `inferred` entries were added by the backend when it expanded a
      // blanket check-in all-clear across the user's symptom history — the
      // user never named them. They are real evidence for the sensitivity
      // engine, but naming them back to someone who typed "fine" would read
      // as a symptom report they never made. Only what the USER said is shown.
      if (value.inferred) continue;
      entries.push({
        key,
        label: symptomDisplayLabel(key),
        severity: value.severity ?? null,
        trend: value.trend ?? null,
      });
    }
    for (const other of symptoms.other || []) {
      if (!other || !other.label) continue;
      entries.push({
        key: "other",
        label: capitalize(other.label),
        severity: other.severity ?? null,
        trend: other.trend ?? null,
      });
    }
    return entries;
  }

  // Old flat shape.
  if (symptomData.symptom_type) {
    const severity = severityFromLabel(symptomData.severity_label) ?? symptomData.severity_grade ?? null;
    return [{
      key: symptomData.symptom_type,
      label: capitalize(symptomData.symptom_type),
      severity,
      trend: null,
    }];
  }

  return [];
}

// True if there's at least one reported symptom (either shape).
export function hasSymptom(symptomData) {
  return extractSymptomEntries(symptomData).length > 0;
}

// True for an all-clear log: a v2 `symptoms` object that reports nothing.
// "I have no symptoms right now" is a real report the user expects to see
// recorded, so it earns a card of its own.
//
// The `symptoms` object must be PRESENT — that is what separates "a log that
// reports nothing" from "not a symptom log at all". Every meal row carries
// `symptomData: {}`, and treating those as all-clears would put a card on
// every meal.
export function isAllClearLog(symptomData) {
  if (!symptomData || typeof symptomData !== "object") return false;
  const symptoms = symptomData.symptoms;
  if (!symptoms || typeof symptoms !== "object") return false;
  if (symptoms.no_symptoms) return true;
  return extractSymptomEntries(symptomData).length === 0;
}

// True if this row should render a symptom card at all — a reported symptom,
// or an all-clear.
export function hasSymptomCard(symptomData) {
  return hasSymptom(symptomData) || isAllClearLog(symptomData);
}

// Card heading describing what the log actually says — "Symptom Logged" was
// hardcoded, so a symptom the user reported as GONE still read "Symptom
// Logged: Stomach Pain / Cramps" on a green card, which scans as a fresh
// complaint.
//
// `severity: 0` means "not present right now"; `trend` says why:
//   resolved — they HAD it and it has gone
//   absent   — it was not there in the first place (e.g. a "fine" reply to a
//              check-in about a symptom they had not reported)
// The two must not share copy: "Symptom resolved" over an `absent` entry would
// claim a recovery that never happened.
//
// isActiveEntry MUST stay in step with the backend's symptom_polarity
// (Symptom-Engine schemas/symptom_schemas.py), which drives the card colour.
// Same predicate on both sides is what stops the heading disagreeing with the
// red/green treatment around it.
function isActiveEntry(entry) {
  if (entry.severity != null) return entry.severity >= 1;
  // A comparative report ("getting worse") carries no intensity word, so
  // severity comes back unset — the trend is the only signal that the symptom
  // is present and deteriorating.
  return entry.trend === "worse";
}

// True when the log says nothing is wrong — either no entries at all, or
// every entry is a symptom reported as not present. A blanket check-in reply
// lands here: the backend expands "fine" into one `absent` entry per symptom
// in the user's history, so this is routinely several entries all saying the
// same thing.
export function isAllClearReport(symptomData) {
  const entries = extractSymptomEntries(symptomData);
  if (entries.length === 0) return true;
  return entries.every((e) => e.severity === 0 && e.trend === "absent");
}

export function symptomCardTitle(symptomData) {
  const entries = extractSymptomEntries(symptomData);
  // An all-clear naming no symptom at all ("I have no symptoms right now")
  // and one anchored to specific symptoms (a "fine" reply expanded across the
  // user's profile) are the same statement at different resolutions — both
  // read "All clear", matching the push notification title for the event.
  if (isAllClearReport(symptomData)) return "All clear";

  // Anything currently being felt takes precedence — these are the red cards.
  if (entries.some(isActiveEntry)) return "Symptom logged";

  const trends = entries.map((e) => e.trend);
  if (trends.some((t) => t === "resolved")) return "Symptom resolved";
  if (trends.some((t) => t === "improved")) return "Symptom improving";

  // Entries with neither severity nor a recognised trend — nothing better to say.
  return "Symptom logged";
}

// "Bloating & Gas (Mild), Brain Fog" — joins all reported symptoms with
// severity. An all-clear names nothing, so it gets its own line rather than
// an empty string, which is what rendered as a blank card.
export function symptomSummary(symptomData) {
  const summary = extractSymptomEntries(symptomData)
    .map((e) => {
      const sev = severityLabel(e.severity);
      return sev ? `${e.label} (${sev})` : e.label;
    })
    .join(", ");

  if (summary) return summary;
  return isAllClearLog(symptomData) ? "No symptoms reported" : "";
}

// Detail line for the CHAT card specifically.
//
// An all-clear is collapsed to a single line rather than listing the symptoms
// it cleared. A blanket "fine" expands server-side into one `absent` entry per
// symptom in the user's history, so the listing form put the symptom NOUNS in
// front of the user while only the heading carried the negation — "All clear /
// Headache / Migraine, Bloating & Gas, Fatigue / Energy Crash" scans as three
// symptoms logged. It also grew a one-word reply into three wrapped lines.
//
// History keeps the full list via symptomSummary/extractSymptomEntries, where
// a stacked per-symptom layout reads properly, and the stored data and the
// per-symptom ClearEvents sent to the sensitivity engine are unaffected — this
// is a rendering choice, not a change to what is recorded.
export function symptomCardDetail(symptomData) {
  if (isAllClearReport(symptomData)) return "No symptoms reported";
  return symptomSummary(symptomData);
}
