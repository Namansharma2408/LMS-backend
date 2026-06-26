import jwt from 'jsonwebtoken';
import { getUsers } from '../data/db.js';

// Protect routes - verify token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexus_secret_key');

      // Check if user still exists in JSON database
      const users = await getUsers();
      const user = users.find(u => u._id === decoded.id || u.email === decoded.email);

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (user.status === 'Suspended') {
        return res.status(403).json({ message: 'User account is suspended' });
      }

      // Attach user details to request
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        purchasedCourseIds: user.purchasedCourseIds || []
      };

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Authorize roles (RBAC)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};
