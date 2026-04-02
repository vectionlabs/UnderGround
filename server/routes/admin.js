const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Middleware: require admin role
async function requireAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  const user = await db.get('SELECT role FROM users WHERE id = $1', [userId]);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorizzato - solo admin' });
  }
  next();
}

router.use(requireAdmin);

// ==================== BAN ====================

// Ban a user
router.post('/ban/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const target = await db.get('SELECT id, role FROM users WHERE id = $1', [userId]);
    if (!target) return res.status(404).json({ error: 'Utente non trovato' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Non puoi bannare un admin' });

    await db.run('UPDATE users SET banned = true, ban_reason = $1 WHERE id = $2', [reason || 'Violazione regole', userId]);
    res.json({ success: true, message: 'Utente bannato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Unban a user
router.post('/unban/:userId', async (req, res) => {
  try {
    await db.run('UPDATE users SET banned = false, ban_reason = NULL WHERE id = $1', [req.params.userId]);
    res.json({ success: true, message: 'Utente sbannato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ==================== MUTE ====================

// Mute a user
router.post('/mute/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const target = await db.get('SELECT id, role FROM users WHERE id = $1', [userId]);
    if (!target) return res.status(404).json({ error: 'Utente non trovato' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Non puoi mutare un admin' });

    await db.run('UPDATE users SET muted = true, mute_reason = $1 WHERE id = $2', [reason || 'Comportamento inappropriato', userId]);
    res.json({ success: true, message: 'Utente mutato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Unmute a user
router.post('/unmute/:userId', async (req, res) => {
  try {
    await db.run('UPDATE users SET muted = false, mute_reason = NULL WHERE id = $1', [req.params.userId]);
    res.json({ success: true, message: 'Utente smutato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ==================== DELETE CONTENT ====================

// Delete any post
router.delete('/posts/:postId', async (req, res) => {
  try {
    const post = await db.get('SELECT id FROM posts WHERE id = $1', [req.params.postId]);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });

    await db.run('DELETE FROM comments WHERE post_id = $1', [req.params.postId]);
    await db.run('DELETE FROM likes WHERE post_id = $1', [req.params.postId]);
    await db.run('DELETE FROM posts WHERE id = $1', [req.params.postId]);
    res.json({ success: true, message: 'Post eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete any reel
router.delete('/reels/:reelId', async (req, res) => {
  try {
    const reel = await db.get('SELECT id FROM reels WHERE id = $1', [req.params.reelId]);
    if (!reel) return res.status(404).json({ error: 'Reel non trovato' });

    await db.run('DELETE FROM reel_likes WHERE reel_id = $1', [req.params.reelId]);
    await db.run('DELETE FROM reels WHERE id = $1', [req.params.reelId]);
    res.json({ success: true, message: 'Reel eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete any channel
router.delete('/channels/:channelId', async (req, res) => {
  try {
    const channel = await db.get('SELECT id FROM channels WHERE id = $1', [req.params.channelId]);
    if (!channel) return res.status(404).json({ error: 'Canale non trovato' });

    await db.run('DELETE FROM channel_members WHERE channel_id = $1', [req.params.channelId]);
    // Delete posts in channel
    const channelPosts = await db.all('SELECT id FROM posts WHERE channel_id = $1', [req.params.channelId]);
    for (const p of channelPosts) {
      await db.run('DELETE FROM comments WHERE post_id = $1', [p.id]);
      await db.run('DELETE FROM likes WHERE post_id = $1', [p.id]);
    }
    await db.run('DELETE FROM posts WHERE channel_id = $1', [req.params.channelId]);
    await db.run('DELETE FROM channels WHERE id = $1', [req.params.channelId]);
    res.json({ success: true, message: 'Canale eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete any comment
router.delete('/comments/:commentId', async (req, res) => {
  try {
    await db.run('DELETE FROM comments WHERE id = $1', [req.params.commentId]);
    res.json({ success: true, message: 'Commento eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ==================== LIST USERS ====================

// Get all users (admin panel)
router.get('/users', async (req, res) => {
  try {
    const users = await db.all(`
      SELECT id, username, display_name, avatar, role, banned, ban_reason, muted, mute_reason, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
