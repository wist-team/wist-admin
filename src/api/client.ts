import { env } from '../config/env';
import { ADMIN_KEY_HEADER } from './hosts';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchLike = typeof fetch;

/**
 * Attaches the admin key to every request, regardless of host. Enforcement is
 * being rolled out service by service on the server; sending the key
 * everywhere from day one means no client change is needed when it lands.
 */
export function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (env.adminKey && !headers.has(ADMIN_KEY_HEADER)) {
    headers.set(ADMIN_KEY_HEADER, env.adminKey);
  }
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return headers;
}

export async function apiFetch(
  url: string,
  init?: RequestInit,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const response = await fetchImpl(url, { ...init, headers: buildHeaders(init) });
  if (!response.ok) {
    const body = await response.text().catch(() => undefined);
    throw new ApiError(`${init?.method ?? 'GET'} ${url} → ${response.status}`, response.status, url, body);
  }
  return response;
}

export async function apiJson<T>(url: string, init?: RequestInit, fetchImpl?: FetchLike): Promise<T> {
  const response = await apiFetch(url, init, fetchImpl);
  return (await response.json()) as T;
}
