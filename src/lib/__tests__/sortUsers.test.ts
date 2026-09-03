import type { AdminUser } from '../../api/admin';
import { sortUsers } from '../sortUsers';

function user(partial: Partial<AdminUser> & { idusers: number }): AdminUser {
  return {
    userEmail: `u${partial.idusers}@example.com`,
    userSub: 'sub',
    user_message_count: 0,
    user_meal_count: 1,
    liked_responses: 0,
    disliked_responses: 0,
    most_recent_activity: null,
    first_activity: null,
    days_since_first_message: 0,
    days_active: 0,
    days_missed: 0,
    missed_days_percentage: '0',
    avg_messages_per_day: '0',
    avg_syft_data_responses_per_day: '0',
    total_messages_per_day: '0',
    weekday_logs: 0,
    weekend_logs: 0,
    avg_weekday_logs: '0',
    avg_weekend_logs: '0',
    ...partial,
  };
}

const ids = (users: AdminUser[]) => users.map((u) => u.idusers);

describe('sortUsers', () => {
  it('sorts integer fields descending', () => {
    const list = [user({ idusers: 1, user_message_count: 5 }), user({ idusers: 2, user_message_count: 50 })];
    expect(ids(sortUsers(list, 'user_message_count'))).toEqual([2, 1]);
  });

  it('sorts decimal strings numerically, not lexicographically (build 26 bug)', () => {
    const list = [
      user({ idusers: 1, avg_syft_data_responses_per_day: '9.5' }),
      user({ idusers: 2, avg_syft_data_responses_per_day: '27.01' }),
    ];
    expect(ids(sortUsers(list, 'avg_syft_data_responses_per_day'))).toEqual([2, 1]);
  });

  it('Usage sorts ascending and pushes negative % and zero-meal users to the bottom', () => {
    const list = [
      user({ idusers: 1, missed_days_percentage: '40.00' }),
      user({ idusers: 2, missed_days_percentage: '-5.00' }),
      user({ idusers: 3, missed_days_percentage: '10.00', user_meal_count: 0 }),
      user({ idusers: 4, missed_days_percentage: '20.00' }),
    ];
    expect(ids(sortUsers(list, 'missed_days_percentage'))).toEqual([4, 1, 3, 2]);
  });

  it('Recent sorts by timestamp with nulls last', () => {
    const list = [
      user({ idusers: 1, most_recent_activity: null }),
      user({ idusers: 2, most_recent_activity: '2026-01-01T00:00:00.000Z' }),
      user({ idusers: 3, most_recent_activity: '2026-09-01T00:00:00.000Z' }),
    ];
    expect(ids(sortUsers(list, 'most_recent_activity'))).toEqual([3, 2, 1]);
  });

  it('does not mutate the input', () => {
    const list = [user({ idusers: 1, user_message_count: 1 }), user({ idusers: 2, user_message_count: 2 })];
    sortUsers(list, 'user_message_count');
    expect(ids(list)).toEqual([1, 2]);
  });
});
