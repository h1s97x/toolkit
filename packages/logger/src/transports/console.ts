import type { Transport, LogObject } from '../types'

const LEVEL_TO_CONSOLE: Record<number, 'debug' | 'log' | 'info' | 'warn' | 'error'> = {
  10: 'debug', // trace
  20: 'log',   // debug
  30: 'info',  // info
  40: 'warn',  // warn
  50: 'error', // error
  60: 'error', // fatal
}

/**
 * Console Transport — writes formatted log objects to the console.
 * Works in both browser and Node.js environments.
 */
export function createConsoleTransport(): Transport {
  return {
    write(logObject: LogObject): void {
      const method = LEVEL_TO_CONSOLE[logObject.level] || 'log'
      const formatted = JSON.stringify(logObject)

      switch (method) {
        case 'debug':
          console.debug(formatted)
          break
        case 'log':
          console.log(formatted)
          break
        case 'info':
          console.info(formatted)
          break
        case 'warn':
          console.warn(formatted)
          break
        case 'error':
          console.error(formatted)
          break
      }
    },
  }
}
