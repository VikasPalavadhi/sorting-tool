import { Router, Request, Response } from 'express';
import { validatePassword, createSession, validateSession, deleteSession, getUserById } from '../database/service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required',
      code: 'MISSING_CREDENTIALS'
    });
  }

  // Validate credentials
  const user = validatePassword(username, password);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid username or password',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Create session
  const session = createSession(user.id);

  // Return session info
  res.json({
    success: true,
    token: session.token,
    user: {
      id: user.id,
      username: user.username
    },
    session: {
      loginTime: session.login_time,
      expiresAt: session.expires_at
    }
  });
});

/**
 * POST /api/auth/logout
 * Logout and clear session
 */
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  const token = req.session?.token;

  if (token) {
    deleteSession(token);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/session
 * Validate current session and get user info
 */
router.get('/session', authenticateToken, (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      error: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

export default router;
