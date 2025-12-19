export const SCHEMA = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `,

  boards: `
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_username TEXT NOT NULL,
      board_id TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `,

  stickies: `
    CREATE TABLE IF NOT EXISTS stickies (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      text TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    )
  `,

  canvas_instances: `
    CREATE TABLE IF NOT EXISTS canvas_instances (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      sticky_id TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      z_index INTEGER NOT NULL,
      overridden_text TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (sticky_id) REFERENCES stickies(id) ON DELETE CASCADE
    )
  `,

  sessions: `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      login_time INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `
};

// Indexes for better query performance
export const INDEXES = {
  boardsByOwner: `
    CREATE INDEX IF NOT EXISTS idx_boards_owner_id
    ON boards(owner_id)
  `,

  boardByBoardId: `
    CREATE INDEX IF NOT EXISTS idx_boards_board_id
    ON boards(board_id)
  `,

  stickyByBoard: `
    CREATE INDEX IF NOT EXISTS idx_stickies_board_id
    ON stickies(board_id)
  `,

  canvasInstanceByBoard: `
    CREATE INDEX IF NOT EXISTS idx_canvas_instances_board_id
    ON canvas_instances(board_id)
  `,

  sessionByToken: `
    CREATE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions(token)
  `
};
