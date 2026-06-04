import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RequestQueueManager, getRequestQueue } from '../src/request-queue'

describe('RequestQueueManager', () => {
  let queue: RequestQueueManager

  beforeEach(() => {
    queue = new RequestQueueManager({
      maxSize: 5,
      maxWaitTime: 1000,
      bucketCapacity: 10,
      requestsPerSecond: 100,
    })
  })

  afterEach(() => {
    queue.destroy()
  })

  describe('enqueue', () => {
    it('should execute a task and return its result', async () => {
      const result = await queue.enqueue(async () => 'done')
      expect(result).toBe('done')
    })

    it('should reject when task throws', async () => {
      await expect(
        queue.enqueue(async () => { throw new Error('task error') })
      ).rejects.toThrow('task error')
    })

    it('should reject when queue is full', async () => {
      const tinyQueue = new RequestQueueManager({
        maxSize: 2,
        maxWaitTime: 1000,
        bucketCapacity: 1,
        requestsPerSecond: 0.001, // 1 token per 1000s — almost never
      })

      // Drain the initial token
      await tinyQueue.enqueue(async () => 'ok')

      // Fill both queue slots (these wait on rate limiter, thus occupy queue)
      const p1 = tinyQueue.enqueue(async () => 'fill1').catch(() => {})
      const p2 = tinyQueue.enqueue(async () => 'fill2').catch(() => {})

      // Give a tick for both enqueues to add to queue
      await new Promise(r => setTimeout(r, 50))

      // 3rd should throw QUEUE_FULL immediately (queue.length >= 2)
      await expect(
        tinyQueue.enqueue(async () => 'reject')
      ).rejects.toThrow('QUEUE_FULL')

      tinyQueue.destroy()
    })

    it('should timeout when task waits too long', async () => {
      const slowQueue = new RequestQueueManager({
        maxSize: 5,
        maxWaitTime: 100,
        bucketCapacity: 1,
        requestsPerSecond: 0.01, // Very slow refill
      })

      // Drain the single token
      await slowQueue.enqueue(async () => 'ok')

      // This should time out because the refill rate is too slow
      await expect(
        slowQueue.enqueue(async () => 'slow', 50)
      ).rejects.toThrow('TIMEOUT')

      slowQueue.destroy()
    }, 5000)
  })

  describe('getStats', () => {
    it('should return zero stats initially', () => {
      const stats = queue.getStats()
      expect(stats.waiting).toBe(0)
      expect(stats.processing).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
    })

    it('should reflect completed tasks', async () => {
      await queue.enqueue(async () => 'done')

      const stats = queue.getStats()
      expect(stats.totalProcessed).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(0)
    })
  })

  describe('canEnqueue', () => {
    it('should allow enqueue when queue is empty', () => {
      const result = queue.canEnqueue()
      expect(result.allowed).toBe(true)
    })
  })

  describe('getEstimatedWaitTime', () => {
    it('should return 0 when queue is empty', () => {
      expect(queue.getEstimatedWaitTime()).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all queued tasks', async () => {
      const task = () => new Promise<void>(() => {})

      queue.enqueue(task).catch(() => {})
      queue.enqueue(task).catch(() => {})

      // Give them time to queue up
      await new Promise(r => setTimeout(r, 50))

      queue.clear()

      const stats = queue.getStats()
      expect(stats.waiting).toBe(0)
    })
  })

  describe('updateRateLimit', () => {
    it('should update rate limit dynamically', () => {
      queue.updateRateLimit(50, 5)
      const stats = queue.getStats()
      // Token bucket should reflect new capacity
      expect(stats.currentTokenBucket.capacity).toBe(5)
    })
  })
})

describe('getRequestQueue singleton', () => {
  it('should return the same instance', () => {
    const a = getRequestQueue()
    const b = getRequestQueue()
    expect(a).toBe(b)
    a.destroy()
  })
})
