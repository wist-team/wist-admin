import { legacyMealImageUrl, mealImageUrl, parseThreadContent } from '../threadContent';

describe('parseThreadContent', () => {
  it('parses a JSON object', () => {
    const r = parseThreadContent('{"userResponse":"hi","apiVersion":"3"}');
    expect(r.ok && r.content.userResponse).toBe('hi');
  });
  it('reports empty and invalid content without throwing', () => {
    expect(parseThreadContent(null)).toEqual({ ok: false, raw: null, error: 'empty' });
    expect(parseThreadContent('not json').ok).toBe(false);
    expect(parseThreadContent('[1,2]').ok).toBe(false);
  });
});

describe('mealImageUrl', () => {
  it('prefixes bare file names with the S3 bucket', () => {
    expect(mealImageUrl('abc.jpg')).toBe('https://wist-meal-images.s3.eu-west-1.amazonaws.com/abc.jpg');
  });
  it('passes absolute URLs through and returns null for nothing', () => {
    expect(mealImageUrl('https://x/y.png')).toBe('https://x/y.png');
    expect(mealImageUrl(undefined)).toBeNull();
    expect(mealImageUrl('')).toBeNull();
  });
  it('legacy fallback only applies to bare file names', () => {
    expect(legacyMealImageUrl('abc.jpg')).toBe('https://images.syfthealth.app/userimages/abc.jpg');
    expect(legacyMealImageUrl('https://x/y.png')).toBeNull();
  });
});
