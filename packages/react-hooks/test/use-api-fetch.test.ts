import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiFetch } from '../src/use-api-fetch';

describe('useApiFetch', () => {
  it('should start with idle state', () => {
    const { result } = renderHook(() => useApiFetch());
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch successfully with { code, data } format', async () => {
    const mockData = { id: 1, name: 'test' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: mockData }),
    });

    const { result } = renderHook(() => useApiFetch());

    await act(async () => {
      const data = await result.current.fetchApi('/api/test');
      expect(data).toEqual(mockData);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch successfully with { success, data } format', async () => {
    const mockData = { id: 1, name: 'test' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockData }),
    });

    const { result } = renderHook(() => useApiFetch());

    await act(async () => {
      const data = await result.current.fetchApi('/api/test');
      expect(data).toEqual(mockData);
    });
  });

  it('should handle HTTP errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    const { result } = renderHook(() => useApiFetch());

    await act(async () => {
      const data = await result.current.fetchApi('/api/not-found');
      expect(data).toBeNull();
    });

    expect(result.current.error).toContain('Not found');
    expect(result.current.loading).toBe(false);
  });

  it('should handle network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApiFetch());

    await act(async () => {
      const data = await result.current.fetchApi('/api/fail');
      expect(data).toBeNull();
    });

    expect(result.current.error).toBe('Network error');
  });
});
