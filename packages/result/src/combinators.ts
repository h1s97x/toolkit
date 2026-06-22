/**
 * Combinators: combine, sequence, all, any
 */

import type { Result } from './result.js'
import type { Option } from './option.js'

/**
 * Combine multiple Results into one.
 * Returns Ok with tuple of values, or first Err encountered.
 *
 * @example
 * const r = combine(ok(1), ok('a')) // Ok<[number, string]>
 * const r2 = combine(ok(1), err('oops')) // Err<string>
 */
export function combine<T extends readonly Result<any, any>[]>(
  ...results: T
): Result<
  { [K in keyof T]: T[K] extends Result<infer V, any> ? V : never },
  T[number] extends Result<any, infer E> ? E : never
> {
  const values: any[] = []
  for (const r of results) {
    if (r.isErr()) return r as any
    values.push(r.value)
  }
  return { __brand: 'ok', value: values } as any
}

/**
 * Combine multiple Options into one.
 * Returns Some with tuple of values, or None if any is None.
 */
export function combineOptions<T extends readonly Option<any>[]>(
  ...options: T
): Option<{ [K in keyof T]: T[K] extends Option<infer V> ? V : never }> {
  const values: any[] = []
  for (const o of options) {
    if (o.__brand === 'none') return { __brand: 'none' }
    values.push(o.value)
  }
  return { __brand: 'some', value: values } as any
}

/**
 * Run all Results, collect Ok values, ignore Errs.
 */
export function collectOk<T, E>(
  results: Result<T, E>[],
): T[] {
  return results.filter(r => r.isOk()).map(r => (r as any).value)
}

/**
 * Run all Results, collect Err values, ignore Oks.
 */
export function collectErr<T, E>(
  results: Result<T, E>[],
): E[] {
  return results.filter(r => r.isErr()).map(r => (r as any).error)
}

/**
 * Partition Results into [oks, errs].
 */
export function partition<T, E>(
  results: Result<T, E>[],
): [T[], E[]] {
  const oks: T[] = []
  const errs: E[] = []
  for (const r of results) {
    if (r.isOk()) oks.push(r.value)
    else errs.push(r.error)
  }
  return [oks, errs]
}
