import { describe, it, expect, vi } from 'vitest'
import { retry, retrySync, createRetryer } from '../src/retry.js'

describe('retry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await retry(fn, { maxAttempts: 3, baseDelay: 1, jitter: 'none' })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    const result = await retry(fn, { maxAttempts: 3, baseDelay: 1, jitter: 'none' })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max attempts exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await expect(
      retry(fn, { maxAttempts: 2, baseDelay: 1, jitter: 'none' })
    ).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('respects shouldRetry condition', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal'))
    const shouldRetry = vi.fn().mockReturnValue(false)

    await expect(
      retry(fn, { shouldRetry, baseDelay: 1, jitter: 'none' })
    ).rejects.toThrow('fatal')
    expect(fn).toHaveBeenCalledTimes(1) // No retries
  })

  it('calls onRetry before each retry', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')
    const onRetry = vi.fn()

    await retry(fn, { maxAttempts: 2, baseDelay: 1, jitter: 'none', onRetry })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number))
  })

  it('applies fixed backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const result = await retry(fn, { maxAttempts: 2, baseDelay: 10, backoff: 'fixed', jitter: 'none' })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('applies linear backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const result = await retry(fn, { maxAttempts: 2, baseDelay: 50, backoff: 'linear', jitter: 'none' })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('stops retrying when shouldRetry returns false', async () => {
    let callCount = 0
    const fn = vi.fn().mockImplementation(() => {
      callCount++
      throw new Error(`fail ${callCount}`)
    })

    const shouldRetry = (error: Error) => {
      return error.message !== 'fail 2' // Stop after first retry
    }

    await expect(
      retry(fn, { shouldRetry, baseDelay: 1, jitter: 'none' })
    ).rejects.toThrow('fail 2')
    expect(fn).toHaveBeenCalledTimes(2) // initial + 1 retry
  })
})

describe('retrySync', () => {
  it('returns result on first success', () => {
    const fn = vi.fn().mockReturnValue('success')
    const result = retrySync(fn, { maxAttempts: 3, baseDelay: 0 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds', () => {
    const fn = vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail 1') })
      .mockImplementationOnce(() => { throw new Error('fail 2') })
      .mockReturnValue('success')

    const result = retrySync(fn, { maxAttempts: 3, baseDelay: 0 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max attempts exceeded', () => {
    const fn = vi.fn().mockImplementation(() => { throw new Error('always fails') })

    expect(() => retrySync(fn, { maxAttempts: 2, baseDelay: 0 })).toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('createRetryer', () => {
  it('creates a retryer with default options', async () => {
    const retryer = createRetryer({ maxAttempts: 2, baseDelay: 1 })
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const result = await retryer.retry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('allows overriding options per-call', async () => {
    const retryer = createRetryer({ maxAttempts: 1, baseDelay: 1 })
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    await expect(retryer.retry(fn, { maxAttempts: 2 })).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
