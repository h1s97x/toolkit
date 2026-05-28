# @h1s97x/logger

Universal isomorphic logger with structured JSON output. Inspired by [pino](https://getpino.io/), designed for both browser and Node.js environments.

## Features

- Six log levels: trace, debug, info, warn, error, fatal
- Structured JSON output — every log is a valid JSON object
- Child loggers with inherited configuration and bound context
- Pluggable transport layer — console, file, HTTP, Supabase, or custom
- Automatic redaction of sensitive fields (e.g. password, token)
- Serializer support for safe Error serialization
- Dynamic context injection via `mixin`
- Zero core dependencies, lightweight and fast

## Install

```bash
pnpm add @h1s97x/logger
# or
npm install @h1s97x/logger
```

## Quick Start

```ts
import { createLogger } from '@h1s97x/logger'

const logger = createLogger({
  name: 'my-app',
  level: 'info',
})

logger.info({ userId: 'u1' }, 'user login')
// {"level":30,"time":"2026-05-28T07:00:00.000Z","msg":"user login","userId":"u1","name":"my-app"}
```

## API

### createLogger(options)

Creates a new Logger instance.

```ts
const logger = createLogger({
  name: 'my-app',         // Logger name, included in each log line
  level: 'info',          // Minimum level (default: 'info')
  base: { app: 'bank' },  // Base fields merged into every log
  serializers: {          // Keyed serializers for log fields
    err: stdSerializers.err,
  },
  redact: ['password', 'user.token'],  // Fields to redact
  transport: customTransport,          // Custom transport(s)
  mixin: () => ({ seq: ++counter }),   // Dynamic context
  timestamp: true,                     // true, false, or custom fn
})
```

### logger.child(bindings)

Creates a child logger that inherits parent configuration and appends bound context.

```ts
const taskLogger = logger.child({ module: 'task-service', taskId: 'abc-123' })
taskLogger.info({ status: 'running' }, 'task started')
```

### Log Methods

```ts
logger.trace(obj, msg?)
logger.debug(obj, msg?)
logger.info(obj, msg?)
logger.warn(obj, msg?)
logger.error(obj | Error, msg?)
logger.fatal(obj | Error, msg?)
```

### Error Handling

```ts
import { createLogger, stdSerializers } from '@h1s97x/logger'

const logger = createLogger({
  serializers: { err: stdSerializers.err },
})

try {
  // ...
} catch (err) {
  logger.error(err, 'operation failed')
  // Serializes Error to { type, name, message, stack, cause }
}
```

### Redaction

```ts
const logger = createLogger({
  redact: ['password', 'creditCard', 'user.ssn'],
})

logger.info({ username: 'alice', password: 'secret123' }, 'login')
// password field will be replaced with '[Redacted]'
```

### Custom Transport

```ts
import { createLogger } from '@h1s97x/logger'
import type { Transport, LogObject } from '@h1s97x/logger'

const httpTransport: Transport = {
  write(logObj: LogObject) {
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify(logObj),
      headers: { 'Content-Type': 'application/json' },
    })
  },
  onError(err, logObj) {
    console.error('Failed to send log:', err.message)
  },
}

const logger = createLogger({ transport: httpTransport })
```

## Built-in Transports

### ConsoleTransport

```ts
import { createLogger, createConsoleTransport } from '@h1s97x/logger'

const logger = createLogger({ transport: createConsoleTransport() })
```

## Level Thresholds

| Level | Value | Description |
|-------|-------|-------------|
| trace | 10 | Most verbose, detailed tracing |
| debug | 20 | Debugging information |
| info  | 30 | General information (default) |
| warn  | 40 | Warning conditions |
| error | 50 | Error conditions |
| fatal | 60 | Fatal conditions requiring immediate attention |

## License

MIT
