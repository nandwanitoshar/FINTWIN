import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
import { UserRepository, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: Omit<IUser, 'passwordHash'>;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Missing or malformed Authorization header.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    const user = await UserRepository.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid session. User no longer exists.',
      });
      return;
    }

    // Attach user without sensitive password hash
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
    return;
  }
};
