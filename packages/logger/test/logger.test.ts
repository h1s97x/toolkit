import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLogger, createConsoleTransport } from '../src/index'
import type { Logger, Transport, LogObject } from '../src/types'

describe('createLogger', () => {
  it('should create a logger with default level info', () => {
    const logger = createLogger()
    expect(logger.level).toBe('info')
  })

  it('should create a logger with custom level', () => {
    const logger = createLogger({ level: 'debug' })
    expect(logger.level).toBe('debug')
  })

  it('should create a logger with a name', () => {
    const logger = createLogger({ name: 'test-app' })
    expect(logger.level).toBe('info')
  })
})

describe('Logger log methods', () => {
  let transport: Transport
  let logs: LogObject[]

  beforeEach(() => {
    logs = []
    transport = {
      write(logObj: LogObject) {
        logs.push(logObj)
      },
    }
  })

  it('should call transport.write with structured log object', () => {
    const logger = createLogger({ transport })
    logger.info({ userId: 'u1' }, 'user login')

    expect(logs).toHaveLength(1)
    expect(logs[0].level).toBe(30)
    expect(logs[0].msg).toBe('user login')
    expect(logs[0].userId).toBe('u1')
    expect(logs[0].time).toBeTruthy()
  })

  it('should not log when level is below threshold', () => {
    const logger = createLogger({ level: 'error', transport })
    logger.info({ test: true }, 'should not appear')
    logger.debug({ test: true }, 'should not appear')
    logger.trace({ test: true }, 'should not appear')

    expect(logs).toHaveLength(0)
  })

  it('should log when level meets threshold', () => {
    const logger = createLogger({ level: 'error', transport })
    logger.error({ test: true }, 'error msg')
    logger.fatal({ test: true }, 'fatal msg')

    expect(logs).toHaveLength(2)
    expect(logs[0].level).toBe(50)
    expect(logs[1].level).toBe(60)
  })

  it('should handle Error objects in error() and fatal()', () => {
    const logger = createLogger({ transport })
    const err = new Error('boom')
    logger.error(err, 'operation failed')

    expect(logs).toHaveLength(1)
    expect(logs[0].msg).toBe('operation failed')
    expect(logs[0].err).toBeInstanceOf(Error)
  })

  it('should include base fields in every log', () => {
    const logger = createLogger({
      base: { app: 'test-app', env: 'dev' },
      transport,
    })
    logger.info({}, 'test')

    expect(logs[0].app).toBe('test-app')
    expect(logs[0].env).toBe('dev')
  })

  it('should apply redaction', () => {
    const logger = createLogger({
      redact: ['password', 'user.secret'],
      transport,
    })
    logger.info({ username: 'alice', password: 'pw', user: { secret: 's' } }, 'test')

    expect(logs[0].username).toBe('alice')
    expect(logs[0].password).toBe('[Redacted]')
    expect(logs[0].user.secret).toBe('[Redacted]')
  })

  it('should apply mixin to inject dynamic context', () => {
    let counter = 0
    const logger = createLogger({
      mixin: () => ({ seq: ++counter }),
      transport,
    })
    logger.info({}, 'first')
    logger.info({}, 'second')

    expect(logs[0].seq).toBe(1)
    expect(logs[1].seq).toBe(2)
  })

  it('should include logger name when provided', () => {
    const logger = createLogger({ name: 'my-service', transport })
    logger.info({}, 'test')

    expect(logs[0].name).toBe('my-service')
  })

  it('should handle timestamp=false', () => {
    const logger = createLogger({ timestamp: false, transport })
    logger.info({}, 'test')

    expect(logs[0].time).toBe('')
  })

  it('should handle custom timestamp function', () => {
    const logger = createLogger({
      timestamp: () => '2026-01-01T00:00:00.000Z',
      transport,
    })
    logger.info({}, 'test')

    expect(logs[0].time).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('child logger', () => {
  let logs: LogObject[]

  beforeEach(() => {
    logs = []
  })

  it('should inherit parent level and bindings', () => {
    const parent = createLogger({
      level: 'warn',
      transport: { write: (o) => logs.push(o) },
      base: { app: 'myapp' },
    })
    const child = parent.child({ module: 'auth' })

    expect(child.level).toBe('warn')
    child.warn({}, 'test')
    expect(logs[0].module).toBe('auth')
    expect(logs[0].app).toBe('myapp')
  })

  it('should merge child bindings with parent bindings', () => {
    const parent = createLogger({
      transport: { write: (o) => logs.push(o) },
    })
    const grandparent = parent.child({ tier: 'api' })
    const child = grandparent.child({ module: 'auth' })

    child.info({}, 'test')
    expect(logs[0].tier).toBe('api')
    expect(logs[0].module).toBe('auth')
  })

  it('should respect parent level in child', () => {
    const parent = createLogger({
      level: 'error',
      transport: { write: (o) => logs.push(o) },
    })
    const child = parent.child({ module: 'auth' })

    child.info({}, 'should not appear')
    expect(logs).toHaveLength(0)

    child.error({}, 'should appear')
    expect(logs).toHaveLength(1)
  })
})

describe('console transport', () => {
  it('should create a console transport without errors', () => {
    const transport = createConsoleTransport()
    expect(transport).toBeDefined()
    expect(typeof transport.write).toBe('function')
  })

  it('should not throw when writing', () => {
    const transport = createConsoleTransport()
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})

    expect(() => {
      transport.write({
        level: 30,
        time: '2026-01-01T00:00:00.000Z',
        msg: 'test',
      })
    }).not.toThrow()

    spy.mockRestore()
  })
})

describe('transport error handling', () => {
  it('should call onError when transport throws', () => {
    const errors: Error[] = []
    const brokenTransport: Transport = {
      write() {
        throw new Error('transport failed')
      },
      onError(err) {
        errors.push(err)
      },
    }

    const logger = createLogger({ transport: brokenTransport })
    expect(() => logger.info({}, 'test')).not.toThrow()
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('transport failed')
  })

  it('should silently ignore transport errors without onError', () => {
    const brokenTransport: Transport = {
      write() {
        throw new Error('transport failed')
      },
    }

    const logger = createLogger({ transport: brokenTransport })
    expect(() => logger.info({}, 'test')).not.toThrow()
  })
})
