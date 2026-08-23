'use strict';

const buckets = new Map();

/**
 * Minimal in-memory fixed-window rate limiter (no external deps).
 * Skipped automatically when NODE_ENV === 'test'.
 */
function rateLimit({ windowMs = 60000, max = 60, keyBy = 'ip', message = 'Too many requests. Please slow down.' } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    if (process.env.NODE_ENV === 'test') return next();

    const identity = keyBy === 'user'
      ? String(req.body?.userId || req.body?.employeeId || '')
      : '';
    const key = `${req.ip || 'unknown'}:${identity}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    // Periodic sweep so the map cannot grow unbounded
    if (buckets.size > 10000) {
      for (const [k, b] of buckets) {
        if (now - b.start > windowMs) buckets.delete(k);
      }
    }

    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}

module.exports = { rateLimit };
