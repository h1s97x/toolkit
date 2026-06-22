import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  RateLimitError,
  ExternalServiceError,
  ConfigurationError,
  DatabaseError,
  ServiceUnavailableError,
} from '../src'
import {
  isBaseError,
  toBaseError,
  serializeError,
  fromUnknown,
  isErrorOfType,
  getErrorChain,
} from '../src'

describe('BaseError', () => {
  it('should create error with correct properties', () => {
    const error = new BaseError('Test error', {
      code: 'TEST_ERROR',
      statusCode: 400,
      severity: 'warn',
      context: { key: 'value' },
    })

    expect(error.name).toBe('BaseError')
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.severity).toBe('warn')
    expect(error.context).toEqual({ key: 'value' })
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(BaseError)
  })

  it('should support error cause chaining', () => {
    const cause = new Error('Original error')
    const error = new BaseError('Wrapped error', {
      code: 'WRAPPED',
      cause,
    })

    expect(error.cause).toBe(cause)
  })

  it('should serialize to JSON correctly', () => {
    const error = new BaseError('Test error', {
      code: 'TEST',
      statusCode: 400,
      context: { userId: '123' },
    })

    const serialized = error.toJSON()

    expect(serialized).toMatchObject({
      code: 'TEST',
      message: 'Test error',
      statusCode: 400,
    })
  })

  it('should sanitize sensitive context', () => {
    const error = new BaseError('Auth error', {
      code: 'AUTH_ERROR',
      context: {
        username: 'test',
        password: 'secret123',
        apiKey: 'key123',
      },
    })

    const serialized = error.toJSON()

    expect(serialized.details?.password).toBe('***')
    expect(serialized.details?.apiKey).toBe('***')
    expect(serialized.details?.username).toBe('test')
  })

  it('should have correct toString', () => {
    const error = new BaseError('Test', { code: 'TEST' })
    expect(error.toString()).toBe('BaseError [TEST]: Test')
  })
})

describe('Specific Error Classes', () => {
  it('should create ValidationError with correct defaults', () => {
    const error = new ValidationError('Invalid input')
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.severity).toBe('warn')
  })

  it('should create NotFoundError with correct defaults', () => {
    const error = new NotFoundError('User not found')
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.severity).toBe('info')
  })

  it('should create AuthenticationError with correct defaults', () => {
    const error = new AuthenticationError('Invalid token')
    expect(error.statusCode).toBe(401)
  })

  it('should create AuthorizationError with correct defaults', () => {
    const error = new AuthorizationError('Forbidden')
    expect(error.statusCode).toBe(403)
  })

  it('should create ConflictError with correct defaults', () => {
    const error = new ConflictError('Already exists')
    expect(error.statusCode).toBe(409)
  })

  it('should create BusinessRuleError with correct defaults', () => {
    const error = new BusinessRuleError('Account frozen')
    expect(error.statusCode).toBe(422)
  })

  it('should create RateLimitError with retryAfter', () => {
    const error = new RateLimitError('Too many requests', { retryAfter: 60 })
    expect(error.statusCode).toBe(429)
    expect(error.retryAfter).toBe(60)
  })

  it('should create ExternalServiceError with service name', () => {
    const error = new ExternalServiceError('Gateway timeout', { service: 'stripe' })
    expect(error.statusCode).toBe(502)
    expect(error.service).toBe('stripe')
  })

  it('should create ConfigurationError with correct defaults', () => {
    const error = new ConfigurationError('Missing env var')
    expect(error.statusCode).toBe(500)
    expect(error.severity).toBe('fatal')
  })

  it('should create DatabaseError with correct defaults', () => {
    const error = new DatabaseError('Query failed')
    expect(error.statusCode).toBe(500)
  })

  it('should create ServiceUnavailableError with correct defaults', () => {
    const error = new ServiceUnavailableError('Maintenance mode')
    expect(error.statusCode).toBe(503)
  })
})

describe('Utility Functions', () => {
  describe('isBaseError', () => {
    it('should return true for BaseError instances', () => {
      const error = new ValidationError('test')
      expect(isBaseError(error)).toBe(true)
    })

    it('should return false for plain Error', () => {
      const error = new Error('test')
      expect(isBaseError(error)).toBe(false)
    })

    it('should return false for non-errors', () => {
      expect(isBaseError('string')).toBe(false)
      expect(isBaseError(null)).toBe(false)
      expect(isBaseError(undefined)).toBe(false)
    })
  })

  describe('toBaseError', () => {
    it('should return BaseError as-is', () => {
      const original = new ValidationError('test')
      const converted = toBaseError(original)
      expect(converted).toBe(original)
    })

    it('should wrap plain Error', () => {
      const original = new Error('original message')
      const converted = toBaseError(original)
      expect(isBaseError(converted)).toBe(true)
      expect(converted.message).toBe('original message')
      expect(converted.cause).toBe(original)
    })

    it('should handle non-Error values', () => {
      const converted = toBaseError('string error')
      expect(isBaseError(converted)).toBe(true)
      expect(converted.message).toBe('string error')
    })

    it('should handle null', () => {
      const converted = toBaseError(null)
      expect(isBaseError(converted)).toBe(true)
      expect(converted.message).toBe('An unknown error occurred')
    })

    it('should handle undefined', () => {
      const converted = toBaseError(undefined)
      expect(isBaseError(converted)).toBe(true)
      expect(converted.message).toBe('An unknown error occurred')
    })
  })

  describe('serializeError', () => {
    it('should serialize BaseError', () => {
      const error = new NotFoundError('Not found', {
        context: { resource: 'User', id: '123' },
      })
      const serialized = serializeError(error)
      expect(serialized.code).toBe('NOT_FOUND')
      expect(serialized.statusCode).toBe(404)
    })

    it('should serialize plain Error', () => {
      const error = new Error('Plain error')
      const serialized = serializeError(error)
      expect(serialized.code).toBe('INTERNAL_ERROR')
      expect(serialized.statusCode).toBe(500)
    })

    it('should serialize non-Error values', () => {
      const serialized = serializeError('string error')
      expect(serialized.code).toBe('INTERNAL_ERROR')
      expect(serialized.message).toBe('string error')
    })
  })

  describe('fromUnknown', () => {
    it('should wrap unknown error with custom message', () => {
      const original = new Error('Original')
      const wrapped = fromUnknown(original, 'Operation failed', { code: 'OP_FAILED' })
      expect(wrapped.message).toBe('Operation failed')
      expect(wrapped.code).toBe('OP_FAILED')
      expect(wrapped.cause).toBeInstanceOf(Error)
    })
  })

  describe('isErrorOfType', () => {
    it('should match by code string', () => {
      const error = new ValidationError('test')
      expect(isErrorOfType(error, 'VALIDATION_ERROR')).toBe(true)
      expect(isErrorOfType(error, 'NOT_FOUND')).toBe(false)
    })

    it('should match by class constructor', () => {
      const error = new NotFoundError('test')
      expect(isErrorOfType(error, NotFoundError)).toBe(true)
      expect(isErrorOfType(error, ValidationError)).toBe(false)
    })
  })

  describe('getErrorChain', () => {
    it('should return error chain', () => {
      const cause = new Error('Root cause')
      const middle = new BaseError('Middle', { code: 'MIDDLE', cause })
      const top = new BaseError('Top', { code: 'TOP', cause: middle })

      const chain = getErrorChain(top)
      expect(chain).toHaveLength(3)
      expect(chain[0]).toEqual({ code: 'TOP', message: 'Top' })
      expect(chain[1]).toEqual({ code: 'MIDDLE', message: 'Middle' })
      expect(chain[2]).toEqual({ code: 'CAUSE', message: 'Root cause' })
    })
  })
})

describe('Error Chaining', () => {
  it('should support nested error chains', () => {
    const rootCause = new Error('Database connection failed')
    const serviceError = new ExternalServiceError('Payment gateway failed', {
      cause: rootCause,
      service: 'stripe',
    })
    const appError = new BaseError('Checkout failed', {
      code: 'CHECKOUT_FAILED',
      cause: serviceError,
      context: { orderId: '123' },
    })

    expect(appError.cause).toBe(serviceError)
    expect((appError.cause as ExternalServiceError).cause).toBe(rootCause)
    expect(appError.context.orderId).toBe('123')
  })

  it('should serialize nested errors', () => {
    const cause = new ValidationError('Invalid email')
    const error = new BaseError('Request failed', {
      code: 'REQUEST_FAILED',
      cause,
    })

    const serialized = error.toJSON()
    expect(serialized.cause).toBeDefined()
    expect(serialized.cause?.code).toBe('VALIDATION_ERROR')
  })
})
