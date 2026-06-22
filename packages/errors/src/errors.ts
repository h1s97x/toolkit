import { BaseError } from './base-error'

/**
 * 400 Bad Request - Validation failed
 * Use when request parameters/body fail validation
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid email format', {
 *   context: { field: 'email', value: 'not-an-email' }
 * })
 * ```
 */
export class ValidationError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'VALIDATION_ERROR',
      statusCode: 400,
      severity: 'warn',
      ...options,
    })
  }
}

/**
 * 401 Unauthorized - Authentication failed
 * Use when user is not authenticated
 *
 * @example
 * ```typescript
 * throw new AuthenticationError('Invalid credentials')
 * ```
 */
export class AuthenticationError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'AUTHENTICATION_ERROR',
      statusCode: 401,
      severity: 'warn',
      ...options,
    })
  }
}

/**
 * 403 Forbidden - Authorization failed
 * Use when user is authenticated but lacks permissions
 *
 * @example
 * ```typescript
 * throw new AuthorizationError('Insufficient permissions', {
 *   context: { requiredRole: 'admin', userRole: 'user' }
 * })
 * ```
 */
export class AuthorizationError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'AUTHORIZATION_ERROR',
      statusCode: 403,
      severity: 'warn',
      ...options,
    })
  }
}

/**
 * 404 Not Found - Resource not found
 * Use when requested resource does not exist
 *
 * @example
 * ```typescript
 * throw new NotFoundError('User not found', {
 *   context: { resource: 'User', id: userId }
 * })
 * ```
 */
export class NotFoundError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'NOT_FOUND',
      statusCode: 404,
      severity: 'info',
      ...options,
    })
  }
}

/**
 * 409 Conflict - Resource conflict
 * Use when resource already exists or has conflicting state
 *
 * @example
 * ```typescript
 * throw new ConflictError('Email already exists', {
 *   context: { field: 'email', value: 'user@example.com' }
 * })
 * ```
 */
export class ConflictError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'CONFLICT',
      statusCode: 409,
      severity: 'warn',
      ...options,
    })
  }
}

/**
 * 422 Unprocessable Entity - Business rule violation
 * Use when request is valid but cannot be processed due to business rules
 *
 * @example
 * ```typescript
 * throw new BusinessRuleError('Account is frozen', {
 *   context: { accountId: '123', reason: 'Suspicious activity' }
 * })
 * ```
 */
export class BusinessRuleError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'BUSINESS_RULE_VIOLATION',
      statusCode: 422,
      severity: 'warn',
      ...options,
    })
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 * Use with @h1s97x/rate-limiter
 *
 * @example
 * ```typescript
 * throw new RateLimitError('Rate limit exceeded', {
 *   context: { limit: 100, window: '1m', retryAfter: 60 }
 * })
 * ```
 */
export class RateLimitError extends BaseError {
  public readonly retryAfter?: number

  constructor(message: string, options: Partial<BaseErrorOptions> & { retryAfter?: number } = {}) {
    super(message, {
      code: options.code ?? 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      severity: 'warn',
      ...options,
    })
    this.retryAfter = options.retryAfter
  }
}

/**
 * 500 Internal Server Error - External service failed
 * Use when upstream service is unavailable or returns error
 *
 * @example
 * ```typescript
 * throw new ExternalServiceError('Payment gateway timeout', {
 *   cause: gatewayError,
 *   context: { service: 'stripe', endpoint: '/charges' }
 * })
 * ```
 */
export class ExternalServiceError extends BaseError {
  public readonly service?: string

  constructor(message: string, options: Partial<BaseErrorOptions> & { service?: string } = {}) {
    super(message, {
      code: options.code ?? 'EXTERNAL_SERVICE_ERROR',
      statusCode: 502,
      severity: 'error',
      ...options,
    })
    this.service = options.service
  }
}

/**
 * 500 Internal Server Error - Configuration error
 * Use when application configuration is invalid
 *
 * @example
 * ```typescript
 * throw new ConfigurationError('Missing required env variable', {
 *   context: { variable: 'DATABASE_URL' }
 * })
 * ```
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'CONFIGURATION_ERROR',
      statusCode: 500,
      severity: 'fatal',
      ...options,
    })
  }
}

/**
 * 500 Internal Server Error - Database error
 * Use for database connection/query errors
 *
 * @example
 * ```typescript
 * throw new DatabaseError('Query failed', {
 *   cause: dbError,
 *   context: { query: 'SELECT * FROM users', params: [userId] }
 * })
 * ```
 */
export class DatabaseError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'DATABASE_ERROR',
      statusCode: 500,
      severity: 'error',
      ...options,
    })
  }
}

/**
 * 503 Service Unavailable - Maintenance or overload
 * Use when service is temporarily unavailable
 */
export class ServiceUnavailableError extends BaseError {
  constructor(message: string, options: Partial<BaseErrorOptions> = {}) {
    super(message, {
      code: options.code ?? 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      severity: 'error',
      ...options,
    })
  }
}
