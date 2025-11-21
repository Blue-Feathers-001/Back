import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { cache, CacheKeys, CacheTTL } from '../utils/cache';

interface JwtPayload {
  id: string;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ message: 'Not authorized to access this route' });
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtPayload;

      // OPTIMIZED: Check cache first, then DB with lean() for performance
      const cacheKey = CacheKeys.user(decoded.id);
      let user = cache.get<IUser>(cacheKey);

      if (!user) {
        const dbUser = await User.findById(decoded.id).lean();
        if (dbUser) {
          user = dbUser as unknown as IUser;
          cache.set(cacheKey, user, CacheTTL.USER);
        }
      }

      if (!user) {
        res.status(401).json({ message: 'User not found' });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized to access this route' });
      return;
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Invalidate user cache when user data changes
export const invalidateUserCache = (userId: string): void => {
  cache.delete(CacheKeys.user(userId));
};

export const authorize = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: `User role ${req.user?.role} is not authorized to access this route`,
      });
      return;
    }
    next();
  };
};
