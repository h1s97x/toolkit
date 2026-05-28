import type { LogObject } from '../types'

/**
 * Format a LogObject into a JSON string.
 * Handles circular references gracefully.
 */
export function formatLogObject(obj: LogObject): string {
  try {
    return JSON.stringify(obj)
  } catch {
    // Fallback for objects that can't be serialized (e.g. circular refs)
    return JSON.stringify({
      level: obj.level,
      time: obj.time,
      name: obj.name,
      msg: obj.msg,
      _error: 'Log object could not be serialized',
    })
  }
}

/**
 * Generate an ISO 8601 timestamp string.
 */
export function timestamp(): string {
  return new Date().toISOString()
}
