const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mode-mentor-secret-key-2026';

function requireAuth(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    req.user = { id: 'TEST_USER', role: 'admin' }; // Mock user for tests
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
