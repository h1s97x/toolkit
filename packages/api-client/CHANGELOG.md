# @h1s97x/api-client

## 0.1.2

### Patch Changes

- Add dependency on @h1s97x/errors for unified error handling:
  - logger: use ConfigurationError, isBaseError, serializeError
  - api-client: use ExternalServiceError, createLogger
  - request-queue: use RateLimitError instead of plain Error
  - react-hooks/use-api-fetch: use toBaseError for error handling
- Updated dependencies
  - @h1s97x/logger@0.1.1

## 0.1.1

### Patch Changes

- Initial npm release of @h1s97x/api-client and @h1s97x/react-hooks
