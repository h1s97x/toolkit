import { describe, it, expect } from 'vitest'
import {
  ApiResponse,
  ApiErrors,
  errorResponse,
  handleDbError,
} from '../src/response'

describe('ApiResponse.success', () => {
  it('should return 200 with data', async () => {
    const res = ApiResponse.success({ id: 1 })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.code).toBe(200)
    expect(body.data).toEqual({ id: 1 })
    expect(body.success).toBe(true)
    expect(body.timestamp).toBeTypeOf('number')
  })
})

describe('ApiResponse.created', () => {
  it('should return 201', async () => {
    const res = ApiResponse.created({ id: 1 })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.code).toBe(201)
  })
})

describe('ApiResponse.noContent', () => {
  it('should return 204', () => {
    const res = ApiResponse.noContent()
    expect(res.status).toBe(204)
  })
})

describe('ApiResponse.list', () => {
  it('should return paginated list', async () => {
    const res = ApiResponse.list(['a', 'b'], 1, 10, 25)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.data.items).toEqual(['a', 'b'])
    expect(body.data.pagination).toEqual({
      page: 1,
      page_size: 10,
      total: 25,
      total_pages: 3,
    })
  })

  it('should handle zero total', async () => {
    const res = ApiResponse.list([], 1, 10, 0)
    const body = await res.json()
    expect(body.data.pagination.total_pages).toBe(1)
  })
})

describe('ApiResponse error methods', () => {
  it('badRequest should return 400', async () => {
    const res = ApiResponse.badRequest('Invalid input')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toBe('Invalid input')
  })

  it('unauthorized should return 401', async () => {
    const res = ApiResponse.unauthorized()
    expect(res.status).toBe(401)
  })

  it('forbidden should return 403', async () => {
    const res = ApiResponse.forbidden()
    expect(res.status).toBe(403)
  })

  it('notFound should return 404', async () => {
    const res = ApiResponse.notFound()
    expect(res.status).toBe(404)
  })

  it('conflict should return 409', async () => {
    const res = ApiResponse.conflict('Duplicate')
    expect(res.status).toBe(409)
  })

  it('unprocessable should return 422 with errors', async () => {
    const res = ApiResponse.unprocessable('Validation failed', [
      { field: 'name', message: 'required' },
    ])
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.errors).toHaveLength(1)
  })

  it('tooManyRequests should return 429', async () => {
    const res = ApiResponse.tooManyRequests()
    expect(res.status).toBe(429)
  })

  it('internalError should return 500', async () => {
    const res = ApiResponse.internalError()
    expect(res.status).toBe(500)
  })

  it('error with custom status', async () => {
    const res = ApiResponse.error(422, 'Custom error')
    expect(res.status).toBe(422)
  })
})

describe('ApiErrors', () => {
  it('should provide named error factories', async () => {
    const res = ApiErrors.NOT_FOUND()
    expect(res.status).toBe(404)

    const res2 = ApiErrors.MISSING_PARAM('userId')
    expect(res2.status).toBe(400)
    const body = await res2.json()
    expect(body.message).toContain('userId')
  })
})

describe('errorResponse', () => {
  it('should return 500', () => {
    const res = errorResponse(new Error('db crash'), 'Query failed')
    expect(res.status).toBe(500)
  })
})

describe('handleDbError', () => {
  it('should return 500', () => {
    const res = handleDbError({ message: 'connection lost' }, 'DB error')
    expect(res.status).toBe(500)
  })
})
