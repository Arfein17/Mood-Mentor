/**
 * server/middleware/logging.js
 *
 * Privacy-respecting request logger.
 *
 * REDACTION RULES:
 *  - req.body.text is NEVER logged (could be sensitive wellness content)
 *  - Multipart image buffers are NEVER logged
 *  - employeeId is logged only in development mode (omitted in production)
 *  - All other standard request metadata (method, path, status, ms) is logged
 */

'use strict';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Express middleware that logs requests with sensitive fields redacted.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Capture response finish event to log status + duration
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const parts = [
      `[REQ]`,
      req.method.padEnd(6),
      req.path.padEnd(32),
      String(res.statusCode),
      `${durationMs}ms`,
    ];

    // Include employeeId only in development — never in production
    if (!isProd && req.body && req.body.employeeId) {
      parts.push(`id=${redactId(req.body.employeeId)}`);
    }

    console.log(parts.join(' '));
  });

  next();
}

/**
 * Partially redact an ID for log safety.
 * e.g. "EMP12345" → "EMP1****"
 */
function redactId(id) {
  if (!id || typeof id !== 'string') return '[id]';
  const visible = Math.min(4, id.length);
  return id.slice(0, visible) + '*'.repeat(Math.max(0, id.length - visible));
}

module.exports = { requestLogger, redactId };
