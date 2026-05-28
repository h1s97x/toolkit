/**
 * Standard Error serializer.
 * Extracts name, message, stack, and cause (recursively).
 * Handles non-Error values gracefully.
 */
export function errSerializer(value: unknown): Record<string, unknown> {
  if (value instanceof Error) {
    const result: Record<string, unknown> = {
      type: 'Error',
      name: value.name,
      message: value.message,
      stack: value.stack,
    }

    if (value.cause) {
      result.cause = errSerializer(value.cause)
    }

    // Include additional enumerable properties (e.g. statusCode, code)
    for (const key of Object.keys(value)) {
      if (!(key in result)) {
        result[key] = (value as Record<string, unknown>)[key]
      }
    }

    return result
  }

  // Not an Error, return as-is
  return { type: typeof value, value }
}
