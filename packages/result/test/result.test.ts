import { describe, it, expect } from 'vitest'
import { ok, err, Ok, Err, trySync, tryAsync, Result } from '../src/result.js'

describe('Result', () => {
  describe('Ok', () => {
    it('creates an Ok result', () => {
      const r = ok(42)
      expect(r.isOk()).toBe(true)
      expect(r.isErr()).toBe(false)
      expect(r.unwrap()).toBe(42)
    })

    it('map transforms the value', () => {
      const r = ok(42).map(x => x * 2)
      expect(r.isOk()).toBe(true)
      expect(r.unwrap()).toBe(84)
    })

    it('mapErr does not affect Ok', () => {
      const r = ok(42).mapErr(() => 'oops')
      expect(r.isOk()).toBe(true)
      expect(r.unwrap()).toBe(42)
    })

    it('flatMap chains correctly', () => {
      const r = ok(42).flatMap(x => ok(x * 2))
      expect(r.isOk()).toBe(true)
      expect(r.unwrap()).toBe(84)
    })

    it('flatMap propagates Err', () => {
      const r = ok(42).flatMap(() => err('oops'))
      expect(r.isErr()).toBe(true)
      expect(r.unwrapOr(0)).toBe(0)
    })

    it('unwrapOr returns the value', () => {
      expect(ok(42).unwrapOr(0)).toBe(42)
    })

    it('toOption returns Some', () => {
      const o = ok(42).toOption()
      expect(o.isSome()).toBe(true)
    })
  })

  describe('Err', () => {
    it('creates an Err result', () => {
      const r = err('something went wrong')
      expect(r.isOk()).toBe(false)
      expect(r.isErr()).toBe(true)
    })

    it('map does not affect Err', () => {
      const r = err<number, string>('oops').map(x => x * 2)
      expect(r.isErr()).toBe(true)
    })

    it('mapErr transforms the error', () => {
      const r = err<number, string>('oops').mapErr(e => e.toUpperCase())
      expect(r.isErr()).toBe(true)
      expect((r as Err<number, string>).error).toBe('OOPS')
    })

    it('unwrap throws', () => {
      expect(() => err('oops').unwrap()).toThrow('oops')
    })

    it('unwrapOr returns default', () => {
      expect(err<number, string>('oops').unwrapOr(99)).toBe(99)
    })

    it('toOption returns None', () => {
      const o = err<number, string>('oops').toOption()
      expect(o.isNone()).toBe(true)
    })
  })

  describe('trySync', () => {
    it('returns Ok on success', () => {
      const r = trySync(() => 42)
      expect(r.isOk()).toBe(true)
      expect(r.unwrap()).toBe(42)
    })

    it('returns Err on throw', () => {
      const r = trySync(() => { throw new Error('boom') })
      expect(r.isErr()).toBe(true)
    })
  })

  describe('tryAsync', () => {
    it('returns Ok on success', async () => {
      const r = await tryAsync(async () => 42)
      expect(r.isOk()).toBe(true)
      expect(r.unwrap()).toBe(42)
    })

    it('returns Err on reject', async () => {
      const r = await tryAsync(async () => { throw new Error('boom') })
      expect(r.isErr()).toBe(true)
    })
  })

  describe('match', () => {
    it('calls onOk for Ok', () => {
      const r = ok(42)
      const result = r.match(
        v => `ok: ${v}`,
        e => `err: ${e}`,
      )
      expect(result).toBe('ok: 42')
    })

    it('calls onErr for Err', () => {
      const r = err('oops')
      const result = r.match(
        v => `ok: ${v}`,
        e => `err: ${e}`,
      )
      expect(result).toBe('err: oops')
    })
  })
})
