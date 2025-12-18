import type { User, Session } from '../types/auth';

const STORAGE_KEY = 'card-sorting-auth-session';

// Hardcoded users for authentication
const USERS: User[] = [
  { id: '1', username: 'user1', password: 'martechuser1' },
  { id: '2', username: 'user2', password: 'martechuser2' }
];

/**
 * Validate credentials and create session
 */
export const login = (username: string, password: string): Session | null => {
  const user = USERS.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return null;
  }

  const session: Session = {
    userId: user.id,
    username: user.username,
    loginTime: Date.now()
  };

  // Store session in localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session:', error);
  }

  return session;
};

/**
 * Clear session and logout
 */
export const logout = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove session:', error);
  }
};

/**
 * Get current session from localStorage
 */
export const getSession = (): Session | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session: Session = JSON.parse(stored);

    // Optional: Check if session is expired (e.g., 7 days)
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    if (Date.now() - session.loginTime > MAX_AGE) {
      logout();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = (): boolean => {
  return getSession() !== null;
};
