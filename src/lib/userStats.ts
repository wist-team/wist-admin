import type { AdminUser } from '../api/admin';
import { toNumber } from './number';

const DAY_MS = 86_400_000;

function utcDay(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor(t / DAY_MS) : null;
}

/**
 * Day-based stats derived on the client from `first_activity` and `days_active`.
 *
 * The server's `days_missed` / `missed_days_percentage` use DATEDIFF(CURDATE(), first),
 * which excludes today, so a user active every day shows "Days missed: -1". The span
 * here is inclusive of both the first day and today (in UTC, matching MariaDB's CURDATE
 * on the box). If the server is later fixed these numbers simply agree with it.
 */
export function deriveDayStats(user: AdminUser, now: Date = new Date()) {
  const first = user.first_activity ? utcDay(user.first_activity) : null;
  const today = Math.floor(now.getTime() / DAY_MS);
  if (first === null) return { span: null, daysMissed: null, missedPct: null, avgUserMsgPerDay: null };
  const span = Math.max(today - first + 1, 1);
  const active = Math.min(toNumber(user.days_active) ?? 0, span);
  const daysMissed = span - active;
  return {
    span,
    daysMissed,
    missedPct: (daysMissed / span) * 100,
    /** User-sent messages only; the server's avg_messages_per_day counts bot and data rows too. */
    avgUserMsgPerDay: (toNumber(user.user_message_count) ?? 0) / span,
  };
}
