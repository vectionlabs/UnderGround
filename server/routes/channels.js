const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');

// Get all channels
router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const channels = await db.all(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count,
           u.display_name as creator_name
    FROM channels c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.is_public = true
    ORDER BY c.name ASC
  `);

  if (userId) {
    const joined = await db.all('SELECT channel_id FROM channel_members WHERE user_id = $1', [userId]);
    const joinedSet = new Set(joined.map(j => j.channelId));
    channels.forEach(c => c.joined = joinedSet.has(c.id));
  }

  res.json(channels);
});

// Get user's joined channels
router.get('/joined', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const channels = await db.all(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count
    FROM channels c
    JOIN channel_members cm ON c.id = cm.channel_id
    WHERE cm.user_id = $1
    ORDER BY c.name ASC
  `, [userId]);

  channels.forEach(c => c.joined = true);
  res.json(channels);
});

// Create channel
router.post('/', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { name, description, icon } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome canale richiesto' });
  }

  const existing = await db.get('SELECT id FROM channels WHERE LOWER(name) = LOWER($1)', [name.trim()]);
  if (existing) {
    return res.status(400).json({ error: 'Nome canale già esistente' });
  }

  const id = generateId();
  await db.run(`
    INSERT INTO channels (id, name, description, icon, created_by)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, name.trim(), description || '', icon || '📢', userId]);

  // Auto-join creator
  await db.run('INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2)', [id, userId]);

  // Badge for channel creator
  const user = await db.get('SELECT badges FROM users WHERE id = $1', [userId]);
  const badges = JSON.parse(user.badges || '[]');
  if (!badges.includes('channel_creator')) {
    badges.push('channel_creator');
    await db.run('UPDATE users SET badges = $1 WHERE id = $2', [JSON.stringify(badges), userId]);
  }

  const channel = await db.get('SELECT * FROM channels WHERE id = $1', [id]);
  channel.memberCount = 1;
  channel.joined = true;

  res.json(channel);
});

// Join channel
router.post('/:id/join', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const channelId = req.params.id;
  const channel = await db.get('SELECT * FROM channels WHERE id = $1', [channelId]);
  if (!channel) {
    return res.status(404).json({ error: 'Canale non trovato' });
  }

  const existing = await db.get('SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
  if (existing) {
    return res.status(400).json({ error: 'Già iscritto' });
  }

  await db.run('INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2)', [channelId, userId]);

  const row = await db.get('SELECT COUNT(*) as count FROM channel_members WHERE channel_id = $1', [channelId]);
  res.json({ joined: true, memberCount: parseInt(row.count) });
});

// Leave channel
router.post('/:id/leave', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  await db.run('DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2', [req.params.id, userId]);

  const row = await db.get('SELECT COUNT(*) as count FROM channel_members WHERE channel_id = $1', [req.params.id]);
  res.json({ joined: false, memberCount: parseInt(row.count) });
});

module.exports = router;
