import { Request, Response, NextFunction } from 'express';
import { validateSession, getUserById } from '../database/service';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
      session?: {
        id: string;
        token: string;
      };
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_TOKEN'
    });
  }

  // Validate token
  const session = validateSession(token);

  if (!session) {
    return res.status(401).json({
      error: 'Invalid or expired session',
      code: 'INVALID_TOKEN'
    });
  }

  // Get user info
  const user = getUserById(session.user_id);

  if (!user) {
    return res.status(401).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  // Attach user and session to request
  req.user = {
    id: user.id,
    username: user.username
  };

  req.session = {
    id: session.id,
    token: session.token
  };

  next();
}

// Middleware to check if user is the owner of a board
export function isOwner(boardIdParam: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const boardId = req.params[boardIdParam];
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_USER'
      });
    }

    // The route handler should check ownership
    // This middleware just ensures the user is authenticated
    next();
  };
}
