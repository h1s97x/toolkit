# @h1s97x/rate-limiter

## 0.1.2

### Patch Changes

- Fix: add missing cleanup() method to RequestQueueManager. Constructor called this.cleanup() every 10s via setInterval but the method was never defined, causing "this.cleanup is not a function" runtime error.

## 0.1.1

### Patch Changes

- Initial npm release of @h1s97x/rate-limiter
