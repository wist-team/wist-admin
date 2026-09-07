import type { AdminUser } from '../../api/admin';
import { deriveDayStats } from '../userStats';

const base = {
  idusers: 1,
  userEmail: 'a@b',
  userSub: 's',
  user_message_count: 0,
  user_meal_count: 0,
  liked_responses: 0,
  disliked_responses: 0,
  most_recent_activity: null,
  days_since_first_message: 0,
  days_missed: 0,
  missed_days_percentage: '0',
  avg_messages_per_day: '0',
  avg_syft_data_responses_per_day: '0',
  total_messages_per_day: '0',
  weekday_logs: 0,
  weekend_logs: 0,
  avg_weekday_logs: '0',
  avg_weekend_logs: '0',
} satisfies Partial<AdminUser>;

const now = new Date('2026-09-07T12:00:00Z');

describe('deriveDayStats', () => {
  it('counts the span inclusively so a user active every day has 0 missed, not -1', () => {
    // First message 460 days before today → 461 calendar days including both ends.
    const first = new Date(now.getTime() - 460 * 86_400_000).toISOString();
    const s = deriveDayStats({ ...base, first_activity: first, days_active: 461 }, now);
    expect(s.span).toBe(461);
    expect(s.daysMissed).toBe(0);
    expect(s.missedPct).toBe(0);
  });

  it('computes missed days and percentage', () => {
    const first = new Date(now.getTime() - 99 * 86_400_000).toISOString();
    const s = deriveDayStats({ ...base, first_activity: first, days_active: 75, user_message_count: 250 }, now);
    expect(s.span).toBe(100);
    expect(s.daysMissed).toBe(25);
    expect(s.missedPct).toBe(25);
    expect(s.avgUserMsgPerDay).toBe(2.5);
  });

  it('handles a user with no activity', () => {
    expect(deriveDayStats({ ...base, first_activity: null, days_active: 0 }, now)).toEqual({
      span: null,
      daysMissed: null,
      missedPct: null,
      avgUserMsgPerDay: null,
    });
  });
});
