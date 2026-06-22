import { describe, it, expect } from 'vitest'
import { some, none, Some, None, fromNullable, fromResult } from '../src/option.js'

describe('Option', () => {
  describe('Some', () => {
    it('creates a Some', () => {
      const o = some(42)
      expect(o.isSome()).toBe(true)
      expect(o.isNone()).toBe(false)
      expect(o.unwrap()).toBe(42)
    })

    it('map transforms the value', () => {
      const o = some(42).map(x => x * 2)
      expect(o.isSome()).toBe(true)
      expect(o.unwrap()).toBe(84)
    })

    it('flatMap chains correctly', () => {
      const o = some(42).flatMap(x => some(x * 2))
      expect(o.isSome()).toBe(true)
      expect(o.unwrap()).toBe(84)
    })

    it('unwrapOr returns the value', () => {
      expect(some(42).unwrapOr(0)).toBe(42)
    })

    it('match calls onSome', () => {
      const result = some(42).match(
        v => `some: ${v}`,
        () => 'none',
      )
      expect(result).toBe('some: 42')
    })
  })

  describe('None', () => {
    it('creates a None', () => {
      const o = none<number>()
      expect(o.isSome()).toBe(false)
      expect(o.isNone()).toBe(true)
    })

    it('map returns None', () => {
      const o = none<number>().map(x => x * 2)
      expect(o.isNone()).toBe(true)
    })

    it('unwrap throws', () => {
      expect(() => none<number>().unwrap()).toThrow()
    })

    it('unwrapOr returns default', () => {
      expect(none<number>().unwrapOr(99)).toBe(99)
    })

    it('match calls onNone', () => {
      const result = none<number>().match(
        v => `some: ${v}`,
        () => 'none',
      )
      expect(result).toBe('none')
    })
  })

  describe('fromNullable', () => {
    it('returns Some for non-null value', () => {
      expect(fromNullable(42).isSome()).toBe(true)
      expect(fromNullable('').isSome()).toBe(true)
      expect(fromNullable(0).isSome()).toBe(true)
    })

    it('returns None for null', () => {
      expect(fromNullable(null).isNone()).toBe(true)
    })

    it('returns None for undefined', () => {
      expect(fromNullable(undefined).isNone()).toBe(true)
    })
  })

  describe('fromResult', () => {
    it('converts Ok to Some', () => {
      const o = fromResult({ isOk: () => true, value: 42 })
      expect(o.isSome()).toBe(true)
    })

    it('converts Err to None', () => {
      const o = fromResult({ isOk: () => false, value: undefined as any })
      expect(o.isNone()).toBe(true)
    })
  })
})
