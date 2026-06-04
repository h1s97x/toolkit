import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useDebounce,
  useDebouncedSearch,
  useDebouncedFilters,
  useDebouncedCallback,
} from '../src/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )

    rerender({ value: 'world' })
    expect(result.current).toBe('hello')

    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('world')
  })

  it('should not emit intermediate values with rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })
    act(() => { vi.advanceTimersByTime(100) })
    rerender({ value: 'c' })
    act(() => { vi.advanceTimersByTime(100) })
    rerender({ value: 'd' })

    expect(result.current).toBe('a')

    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('d')
  })
})

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial search term', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial', 500))
    expect(result.current.searchTerm).toBe('initial')
    expect(result.current.debouncedSearch).toBe('initial')
  })

  it('should debounce search term', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 500))

    act(() => { result.current.setSearchTerm('query') })
    expect(result.current.searchTerm).toBe('query')
    expect(result.current.debouncedSearch).toBe('')

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.debouncedSearch).toBe('query')
  })

  it('should clear search', () => {
    const { result } = renderHook(() => useDebouncedSearch('test', 500))

    act(() => { result.current.clearSearch() })
    expect(result.current.searchTerm).toBe('')
    expect(result.current.debouncedSearch).toBe('test')

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.debouncedSearch).toBe('')
  })
})

describe('useDebouncedFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial filters', () => {
    const { result } = renderHook(() =>
      useDebouncedFilters({ search: '', status: 'all' }, ['search'], 300)
    )
    expect(result.current.filters).toEqual({ search: '', status: 'all' })
  })

  it('should not debounce immediate keys', () => {
    const { result } = renderHook(() =>
      useDebouncedFilters({ search: '', status: 'all' }, ['search'], 5000)
    )

    act(() => { result.current.setFilter('status', 'active') })
    // status is not in debounceKeys — debouncedFilters reflects it immediately
    expect(result.current.debouncedFilters.status).toBe('active')
  })

  it('should keep debounced filters in sync', () => {
    const { result } = renderHook(() =>
      useDebouncedFilters({ search: '', status: 'all' }, ['search'], 300)
    )

    act(() => { result.current.setFilter('search', 'hello') })
    act(() => { result.current.setFilter('status', 'active') })

    // debouncedFilters inherits from filters initially
    expect(result.current.debouncedFilters.search).toBe('hello')
    expect(result.current.debouncedFilters.status).toBe('active')

    // After debounce window, committed values are stable
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current.debouncedFilters.search).toBe('hello')
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce function calls', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(fn, 300))

    result.current('a')
    result.current('b')
    result.current('c')

    expect(fn).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(300) })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })
})
