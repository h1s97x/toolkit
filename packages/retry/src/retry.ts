/**
 * Core retry logic with backoff and jitter
 */

import {
  type RetryOptions,
  type BackoffStrategy,
  type JitterStrategy,
  DEFAULT_RETRY_OPTIONS,
} from './types.js'

/**
 * Calculate delay with backoff strategy
 */
function calculateDelay(
  attempt: number,
  strategy: BackoffStrategy,
  baseDelay: number,
  maxDelay: number,
): number {
  let delay: number

  switch (strategy) {
    case 'fixed':
      delay = baseDelay
      break
    case 'linear':
      delay = baseDelay * attempt
      break
    case 'exponential':
      delay = baseDelay * Math.pow(2, attempt - 1)
      break
  }

  return Math.min(delay, maxDelay)
}

/**
 * Apply jitter to delay
 */
function applyJitter(
  delay: number,
  strategy: JitterStrategy,
): number {
  switch (strategy) {
    case 'none':
      return delay
    case 'full':
      // Full jitter: random between 0 and delay
      return Math.floor(Math.random() * delay)
    case 'equal':
      // Equal jitter: delay/2 + random between 0 and delay/2
      return Math.floor(delay / 2 + (Math.random() * delay) / 2)
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry an async function with backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const isLastAttempt = attempt === opts.maxAttempts + 1
      if (isLastAttempt || !opts.shouldRetry(error, attempt)) {
        throw error
      }

      // Calculate delay
      const delay = applyJitter(
        calculateDelay(attempt, opts.backoff, opts.baseDelay, opts.maxDelay),
        opts.jitter,
      )

      // Notify
      opts.onRetry(error, attempt, delay)

      // Wait
      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError
}

/**
 * Retry a sync function with backoff
 * Note: uses synchronous delay (blocking) - prefer async version
 */
export function retrySync<T>(
  fn: () => T,
  options: RetryOptions = {},
): T {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts + 1; attempt++) {
    try {
      return fn()
    } catch (error) {
      lastError = error

      const isLastAttempt = attempt === opts.maxAttempts + 1
      if (isLastAttempt || !opts.shouldRetry(error, attempt)) {
        throw error
      }

      const delay = applyJitter(
        calculateDelay(attempt, opts.backoff, opts.baseDelay, opts.maxDelay),
        opts.jitter,
      )

      opts.onRetry(error, attempt, delay)

      // Synchronous delay (blocking)
      const start = Date.now()
      while (Date.now() - start < delay) {
        // Busy wait - not ideal but necessary for sync
      }
    }
  }

  throw lastError
}

/**
 * Create a retry wrapper function with predefined options
 */
export function createRetryer(defaultOptions: RetryOptions = {}) {
  return {
    async retry<T>(fn: () => Promise<T>, overrides: RetryOptions = {}): Promise<T> {
      return retry(fn, { ...defaultOptions, ...overrides })
    },
    retrySync<T>(fn: () => T, overrides: RetryOptions = {}): T {
      return retrySync(fn, { ...defaultOptions, ...overrides })
    },
  }
}

export {
  calculateDelay,
  applyJitter,
}
