import { describe, it, expect } from 'vitest'
import { errSerializer } from '../src/serializers/err'

describe('errSerializer', () => {
  it('should serialize an Error with name, message, stack', () => {
    const err = new Error('something went wrong')
    const result = errSerializer(err)

    expect(result.type).toBe('Error')
    expect(result.name).toBe('Error')
    expect(result.message).toBe('something went wrong')
    expect(typeof result.stack).toBe('string')
  })

  it('should serialize an Error with a cause', () => {
    const cause = new Error('root cause')
    const err = new Error('wrapper', { cause })
    const result = errSerializer(err)

    expect(result.message).toBe('wrapper')
    expect(result.cause).toBeDefined()
    const c = result.cause as Record<string, unknown>
    expect(c.message).toBe('root cause')
  })

  it('should include custom properties on Error', () => {
    const err = new Error('not found') as Error & { statusCode: number }
    ;(err as Record<string, unknown>).statusCode = 404
    const result = errSerializer(err)

    expect(result.statusCode).toBe(404)
  })

  it('should handle non-Error values', () => {
    const result = errSerializer('just a string')
    expect(result.type).toBe('string')
    expect(result.value).toBe('just a string')
  })

  it('should handle null', () => {
    const result = errSerializer(null)
    expect(result.type).toBe('object')
    expect(result.value).toBeNull()
  })
})
