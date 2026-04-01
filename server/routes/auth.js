const express = require('express');
const router = express.Router();
const { db, hashPassword, verifyPassword, generateId } = require('../db');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, displayName, password, age } = req.body;

    if (!username || !password || !age) {
      return res.status(400).json({ success: false, error: 'Campi obbligatori mancanti' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password troppo corta (min 8 caratteri)' });
    }

    const ageNum = parseInt(age);
    if (ageNum < 13 || ageNum > 120) {
      return res.status(400).json({ success: false, error: 'Età non valida (minimo 13 anni)' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username già esistente' });
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, username, passwordHash, displayName, age)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username.trim(), passwordHash, displayName?.trim() || username.trim(), ageNum);

    // Auto-join default channels
    const defaultChannels = ['ch-scuola', 'ch-sport'];
    const joinStmt = db.prepare('INSERT OR IGNORE INTO channel_members (channelId, userId) VALUES (?, ?)');
    for (const chId of defaultChannels) {
      joinStmt.run(chId, id);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    delete user.passwordHash;

    res.json({ success: true, user, token: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Campi obbligatori mancanti' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Account non trovato' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Password non corretta' });
    }

    // Update status to online
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('online', user.id);

    delete user.passwordHash;
    user.badges = JSON.parse(user.badges || '[]');
    user.socialLinks = JSON.parse(user.socialLinks || '{}');

    res.json({ success: true, user, token: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('offline', userId);
  }
  res.json({ success: true });
});

// Get current user
router.get('/me', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  delete user.passwordHash;
  user.badges = JSON.parse(user.badges || '[]');
  user.socialLinks = JSON.parse(user.socialLinks || '{}');

  res.json(user);
});

// Update profile
router.patch('/profile', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { displayName, bio, avatar, banner, status, mood, theme, socialLinks } = req.body;

  const updates = [];
  const values = [];

  if (displayName !== undefined) { updates.push('displayName = ?'); values.push(displayName); }
  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
  if (banner !== undefined) { updates.push('banner = ?'); values.push(banner); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (mood !== undefined) { updates.push('mood = ?'); values.push(mood); }
  if (theme !== undefined) { updates.push('theme = ?'); values.push(theme); }
  if (socialLinks !== undefined) { updates.push('socialLinks = ?'); values.push(JSON.stringify(socialLinks)); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  }

  values.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  delete user.passwordHash;
  user.badges = JSON.parse(user.badges || '[]');
  user.socialLinks = JSON.parse(user.socialLinks || '{}');

  res.json(user);
});

// Get user by ID
router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, username, displayName, avatar, banner, bio, status, mood, theme, badges, createdAt FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }
  user.badges = JSON.parse(user.badges || '[]');
  res.json(user);
});

module.exports = router;
