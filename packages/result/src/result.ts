/**
 * Result<T, E> — type-safe error handling without try-catch
 *
 * Ok<T>: contains a success value of type T
 * Err<E>: contains an error value of type E
 */

import type { Option } from './option.js'
import { some, none } from './option.js'

export type Result<T, E = Error> = Ok<T, E> | Err<T, E>

export class Ok<T, E = Error> {
  readonly value: T

  constructor(value: T) {
    this.value = value
  }

  isOk(): this is Ok<T, E> {
    return true
  }

  isErr(): this is Err<T, E> {
    return false
  }

  /** Transform the success value, leaving error untouched */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return ok(fn(this.value))
  }

  /** Transform the error value, leaving success untouched */
  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return ok(this.value)
  }

  /** Chain: if Ok, apply fn; if Err, propagate error */
  flatMap<U, F = E>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return fn(this.value)
  }

  /** Unwrap or throw */
  unwrap(): T {
    return this.value
  }

  /** Unwrap or return a default value */
  unwrapOr(defaultValue: T): T {
    return this.value
  }

  /** Unwrap or compute a default value */
  unwrapOrElse(fn: () => T): T {
    return this.value
  }

  /** Match on Ok/Err */
  match<U>(onOk: (value: T) => U, _onErr: (error: E) => U): U {
    return onOk(this.value)
  }

  /** Convert to Option */
  toOption(): Option<T> {
    return some(this.value)
  }
}

export class Err<T, E = Error> {
  readonly error: E

  constructor(error: E) {
    this.error = error
  }

  isOk(): this is Ok<T, E> {
    return false
  }

  isErr(): this is Err<T, E> {
    return true
  }

  /** Transform the success value, leaving error untouched */
  map<U>(_fn: (value: T) => U): Result<U, E> {
    return err(this.error)
  }

  /** Transform the error value, leaving success untouched */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return err(fn(this.error))
  }

  /** Chain: if Ok, apply fn; if Err, propagate error */
  flatMap<U, F = E>(_fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return err(this.error) as Result<U, E | F>
  }

  /** Unwrap or throw */
  unwrap(): never {
    throw this.error
  }

  /** Unwrap or return a default value */
  unwrapOr(defaultValue: T): T {
    return defaultValue
  }

  /** Unwrap or compute a default value */
  unwrapOrElse(fn: () => T): T {
    return fn()
  }

  /** Match on Ok/Err */
  match<U>(_onOk: (value: T) => U, onErr: (error: E) => U): U {
    return onErr(this.error)
  }

  /** Convert to Option */
  toOption(): Option<T> {
    return none()
  }
}

/** Create an Ok result */
export function ok<T, E = Error>(value: T): Result<T, E> {
  return new Ok(value)
}

/** Create an Err result */
export function err<T = never, E = Error>(error: E): Result<T, E> {
  return new Err(error)
}

/**
 * Wrap a sync function that may throw.
 * Returns Result<T, Error>
 */
export function trySync<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn())
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Wrap an async function that may reject.
 * Returns Promise<Result<T, Error>>
 */
export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await fn())
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)))
  }
}
