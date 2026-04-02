const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');

// Get all channels
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const channels = db.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM channel_members WHERE channelId = c.id) as memberCount,
           u.displayName as creatorName
    FROM channels c
    LEFT JOIN users u ON c.createdBy = u.id
    WHERE c.isPublic = 1
    ORDER BY c.name ASC
  `).all();

  if (userId) {
    const joined = db.prepare('SELECT channelId FROM channel_members WHERE userId = ?').all(userId);
    const joinedSet = new Set(joined.map(j => j.channelId));
    channels.forEach(c => c.joined = joinedSet.has(c.id));
  }

  res.json(channels);
});

// Get user's joined channels
router.get('/joined', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const channels = db.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM channel_members WHERE channelId = c.id) as memberCount
    FROM channels c
    JOIN channel_members cm ON c.id = cm.channelId
    WHERE cm.userId = ?
    ORDER BY c.name ASC
  `).all(userId);

  channels.forEach(c => c.joined = true);
  res.json(channels);
});

// Create channel
router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { name, description, icon } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome canale richiesto' });
  }

  const existing = db.prepare('SELECT id FROM channels WHERE LOWER(name) = LOWER(?)').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: 'Nome canale già esistente' });
  }

  const id = generateId();
  db.prepare(`
    INSERT INTO channels (id, name, description, icon, createdBy)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name.trim(), description || '', icon || '📢', userId);

  // Auto-join creator
  db.prepare('INSERT INTO channel_members (channelId, userId) VALUES (?, ?)').run(id, userId);

  // Badge for channel creator
  const user = db.prepare('SELECT badges FROM users WHERE id = ?').get(userId);
  const badges = JSON.parse(user.badges || '[]');
  if (!badges.includes('channel_creator')) {
    badges.push('channel_creator');
    db.prepare('UPDATE users SET badges = ? WHERE id = ?').run(JSON.stringify(badges), userId);
  }

  const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
  channel.memberCount = 1;
  channel.joined = true;

  res.json(channel);
});

// Join channel
router.post('/:id/join', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const channelId = req.params.id;
  const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Canale non trovato' });
  }

  const existing = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ?').get(channelId, userId);
  if (existing) {
    return res.status(400).json({ error: 'Già iscritto' });
  }

  db.prepare('INSERT INTO channel_members (channelId, userId) VALUES (?, ?)').run(channelId, userId);

  const memberCount = db.prepare('SELECT COUNT(*) as count FROM channel_members WHERE channelId = ?').get(channelId).count;
  res.json({ joined: true, memberCount });
});

// Leave channel
router.post('/:id/leave', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  db.prepare('DELETE FROM channel_members WHERE channelId = ? AND userId = ?').run(req.params.id, userId);

  const memberCount = db.prepare('SELECT COUNT(*) as count FROM channel_members WHERE channelId = ?').get(req.params.id).count;
  res.json({ joined: false, memberCount });
});

// Fix corrupted channels (base64 in name)
router.post('/fix-corrupted', (req, res) => {
  try {
    // Find channels where name contains base64
    const channels = db.prepare(`
      SELECT id, name, description, icon 
      FROM channels 
      WHERE LENGTH(name) > 50 
         OR name LIKE '%base64%'
         OR name LIKE 'data:%'
    `).all();

    let fixed = 0;
    for (const channel of channels) {
      if (channel.name && (
        channel.name.length > 50 || 
        channel.name.includes('base64') ||
        channel.name.startsWith('data:')
      )) {
        // Extract a reasonable name from the corrupted one
        let newName = channel.name.substring(0, 30).replace(/[^a-zA-Z0-9\s]/g, '').trim();
        if (!newName || newName.length < 2) {
          newName = `Canale_${channel.id.substring(0, 6)}`;
        }
        
        db.prepare('UPDATE channels SET name = ? WHERE id = ?')
          .run(newName, channel.id);
        fixed++;
      }
    }

    res.json({ success: true, fixed, message: `Corretti ${fixed} canali` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante la correzione' });
  }
});

module.exports = router;
