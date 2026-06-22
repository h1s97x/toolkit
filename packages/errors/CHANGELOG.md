# @h1s97x/errors

## 0.2.0

### Minor Changes

- ### 🎉 Initial Release

  Unified error handling package for TypeScript applications.

  #### Features
  - **BaseError**: Base error class with proper stack trace, cause chaining, and serialization
  - **Specific Errors**: ValidationError, AuthenticationError, NotFoundError, RateLimitError, etc.
  - **Utilities**: `isBaseError()`, `toBaseError()`, `serializeError()`, `fromUnknown()`
  - **Type-safe**: Full TypeScript support with proper type guards
  - **Production-ready**: Sensitive data sanitization, RFC 7807 compatible serialization
