// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiGet,
  apiPost,
  apiDelete,
  apiClient,
  buildUrl,
  ApiError,
} from '../src/client';

describe('apiGet', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    // Mock cookie
    Object.defineProperty(document, 'cookie', {
      value: 'auth_token=test-token; other=val',
      configurable: true,
    });
  });

  it('should fetch with GET and return data on success', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ code: 200, data: { id: 1 } })),
    });

    const result = await apiGet('/api/test');
    expect(result).toEqual({ id: 1 });
  });

  it('should handle new format errors', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ code: 400, message: 'Bad request' })),
    });

    await expect(apiGet('/api/test')).rejects.toThrow('Bad request');
  });

  it('should handle old format responses', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true, data: 'ok' })),
    });

    const result = await apiGet('/api/test');
    expect(result).toBe('ok');
  });

  it('should include auth token in headers', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ code: 200, data: null })),
    });

    await apiGet('/api/test');
    const callHeaders = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(callHeaders['Authorization']).toBe('Bearer test-token');
  });

  it('should set Content-Type as application/json', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ code: 200, data: null })),
    });

    await apiGet('/api/test');
    const callHeaders = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(callHeaders['Content-Type']).toBe('application/json');
  });

  it('should throw ApiError on timeout', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
    );

    await expect(apiGet('/api/test', { timeout: 1 })).rejects.toThrow(ApiError);
    await expect(apiGet('/api/test', { timeout: 1 })).rejects.toThrow('Request timeout');
  });
});

describe('apiPost', () => {
  it('should send JSON body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ code: 200, data: 'created' })),
    });

    const body = { name: 'test' };
    await apiPost('/api/test', body);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual(body);
  });
});

describe('apiDelete', () => {
  it('should use DELETE method', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ code: 200, data: null })),
    });

    await apiDelete('/api/test/1');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].method).toBe('DELETE');
  });
});

describe('buildUrl', () => {
  it('should return base URL if no params', () => {
    expect(buildUrl('/api/test')).toBe('/api/test');
  });

  it('should append query parameters', () => {
    const url = buildUrl('/api/test', { page: 1, limit: 20 });
    expect(url).toBe('/api/test?page=1&limit=20');
  });

  it('should filter out undefined values', () => {
    const url = buildUrl('/api/test', { page: 1, q: undefined as unknown as string });
    expect(url).toBe('/api/test?page=1');
  });
});

describe('apiClient', () => {
  it('should export convenience object', () => {
    expect(apiClient.get).toBe(apiGet);
    expect(apiClient.post).toBe(apiPost);
    expect(apiClient.buildUrl).toBe(buildUrl);
  });
});
