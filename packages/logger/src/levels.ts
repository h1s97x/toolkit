import type { LogLevel } from './types'
import { LOG_LEVEL_NUMBERS } from './types'

/**
 * Check if a given level is enabled given a threshold.
 */
export function isLevelEnabled(level: LogLevel, threshold: LogLevel): boolean {
  return LOG_LEVEL_NUMBERS[level] >= LOG_LEVEL_NUMBERS[threshold]
}

/**
 * All log levels in ascending order.
 */
export const LOG_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
