import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { SCHEMA, INDEXES } from './schema';

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database file path
const DB_PATH = path.join(DATA_DIR, 'cards.db');

// Initialize database connection
export const db = new Database(DB_PATH, {
  verbose: console.log // Log SQL statements in development
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
export function initializeDatabase() {
  console.log('🔧 Initializing database...');

  // Create all tables
  db.exec(SCHEMA.users);
  db.exec(SCHEMA.boards);
  db.exec(SCHEMA.stickies);
  db.exec(SCHEMA.canvas_instances);
  db.exec(SCHEMA.sessions);

  // Create indexes
  db.exec(INDEXES.boardsByOwner);
  db.exec(INDEXES.boardByBoardId);
  db.exec(INDEXES.stickyByBoard);
  db.exec(INDEXES.canvasInstanceByBoard);
  db.exec(INDEXES.sessionByToken);

  console.log('✅ Database tables and indexes created');

  // Seed initial users if they don't exist
  seedUsers();
}

// Seed the 5 hardcoded users
function seedUsers() {
  const users = [
    { id: '1', username: 'user1', password: 'martechuser1' },
    { id: '2', username: 'user2', password: 'martechuser2' },
    { id: '3', username: 'user3', password: 'martechuser3' },
    { id: '4', username: 'user4', password: 'martechuser4' },
    { id: '5', username: 'user5', password: 'martechuser5' }
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const existingUsersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (existingUsersCount.count === 0) {
    console.log('👥 Seeding initial users...');

    for (const user of users) {
      // Hash password with bcrypt (10 salt rounds)
      const passwordHash = bcrypt.hashSync(user.password, 10);

      insertUser.run(
        user.id,
        user.username,
        passwordHash,
        Date.now()
      );

      console.log(`  ✓ Created user: ${user.username}`);
    }

    console.log('✅ All users seeded successfully');
  } else {
    console.log(`ℹ️  Database already has ${existingUsersCount.count} users, skipping seed`);
  }
}

// Export helper to get database stats
export function getDatabaseStats() {
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const boardsCount = db.prepare('SELECT COUNT(*) as count FROM boards').get() as { count: number };
  const stickiesCount = db.prepare('SELECT COUNT(*) as count FROM stickies').get() as { count: number };
  const instancesCount = db.prepare('SELECT COUNT(*) as count FROM canvas_instances').get() as { count: number };

  return {
    users: usersCount.count,
    boards: boardsCount.count,
    stickies: stickiesCount.count,
    canvasInstances: instancesCount.count,
    dbPath: DB_PATH
  };
}

// Initialize on import
initializeDatabase();

console.log('📊 Database stats:', getDatabaseStats());
