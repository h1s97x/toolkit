/**
 * Token-bucket rate limiter
 *
 * Features:
 * - Fixed-rate token refill
 * - Burst support (up to capacity)
 * - Wait queue with timeout
 * - Dynamic configuration
 * - Stats tracking
 */

export interface TokenBucketOptions {
  /** Bucket capacity (max burst) */
  capacity: number
  /** Tokens refilled per second */
  refillRate: number
  /** Initial tokens (default: full bucket) */
  initialTokens?: number
}

export interface TokenBucketStatus {
  currentTokens: number
  queueLength: number
  capacity: number
  refillRate: number
  stats: {
    totalRequests: number
    acceptedRequests: number
    rejectedRequests: number
    queuedRequests: number
  }
}

export class TokenBucketRateLimiter {
  private capacity: number
  private tokens: number
  private refillRate: number
  private lastRefillTime: number
  private queue: QueuedRequest[] = []
  private processingQueue: boolean = false

  private totalRequests: number = 0
  private acceptedRequests: number = 0
  private rejectedRequests: number = 0
  private queuedRequests: number = 0

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity
    this.tokens = options.initialTokens ?? options.capacity
    this.refillRate = options.refillRate
    this.lastRefillTime = Date.now()
  }

  /**
   * Calculate current tokens considering elapsed time
   */
  private calculateTokens(): number {
    const now = Date.now()
    const timePassed = (now - this.lastRefillTime) / 1000
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefillTime = now

    return this.tokens
  }

  /**
   * Try to acquire a token
   * @param waitTimeout max wait time in ms (0 = no wait)
   */
  async acquire(waitTimeout: number = 0): Promise<number> {
    this.totalRequests++

    return new Promise((resolve, reject) => {
      const tryAcquire = (): boolean => {
        const currentTokens = this.calculateTokens()

        if (currentTokens >= 1) {
          this.tokens -= 1
          this.acceptedRequests++
          resolve(currentTokens)
          return true
        }
        return false
      }

      // Try immediate acquire
      if (tryAcquire()) {
        return
      }

      // No wait, reject immediately
      if (waitTimeout === 0) {
        this.rejectedRequests++
        reject(new Error('RATE_LIMITED'))
        return
      }

      // Enqueue with timeout
      this.queuedRequests++

      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(req => req.resolve === resolve)
        if (index !== -1) {
          this.queue.splice(index, 1)
        }
        this.queuedRequests--
        this.rejectedRequests++
        reject(new Error('TIMEOUT'))
      }, waitTimeout)

      this.queue.push({
        resolve,
        reject,
        timestamp: Date.now(),
        timeout,
      })

      this.processQueue()
    })
  }

  /**
   * Process the wait queue asynchronously
   */
  private processQueue(): void {
    if (this.processingQueue || this.queue.length === 0) {
      return
    }

    this.processingQueue = true

    const processNext = () => {
      if (this.queue.length === 0) {
        this.processingQueue = false
        return
      }

      const currentTokens = this.calculateTokens()

      if (currentTokens >= 1) {
        this.tokens -= 1
        const request = this.queue.shift()!
        clearTimeout(request.timeout)
        this.queuedRequests--
        this.acceptedRequests++
        request.resolve(currentTokens)

        // Process next immediately
        setImmediate(processNext)
      } else {
        this.processingQueue = false

        // Wait for next refill
        const tokensNeeded = 1 - currentTokens
        const waitTime = (tokensNeeded / this.refillRate) * 1000

        setTimeout(() => {
          this.processQueue()
        }, Math.min(waitTime, 100))
      }
    }

    processNext()
  }

  /**
   * Get current status and stats
   */
  getStatus(): TokenBucketStatus {
    return {
      currentTokens: Math.floor(this.calculateTokens()),
      queueLength: this.queue.length,
      capacity: this.capacity,
      refillRate: this.refillRate,
      stats: {
        totalRequests: this.totalRequests,
        acceptedRequests: this.acceptedRequests,
        rejectedRequests: this.rejectedRequests,
        queuedRequests: this.queuedRequests,
      },
    }
  }

  /**
   * Update rate limiting config dynamically
   */
  updateConfig(refillRate: number, capacity?: number): void {
    this.refillRate = refillRate
    if (capacity !== undefined) {
      this.capacity = capacity
      this.tokens = Math.min(this.tokens, capacity)
    }
  }

  /**
   * Reset stats counters
   */
  resetStats(): void {
    this.totalRequests = 0
    this.acceptedRequests = 0
    this.rejectedRequests = 0
  }
}

// Internal request type
interface QueuedRequest {
  resolve: (token: number) => void
  reject: (error: Error) => void
  timestamp: number
  timeout: NodeJS.Timeout
}
