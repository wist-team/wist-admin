import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

/** Build 26 used moment's "MMMM Do YYYY, h:mm:ss a". */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'MMMM do yyyy, h:mm:ss a') : iso;
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const d = parseISO(iso);
  return isValid(d) ? `${formatDistanceToNowStrict(d)} ago` : iso;
}
