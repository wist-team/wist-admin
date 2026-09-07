import {
  hasSymptomCard,
  polarityColors,
  symptomCardDetail,
  symptomCardTitle,
} from '../wist/utils/symptomDisplay';

// Shapes taken from real syft-data rows (see PLAN.md gotchas).
const negative = {
  symptom_polarity: 'negative',
  response: "I've logged your mild constipation.",
  symptoms: { constipation: { severity: 1, trend: null, duration: null } },
};
const resolved = {
  symptom_polarity: 'positive',
  symptoms: {
    constipation: { severity: 0, trend: 'resolved', duration: null },
    bloating_gas: { severity: 0, trend: 'absent', duration: null, inferred: true },
  },
};

describe('vendored symptomDisplay', () => {
  it('titles and colours a negative log red', () => {
    expect(symptomCardTitle(negative)).toBe('Symptom logged');
    expect(symptomCardDetail(negative)).toBe('Constipation (Mild)');
    expect(polarityColors(negative.symptom_polarity).fg).toBe('#F47676');
  });
  it('titles a resolution green and hides inferred entries', () => {
    expect(symptomCardTitle(resolved)).toBe('Symptom resolved');
    expect(symptomCardDetail(resolved)).toBe('Constipation');
    expect(polarityColors(resolved.symptom_polarity).fg).toBe('#3E9D64');
  });
  it('does not treat a meal row with empty symptomData as a symptom card', () => {
    expect(hasSymptomCard({})).toBe(false);
    expect(hasSymptomCard(undefined)).toBe(false);
  });
});
