const REDACTED_VALUE = '[Redacted]';

/**
 * Deep-clone an object and replace values at specified dot-paths with "[Redacted]".
 *
 * @example
 * redact({ user: { name: 'a', token: 's' } }, ['user.token'])
 * // => { user: { name: 'a', token: '[Redacted]' } }
 */
export function redact<T extends Record<string, unknown>>(
  obj: T,
  paths: string[],
): T {
  if (!paths || paths.length === 0) return obj;

  const result = structuredClone(obj);

  for (const path of paths) {
    const segments = path.split('.');
    redactPath(result, segments);
  }

  return result;
}

function redactPath(obj: Record<string, unknown>, segments: string[]): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] == null || typeof current[seg] !== 'object') return;
    current = current[seg] as Record<string, unknown>;
  }

  const last = segments[segments.length - 1];
  if (last in current) {
    current[last] = REDACTED_VALUE;
  }
}
