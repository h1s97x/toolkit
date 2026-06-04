/**
 * API 统一响应格式工具
 *
 * 所有 API 响应应使用此工具，确保格式一致。
 * 依赖 NextResponse（Next.js），安装时需确保 next 为 peer dependency。
 *
 * 成功响应格式：
 *   { code: 200, message: "success", data: T, timestamp: number }
 *
 * 列表响应格式（带分页）：
 *   { code: 200, message: "success", data: { items: T[], pagination }, timestamp }
 *
 * 错误响应格式：
 *   { code: 400|401|..., message: string, errors?: ErrorDetail[], timestamp }
 */

import { NextResponse } from 'next/server'

// ========== 类型定义 ==========

export interface SuccessResponse<T> {
  code: 200 | 201
  message: string
  data: T
  timestamp: number
}

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ListResponse<T> {
  code: 200
  message: string
  data: {
    items: T[]
    pagination: Pagination
  }
  timestamp: number
}

export interface ErrorDetail {
  field: string
  message: string
}

export interface ErrorResponse {
  code: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500
  message: string
  errors?: ErrorDetail[]
  timestamp: number
}

export type ErrorCode = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500

// ========== 响应构建器 ==========

export class ApiResponse {
  private static getTimestamp(): number {
    return Date.now()
  }

  /** 成功响应（单条数据） */
  static success<T>(
    data: T,
    message = 'success',
    status: 200 | 201 = 200
  ): NextResponse<SuccessResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        code: status,
        message,
        data,
        timestamp: this.getTimestamp(),
      },
      { status }
    )
  }

  /** 创建成功（POST 创建资源，201） */
  static created<T>(
    data: T,
    message = 'Created successfully'
  ): NextResponse<SuccessResponse<T>> {
    return this.success(data, message, 201)
  }

  /** 无内容（DELETE 成功，204） */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 })
  }

  // ========== 列表响应 ==========

  /** 列表响应（带分页） */
  static list<T>(
    items: T[],
    page: number,
    pageSize: number,
    total: number
  ): NextResponse<ListResponse<T>> {
    const totalPages = Math.ceil(total / pageSize) || 1
    return NextResponse.json({
      success: true,
      code: 200,
      message: 'success',
      data: {
        items,
        pagination: { page, page_size: pageSize, total, total_pages: totalPages },
      },
      timestamp: this.getTimestamp(),
    })
  }

  /** successList 别名（兼容） */
  static successList<T>(
    items: T[],
    page: number,
    pageSize: number,
    total: number
  ): NextResponse<ListResponse<T>> {
    return this.list(items, page, pageSize, total)
  }

  // ========== 错误响应 ==========

  static error(
    code: ErrorCode,
    message: string,
    errors?: ErrorDetail[]
  ): NextResponse<ErrorResponse> {
    return NextResponse.json(
      { code, message, errors, timestamp: this.getTimestamp() },
      { status: code }
    )
  }

  static badRequest(
    message: string,
    errors?: ErrorDetail[]
  ): NextResponse<ErrorResponse> {
    return this.error(400, message, errors)
  }

  static unauthorized(
    message = 'Unauthorized'
  ): NextResponse<ErrorResponse> {
    return this.error(401, message)
  }

  static forbidden(message = 'Forbidden'): NextResponse<ErrorResponse> {
    return this.error(403, message)
  }

  static notFound(message = 'Not found'): NextResponse<ErrorResponse> {
    return this.error(404, message)
  }

  static conflict(message: string): NextResponse<ErrorResponse> {
    return this.error(409, message)
  }

  static unprocessable(
    message: string,
    errors?: ErrorDetail[]
  ): NextResponse<ErrorResponse> {
    return this.error(422, message, errors)
  }

  static tooManyRequests(
    message = 'Too many requests'
  ): NextResponse<ErrorResponse> {
    return this.error(429, message)
  }

  static internalError(
    message = 'Internal server error'
  ): NextResponse<ErrorResponse> {
    return this.error(500, message)
  }
}

// ========== 常用错误预定义 ==========

export const ApiErrors = {
  UNAUTHORIZED: () => ApiResponse.unauthorized(),
  TOKEN_EXPIRED: () => ApiResponse.unauthorized('Token expired'),
  FORBIDDEN: () => ApiResponse.forbidden(),
  ADMIN_REQUIRED: () => ApiResponse.forbidden('Admin access required'),
  NOT_FOUND: () => ApiResponse.notFound(),
  BAD_REQUEST: (msg: string) => ApiResponse.badRequest(msg),
  INTERNAL_ERROR: () => ApiResponse.internalError(),
  MISSING_PARAM: (param: string) =>
    ApiResponse.badRequest(`Missing parameter: ${param}`),
  DB_ERROR: (msg = 'Database operation failed') => ApiResponse.internalError(msg),
  UNKNOWN_ERROR: (msg = 'Unknown error') => ApiResponse.internalError(msg),
  forbidden: (msg?: string) => ApiResponse.forbidden(msg),
  notFound: (msg?: string) => ApiResponse.notFound(msg),
  badRequest: (msg: string) => ApiResponse.badRequest(msg),
  conflict: (msg: string) => ApiResponse.conflict(msg),
  internalError: (msg?: string) => ApiResponse.internalError(msg),
}

// ========== 便捷函数（兼容旧代码） ==========

export function errorResponse(
  error: unknown,
  message: string
): NextResponse<ErrorResponse> {
  console.error(`[API Error] ${message}:`, error)
  return ApiResponse.internalError(message)
}

export function handleDbError(
  error: { message?: string; code?: string } | unknown,
  message: string
): NextResponse<ErrorResponse> {
  console.error(`[DB Error] ${message}:`, error)
  return ApiResponse.internalError(message)
}
