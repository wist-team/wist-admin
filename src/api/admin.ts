import { apiFetch, apiJson } from './client';
import { HOSTS } from './hosts';

/**
 * Row from GET /admin/users (Node/adminapi.js on the box). MariaDB DECIMAL
 * columns arrive as strings; integers as numbers. Users with no messages can
 * have null activity dates because of the LEFT JOIN.
 */
export interface AdminUser {
  idusers: number;
  userEmail: string;
  userSub: string | null;
  user_message_count: number;
  user_meal_count: number;
  liked_responses: number;
  disliked_responses: number;
  most_recent_activity: string | null;
  first_activity: string | null;
  days_since_first_message: number | null;
  days_active: number;
  days_missed: number | null;
  missed_days_percentage: string | number | null;
  avg_messages_per_day: string | number | null;
  avg_syft_data_responses_per_day: string | number | null;
  total_messages_per_day: string | number | null;
  weekday_logs: number;
  weekend_logs: number;
  avg_weekday_logs: string | number | null;
  avg_weekend_logs: string | number | null;
}

export type SenderType = 'user' | 'syft-bot' | 'syft-data';

/** Raw syft_thread row from GET /admin/user/{id}/threads (newest first, max 150). */
export interface ThreadRow {
  syft_thread_id: number;
  syft_thread_idusers: number;
  syft_thread_sender_type: SenderType | string;
  syft_thread_content: string | null;
  syft_thread_image: string | null;
  syft_thread_rating: number | null;
  syft_thread_timestamp: string;
  syft_thread_devicetime: string | null;
  syft_thread_timezone_offset: number | null;
  syft_thread_timezone_region: string | null;
}

export function fetchUsers(): Promise<AdminUser[]> {
  return apiJson<AdminUser[]>(`${HOSTS.api}/admin/users`);
}

export function fetchUserThreads(idUser: number): Promise<ThreadRow[]> {
  return apiJson<ThreadRow[]>(`${HOSTS.api}/admin/user/${idUser}/threads`);
}

/** DELETE /v1/messages/{id} on the consumer API (syftAlphaAPI.js). Also removes an orphaned S3 image. */
export async function deleteMessage(threadId: number): Promise<void> {
  await apiFetch(`${HOSTS.api}/v1/messages/${threadId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
