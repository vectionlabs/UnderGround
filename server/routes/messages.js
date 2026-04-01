const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get conversations list
router.get('/conversations', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  // Get all users that have exchanged messages with current user
  const conversations = db.prepare(`
    SELECT DISTINCT 
      CASE WHEN senderId = ? THEN receiverId ELSE senderId END as oderId,
      MAX(createdAt) as lastMessageAt
    FROM direct_messages
    WHERE senderId = ? OR receiverId = ?
    GROUP BY oderId
    ORDER BY lastMessageAt DESC
  `).all(userId, userId, userId);

  // Get user details and last message for each conversation
  const result = conversations.map(conv => {
    const user = db.prepare('SELECT id, username, displayName, avatar, status FROM users WHERE id = ?').get(conv.oderId);
    const lastMessage = db.prepare(`
      SELECT * FROM direct_messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY createdAt DESC LIMIT 1
    `).get(userId, conv.oderId, conv.oderId, userId);
    
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM direct_messages 
      WHERE senderId = ? AND receiverId = ? AND read = 0
    `).get(conv.oderId, userId).count;

    return {
      user,
      lastMessage,
      unreadCount
    };
  });

  res.json(result);
});

// Get messages with specific user
router.get('/with/:userId', (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const otherId = req.params.userId;

  // Mark messages as read
  db.prepare(`
    UPDATE direct_messages SET read = 1 
    WHERE senderId = ? AND receiverId = ? AND read = 0
  `).run(otherId, currentUserId);

  const messages = db.prepare(`
    SELECT dm.*, u.displayName as senderName, u.avatar as senderAvatar
    FROM direct_messages dm
    JOIN users u ON dm.senderId = u.id
    WHERE (dm.senderId = ? AND dm.receiverId = ?) OR (dm.senderId = ? AND dm.receiverId = ?)
    ORDER BY dm.createdAt ASC
    LIMIT 100
  `).all(currentUserId, otherId, otherId, currentUserId);

  res.json(messages);
});

// Send direct message
router.post('/send', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { receiverId, text } = req.body;
  if (!receiverId || !text?.trim()) {
    return res.status(400).json({ error: 'Destinatario e testo richiesti' });
  }

  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(receiverId);
  if (!receiver) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  const modResult = moderateText(text);
  if (!modResult.allowed) {
    db.prepare('INSERT INTO moderation_log (id, type, message, userId) VALUES (?, ?, ?, ?)').run(
      generateId(), 'blocked', `DM bloccato: ${modResult.riskTags.join(', ')}`, userId
    );
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  db.prepare(`
    INSERT INTO direct_messages (id, senderId, receiverId, text)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, receiverId, modResult.cleanText);

  const message = db.prepare(`
    SELECT dm.*, u.displayName as senderName, u.avatar as senderAvatar
    FROM direct_messages dm
    JOIN users u ON dm.senderId = u.id
    WHERE dm.id = ?
  `).get(id);

  res.json(message);
});

// Get unread count
router.get('/unread', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const count = db.prepare(`
    SELECT COUNT(*) as count FROM direct_messages WHERE receiverId = ? AND read = 0
  `).get(userId).count;

  res.json({ count });
});

// Search users for new conversation
router.get('/search-users', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }

  const users = db.prepare(`
    SELECT id, username, displayName, avatar, status 
    FROM users 
    WHERE id != ? AND (LOWER(username) LIKE LOWER(?) OR LOWER(displayName) LIKE LOWER(?))
    LIMIT 10
  `).all(userId, `%${q}%`, `%${q}%`);

  res.json(users);
});

module.exports = router;
