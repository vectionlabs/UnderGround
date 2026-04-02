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

    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username già esistente' });
    }

    const id = generateId();
    const pwHash = await hashPassword(password);

    await db.run(`
      INSERT INTO users (id, username, password_hash, display_name, age)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, username.trim(), pwHash, displayName?.trim() || username.trim(), ageNum]);

    // Auto-join default channels
    const defaultChannels = ['ch-scuola', 'ch-sport'];
    for (const chId of defaultChannels) {
      await db.run('INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [chId, id]);
    }

    const user = await db.get('SELECT * FROM users WHERE id = $1', [id]);
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

    const user = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Account non trovato' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Password non corretta' });
    }

    // Update status to online
    await db.run('UPDATE users SET status = $1 WHERE id = $2', ['online', user.id]);

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
router.post('/logout', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    await db.run('UPDATE users SET status = $1 WHERE id = $2', ['offline', userId]);
  }
  res.json({ success: true });
});

// Get current user
router.get('/me', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  delete user.passwordHash;
  user.badges = JSON.parse(user.badges || '[]');
  user.socialLinks = JSON.parse(user.socialLinks || '{}');

  res.json(user);
});

// Update profile
router.patch('/profile', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { displayName, bio, avatar, banner, status, mood, theme, socialLinks } = req.body;

  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (displayName !== undefined) {
    const cleanName = (displayName || '').substring(0, 50).replace(/data:image[^;]*;base64,.*/, '').trim();
    if (cleanName) { updates.push(`display_name = $${paramIdx++}`); values.push(cleanName); }
  }
  if (bio !== undefined) { updates.push(`bio = $${paramIdx++}`); values.push(bio); }
  if (avatar !== undefined) { updates.push(`avatar = $${paramIdx++}`); values.push(avatar); }
  if (banner !== undefined) { updates.push(`banner = $${paramIdx++}`); values.push(banner); }
  if (status !== undefined) { updates.push(`status = $${paramIdx++}`); values.push(status); }
  if (mood !== undefined) { updates.push(`mood = $${paramIdx++}`); values.push(mood); }
  if (theme !== undefined) { updates.push(`theme = $${paramIdx++}`); values.push(theme); }
  if (socialLinks !== undefined) { updates.push(`social_links = $${paramIdx++}`); values.push(JSON.stringify(socialLinks)); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  }

  values.push(userId);
  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}`, values);

  const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
  delete user.passwordHash;
  user.badges = JSON.parse(user.badges || '[]');
  user.socialLinks = JSON.parse(user.socialLinks || '{}');

  res.json(user);
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  const user = await db.get(
    'SELECT id, username, display_name, avatar, banner, bio, status, mood, theme, badges, created_at FROM users WHERE id = $1',
    [req.params.id]
  );
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }
  user.badges = JSON.parse(user.badges || '[]');
  res.json(user);
});

module.exports = router;
