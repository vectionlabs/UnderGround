const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get user's groups
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const groups = db.prepare(`
    SELECT g.*, gm.role,
           (SELECT COUNT(*) FROM group_members WHERE groupId = g.id) as memberCount,
           u.displayName as adminName
    FROM groups_table g
    JOIN group_members gm ON g.id = gm.groupId
    JOIN users u ON g.adminId = u.id
    WHERE gm.userId = ?
    ORDER BY g.createdAt DESC
  `).all(userId);

  res.json(groups);
});

// Create group
router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { name, description, avatar } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome gruppo richiesto' });
  }

  const id = generateId();
  db.prepare(`
    INSERT INTO groups_table (id, name, description, avatar, adminId)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name.trim(), description || '', avatar || null, userId);

  // Add creator as admin
  db.prepare('INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, ?)').run(id, userId, 'admin');

  const group = db.prepare(`
    SELECT g.*, u.displayName as adminName
    FROM groups_table g
    JOIN users u ON g.adminId = u.id
    WHERE g.id = ?
  `).get(id);

  group.memberCount = 1;
  group.role = 'admin';

  res.json(group);
});

// Get group details
router.get('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const group = db.prepare(`
    SELECT g.*, u.displayName as adminName,
           (SELECT COUNT(*) FROM group_members WHERE groupId = g.id) as memberCount
    FROM groups_table g
    JOIN users u ON g.adminId = u.id
    WHERE g.id = ?
  `).get(req.params.id);

  if (!group) {
    return res.status(404).json({ error: 'Gruppo non trovato' });
  }

  if (userId) {
    const membership = db.prepare('SELECT role FROM group_members WHERE groupId = ? AND userId = ?').get(req.params.id, userId);
    group.role = membership?.role || null;
    group.isMember = !!membership;
  }

  res.json(group);
});

// Get group members
router.get('/:id/members', (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.username, u.displayName, u.avatar, u.status, gm.role
    FROM group_members gm
    JOIN users u ON gm.userId = u.id
    WHERE gm.groupId = ?
    ORDER BY gm.role DESC, u.displayName ASC
  `).all(req.params.id);

  res.json(members);
});

// Invite to group (by username)
router.post('/:id/invite', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { username } = req.body;
  if (!username?.trim()) {
    return res.status(400).json({ error: 'Username richiesto' });
  }

  // Check if user is admin
  const membership = db.prepare('SELECT role FROM group_members WHERE groupId = ? AND userId = ?').get(req.params.id, userId);
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Solo gli admin possono invitare' });
  }

  const targetUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
  if (!targetUser) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  const existing = db.prepare('SELECT * FROM group_members WHERE groupId = ? AND userId = ?').get(req.params.id, targetUser.id);
  if (existing) {
    return res.status(400).json({ error: 'Utente già nel gruppo' });
  }

  db.prepare('INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, ?)').run(req.params.id, targetUser.id, 'member');

  res.json({ success: true });
});

// Leave group
router.post('/:id/leave', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const group = db.prepare('SELECT adminId FROM groups_table WHERE id = ?').get(req.params.id);
  if (group && group.adminId === userId) {
    return res.status(400).json({ error: 'L\'admin non può abbandonare il gruppo' });
  }

  db.prepare('DELETE FROM group_members WHERE groupId = ? AND userId = ?').run(req.params.id, userId);
  res.json({ success: true });
});

// Get group messages
router.get('/:id/messages', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const membership = db.prepare('SELECT * FROM group_members WHERE groupId = ? AND userId = ?').get(req.params.id, userId);
  if (!membership) {
    return res.status(403).json({ error: 'Non sei membro di questo gruppo' });
  }

  const messages = db.prepare(`
    SELECT gm.*, u.displayName as senderName, u.avatar as senderAvatar
    FROM group_messages gm
    JOIN users u ON gm.senderId = u.id
    WHERE gm.groupId = ?
    ORDER BY gm.createdAt ASC
    LIMIT 100
  `).all(req.params.id);

  res.json(messages);
});

// Send group message
router.post('/:id/messages', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Testo richiesto' });
  }

  const membership = db.prepare('SELECT * FROM group_members WHERE groupId = ? AND userId = ?').get(req.params.id, userId);
  if (!membership) {
    return res.status(403).json({ error: 'Non sei membro di questo gruppo' });
  }

  const modResult = moderateText(text);
  if (!modResult.allowed) {
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  db.prepare('INSERT INTO group_messages (id, groupId, senderId, text) VALUES (?, ?, ?, ?)').run(
    id, req.params.id, userId, modResult.cleanText
  );

  const message = db.prepare(`
    SELECT gm.*, u.displayName as senderName, u.avatar as senderAvatar
    FROM group_messages gm
    JOIN users u ON gm.senderId = u.id
    WHERE gm.id = ?
  `).get(id);

  res.json(message);
});

module.exports = router;
