const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get conversations list
router.get('/conversations', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const conversations = await db.all(`
    SELECT DISTINCT 
      CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as oder_id,
      MAX(created_at) as last_message_at
    FROM direct_messages
    WHERE sender_id = $1 OR receiver_id = $1
    GROUP BY oder_id
    ORDER BY last_message_at DESC
  `, [userId]);

  const result = [];
  for (const conv of conversations) {
    const user = await db.get('SELECT id, username, display_name, avatar, status FROM users WHERE id = $1', [conv.oderId]);
    const lastMessage = await db.get(`
      SELECT * FROM direct_messages 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at DESC LIMIT 1
    `, [userId, conv.oderId]);
    
    const unreadRow = await db.get(`
      SELECT COUNT(*) as count FROM direct_messages 
      WHERE sender_id = $1 AND receiver_id = $2 AND read = false
    `, [conv.oderId, userId]);

    result.push({ user, lastMessage, unreadCount: parseInt(unreadRow.count) });
  }

  res.json(result);
});

// Get messages with specific user
router.get('/with/:userId', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const otherId = req.params.userId;

  await db.run(`
    UPDATE direct_messages SET read = true 
    WHERE sender_id = $1 AND receiver_id = $2 AND read = false
  `, [otherId, currentUserId]);

  const messages = await db.all(`
    SELECT dm.*, u.display_name as sender_name, u.avatar as sender_avatar
    FROM direct_messages dm
    JOIN users u ON dm.sender_id = u.id
    WHERE (dm.sender_id = $1 AND dm.receiver_id = $2) OR (dm.sender_id = $2 AND dm.receiver_id = $1)
    ORDER BY dm.created_at ASC
    LIMIT 100
  `, [currentUserId, otherId]);

  res.json(messages);
});

// Send direct message
router.post('/send', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { receiverId, text } = req.body;
  if (!receiverId || !text?.trim()) {
    return res.status(400).json({ error: 'Destinatario e testo richiesti' });
  }

  const receiver = await db.get('SELECT id FROM users WHERE id = $1', [receiverId]);
  if (!receiver) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  const modResult = moderateText(text);
  if (!modResult.allowed) {
    await db.run('INSERT INTO moderation_log (id, type, message, user_id) VALUES ($1, $2, $3, $4)',
      [generateId(), 'blocked', `DM bloccato: ${modResult.riskTags.join(', ')}`, userId]);
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  await db.run(`
    INSERT INTO direct_messages (id, sender_id, receiver_id, text)
    VALUES ($1, $2, $3, $4)
  `, [id, userId, receiverId, modResult.cleanText]);

  const message = await db.get(`
    SELECT dm.*, u.display_name as sender_name, u.avatar as sender_avatar
    FROM direct_messages dm
    JOIN users u ON dm.sender_id = u.id
    WHERE dm.id = $1
  `, [id]);

  res.json(message);
});

// Get unread count
router.get('/unread', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const row = await db.get('SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = $1 AND read = false', [userId]);
  res.json({ count: parseInt(row.count) });
});

// Search users for new conversation
router.get('/search-users', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }

  const users = await db.all(`
    SELECT id, username, display_name, avatar, status 
    FROM users 
    WHERE id != $1 AND (LOWER(username) LIKE LOWER($2) OR LOWER(display_name) LIKE LOWER($2))
    LIMIT 10
  `, [userId, `%${q}%`]);

  res.json(users);
});

module.exports = router;
