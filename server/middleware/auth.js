const jwt = require('jsonwebtoken');
const config = require('../config');
const { repository } = require('../db/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = repository.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      childName: user.child_name
    };

    if (user.role === 'therapist') {
      const therapist = repository.getTherapistByUserId(user.id);
      req.user.therapistId = therapist ? therapist.id : user.id;
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = repository.getUserById(decoded.id);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        childName: user.child_name
      };
      if (user.role === 'therapist') {
        const therapist = repository.getTherapistByUserId(user.id);
        req.user.therapistId = therapist ? therapist.id : user.id;
      }
    }
  } catch (err) {
    // Ignore invalid token in optional auth
  }
  next();
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: `Access forbidden: ${requiredRole} account required.` });
    }
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireParent: requireRole('parent'),
  requireTherapist: requireRole('therapist')
};
