/**
 * Port of build 26's NutritionDataTable data shaping (recovered/build26/decompiled.js ~338035).
 *
 * `nutritionDataNested` is a tree: { "Dish name": { "Ingredient": { quantity, nutrition, assumptions }, ... } }.
 * A node with a `nutrition` object is an ingredient; any other object is a heading whose
 * children are indented one level. Macro values are per 100 g and scaled by `quantity`.
 */

export const MACROS = ['Kcals', 'Carbs', 'Protein', 'Fat', 'Fibre'] as const;
export type Macro = (typeof MACROS)[number];
export type MacroTotals = Record<Macro, number>;

export interface IngredientRow {
  isHeading: false;
  name: string;
  depth: number;
  quantity: number;
  macros: MacroTotals;
}

export interface HeadingRow {
  isHeading: true;
  name: string;
  depth: number;
}

export type NutritionRow = IngredientRow | HeadingRow;

export interface NutritionSummary {
  rows: NutritionRow[];
  totals: MacroTotals & { quantity: number };
  allAssumptions: string[];
}

type Node = Record<string, unknown>;

function isObject(v: unknown): v is Node {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function collectAssumptions(value: unknown, into: string[]): void {
  if (typeof value === 'string') {
    if (value.trim()) into.push(value.trim());
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectAssumptions(v, into));
  } else if (isObject(value)) {
    Object.values(value).forEach((v) => collectAssumptions(v, into));
  }
  // booleans/numbers/null are ignored, as in build 26
}

export function summariseNutrition(
  nested: unknown,
  flat?: unknown,
  mealAssumptions?: unknown,
): NutritionSummary | null {
  const source = isObject(nested) && Object.keys(nested).length > 0 ? nested : isObject(flat) ? flat : null;
  if (!source || Object.keys(source).length === 0) return null;

  const rows: NutritionRow[] = [];
  const totals = { quantity: 0, Kcals: 0, Carbs: 0, Protein: 0, Fat: 0, Fibre: 0 };
  const allAssumptions: string[] = [];

  const traverse = (node: Node, depth: number) => {
    for (const [name, value] of Object.entries(node)) {
      if (!isObject(value)) continue;
      if (isObject(value.nutrition)) {
        const quantity = num(value.quantity);
        const n = value.nutrition;
        const macros = {
          Kcals: (num(n.Kcals) * quantity) / 100,
          Carbs: (num(n.Carbs) * quantity) / 100,
          Protein: (num(n.Protein) * quantity) / 100,
          Fat: (num(n.Fat) * quantity) / 100,
          Fibre: (num(n.Fibre) * quantity) / 100,
        };
        rows.push({ isHeading: false, name, depth, quantity, macros });
        totals.quantity += quantity;
        for (const m of MACROS) totals[m] += macros[m];
        collectAssumptions(value.assumptions, allAssumptions);
      } else {
        rows.push({ isHeading: true, name, depth });
        traverse(value, depth + 1);
      }
    }
  };

  traverse(source, 0);
  collectAssumptions(mealAssumptions, allAssumptions);
  return { rows, totals, allAssumptions };
}
