import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TokenBucketRateLimiter } from '../src/token-bucket'

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter({
      capacity: 10,
      refillRate: 5,
    })
  })

  describe('constructor', () => {
    it('should start with full bucket by default', () => {
      const status = limiter.getStatus()
      expect(status.currentTokens).toBe(10)
      expect(status.capacity).toBe(10)
      expect(status.refillRate).toBe(5)
    })

    it('should accept custom initial tokens', () => {
      const l = new TokenBucketRateLimiter({ capacity: 10, refillRate: 5, initialTokens: 3 })
      expect(l.getStatus().currentTokens).toBe(3)
    })
  })

  describe('acquire', () => {
    it('should acquire a token immediately when available', async () => {
      const remaining = await limiter.acquire(0)
      expect(remaining).toBeGreaterThanOrEqual(0)
      expect(limiter.getStatus().stats.acceptedRequests).toBe(1)
    })

    it('should reject immediately when no tokens and timeout is 0', async () => {
      // Drain all tokens first
      for (let i = 0; i < 10; i++) {
        await limiter.acquire(0)
      }

      await expect(limiter.acquire(0)).rejects.toThrow('RATE_LIMITED')
      expect(limiter.getStatus().stats.rejectedRequests).toBe(1)
    })

    it('should wait for a token when timeout is set', async () => {
      // Drain all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire(0)
      }

      // With 5 tokens/sec, should get a token within 200ms
      const promise = limiter.acquire(500)
      await expect(promise).resolves.toBeGreaterThanOrEqual(0)
    }, 5000)

    it('should timeout when wait exceeds specified timeout', async () => {
      // Drain all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire(0)
      }

      // 1ms timeout should be too short for a new token at 5/sec
      await expect(limiter.acquire(1)).rejects.toThrow('TIMEOUT')
    })
  })

  describe('getStatus', () => {
    it('should return correct stats after operations', async () => {
      await limiter.acquire(0)
      await limiter.acquire(0)

      const status = limiter.getStatus()
      expect(status.stats.totalRequests).toBe(2)
      expect(status.stats.acceptedRequests).toBe(2)
      expect(status.currentTokens).toBe(8)
      expect(status.queueLength).toBe(0)
    })
  })

  describe('updateConfig', () => {
    it('should update refill rate dynamically', () => {
      limiter.updateConfig(10)
      expect(limiter.getStatus().refillRate).toBe(10)
    })

    it('should clamp tokens when reducing capacity', () => {
      limiter.updateConfig(5, 3)
      expect(limiter.getStatus().capacity).toBe(3)
      expect(limiter.getStatus().currentTokens).toBeLessThanOrEqual(3)
    })
  })

  describe('resetStats', () => {
    it('should reset all counters to zero', () => {
      limiter.acquire(0)
      limiter.resetStats()
      const stats = limiter.getStatus().stats
      expect(stats.totalRequests).toBe(0)
      expect(stats.acceptedRequests).toBe(0)
      expect(stats.rejectedRequests).toBe(0)
      expect(stats.queuedRequests).toBe(0)
    })
  })
})
