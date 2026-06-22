import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncState } from '../src/use-async-state';

describe('useAsyncState', () => {
  it('should return initial state', () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => useAsyncState(fetcher, { items: [] }));

    expect(result.current.data).toEqual({ items: [] });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should set loading while executing', async () => {
    const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useAsyncState(fetcher));

    act(() => { result.current.execute(); });
    expect(result.current.loading).toBe(true);
  });

  it('should return data on success', async () => {
    const fetcher = vi.fn().mockResolvedValue('success data');
    const { result } = renderHook(() => useAsyncState(fetcher));

    let data: string | null = null;
    await act(async () => {
      data = await result.current.execute();
    });

    expect(data).toBe('success data');
    expect(result.current.data).toBe('success data');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors gracefully', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useAsyncState(fetcher));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBe('API error');
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });
});
