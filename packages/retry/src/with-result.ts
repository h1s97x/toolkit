/**
 * Integration with @h1s97x/result package
 * Retry functions that return Result types instead of throwing
 */

import type { Result } from '@h1s97x/result'
import { ok, err } from '@h1s97x/result'
import {
  type RetryOptions,
  DEFAULT_RETRY_OPTIONS,
} from './types.js'
import { retry, retrySync } from './retry.js'

/**
 * Retry an async function, returning Result instead of throwing
 */
export async function retryResult<T, E = Error>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<Result<T, E>> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options }

  try {
    const value = await retry(fn, opts)
    return ok(value)
  } catch (error) {
    return err(error as E)
  }
}

/**
 * Retry a sync function, returning Result instead of throwing
 */
export function retryResultSync<T, E = Error>(
  fn: () => T,
  options: RetryOptions = {},
): Result<T, E> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options }

  try {
    const value = retrySync(fn, opts)
    return ok(value)
  } catch (error) {
    return err(error as E)
  }
}

/**
 * Decorator-style: wrap a function to make it retryable
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {},
) {
  return async (...args: TArgs): Promise<TReturn> => {
    return retry(() => fn(...args), options)
  }
}

/**
 * Decorator-style: wrap a sync function to make it retryable
 */
export function withRetrySync<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: RetryOptions = {},
) {
  return (...args: TArgs): TReturn => {
    return retrySync(() => fn(...args), options)
  }
}
