const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Use persistent storage on Render, local storage in dev
const isProduction = process.env.NODE_ENV === 'production';
let dbPath = path.join(__dirname, 'underground.db');

if (isProduction) {
  // Check if /data exists (Render disk), otherwise use local
  if (fs.existsSync('/data')) {
    dbPath = '/data/underground.db';
    console.log('📁 Using persistent disk at /data');
  } else {
    console.log('⚠️ /data not found, using local database');
  }
}

console.log('🗄️ Database path:', dbPath);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    displayName TEXT NOT NULL,
    avatar TEXT DEFAULT NULL,
    banner TEXT DEFAULT NULL,
    bio TEXT DEFAULT 'Nuovo su UnderGround!',
    status TEXT DEFAULT 'online',
    mood TEXT DEFAULT '😊',
    theme TEXT DEFAULT 'sunset',
    badges TEXT DEFAULT '[]',
    socialLinks TEXT DEFAULT '{}',
    age INTEGER NOT NULL,
    privateProfile INTEGER DEFAULT 1,
    safeComments INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '📢',
    isPublic INTEGER DEFAULT 1,
    createdBy TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS channel_members (
    channelId TEXT NOT NULL,
    userId TEXT NOT NULL,
    joinedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channelId, userId),
    FOREIGN KEY (channelId) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS groups_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    avatar TEXT DEFAULT NULL,
    adminId TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (adminId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joinedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (groupId, userId),
    FOREIGN KEY (groupId) REFERENCES groups_table(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    authorId TEXT NOT NULL,
    channelId TEXT,
    publishAsChannelId TEXT DEFAULT NULL,
    text TEXT NOT NULL,
    imageBase64 TEXT DEFAULT NULL,
    videoBase64 TEXT DEFAULT NULL,
    documentBase64 TEXT DEFAULT NULL,
    documentName TEXT DEFAULT NULL,
    documentType TEXT DEFAULT NULL,
    mediaType TEXT DEFAULT 'text',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (channelId) REFERENCES channels(id) ON DELETE SET NULL,
    FOREIGN KEY (publishAsChannelId) REFERENCES channels(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    authorId TEXT NOT NULL,
    text TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    postId TEXT NOT NULL,
    userId TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (postId, userId),
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS direct_messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    text TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS group_messages (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    text TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES groups_table(id) ON DELETE CASCADE,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS moderation_log (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    userId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reels (
    id TEXT PRIMARY KEY,
    authorId TEXT NOT NULL,
    title TEXT NOT NULL,
    imageBase64 TEXT,
    videoBase64 TEXT,
    mediaType TEXT DEFAULT 'image',
    duration INTEGER DEFAULT 0,
    isShort INTEGER DEFAULT 1,
    likes INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    uploaderId TEXT NOT NULL,
    type TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    fileName TEXT,
    fileSize INTEGER DEFAULT 0,
    dataBase64 TEXT NOT NULL,
    thumbnailBase64 TEXT,
    duration INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaderId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reel_likes (
    reelId TEXT NOT NULL,
    userId TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reelId, userId),
    FOREIGN KEY (reelId) REFERENCES reels(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed default channels
const defaultChannels = [
  { id: 'ch-scuola', name: 'Scuola', description: 'Discussioni sulla scuola', icon: '📚' },
  { id: 'ch-sport', name: 'Sport', description: 'Tutto sullo sport', icon: '⚽' },
  { id: 'ch-musica', name: 'Musica', description: 'Condividi la tua musica', icon: '🎵' },
  { id: 'ch-gaming', name: 'Gaming', description: 'Videogiochi e gaming', icon: '🎮' },
  { id: 'ch-arte', name: 'Arte', description: 'Creatività e arte', icon: '🎨' },
  { id: 'ch-scienza', name: 'Scienza', description: 'Scienza e tecnologia', icon: '🔬' },
  { id: 'ch-cucina', name: 'Cucina', description: 'Ricette e cucina', icon: '🍳' },
];

const insertChannel = db.prepare(`
  INSERT OR IGNORE INTO channels (id, name, description, icon, isPublic) 
  VALUES (?, ?, ?, ?, 1)
`);

for (const ch of defaultChannels) {
  insertChannel.run(ch.id, ch.name, ch.description, ch.icon);
}

// Helper functions
const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  db,
  hashPassword,
  verifyPassword,
  generateId
};
