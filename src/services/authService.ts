import type { Session } from '../types/auth';
import { apiLogin, apiLogout, apiGetSession } from './apiService';

const STORAGE_KEY = 'card-sorting-auth-session';

/**
 * Validate credentials and create session via API
 */
export const login = async (username: string, password: string): Promise<Session | null> => {
  try {
    const response = await apiLogin(username, password);

    if (!response) {
      return null;
    }

    const session: Session = {
      userId: response.user.id,
      username: response.user.username,
      loginTime: response.session.loginTime
    };

    // Store session in localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    return session;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

/**
 * Clear session and logout
 */
export const logout = async (): Promise<void> => {
  try {
    await apiLogout();
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to logout:', error);
    // Still remove session even if API call fails
    localStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * Get current session from localStorage and validate with API
 */
export const getSession = async (): Promise<Session | null> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session: Session = JSON.parse(stored);

    // Validate session with API
    const validationResponse = await apiGetSession();

    if (!validationResponse) {
      // Session invalid, clear it
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
 * Get current session synchronously from localStorage (no API validation)
 * Use this for initial checks, but validate with getSession() for important operations
 */
export const getSessionSync = (): Session | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

/**
 * Check if user is currently authenticated (synchronous check)
 */
export const isAuthenticated = (): boolean => {
  return getSessionSync() !== null;
};
