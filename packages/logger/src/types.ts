/**
 * Log level severity, from lowest to highest.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Numeric mapping of log levels (higher = more severe).
 * Matches pino/syslog conventions.
 */
export const LOG_LEVEL_NUMBERS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
}

/**
 * A single transport that writes formatted log objects.
 * Implementations can output to console, file, HTTP, etc.
 */
export interface Transport {
  write(logObject: LogObject): void
  onError?: (error: Error, logObject: LogObject) => void
}

/**
 * The structured log object passed to transports.
 */
export interface LogObject {
  level: number
  time: string
  name?: string
  msg: string
  [key: string]: unknown
}

/**
 * Serializer function: transforms a value before logging.
 * Used to safely serialize Error objects, strip sensitive fields, etc.
 */
export type SerializerFn = (value: unknown) => unknown

/**
 * Options for creating a Logger instance.
 */
export interface LoggerOptions {
  /** Logger name, included in each log line */
  name?: string
  /** Minimum log level to output (default: 'info') */
  level?: LogLevel
  /** Base fields merged into every log object */
  base?: Record<string, unknown>
  /** Keyed serializers applied to matching log fields */
  serializers?: Record<string, SerializerFn>
  /** Dot-path keys to redact (e.g. ['password', 'user.token']) */
  redact?: string[]
  /** One or more transports that write formatted logs */
  transport?: Transport | Transport[]
  /** A function called on each log invocation to inject dynamic context */
  mixin?: () => Record<string, unknown>
  /** Include timestamp (true = ISO string, or custom function). Default: true */
  timestamp?: boolean | (() => string)
}

/**
 * Logger interface — the public API.
 */
export interface Logger {
  trace(obj: Record<string, unknown>, msg?: string): void
  debug(obj: Record<string, unknown>, msg?: string): void
  info(obj: Record<string, unknown>, msg?: string): void
  warn(obj: Record<string, unknown>, msg?: string): void
  error(obj: Record<string, unknown> | Error, msg?: string): void
  fatal(obj: Record<string, unknown> | Error, msg?: string): void
  child(bindings: Record<string, unknown>): Logger
  level: LogLevel
}
