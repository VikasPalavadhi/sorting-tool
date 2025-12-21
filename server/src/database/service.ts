import { db } from './init';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Types
export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  login_time: number;
  expires_at: number;
}

export interface Board {
  id: string;
  name: string;
  owner_id: string;
  owner_username: string;
  board_id: string;
  created_at: number;
  updated_at: number;
}

export interface Sticky {
  id: string;
  board_id: string;
  text: string;
  color: string;
  created_at: number;
}

export interface CanvasInstance {
  id: string;
  board_id: string;
  sticky_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  overridden_text?: string;
}

export interface FullBoard extends Board {
  stickies: Sticky[];
  canvasInstances: CanvasInstance[];
}

// ========== USER METHODS ==========

export function getUserByUsername(username: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as User | undefined;
}

export function getUserById(userId: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(userId) as User | undefined;
}

export function validatePassword(username: string, password: string): User | null {
  const user = getUserByUsername(username);
  if (!user) return null;

  const isValid = bcrypt.compareSync(password, user.password_hash);
  return isValid ? user : null;
}

// ========== SESSION METHODS ==========

export function createSession(userId: string): Session {
  const token = randomBytes(32).toString('hex');
  const loginTime = Date.now();
  const expiresAt = loginTime + (7 * 24 * 60 * 60 * 1000); // 7 days

  const session: Session = {
    id: `session-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    user_id: userId,
    token,
    login_time: loginTime,
    expires_at: expiresAt
  };

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, login_time, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(session.id, session.user_id, session.token, session.login_time, session.expires_at);

  return session;
}

export function validateSession(token: string): Session | null {
  const stmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
  const session = stmt.get(token) as Session | undefined;

  if (!session) return null;

  // Check if expired
  if (Date.now() > session.expires_at) {
    deleteSession(token);
    return null;
  }

  return session;
}

export function deleteSession(token: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  stmt.run(token);
}

export function cleanupExpiredSessions(): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
  stmt.run(Date.now());
}

// ========== BOARD METHODS ==========

export interface BoardWithCounts extends Board {
  sticky_count: number;
  canvas_count: number;
}

export function getUserBoards(userId: string): BoardWithCounts[] {
  const stmt = db.prepare(`
    SELECT
      b.*,
      COUNT(DISTINCT s.id) as sticky_count,
      COUNT(DISTINCT ci.id) as canvas_count
    FROM boards b
    LEFT JOIN stickies s ON b.id = s.board_id
    LEFT JOIN canvas_instances ci ON b.id = ci.board_id
    WHERE b.owner_id = ?
    GROUP BY b.id
    ORDER BY b.updated_at DESC
  `);
  return stmt.all(userId) as BoardWithCounts[];
}

export function getBoardMetadata(boardId: string): Board | undefined {
  const stmt = db.prepare('SELECT * FROM boards WHERE id = ?');
  return stmt.get(boardId) as Board | undefined;
}

export function getBoardByBoardId(boardIdField: string): Board | undefined {
  const stmt = db.prepare('SELECT * FROM boards WHERE board_id = ?');
  return stmt.get(boardIdField) as Board | undefined;
}

export function getFullBoard(boardId: string): FullBoard | null {
  const board = getBoardMetadata(boardId);
  if (!board) return null;

  // Get all stickies for this board
  const stickiesStmt = db.prepare('SELECT * FROM stickies WHERE board_id = ? ORDER BY created_at ASC');
  const stickies = stickiesStmt.all(boardId) as Sticky[];

  // Get all canvas instances for this board
  const instancesStmt = db.prepare('SELECT * FROM canvas_instances WHERE board_id = ? ORDER BY z_index ASC');
  const instances = instancesStmt.all(boardId) as CanvasInstance[];

  return {
    ...board,
    stickies,
    canvasInstances: instances
  };
}

export function createBoard(name: string, userId: string, boardIdField?: string): Board {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  const board: Board = {
    id: `board-db-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    name,
    owner_id: userId,
    owner_username: user.username,
    board_id: boardIdField || `board-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    created_at: Date.now(),
    updated_at: Date.now()
  };

  const stmt = db.prepare(`
    INSERT INTO boards (id, name, owner_id, owner_username, board_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    board.id,
    board.name,
    board.owner_id,
    board.owner_username,
    board.board_id,
    board.created_at,
    board.updated_at
  );

  return board;
}

export function updateBoardName(boardId: string, name: string, userId: string): boolean {
  const board = getBoardMetadata(boardId);
  if (!board || board.owner_id !== userId) return false;

  const stmt = db.prepare(`
    UPDATE boards
    SET name = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(name, Date.now(), boardId);
  return true;
}

export function deleteBoard(boardId: string, userId: string): boolean {
  const board = getBoardMetadata(boardId);
  if (!board || board.owner_id !== userId) return false;

  // Delete board (CASCADE will delete stickies and canvas_instances)
  const stmt = db.prepare('DELETE FROM boards WHERE id = ?');
  stmt.run(boardId);

  return true;
}

// ========== STICKY METHODS ==========

export function createSticky(boardId: string, sticky: Omit<Sticky, 'board_id'>): Sticky {
  const newSticky: Sticky = {
    ...sticky,
    board_id: boardId
  };

  const stmt = db.prepare(`
    INSERT INTO stickies (id, board_id, text, color, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    newSticky.id,
    newSticky.board_id,
    newSticky.text,
    newSticky.color,
    newSticky.created_at
  );

  // Update board's updated_at
  updateBoardTimestamp(boardId);

  return newSticky;
}

export function updateSticky(stickyId: string, updates: Partial<Pick<Sticky, 'text' | 'color'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.text !== undefined) {
    fields.push('text = ?');
    values.push(updates.text);
  }

  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }

  if (fields.length === 0) return false;

  values.push(stickyId);

  const stmt = db.prepare(`
    UPDATE stickies
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  // Update board's updated_at
  const sticky = db.prepare('SELECT board_id FROM stickies WHERE id = ?').get(stickyId) as { board_id: string } | undefined;
  if (sticky) {
    updateBoardTimestamp(sticky.board_id);
  }

  return true;
}

export function deleteSticky(stickyId: string): boolean {
  // Get board_id before deleting
  const sticky = db.prepare('SELECT board_id FROM stickies WHERE id = ?').get(stickyId) as { board_id: string } | undefined;

  const stmt = db.prepare('DELETE FROM stickies WHERE id = ?');
  stmt.run(stickyId);

  // Update board's updated_at
  if (sticky) {
    updateBoardTimestamp(sticky.board_id);
  }

  return true;
}

// ========== CANVAS INSTANCE METHODS ==========

export function createCanvasInstance(boardId: string, instance: Omit<CanvasInstance, 'board_id'>): CanvasInstance {
  const newInstance: CanvasInstance = {
    ...instance,
    board_id: boardId
  };

  const stmt = db.prepare(`
    INSERT INTO canvas_instances (id, board_id, sticky_id, x, y, width, height, z_index, overridden_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    newInstance.id,
    newInstance.board_id,
    newInstance.sticky_id,
    newInstance.x,
    newInstance.y,
    newInstance.width,
    newInstance.height,
    newInstance.z_index,
    newInstance.overridden_text || null
  );

  // Update board's updated_at
  updateBoardTimestamp(boardId);

  return newInstance;
}

export function updateCanvasInstance(instanceId: string, updates: Partial<Omit<CanvasInstance, 'id' | 'board_id' | 'sticky_id'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.x !== undefined) {
    fields.push('x = ?');
    values.push(updates.x);
  }

  if (updates.y !== undefined) {
    fields.push('y = ?');
    values.push(updates.y);
  }

  if (updates.width !== undefined) {
    fields.push('width = ?');
    values.push(updates.width);
  }

  if (updates.height !== undefined) {
    fields.push('height = ?');
    values.push(updates.height);
  }

  if (updates.z_index !== undefined) {
    fields.push('z_index = ?');
    values.push(updates.z_index);
  }

  if (updates.overridden_text !== undefined) {
    fields.push('overridden_text = ?');
    values.push(updates.overridden_text || null);
  }

  if (fields.length === 0) return false;

  values.push(instanceId);

  const stmt = db.prepare(`
    UPDATE canvas_instances
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  // Update board's updated_at
  const instance = db.prepare('SELECT board_id FROM canvas_instances WHERE id = ?').get(instanceId) as { board_id: string } | undefined;
  if (instance) {
    updateBoardTimestamp(instance.board_id);
  }

  return true;
}

export function deleteCanvasInstance(instanceId: string): boolean {
  // Get board_id before deleting
  const instance = db.prepare('SELECT board_id FROM canvas_instances WHERE id = ?').get(instanceId) as { board_id: string } | undefined;

  const stmt = db.prepare('DELETE FROM canvas_instances WHERE id = ?');
  stmt.run(instanceId);

  // Update board's updated_at
  if (instance) {
    updateBoardTimestamp(instance.board_id);
  }

  return true;
}

// ========== BULK SAVE METHODS ==========

export function saveBoardState(
  boardId: string,
  stickies: Omit<Sticky, 'board_id'>[],
  instances: Omit<CanvasInstance, 'board_id'>[]
): void {
  // Use transaction for atomic operation
  const saveTransaction = db.transaction(() => {
    // Delete all existing stickies and instances for this board
    db.prepare('DELETE FROM canvas_instances WHERE board_id = ?').run(boardId);
    db.prepare('DELETE FROM stickies WHERE board_id = ?').run(boardId);

    // Insert all stickies
    const insertSticky = db.prepare(`
      INSERT INTO stickies (id, board_id, text, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const sticky of stickies) {
      insertSticky.run(sticky.id, boardId, sticky.text, sticky.color, sticky.created_at);
    }

    // Insert all canvas instances
    const insertInstance = db.prepare(`
      INSERT INTO canvas_instances (id, board_id, sticky_id, x, y, width, height, z_index, overridden_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const instance of instances) {
      insertInstance.run(
        instance.id,
        boardId,
        instance.sticky_id,
        instance.x,
        instance.y,
        instance.width,
        instance.height,
        instance.z_index,
        instance.overridden_text || null
      );
    }

    // Update board timestamp
    updateBoardTimestamp(boardId);
  });

  saveTransaction();
}

// ========== HELPER METHODS ==========

function updateBoardTimestamp(boardId: string): void {
  const stmt = db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?');
  stmt.run(Date.now(), boardId);
}
