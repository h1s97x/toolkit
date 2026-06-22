/**
 * API 客户端 — 前端统一调用后端 API
 *
 * 特性：
 * - 统一的请求/响应处理
 * - 自动解析新格式 { code, message, data } 和旧格式 { success, data/error }
 * - 统一错误处理（使用 @h1s97x/errors）
 * - 支持认证 token（从 cookie 读取）
 * - 超时控制
 * - 请求/响应日志（使用 @h1s97x/logger）
 */

import { ExternalServiceError, isBaseError, toBaseError } from '@h1s97x/errors';
import { createLogger } from '@h1s97x/logger';

const logger = createLogger({ name: 'api-client' });

// ========== 类型定义 ==========

/** API 响应格式（新格式） */
export interface ApiResponseFormat<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/** 旧格式响应（向后兼容） */
export interface LegacyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 请求选项 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** 请求体（自动 JSON 序列化） */
  body?: unknown;
  /** 是否解析为新格式（默认 true） */
  parseNewFormat?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/** API 错误（向后兼容，继承 ExternalServiceError） */
export class ApiError extends ExternalServiceError {
  public details?: Array<{ field: string; message: string }>;

  constructor(
    code: number,
    message: string,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message, {
      code: `API_${code}`,
      statusCode: code,
      context: { details },
    });
    this.name = 'ApiError';
    this.details = details;
  }
}

// ========== API 客户端 ==========

const DEFAULT_TIMEOUT = 30000;

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'auth_token') return value;
  }
  return null;
}

async function parseResponse<T>(
  response: Response,
  parseNewFormat: boolean = true,
): Promise<T> {
  const text = await response.text();

  if (!text) {
    if (response.status === 204) return null as T;
    throw new ApiError(response.status, 'Empty response');
  }

  const json = JSON.parse(text);

  if (parseNewFormat && 'code' in json) {
    if (json.code >= 200 && json.code < 300) return json.data as T;
    throw new ApiError(json.code, json.message, json.errors);
  }

  if ('success' in json) {
    if (json.success) return json.data as T;
    throw new ApiError(response.status, json.error || 'Request failed');
  }

  return json as T;
}

async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, body, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(restOptions.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const finalOptions: RequestInit = {
    ...restOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: controller.signal,
  };

  const startTime = Date.now();
  logger.info({ url, method: finalOptions.method ?? 'GET' }, 'API request started');

  try {
    const response = await fetch(url, finalOptions);
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    logger.info(
      { url, status: response.status, duration },
      'API request completed',
    );

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      const err = new ApiError(408, 'Request timeout', [{ field: 'timeout', message: `${timeout}ms` }]);
      logger.error({ url, duration, timeout }, 'API request timeout');
      throw err;
    }

    const err = toBaseError(error, 'API request failed');
    logger.error({ url, duration, error: err }, 'API request failed');
    throw err;
  }
}

// ========== HTTP 方法 ==========

export async function apiGet<T = unknown>(
  url: string,
  options?: RequestOptions,
): Promise<T> {
  const response = await fetchWithTimeout(url, { ...options, method: 'GET' });
  return parseResponse<T>(response, options?.parseNewFormat ?? true);
}

export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    method: 'POST',
    body,
  });
  return parseResponse<T>(response, options?.parseNewFormat ?? true);
}

export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    method: 'PUT',
    body,
  });
  return parseResponse<T>(response, options?.parseNewFormat ?? true);
}

export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    method: 'PATCH',
    body,
  });
  return parseResponse<T>(response, options?.parseNewFormat ?? true);
}

export async function apiDelete<T = unknown>(
  url: string,
  options?: RequestOptions,
): Promise<T> {
  const response = await fetchWithTimeout(url, { ...options, method: 'DELETE' });
  return parseResponse<T>(response, options?.parseNewFormat ?? true);
}

// ========== 工具函数 ==========

export function buildUrl(
  base: string,
  params?: Record<string, string | number | boolean>,
): string {
  if (!params) return base;
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
  return query ? `${base}?${query}` : base;
}

// ========== 便捷导出 ==========

export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  buildUrl,
  ApiError,
};

export const apiClient = api;
export type ApiResult<T = unknown> = ApiResponseFormat<T>;
export type ApiClient = typeof api;
