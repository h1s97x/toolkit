/**
 * Option<T> — type-safe nullable value handling
 *
 * Some<T>: contains a value of type T
 * None: represents absence of a value
 */

export class Some<T> {
  readonly value: T

  constructor(value: T) {
    this.value = value
  }

  isSome(): this is Some<T> {
    return true
  }

  isNone(): this is None<T> {
    return false
  }

  unwrap(): T {
    return this.value
  }

  unwrapOr(_defaultValue: T): T {
    return this.value
  }

  unwrapOrElse(_fn: () => T): T {
    return this.value
  }

  map<U>(fn: (value: T) => U): Option<U> {
    return some(fn(this.value))
  }

  flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value)
  }

  match<U>(onSome: (value: T) => U, _onNone: () => U): U {
    return onSome(this.value)
  }
}

export class None<T> {
  isSome(): this is Some<T> {
    return false
  }

  isNone(): this is None<T> {
    return true
  }

  unwrap(): never {
    throw new Error('Cannot unwrap None')
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue
  }

  unwrapOrElse<T>(fn: () => T): T {
    return fn()
  }

  map<U>(_fn: (value: T) => U): Option<U> {
    return none()
  }

  flatMap<U>(_fn: (value: T) => Option<U>): Option<U> {
    return none()
  }

  match<U>(_onSome: (value: T) => U, onNone: () => U): U {
    return onNone()
  }
}

export type Option<T> = Some<T> | None<T>

/** Create a Some option */
export function some<T>(value: T): Option<T> {
  return new Some(value)
}

/** Create a None option */
export function none<T>(): Option<T> {
  return new None()
}

/** Convert null/undefined to Option */
export function fromNullable<T>(value: T | null | undefined): Option<NonNullable<T>> {
  return value == null ? none() : some(value as NonNullable<T>)
}

/** Convert Result to Option (discards error) */
export function fromResult<T, E>(result: { isOk(): boolean; value: T }): Option<T> {
  return result.isOk() ? some(result.value) : none()
}
