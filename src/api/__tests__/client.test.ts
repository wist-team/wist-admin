import { env } from '../../config/env';
import { ApiError, apiFetch, apiJson, buildHeaders } from '../client';

const mutableEnv = env as { adminKey: string; portalKey: string };

describe('client', () => {
  beforeEach(() => {
    mutableEnv.adminKey = 'test-admin-key';
  });

  it('attaches the admin key and Accept header to every request', () => {
    const h = buildHeaders();
    expect(h.get('x-wist-proxy-key')).toBe('test-admin-key');
    expect(h.get('Accept')).toBe('application/json');
  });

  it('does not override an explicit key header', () => {
    const h = buildHeaders({ headers: { 'x-wist-proxy-key': 'other' } });
    expect(h.get('x-wist-proxy-key')).toBe('other');
  });

  it('omits the header when no key is configured', () => {
    mutableEnv.adminKey = '';
    expect(buildHeaders().has('x-wist-proxy-key')).toBe(false);
  });

  it('sends the header through fetch and parses JSON', async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    const data = await apiJson<{ ok: number }>('https://example.test/x', undefined, fetchImpl as unknown as typeof fetch);
    expect(data).toEqual({ ok: 1 });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Headers).get('x-wist-proxy-key')).toBe('test-admin-key');
  });

  it('throws ApiError with status and body on non-2xx', async () => {
    const fetchImpl = jest.fn(async () => new Response('forbidden', { status: 403 }));
    await expect(
      apiFetch('https://example.test/x', undefined, fetchImpl as unknown as typeof fetch),
    ).rejects.toMatchObject({ name: 'ApiError', status: 403, body: 'forbidden' } satisfies Partial<ApiError>);
  });
});
