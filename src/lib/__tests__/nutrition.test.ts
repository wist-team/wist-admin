import { summariseNutrition } from '../nutrition';

const egg = { quantity: 50, nutrition: { Kcals: 200, Carbs: 1, Protein: 14, Fat: 15, Fibre: 0 }, assumptions: 'One large egg.' };
const toast = { quantity: 40, nutrition: { Kcals: 250, Carbs: 50, Protein: 10, Fat: 2, Fibre: 2.5 }, assumptions: '' };

describe('summariseNutrition', () => {
  it('flattens a nested meal into heading and ingredient rows, scaled per 100g', () => {
    const s = summariseNutrition({ 'Egg on toast': { Egg: egg, Toast: toast } });
    expect(s).not.toBeNull();
    expect(s!.rows.map((r) => [r.name, r.depth, r.isHeading])).toEqual([
      ['Egg on toast', 0, true],
      ['Egg', 1, false],
      ['Toast', 1, false],
    ]);
    const eggRow = s!.rows[1];
    expect(eggRow.isHeading).toBe(false);
    if (!eggRow.isHeading) expect(eggRow.macros.Kcals).toBe(100);
    expect(s!.totals.Kcals).toBe(200);
    expect(s!.totals.quantity).toBe(90);
    expect(s!.totals.Fibre).toBe(1);
  });

  it('collects non-empty assumption strings, arrays and objects', () => {
    const s = summariseNutrition(
      { Meal: { Egg: egg, Sauce: { ...toast, assumptions: ['a', 'b'] }, Salad: { ...toast, assumptions: { x: 'c' } } } },
      undefined,
      'meal-level note',
    );
    expect(s!.allAssumptions).toEqual(['One large egg.', 'a', 'b', 'c', 'meal-level note']);
  });

  it('falls back to the flat structure and returns null for nothing', () => {
    expect(summariseNutrition({}, { Egg: egg })!.rows).toHaveLength(1);
    expect(summariseNutrition({}, {})).toBeNull();
    expect(summariseNutrition(undefined, undefined)).toBeNull();
  });
});
