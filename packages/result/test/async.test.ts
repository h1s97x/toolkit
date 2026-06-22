import { describe, it, expect } from 'vitest'
import { asyncResult, AsyncResult } from '../src/async.js'
import { ok, err } from '../src/result.js'

describe('AsyncResult', () => {
  it('map transforms async result', async () => {
    const ar = asyncResult(Promise.resolve(ok(42)))
    const result = await ar.map(x => x * 2)
    expect(result.isOk()).toBe(true)
    expect(result.unwrap()).toBe(84)
  })

  it('propagates error', async () => {
    const ar = asyncResult(Promise.resolve(err<number, string>('oops')))
    const result = await ar.map(x => x * 2)
    expect(result.isErr()).toBe(true)
  })

  it('unwrapOr returns value or default', async () => {
    const ar1 = asyncResult(Promise.resolve(ok(42)))
    expect(await ar1.unwrapOr(0)).toBe(42)

    const ar2 = asyncResult(Promise.resolve(err<number, string>('oops')))
    expect(await ar2.unwrapOr(99)).toBe(99)
  })
})
