import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RequestQueueManager, getRequestQueue } from '@h1s97x/request-queue';

describe('RequestQueueManager', () => {
  let queue: RequestQueueManager;

  beforeEach(() => {
    queue = new RequestQueueManager({
      maxSize: 10,
      maxWaitTime: 5000,
      bucketCapacity: 5,
      requestsPerSecond: 10,
    });
  });

  afterEach(() => {
    queue.destroy();
  });

  it('should initialize with correct stats', () => {
    const stats = queue.getStats();
    expect(stats.waiting).toBe(0);
    expect(stats.processing).toBe(0);
    expect(stats.completed).toBe(0);
  });

  it('should enqueue and execute tasks', async () => {
    const result = await queue.enqueue(() => Promise.resolve('done'));
    expect(result).toBe('done');
  });

  it('should process tasks in FIFO order', async () => {
    const order: number[] = [];

    const p1 = queue.enqueue(() => {
      order.push(1);
      return Promise.resolve(1);
    });
    const p2 = queue.enqueue(() => {
      order.push(2);
      return Promise.resolve(2);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it('should respect rate limiting', async () => {
    const queue = new RequestQueueManager({
      maxSize: 10,
      maxWaitTime: 5000,
      bucketCapacity: 2,
      requestsPerSecond: 1,
    });

    const start = Date.now();
    await Promise.all([
      queue.enqueue(() => Promise.resolve(1)),
      queue.enqueue(() => Promise.resolve(2)),
      queue.enqueue(() => Promise.resolve(3)),
    ]);
    const elapsed = Date.now() - start;

    // With bucket capacity 2 and 1 req/s, 3 tasks should take at least ~1s
    expect(elapsed).toBeGreaterThanOrEqual(900);
    queue.destroy();
  });

  it('should reject when queue is full', async () => {
    const queue = new RequestQueueManager({
      maxSize: 1,
      maxWaitTime: 5000,
      bucketCapacity: 0, // No tokens - jobs won't be processed
      requestsPerSecond: 0,
    });

    // Fill the queue (add catch to suppress unhandled rejection)
    void queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 1000))).catch(() => {});

    // Wait a bit to ensure the first enqueue has completed
    await new Promise(r => setTimeout(r, 50));

    // This should fail immediately
    await expect(
      queue.enqueue(() => Promise.resolve('test')),
    ).rejects.toThrow('Queue is full');
    queue.destroy();
  });

  it('should timeout tasks that wait too long', async () => {
    const queue = new RequestQueueManager({
      maxSize: 10,
      maxWaitTime: 100,
      bucketCapacity: 0, // No tokens available
      requestsPerSecond: 0,
    });

    // Fill the bucket by acquiring all tokens
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 10; i++) {
      // Add catch to suppress unhandled rejections
      const p = queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 10000)));
      p.catch(() => {});
      promises.push(p);
    }

    // Wait for timeout
    await new Promise(r => setTimeout(r, 200));

    // Cleanup should have evicted the tasks
    const stats = queue.getStats();
    expect(stats.timeout).toBeGreaterThan(0);

    // Clean up
    queue.destroy();
    await Promise.all(promises.map(p => p.catch(() => {})));
  });

  it('should provide accurate stats', async () => {
    const queue = new RequestQueueManager({
      maxSize: 10,
      maxWaitTime: 5000,
      bucketCapacity: 10,
      requestsPerSecond: 100,
    });

    await queue.enqueue(() => Promise.resolve(1));
    await queue.enqueue(() => Promise.resolve(2));

    const stats = queue.getStats();
    expect(stats.completed).toBe(2);
    expect(stats.totalProcessed).toBe(2);
    queue.destroy();
  });

  it('should estimate wait time', () => {
    const queue = new RequestQueueManager({
      maxSize: 10,
      maxWaitTime: 5000,
      bucketCapacity: 0,   // 不处理，让任务留在队列
      requestsPerSecond: 0,
    });

    expect(queue.getEstimatedWaitTime()).toBe(0);

    // Mock some waiting tasks
    queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 10000)));
    queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 10000)));

    const waitTime = queue.getEstimatedWaitTime();
    expect(waitTime).toBeGreaterThan(0);
    queue.destroy();
  });

  it('should check if can enqueue', () => {
    const queue = new RequestQueueManager({
      maxSize: 2,
      maxWaitTime: 5000,
      bucketCapacity: 0,   // 不处理，任务留在队列
      requestsPerSecond: 0,
    });

    expect(queue.canEnqueue().allowed).toBe(true);

    queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 10000))).catch(() => {});
    queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 10000))).catch(() => {});

    expect(queue.canEnqueue().allowed).toBe(false);
    queue.destroy();
  });

  it('should clear all tasks', async () => {
    const queue = new RequestQueueManager({
      maxSize: 10,
      maxWaitTime: 5000,
      bucketCapacity: 0,   // 不处理，任务留在队列
      requestsPerSecond: 0,
    });

    const p1 = queue.enqueue(() => Promise.resolve(1));
    const p2 = queue.enqueue(() => Promise.resolve(2));

    queue.clear();

    // After clear, waiting tasks should be rejected
    await expect(p1).rejects.toThrow('Queue has been cleared');
    await expect(p2).rejects.toThrow('Queue has been cleared');
    queue.destroy();
  });

  it('should destroy and release resources', async () => {
    const queue = new RequestQueueManager({
      maxSize: 10,
      maxWaitTime: 5000,
      bucketCapacity: 0,   // 不处理，任务留在队列
      requestsPerSecond: 0,
    });

    const p = queue.enqueue(() => Promise.resolve(1));
    queue.destroy();

    // After destroy, waiting tasks should be rejected
    await expect(p).rejects.toThrow('Queue has been cleared');
  });
});

describe('getRequestQueue singleton', () => {
  it('should return the same instance', () => {
    const q1 = getRequestQueue();
    const q2 = getRequestQueue();
    expect(q1).toBe(q2);
  });
});
