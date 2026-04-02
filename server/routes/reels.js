const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get all reels
router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'];

  const reels = await db.all(`
    SELECT r.*, u.display_name as author_name, u.avatar as author_avatar,
           (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as like_count
    FROM reels r
    JOIN users u ON r.author_id = u.id
    ORDER BY r.created_at DESC
    LIMIT 50
  `);

  if (userId) {
    const liked = await db.all('SELECT reel_id FROM reel_likes WHERE user_id = $1', [userId]);
    const likedSet = new Set(liked.map(l => l.reelId));
    reels.forEach(r => r.liked = likedSet.has(r.id));
  }

  res.json(reels);
});

// Create reel
router.post('/', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  // Check muted
  const caller = await db.get('SELECT muted, mute_reason FROM users WHERE id = $1', [userId]);
  if (caller?.muted) {
    return res.status(403).json({ error: 'Sei mutato: ' + (caller.muteReason || 'Comportamento inappropriato') });
  }

  const { title, imageBase64, videoBase64, mediaType, duration, isShort } = req.body;
  if (!title?.trim() || (!imageBase64 && !videoBase64)) {
    return res.status(400).json({ error: 'Titolo e media richiesti' });
  }

  const modResult = moderateText(title);
  if (!modResult.allowed) {
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  const type = mediaType || (videoBase64 ? 'video' : 'image');
  const short = isShort !== undefined ? !!isShort : (duration && duration <= 60);

  await db.run(`
    INSERT INTO reels (id, author_id, title, image_base64, video_base64, media_type, duration, is_short)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [id, userId, modResult.cleanText, imageBase64 || null, videoBase64 || null, type, duration || 0, short]);

  const reel = await db.get(`
    SELECT r.*, u.display_name as author_name, u.avatar as author_avatar
    FROM reels r
    JOIN users u ON r.author_id = u.id
    WHERE r.id = $1
  `, [id]);

  reel.likeCount = 0;
  reel.liked = false;

  res.json(reel);
});

// Like/unlike reel
router.post('/:id/like', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const reelId = req.params.id;
  const existing = await db.get('SELECT * FROM reel_likes WHERE reel_id = $1 AND user_id = $2', [reelId, userId]);

  if (existing) {
    await db.run('DELETE FROM reel_likes WHERE reel_id = $1 AND user_id = $2', [reelId, userId]);
  } else {
    await db.run('INSERT INTO reel_likes (reel_id, user_id) VALUES ($1, $2)', [reelId, userId]);
  }

  const row = await db.get('SELECT COUNT(*) as count FROM reel_likes WHERE reel_id = $1', [reelId]);
  const likeCount = parseInt(row.count);
  
  await db.run('UPDATE reels SET likes = $1 WHERE id = $2', [likeCount, reelId]);

  res.json({ liked: !existing, likeCount });
});

// Get single reel
router.get('/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];

  const reel = await db.get(`
    SELECT r.*, u.display_name as author_name, u.avatar as author_avatar,
           (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as like_count
    FROM reels r
    JOIN users u ON r.author_id = u.id
    WHERE r.id = $1
  `, [req.params.id]);

  if (!reel) {
    return res.status(404).json({ error: 'Reel non trovato' });
  }

  if (userId) {
    const liked = await db.get('SELECT * FROM reel_likes WHERE reel_id = $1 AND user_id = $2', [req.params.id, userId]);
    reel.liked = !!liked;
  }

  res.json(reel);
});

// Delete reel
router.delete('/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const reel = await db.get('SELECT * FROM reels WHERE id = $1', [req.params.id]);
  if (!reel) {
    return res.status(404).json({ error: 'Reel non trovato' });
  }

  if (reel.authorId !== userId) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  await db.run('DELETE FROM reels WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
