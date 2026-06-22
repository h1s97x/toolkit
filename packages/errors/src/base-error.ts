import type { BaseErrorOptions, ErrorContext, ErrorSeverity, SerializedError } from './types'

/**
 * Base error class for all application errors
 *
 * Features:
 * - Proper stack trace preservation
 * - Error cause chaining (ES2022)
 * - Serializable for API responses and logging
 * - Context attachment (with sanitization)
 * - HTTP status code mapping
 *
 * @example
 * ```typescript
 * throw new BaseError('User not found', {
 *   code: 'USER_NOT_FOUND',
 *   statusCode: 404,
 *   context: { userId: '123' }
 * })
 * ```
 */
export class BaseError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly severity: ErrorSeverity
  public readonly context: ErrorContext
  public readonly exposeDetails: boolean
  public readonly cause?: Error | unknown

  constructor(message: string, options: BaseErrorOptions) {
    super(message)

    // Preserve correct prototype chain (required for `instanceof`)
    Object.setPrototypeOf(this, new.target.prototype)

    // Set error name to class name (for `Error.prototype.toString()`)
    this.name = new.target.name

    // Maintains proper stack trace (V8 only, fallback for other runtimes)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    this.code = options.code
    this.statusCode = options.statusCode ?? 500
    this.severity = options.severity ?? 'error'
    this.context = options.context ?? {}
    this.exposeDetails = options.exposeDetails ?? false

    // Support ES2022 Error cause chaining
    if (options.cause) {
      this.cause = options.cause instanceof Error ? options.cause : new Error(String(options.cause))
    }
  }

  /**
   * Serialize error for API responses and logging
   * Follows RFC 7807 (Problem Details for HTTP APIs)
   *
   * In production, sensitive context is sanitized
   */
  toJSON(): SerializedError {
    const isProduction = process.env.NODE_ENV === 'production'

    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      severity: this.severity,
      // Only expose details if explicitly allowed or not in production
      details: this.exposeDetails || !isProduction ? this.sanitizeContext(this.context) : undefined,
      cause: this.cause instanceof BaseError ? this.cause.toJSON() : undefined,
      // Only include stack in non-production
      stack: isProduction ? undefined : this.stack,
    }
  }

  /**
   * Sanitize context to remove sensitive fields
   * Override in subclasses for custom sanitization
   */
  protected sanitizeContext(context: ErrorContext): Record<string, unknown> {
    const sensitiveFields = ['password', 'token', 'secret', 'apikey', 'authorization']
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(context)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '***'
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Convert to string (for logging)
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

/**
 * Error severity type (re-export for convenience)
 */
export type { ErrorSeverity, SerializedError, BaseErrorOptions, ErrorContext }
