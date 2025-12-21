import type { Project } from '../types';

// API base URL - use environment variable or detect based on mode
// In production, use empty string (relative URLs) so requests go to same domain
// In development, use localhost
const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('card-sorting-auth-token');
}

// Helper to make authenticated requests
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });

  return response;
}

// ========== AUTH API ==========

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
  };
  session: {
    loginTime: number;
    expiresAt: number;
  };
}

export interface SessionResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
  };
}

export async function apiLogin(username: string, password: string): Promise<LoginResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      console.error('Login failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('card-sorting-auth-token', data.token);
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await authenticatedFetch('/api/auth/logout', {
      method: 'POST'
    });

    // Remove token from localStorage
    localStorage.removeItem('card-sorting-auth-token');
  } catch (error) {
    console.error('Logout error:', error);
    // Still remove token even if request fails
    localStorage.removeItem('card-sorting-auth-token');
  }
}

export async function apiGetSession(): Promise<SessionResponse | null> {
  try {
    const response = await authenticatedFetch('/api/auth/session');

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

// ========== BOARDS API ==========

export interface BoardMetadata {
  id: string;
  name: string;
  boardId: string;
  ownerId: string;
  ownerUsername: string;
  createdAt: number;
  updatedAt: number;
  stickyCount: number;
  canvasCount: number;
}

export interface FullBoardResponse {
  success: boolean;
  board: {
    id: string;
    name: string;
    boardId: string;
    ownerId: string;
    ownerUsername: string;
    createdAt: number;
    updatedAt: number;
    stickies: Array<{
      id: string;
      text: string;
      color: string;
      created_at: number;
    }>;
    canvasInstances: Array<{
      id: string;
      sticky_id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      z_index: number;
      overridden_text?: string;
    }>;
  };
}

export async function apiGetAllBoards(): Promise<BoardMetadata[]> {
  try {
    const response = await authenticatedFetch('/api/boards');

    if (!response.ok) {
      console.error('Failed to get boards:', response.status);
      return [];
    }

    const data = await response.json();
    return data.boards || [];
  } catch (error) {
    console.error('Get boards error:', error);
    return [];
  }
}

export async function apiGetBoard(boardId: string): Promise<Project | null> {
  try {
    const response = await authenticatedFetch(`/api/boards/${boardId}`);

    if (!response.ok) {
      console.error('Failed to get board:', response.status);
      return null;
    }

    const data: FullBoardResponse = await response.json();

    // Convert database format to Project format
    const project: Project = {
      id: data.board.id,
      name: data.board.name,
      boardId: data.board.boardId,
      ownerId: data.board.ownerId,
      ownerUsername: data.board.ownerUsername,
      createdAt: data.board.createdAt,
      updatedAt: data.board.updatedAt,
      stickies: data.board.stickies.map(s => ({
        id: s.id,
        text: s.text,
        color: s.color,
        createdAt: s.created_at
      })),
      canvasInstances: data.board.canvasInstances.map(ci => ({
        id: ci.id,
        stickyId: ci.sticky_id,
        x: ci.x,
        y: ci.y,
        width: ci.width,
        height: ci.height,
        zIndex: ci.z_index,
        overriddenText: ci.overridden_text
      }))
    };

    return project;
  } catch (error) {
    console.error('Get board error:', error);
    return null;
  }
}

export async function apiGetBoardByBoardId(boardIdField: string): Promise<Project | null> {
  try {
    const response = await authenticatedFetch(`/api/boards/by-board-id/${boardIdField}`);

    if (!response.ok) {
      console.error('Failed to get board by boardId:', response.status);
      return null;
    }

    const data: FullBoardResponse = await response.json();

    // Convert database format to Project format
    const project: Project = {
      id: data.board.id,
      name: data.board.name,
      boardId: data.board.boardId,
      ownerId: data.board.ownerId,
      ownerUsername: data.board.ownerUsername,
      createdAt: data.board.createdAt,
      updatedAt: data.board.updatedAt,
      stickies: data.board.stickies.map(s => ({
        id: s.id,
        text: s.text,
        color: s.color,
        createdAt: s.created_at
      })),
      canvasInstances: data.board.canvasInstances.map(ci => ({
        id: ci.id,
        stickyId: ci.sticky_id,
        x: ci.x,
        y: ci.y,
        width: ci.width,
        height: ci.height,
        zIndex: ci.z_index,
        overriddenText: ci.overridden_text
      }))
    };

    return project;
  } catch (error) {
    console.error('Get board by boardId error:', error);
    return null;
  }
}

export async function apiCreateBoard(name: string, boardId?: string): Promise<BoardMetadata | null> {
  try {
    const response = await authenticatedFetch('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ name, boardId })
    });

    if (!response.ok) {
      console.error('Failed to create board:', response.status);
      return null;
    }

    const data = await response.json();
    return data.board;
  } catch (error) {
    console.error('Create board error:', error);
    return null;
  }
}

export async function apiUpdateBoardName(boardId: string, name: string): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`/api/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });

    return response.ok;
  } catch (error) {
    console.error('Update board error:', error);
    return false;
  }
}

export async function apiDeleteBoard(boardId: string): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`/api/boards/${boardId}`, {
      method: 'DELETE'
    });

    return response.ok;
  } catch (error) {
    console.error('Delete board error:', error);
    return false;
  }
}

export async function apiSaveBoardState(
  boardId: string,
  stickies: any[],
  canvasInstances: any[]
): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`/api/boards/${boardId}/save`, {
      method: 'POST',
      body: JSON.stringify({ stickies, canvasInstances })
    });

    return response.ok;
  } catch (error) {
    console.error('Save board state error:', error);
    return false;
  }
}
