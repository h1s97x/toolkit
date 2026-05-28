import type { LoggerOptions, Logger } from './types'
import { LoggerImpl } from './logger'
import { errSerializer } from './serializers/err'

/**
 * Standard serializers for common types.
 */
export const stdSerializers = {
  err: errSerializer,
}

/**
 * Create a new Logger instance.
 *
 * @example
 * ```ts
 * import { createLogger } from '@h1s97x/logger'
 *
 * const logger = createLogger({
 *   name: 'my-app',
 *   level: 'info',
 *   redact: ['password'],
 *   serializers: { err: stdSerializers.err },
 * })
 *
 * logger.info({ userId: 'u1' }, 'user login')
 * ```
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new LoggerImpl(options)
}

// Re-export types for consumers
export type { Logger, LoggerOptions, LogLevel, LogObject, Transport } from './types'
export { createConsoleTransport } from './transports/console'
