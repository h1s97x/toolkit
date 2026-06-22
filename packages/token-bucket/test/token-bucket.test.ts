import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TokenBucketRateLimiter } from '@h1s97x/token-bucket'

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter({
      capacity: 5,
      refillRate: 1,
    })
  })

  it('should initialize with full bucket', () => {
    const status = limiter.getStatus()
    expect(status.availableTokens).toBe(5)
    expect(status.capacity).toBe(5)
  })

  it('should allow acquiring tokens immediately', () => {
    expect(limiter.tryAcquire()).toBe(true)
    expect(limiter.tryAcquire()).toBe(true)
    expect(limiter.tryAcquire()).toBe(true)
    expect(limiter.tryAcquire()).toBe(true)
    expect(limiter.tryAcquire()).toBe(true)
    expect(limiter.tryAcquire()).toBe(false)
  })

  it('should refill tokens over time', async () => {
    limiter.tryAcquire()
    limiter.tryAcquire()
    expect(limiter.getStatus().availableTokens).toBe(3)

    // Wait for refill
    await new Promise(r => setTimeout(r, 1100))
    expect(limiter.getStatus().availableTokens).toBe(4)
  })

  it('should acquire token asynchronously', async () => {
    // Drain the bucket
    limiter.tryAcquire()
    limiter.tryAcquire()
    limiter.tryAcquire()
    limiter.tryAcquire()
    limiter.tryAcquire()

    // This should wait for refill
    const start = Date.now()
    await limiter.acquire()
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(900)
  })

  it('should timeout when acquiring token', async () => {
    // Drain the bucket
    limiter.tryAcquire()
    limiter.tryAcquire()
    limiter.tryAcquire()
    limiter.tryAcquire()
    limiter.tryAcquire()

    await expect(limiter.acquire(100)).rejects.toThrow('TIMEOUT')
  })

  it('should update config', () => {
    limiter.updateConfig(2, 10)
    const status = limiter.getStatus()
    expect(status.capacity).toBe(10)
  })

  it('should report correct status', () => {
    const status = limiter.getStatus()
    expect(status.availableTokens).toBe(5)
    expect(status.capacity).toBe(5)
    expect(status.timeToNextToken).toBe(0)
  })
})
