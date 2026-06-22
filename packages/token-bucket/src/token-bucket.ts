/**
 * Token-bucket rate limiter
 *
 * Features:
 * - Configurable bucket capacity (burst) and refill rate
 * - Async token acquisition with timeout support
 * - Thread-safe for concurrent use
 * - Status monitoring
 */

export interface RateLimiterConfig {
  /** Bucket capacity (max burst size) */
  capacity: number
  /** Token refill rate (tokens per second) */
  refillRate: number
}

export interface TokenBucketStatus {
  /** Currently available tokens */
  availableTokens: number
  /** Bucket capacity */
  capacity: number
  /** Time until next token refill (ms) */
  timeToNextToken: number
}

export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRate: number;
  private tokens: number;
  private lastRefillTime: number;

  constructor(config: RateLimiterConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * Try to acquire a token immediately.
   * Returns true if successful, false if no tokens available.
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Acquire a token, waiting up to `timeoutMs` milliseconds.
   * Throws if timeout is reached.
   */
  async acquire(timeoutMs: number = 0): Promise<void> {
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const tryAcquire = () => {
        this.refill();
        if (this.tokens >= 1) {
          this.tokens -= 1;
          resolve();
          return;
        }

        if (timeoutMs > 0 && Date.now() - start >= timeoutMs) {
          reject(new Error('TIMEOUT: Token acquisition timed out'));
          return;
        }

        // Calculate wait time until next token
        const timeToNextToken = this.getTimeToNextToken();
        setTimeout(tryAcquire, Math.min(timeToNextToken, 100));
      };

      tryAcquire();
    });
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Calculate time until next token is available (ms)
   */
  private getTimeToNextToken(): number {
    if (this.tokens >= 1) return 0;
    const timePerToken = 1000 / this.refillRate;
    return timePerToken;
  }

  /**
   * Get current bucket status
   */
  getStatus(): TokenBucketStatus {
    this.refill();
    return {
      availableTokens: Math.floor(this.tokens),
      capacity: this.capacity,
      timeToNextToken: this.getTimeToNextToken(),
    };
  }

  /**
   * Update rate limiter configuration
   */
  updateConfig(refillRate: number, capacity?: number): void {
    this.refillRate = refillRate;
    if (capacity !== undefined) {
      this.capacity = capacity;
      this.tokens = Math.min(this.tokens, capacity);
    }
  }
}
