import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

/**
 * Generic value debounce hook
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Search input debounce hook
 *
 * Separates the immediate input value (for UI) from the debounced value (for API calls).
 */
export function useDebouncedSearch(initialSearch: string = '', delay: number = 500) {
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const debouncedSearch = useDebounce(searchTerm, delay)

  const clearSearch = useCallback(() => {
    setSearchTerm('')
  }, [])

  return {
    searchTerm,
    debouncedSearch,
    setSearchTerm,
    clearSearch,
  } as const
}

/**
 * Filter state debounce hook
 *
 * Only text input fields are debounced; dropdown/select changes take effect immediately.
 *
 * **Note**: `debounceKeys` must be stable (define outside component or wrap in useMemo).
 */
export function useDebouncedFilters<T extends Record<string, unknown>>(
  initialFilters: T,
  debounceKeys: readonly (keyof T)[] | (keyof T)[],
  delay: number = 500
) {
  const [filters, setFilters] = useState<T>(initialFilters)
  const debounceKeysRef = useRef(debounceKeys)
  const debouncedValuesRef = useRef<Partial<T>>({})
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({})

  useEffect(() => {
    const debounceKeySet = new Set(debounceKeysRef.current.map(String))

    for (const key in filters) {
      const filterKey = key as keyof T
      const value = filters[filterKey]

      if (debounceKeySet.has(key)) {
        if (timersRef.current[key]) {
          clearTimeout(timersRef.current[key]!)
        }
        timersRef.current[key] = setTimeout(() => {
          debouncedValuesRef.current[filterKey] = value
          setFilters(prev => ({ ...prev }))
        }, delay)
      } else {
        debouncedValuesRef.current[filterKey] = value
      }
    }
  }, [filters, delay])

  useEffect(() => {
    return () => {
      for (const key in timersRef.current) {
        if (timersRef.current[key]) {
          clearTimeout(timersRef.current[key]!)
        }
      }
    }
  }, [])

  const debouncedFilters = useMemo<T>(() => {
    const result = { ...filters }
    const debounceKeySet = new Set(debounceKeysRef.current.map(String))

    for (const key in debouncedValuesRef.current) {
      const filterKey = key as keyof T
      if (debounceKeySet.has(key)) {
        result[filterKey] = debouncedValuesRef.current[filterKey] as T[keyof T]
      }
    }
    return result
  }, [filters])

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
    debouncedValuesRef.current = {}
  }, [initialFilters])

  return {
    filters,
    debouncedFilters,
    setFilter,
    setFilters,
    clearFilters,
  } as const
}

/**
 * Function debounce hook
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fnRef = useRef(fn)

  fnRef.current = fn

  const debouncedFn = useCallback((...args: unknown[]) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      fnRef.current(...args)
    }, delay)
  }, [delay]) as T

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return debouncedFn
}
