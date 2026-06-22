/**
 * Retry configuration options
 */

export type BackoffStrategy = 'fixed' | 'exponential' | 'linear'

export type JitterStrategy = 'none' | 'full' | 'equal'

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Base delay in milliseconds (default: 100) */
  baseDelay?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number
  /** Backoff strategy (default: 'exponential') */
  backoff?: BackoffStrategy
  /** Jitter strategy to add randomness (default: 'full') */
  jitter?: JitterStrategy
  /** Custom condition to determine if error should be retried */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** Called before each retry attempt */
  onRetry?: (error: unknown, attempt: number, delay: number) => void
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 100,
  maxDelay: 30000,
  backoff: 'exponential',
  jitter: 'full',
  shouldRetry: () => true,
  onRetry: () => {},
}
