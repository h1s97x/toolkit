/**
 * AsyncResult<T, E> — Promise<Result<T, E>> with chainable methods
 * AsyncOption<T> — Promise<Option<T>> with chainable methods
 */

import { ok, err } from './result.js'
import { some, none } from './option.js'
import type { Result } from './result.js'
import type { Option } from './option.js'

export class AsyncResult<T, E = Error> {
  constructor(private promise: Promise<Result<T, E>>) {}

  /** Transform the success value */
  async map<U>(fn: (value: T) => U | Promise<U>): Promise<Result<U, E>> {
    const result = await this.promise
    if (result.isOk()) {
      return ok(await fn(result.value))
    }
    return err(result.error) as unknown as Result<U, E>
  }

  /** Transform the error value */
  async mapErr<F>(fn: (error: E) => F | Promise<F>): Promise<Result<T, F>> {
    const result = await this.promise
    if (result.isErr()) {
      return err(await fn(result.error))
    }
    return ok(result.value) as unknown as Result<T, F>
  }

  /** Chain async operations */
  async flatMap<U, F = E>(
    fn: (value: T) => Promise<Result<U, F>> | AsyncResult<U, F>,
  ): Promise<Result<U, E | F>> {
    const result = await this.promise
    if (result.isOk()) {
      const next = fn(result.value)
      return next instanceof AsyncResult ? next.promise : next
    }
    return err(result.error) as unknown as Result<U, E | F>
  }

  /** Unwrap or throw */
  async unwrap(): Promise<T> {
    const result = await this.promise
    if (result.isOk()) return result.value
    throw result.error
  }

  /** Unwrap or return a default value */
  async unwrapOr(defaultValue: T): Promise<T> {
    const result = await this.promise
    return result.isOk() ? result.value : defaultValue
  }

  /** Unwrap or compute a default value */
  async unwrapOrElse(fn: () => T | Promise<T>): Promise<T> {
    const result = await this.promise
    return result.isOk() ? result.value : fn()
  }

  /** Match on Ok/Err */
  async match<U>(
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: E) => U | Promise<U>,
  ): Promise<U> {
    const result = await this.promise
    return result.isOk()
      ? onOk(result.value)
      : onErr(result.error)
  }

  /** Await and get the inner Result */
  async get(): Promise<Result<T, E>> {
    return this.promise
  }
}

export class AsyncOption<T> {
  constructor(private promise: Promise<Option<T>>) {}

  /** Map over the value inside the async option */
  async map<U>(fn: (value: T) => U | Promise<U>): Promise<Option<U>> {
    const option = await this.promise
    if (option.isSome()) {
      return some(await fn(option.value))
    }
    return none()
  }

  /** FlatMap: chain async Option-returning functions */
  async flatMap<U>(
    fn: (value: T) => Promise<Option<U>> | AsyncOption<U>,
  ): Promise<Option<U>> {
    const option = await this.promise
    if (option.isSome()) {
      const next = fn(option.value)
      return next instanceof AsyncOption ? next.promise : next
    }
    return none()
  }

  /** Unwrap or return a default value */
  async unwrapOr(defaultValue: T): Promise<T> {
    const option = await this.promise
    return option.isSome() ? option.value : defaultValue
  }

  /** Unwrap or compute a default value */
  async unwrapOrElse(fn: () => T | Promise<T>): Promise<T> {
    const option = await this.promise
    return option.isSome() ? option.value : fn()
  }

  /** Match on Some/None */
  async match<U>(
    onSome: (value: T) => U | Promise<U>,
    onNone: () => U | Promise<U>,
  ): Promise<U> {
    const option = await this.promise
    return option.isSome()
      ? onSome(option.value)
      : onNone()
  }

  /** Await and get the inner Option */
  async get(): Promise<Option<T>> {
    return this.promise
  }
}

/** Wrap a Promise<Result> into an AsyncResult */
export function asyncResult<T, E = Error>(
  promise: Promise<Result<T, E>> | AsyncResult<T, E>,
): AsyncResult<T, E> {
  if (promise instanceof AsyncResult) return promise
  return new AsyncResult(promise)
}

/** Wrap a Promise<Option> into an AsyncOption */
export function asyncOption<T>(
  promise: Promise<Option<T>> | AsyncOption<T>,
): AsyncOption<T> {
  if (promise instanceof AsyncOption) return promise
  return new AsyncOption(promise)
}
