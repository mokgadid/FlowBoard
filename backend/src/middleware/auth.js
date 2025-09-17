const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    const payload = jwt.verify(token, secret);
    req.userId = payload.sub;
    next();
  } catch (_err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { authRequired };


