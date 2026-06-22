// Core exports
export { BaseError } from './base-error'

// Error classes
export {
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
} from './errors'

// Utilities
export {
  isBaseError,
  toBaseError,
  serializeError,
  fromUnknown,
  isErrorOfType,
  getErrorChain,
} from './utils'

// Types
export type {
  ErrorSeverity,
  ErrorContext,
  SerializedError,
  BaseErrorOptions,
} from './types'
