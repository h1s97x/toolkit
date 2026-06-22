/**
 * Error severity levels
 * Used for logging and monitoring
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warn' | 'info'

/**
 * Serializable error context
 * All additional data attached to an error
 */
export interface ErrorContext {
  [key: string]: unknown
}

/**
 * Serialized error format
 * Used for API responses and logging
 * Follows RFC 7807 (Problem Details for HTTP APIs)
 */
export interface SerializedError {
  /** Machine-readable error code */
  code: string
  /** Human-readable error message */
  message: string
  /** HTTP status code (if applicable) */
  statusCode?: number
  /** Error severity */
  severity?: ErrorSeverity
  /** Additional context (sanitized) */
  details?: Record<string, unknown>
  /** Cause error (recursive) */
  cause?: SerializedError | null
  /** Stack trace (in development) */
  stack?: string
}

/**
 * Options for creating a BaseError
 */
export interface BaseErrorOptions {
  /** Machine-readable error code */
  code: string
  /** HTTP status code */
  statusCode?: number
  /** Error severity */
  severity?: ErrorSeverity
  /** Additional context (will be sanitized in production) */
  context?: ErrorContext
  /** Original error (for chaining) */
  cause?: Error | unknown
  /** Whether to expose internal details in production */
  exposeDetails?: boolean
}
