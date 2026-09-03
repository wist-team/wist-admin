import type { AdminUser } from '../api/admin';
import { toNumber } from './number';

export type SortField =
  | 'user_message_count'
  | 'user_meal_count'
  | 'avg_syft_data_responses_per_day'
  | 'missed_days_percentage'
  | 'most_recent_activity'
  | 'idusers';

export const DEFAULT_SORT: SortField = 'user_message_count';

/** Sort buttons as shipped in build 26, in order. */
export const SORT_OPTIONS: ReadonlyArray<{ title: string; field: SortField }> = [
  { title: 'Total', field: 'user_message_count' },
  { title: 'Meals', field: 'user_meal_count' },
  { title: 'Daily Avg', field: 'avg_syft_data_responses_per_day' },
  { title: 'Usage', field: 'missed_days_percentage' },
  { title: 'Recent', field: 'most_recent_activity' },
  { title: 'ID', field: 'idusers' },
];

function key(user: AdminUser, field: SortField): number {
  if (field === 'most_recent_activity') {
    const t = user.most_recent_activity ? Date.parse(user.most_recent_activity) : NaN;
    return Number.isFinite(t) ? t : -Infinity;
  }
  return toNumber(user[field]) ?? -Infinity;
}

/**
 * Port of build 26 `sortUsers`. Every field sorts descending except Usage
 * (missed-days percentage), which sorts ascending and pushes users with a
 * negative percentage or zero meals to the bottom.
 *
 * Deliberate fix versus build 26: decimal fields arrive as strings and were
 * compared lexicographically there ("9.5" > "27.01"); here they are numeric.
 */
export function compareUsers(field: SortField) {
  return (a: AdminUser, b: AdminUser): number => {
    if (field === 'missed_days_percentage') {
      const am = toNumber(a.missed_days_percentage) ?? -1;
      const bm = toNumber(b.missed_days_percentage) ?? -1;
      if (am < 0 && bm >= 0) return 1;
      if (am >= 0 && bm < 0) return -1;
      if (a.user_meal_count === 0 && b.user_meal_count !== 0) return 1;
      if (a.user_meal_count !== 0 && b.user_meal_count === 0) return -1;
      return am - bm;
    }
    return key(b, field) - key(a, field);
  };
}

export function sortUsers(users: AdminUser[], field: SortField): AdminUser[] {
  return [...users].sort(compareUsers(field));
}
