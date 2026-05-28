import { describe, it, expect } from 'vitest'
import { redact } from '../src/utils/redact'

describe('redact', () => {
  it('should redact a top-level key', () => {
    const obj = { name: 'alice', password: 'secret123' }
    const result = redact(obj, ['password'])
    expect(result.name).toBe('alice')
    expect(result.password).toBe('[Redacted]')
  })

  it('should redact a nested key via dot-path', () => {
    const obj = { user: { name: 'alice', token: 'abc-123' } }
    const result = redact(obj, ['user.token'])
    expect(result.user.name).toBe('alice')
    expect(result.user.token).toBe('[Redacted]')
  })

  it('should redact multiple paths', () => {
    const obj = {
      username: 'alice',
      password: 'pw',
      user: { token: 'tk', secret: 'sc' },
    }
    const result = redact(obj, ['password', 'user.token', 'user.secret'])
    expect(result.username).toBe('alice')
    expect(result.password).toBe('[Redacted]')
    expect(result.user.token).toBe('[Redacted]')
    expect(result.user.secret).toBe('[Redacted]')
  })

  it('should return original object if paths is empty', () => {
    const obj = { name: 'alice' }
    const result = redact(obj, [])
    expect(result).toEqual(obj)
  })

  it('should not throw on non-existent paths', () => {
    const obj = { name: 'alice' }
    const result = redact(obj, ['nonexistent.field'])
    expect(result).toEqual(obj)
  })

  it('should not mutate the original object', () => {
    const obj = { password: 'secret' }
    redact(obj, ['password'])
    expect(obj.password).toBe('secret')
  })
})
