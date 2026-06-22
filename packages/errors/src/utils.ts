import { BaseError } from './base-error'
import type { SerializedError } from './types'

/**
 * Type guard: check if value is a BaseError
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation()
 * } catch (error) {
 *   if (isBaseError(error)) {
 *     // error is typed as BaseError
 *     console.log(error.code)
 *   }
 * }
 * ```
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError
}

/**
 * Convert any error to BaseError
 * If already BaseError, return as-is
 * If plain Error, wrap it
 * If other value, create new BaseError with stringified value
 *
 * @example
 * ```typescript
 * catch (error) {
 *   const baseError = toBaseError(error)
 *   // baseError is always a BaseError
 * }
 * ```
 */
export function toBaseError(error: unknown, defaultMessage = 'An unknown error occurred'): BaseError {
  if (isBaseError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new BaseError(error.message, {
      code: 'UNKNOWN_ERROR',
      cause: error,
    })
  }

  // Handle null, undefined, and other values
  const message = error !== null && error !== undefined ? String(error) : defaultMessage
  return new BaseError(message, {
    code: 'UNKNOWN_ERROR',
    context: { originalValue: error },
  })
}

/**
 * Serialize any error to SerializedError format
 * Handles both BaseError and plain Error
 *
 * @example
 * ```typescript
 * const serialized = serializeError(error)
 * res.status(serialized.statusCode).json(serialized)
 * ```
 */
export function serializeError(error: unknown): SerializedError {
  if (isBaseError(error)) {
    return error.toJSON()
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      statusCode: 500,
      severity: 'error',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message: String(error || 'An unknown error occurred'),
    statusCode: 500,
    severity: 'error',
  }
}

/**
 * Create error from unknown (convenience wrapper for toBaseError)
 * Useful in catch blocks
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation()
 * } catch (error: unknown) {
 *   throw fromUnknown(error, 'Operation failed', {
 *     code: 'OPERATION_FAILED'
 *   })
 * }
 * ```
 */
export function fromUnknown(
  error: unknown,
  message: string,
  options: Partial<BaseErrorOptions> = {}
): BaseError {
  const baseError = toBaseError(error)
  return new BaseError(message, {
    code: options.code ?? 'WRAPPED_ERROR',
    cause: baseError,
    ...options,
  })
}

/**
 * Check if error is of specific type (by code or class)
 *
 * @example
 * ```typescript
 * if (isErrorOfType(error, 'VALIDATION_ERROR')) { ... }
 * if (isErrorOfType(error, ValidationError)) { ... }
 * ```
 */
export function isErrorOfType(
  error: unknown,
  type: string | (new (...args: never[]) => BaseError)
): boolean {
  if (!isBaseError(error)) {
    return false
  }

  if (typeof type === 'string') {
    return error.code === type
  }

  return error instanceof type
}

/**
 * Extract all causes from an error (for debugging)
 *
 * @example
 * ```typescript
 * const chain = getErrorChain(error)
 * // [{ code: 'A', message: '...' }, { code: 'B', message: '...' }]
 * ```
 */
export function getErrorChain(error: BaseError): Array<{ code: string; message: string }> {
  const chain: Array<{ code: string; message: string }> = []
  let current: Error | unknown | undefined = error

  while (current instanceof BaseError) {
    chain.push({ code: current.code, message: current.message })
    current = current.cause
  }

  if (current instanceof Error) {
    chain.push({ code: 'CAUSE', message: current.message })
  }

  return chain
}
