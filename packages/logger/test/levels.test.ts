import { describe, it, expect } from 'vitest'
import { isLevelEnabled } from '../src/levels'

describe('isLevelEnabled', () => {
  it('should return true when level is above threshold', () => {
    expect(isLevelEnabled('error', 'info')).toBe(true)
    expect(isLevelEnabled('fatal', 'info')).toBe(true)
    expect(isLevelEnabled('warn', 'debug')).toBe(true)
  })

  it('should return true when level equals threshold', () => {
    expect(isLevelEnabled('info', 'info')).toBe(true)
  })

  it('should return false when level is below threshold', () => {
    expect(isLevelEnabled('debug', 'info')).toBe(false)
    expect(isLevelEnabled('trace', 'info')).toBe(false)
    expect(isLevelEnabled('info', 'error')).toBe(false)
  })

  it('trace should be the lowest level', () => {
    expect(isLevelEnabled('trace', 'trace')).toBe(true)
    expect(isLevelEnabled('trace', 'debug')).toBe(false)
    expect(isLevelEnabled('trace', 'info')).toBe(false)
    expect(isLevelEnabled('trace', 'warn')).toBe(false)
    expect(isLevelEnabled('trace', 'error')).toBe(false)
    expect(isLevelEnabled('trace', 'fatal')).toBe(false)
  })

  it('fatal should be the highest level', () => {
    expect(isLevelEnabled('fatal', 'trace')).toBe(true)
    expect(isLevelEnabled('fatal', 'debug')).toBe(true)
    expect(isLevelEnabled('fatal', 'info')).toBe(true)
    expect(isLevelEnabled('fatal', 'warn')).toBe(true)
    expect(isLevelEnabled('fatal', 'error')).toBe(true)
    expect(isLevelEnabled('fatal', 'fatal')).toBe(true)
  })
})
