import { useState, useCallback } from 'react';
import { isBaseError, toBaseError } from '@h1s97x/errors';
import { createLogger } from '@h1s97x/logger';

const logger = createLogger({ name: 'react-hooks:useApiFetch' });

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Unified API fetch hook.
 *
 * - Handles both `{ code: 200, data }` and `{ success: true, data }` response formats
 * - Manages loading / error state automatically
 * - Sends `credentials: 'include'` by default
 * - Uses @h1s97x/errors for error handling
 */
export function useApiFetch<T = unknown>() {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const fetchApi = useCallback(
    async (url: string, options?: RequestInit): Promise<T | null> => {
      setState({ data: null, error: null, loading: true });
      try {
        const res = await fetch(url, { credentials: 'include', ...options });
        const json = await res.json();

        const success =
          json.success ?? (json.code >= 200 && json.code < 300);
        if (!success || !res.ok) {
          const message = json.error || json.message || `Request failed (${res.status})`;
          throw new Error(message);
        }

        const result = (json.data ?? json) as T;
        setState({ data: result, error: null, loading: false });
        return result;
      } catch (err: unknown) {
        const error = toBaseError(err, 'API fetch failed');
        const message = isBaseError(error)
          ? `[${error.code}] ${error.message}`
          : error.message;

        logger.error({ error, url }, 'useApiFetch: request failed');

        setState({ data: null, error: message, loading: false });
        return null;
      }
    },
    [],
  );

  return { ...state, fetchApi };
}
