/**
 * FIFO request queue manager with rate limiting
 *
 * Features:
 * - FIFO order for fairness
 * - Configurable max queue length
 * - Rate-limited task execution via token bucket
 * - Timeout-based task eviction
 * - Wait time estimation
 * - Periodic stale cleanup
 */

import { TokenBucketRateLimiter } from './token-bucket'

export interface QueueOptions {
  /** Maximum queue length */
  maxSize: number
  /** Max task wait time in ms */
  maxWaitTime: number
  /** Token bucket capacity (burst) */
  bucketCapacity: number
  /** Requests allowed per second */
  requestsPerSecond: number
}

export interface QueueStats {
  waiting: number
  processing: number
  completed: number
  failed: number
  timeout: number
  avgWaitTime: number
  maxQueueLength: number
  totalProcessed: number
  currentTokenBucket: ReturnType<TokenBucketRateLimiter['getStatus']>
}

interface QueuedJob {
  id: string
  task: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  createdAt: number
  timeout: NodeJS.Timeout
  status: 'waiting' | 'processing' | 'completed' | 'failed' | 'timeout'
}

const DEFAULT_OPTIONS: QueueOptions = {
  maxSize: 100,
  maxWaitTime: 60000,
  bucketCapacity: 20,
  requestsPerSecond: 10,
}

export class RequestQueueManager {
  private queue: QueuedJob[] = []
  private options: QueueOptions
  private rateLimiter: TokenBucketRateLimiter
  private stats: Omit<QueueStats, 'avgWaitTime' | 'currentTokenBucket'>
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private idCounter: number = 0

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    this.rateLimiter = new TokenBucketRateLimiter({
      capacity: this.options.bucketCapacity,
      refillRate: this.options.requestsPerSecond,
    })

    this.stats = {
      waiting: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      timeout: 0,
      maxQueueLength: 0,
      totalProcessed: 0,
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 10000)
  }

  private generateId(): string {
    return `job_${Date.now()}_${++this.idCounter}`
  }

  /**
   * Enqueue a task for rate-limited execution.
   * Returns a promise that resolves with the task's result
   * once a rate-limit token is acquired and the task completes.
   */
  async enqueue<T>(task: () => Promise<T>, timeout?: number): Promise<T> {
    const jobId = this.generateId()
    const waitTimeout = timeout ?? this.options.maxWaitTime

    if (this.queue.length >= this.options.maxSize) {
      throw new Error(`QUEUE_FULL: Queue is full (${this.options.maxSize})`)
    }

    this.stats.maxQueueLength = Math.max(
      this.stats.maxQueueLength,
      this.queue.length + 1
    )

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex(j => j.id === jobId)
        if (index !== -1) {
          this.queue.splice(index, 1)
          this.stats.waiting--
        }
        this.stats.timeout++
        reject(new Error(`TIMEOUT: Task waited too long (${waitTimeout}ms)`))
      }, waitTimeout)

      const job: QueuedJob = {
        id: jobId,
        task: task as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        createdAt: Date.now(),
        timeout: timeoutId,
        status: 'waiting',
      }

      this.queue.push(job)
      this.stats.waiting++
      this.processQueue()
    })
  }

  /**
   * Process the queue: acquire tokens and execute tasks
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      // Acquire a rate-limit token (wait up to 100ms)
      try {
        await this.rateLimiter.acquire(100)
      } catch {
        break
      }

      const job = this.queue.shift()
      if (!job) break

      clearTimeout(job.timeout)
      this.stats.waiting--
      this.stats.processing++
      this.stats.totalProcessed++

      job.status = 'processing'

      // Execute the task and resolve/reject the promise
      try {
        const result = await job.task()
        job.status = 'completed'
        this.stats.processing--
        this.stats.completed++
        job.resolve(result)
      } catch (error) {
        job.status = 'failed'
        this.stats.processing--
        this.stats.failed++
        job.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const now = Date.now()
    const totalWaitTime = this.queue.reduce(
      (sum, job) => sum + (now - job.createdAt),
      0
    )
    const avgWaitTime =
      this.queue.length > 0 ? totalWaitTime / this.queue.length : 0

    return {
      ...this.stats,
      avgWaitTime,
      currentTokenBucket: this.rateLimiter.getStatus(),
    }
  }

  /**
   * Estimate wait time for a new task
   */
  getEstimatedWaitTime(): number {
    if (this.queue.length === 0) return 0
    const avgWaitPerRequest = 1000 / this.options.requestsPerSecond
    return Math.ceil(this.queue.length * avgWaitPerRequest)
  }

  /**
   * Check if a new task can be enqueued
   */
  canEnqueue(): {
    allowed: boolean
    reason?: string
    estimatedWait?: number
  } {
    if (this.queue.length >= this.options.maxSize) {
      return {
        allowed: false,
        reason: `Queue is full (${this.queue.length}/${this.options.maxSize})`,
      }
    }

    const estimatedWait = this.getEstimatedWaitTime()
    if (estimatedWait > this.options.maxWaitTime) {
      return {
        allowed: false,
        reason: `Estimated wait too long (${Math.round(estimatedWait / 1000)}s)`,
        estimatedWait,
      }
    }

    return { allowed: true, estimatedWait }
  }

  /**
   * Periodic cleanup: evict stale tasks that exceeded maxWaitTime
   */
  private cleanup(): void {
    const now = Date.now()
    const expired: QueuedJob[] = []

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const job = this.queue[i]
      if (now - job.createdAt > this.options.maxWaitTime) {
        expired.push(job)
        this.queue.splice(i, 1)
        this.stats.waiting--
      }
    }

    for (const job of expired) {
      clearTimeout(job.timeout)
      job.status = 'timeout'
      this.stats.timeout++
      job.reject(new Error(`CLEANUP: Task evicted after ${this.options.maxWaitTime}ms`))
    }
  }

  /**
   * Update rate limiting config
   */
  updateRateLimit(refillRate: number, capacity?: number): void {
    this.options.requestsPerSecond = refillRate
    if (capacity !== undefined) {
      this.options.bucketCapacity = capacity
    }
    this.rateLimiter.updateConfig(refillRate, capacity)
  }

  /**
   * Clear all queued tasks
   */
  clear(): void {
    for (const job of this.queue) {
      clearTimeout(job.timeout)
      job.reject(new Error('CLEARED: Queue has been cleared'))
    }
    this.queue = []
    this.stats.waiting = 0
  }

  /**
   * Destroy the queue manager and release resources
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Singleton factory
let queueInstance: RequestQueueManager | null = null

export function getRequestQueue(): RequestQueueManager {
  if (!queueInstance) {
    queueInstance = new RequestQueueManager()
  }
  return queueInstance
}
