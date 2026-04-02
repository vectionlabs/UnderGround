const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get user's groups
router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const groups = await db.all(`
    SELECT g.*, gm.role,
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
           u.display_name as admin_name
    FROM groups_table g
    JOIN group_members gm ON g.id = gm.group_id
    JOIN users u ON g.admin_id = u.id
    WHERE gm.user_id = $1
    ORDER BY g.created_at DESC
  `, [userId]);

  res.json(groups);
});

// Create group
router.post('/', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { name, description, avatar } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome gruppo richiesto' });
  }

  const id = generateId();
  await db.run(`
    INSERT INTO groups_table (id, name, description, avatar, admin_id)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, name.trim(), description || '', avatar || null, userId]);

  await db.run('INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)', [id, userId, 'admin']);

  const group = await db.get(`
    SELECT g.*, u.display_name as admin_name
    FROM groups_table g
    JOIN users u ON g.admin_id = u.id
    WHERE g.id = $1
  `, [id]);

  group.memberCount = 1;
  group.role = 'admin';

  res.json(group);
});

// Get group details
router.get('/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const group = await db.get(`
    SELECT g.*, u.display_name as admin_name,
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
    FROM groups_table g
    JOIN users u ON g.admin_id = u.id
    WHERE g.id = $1
  `, [req.params.id]);

  if (!group) {
    return res.status(404).json({ error: 'Gruppo non trovato' });
  }

  if (userId) {
    const membership = await db.get('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, userId]);
    group.role = membership?.role || null;
    group.isMember = !!membership;
  }

  res.json(group);
});

// Get group members
router.get('/:id/members', async (req, res) => {
  const members = await db.all(`
    SELECT u.id, u.username, u.display_name, u.avatar, u.status, gm.role
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = $1
    ORDER BY gm.role DESC, u.display_name ASC
  `, [req.params.id]);

  res.json(members);
});

// Invite to group
router.post('/:id/invite', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { username } = req.body;
  if (!username?.trim()) {
    return res.status(400).json({ error: 'Username richiesto' });
  }

  const membership = await db.get('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, userId]);
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Solo gli admin possono invitare' });
  }

  const targetUser = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  const existing = await db.get('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, targetUser.id]);
  if (existing) {
    return res.status(400).json({ error: 'Utente già nel gruppo' });
  }

  await db.run('INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)', [req.params.id, targetUser.id, 'member']);
  res.json({ success: true });
});

// Leave group
router.post('/:id/leave', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const group = await db.get('SELECT admin_id FROM groups_table WHERE id = $1', [req.params.id]);
  if (group && group.adminId === userId) {
    return res.status(400).json({ error: "L'admin non può abbandonare il gruppo" });
  }

  await db.run('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, userId]);
  res.json({ success: true });
});

// Get group messages
router.get('/:id/messages', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const membership = await db.get('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, userId]);
  if (!membership) {
    return res.status(403).json({ error: 'Non sei membro di questo gruppo' });
  }

  const messages = await db.all(`
    SELECT gm.*, u.display_name as sender_name, u.avatar as sender_avatar
    FROM group_messages gm
    JOIN users u ON gm.sender_id = u.id
    WHERE gm.group_id = $1
    ORDER BY gm.created_at ASC
    LIMIT 100
  `, [req.params.id]);

  res.json(messages);
});

// Send group message
router.post('/:id/messages', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Testo richiesto' });
  }

  const membership = await db.get('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, userId]);
  if (!membership) {
    return res.status(403).json({ error: 'Non sei membro di questo gruppo' });
  }

  const modResult = moderateText(text);
  if (!modResult.allowed) {
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  await db.run('INSERT INTO group_messages (id, group_id, sender_id, text) VALUES ($1, $2, $3, $4)',
    [id, req.params.id, userId, modResult.cleanText]);

  const message = await db.get(`
    SELECT gm.*, u.display_name as sender_name, u.avatar as sender_avatar
    FROM group_messages gm
    JOIN users u ON gm.sender_id = u.id
    WHERE gm.id = $1
  `, [id]);

  res.json(message);
});

module.exports = router;
