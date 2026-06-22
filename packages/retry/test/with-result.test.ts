import { describe, it, expect, vi } from 'vitest'
import { retryResult, withRetry } from '../src/with-result.js'
import { ok, err } from '@h1s97x/result'

describe('retryResult', () => {
  it('returns Ok on success', async () => {
    const fn = vi.fn().mockResolvedValue(42)
    const result = await retryResult(fn, { maxAttempts: 3, baseDelay: 1, jitter: 'none' })
    expect(result.isOk()).toBe(true)
    expect(result.unwrap()).toBe(42)
  })

  it('returns Err after all attempts fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const result = await retryResult(fn, { maxAttempts: 2, baseDelay: 1, jitter: 'none' })
    expect(result.isErr()).toBe(true)
  })

  it('returns Ok when retry succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')
    const result = await retryResult(fn, { maxAttempts: 2, baseDelay: 1, jitter: 'none' })
    expect(result.isOk()).toBe(true)
    expect(result.unwrap()).toBe('success')
  })
})

describe('withRetry', () => {
  it('wraps function with retry logic', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')
    const wrapped = withRetry(fn, { maxAttempts: 2, baseDelay: 1, jitter: 'none' })
    const result = await wrapped()
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('returns Result when used with retryResult', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(42)
    const result = await retryResult(fn, { maxAttempts: 2, baseDelay: 1, jitter: 'none' })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe(42)
    }
  })
})
