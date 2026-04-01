const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get all reels
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'];

  const reels = db.prepare(`
    SELECT r.*, u.displayName as authorName, u.avatar as authorAvatar,
           (SELECT COUNT(*) FROM reel_likes WHERE reelId = r.id) as likeCount
    FROM reels r
    JOIN users u ON r.authorId = u.id
    ORDER BY r.createdAt DESC
    LIMIT 50
  `).all();

  if (userId) {
    const liked = db.prepare('SELECT reelId FROM reel_likes WHERE userId = ?').all(userId);
    const likedSet = new Set(liked.map(l => l.reelId));
    reels.forEach(r => r.liked = likedSet.has(r.id));
  }

  res.json(reels);
});

// Create reel
router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
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
  const short = isShort !== undefined ? (isShort ? 1 : 0) : (duration && duration <= 60 ? 1 : 0);

  db.prepare(`
    INSERT INTO reels (id, authorId, title, imageBase64, videoBase64, mediaType, duration, isShort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, modResult.cleanText, imageBase64 || null, videoBase64 || null, type, duration || 0, short);

  const reel = db.prepare(`
    SELECT r.*, u.displayName as authorName, u.avatar as authorAvatar
    FROM reels r
    JOIN users u ON r.authorId = u.id
    WHERE r.id = ?
  `).get(id);

  reel.likeCount = 0;
  reel.liked = false;

  res.json(reel);
});

// Like/unlike reel
router.post('/:id/like', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const reelId = req.params.id;
  const existing = db.prepare('SELECT * FROM reel_likes WHERE reelId = ? AND userId = ?').get(reelId, userId);

  if (existing) {
    db.prepare('DELETE FROM reel_likes WHERE reelId = ? AND userId = ?').run(reelId, userId);
  } else {
    db.prepare('INSERT INTO reel_likes (reelId, userId) VALUES (?, ?)').run(reelId, userId);
  }

  const likeCount = db.prepare('SELECT COUNT(*) as count FROM reel_likes WHERE reelId = ?').get(reelId).count;
  
  // Update reel likes count
  db.prepare('UPDATE reels SET likes = ? WHERE id = ?').run(likeCount, reelId);

  res.json({ liked: !existing, likeCount });
});

// Get single reel
router.get('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];

  const reel = db.prepare(`
    SELECT r.*, u.displayName as authorName, u.avatar as authorAvatar,
           (SELECT COUNT(*) FROM reel_likes WHERE reelId = r.id) as likeCount
    FROM reels r
    JOIN users u ON r.authorId = u.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!reel) {
    return res.status(404).json({ error: 'Reel non trovato' });
  }

  if (userId) {
    const liked = db.prepare('SELECT * FROM reel_likes WHERE reelId = ? AND userId = ?').get(req.params.id, userId);
    reel.liked = !!liked;
  }

  res.json(reel);
});

// Delete reel
router.delete('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const reel = db.prepare('SELECT * FROM reels WHERE id = ?').get(req.params.id);
  if (!reel) {
    return res.status(404).json({ error: 'Reel non trovato' });
  }

  if (reel.authorId !== userId) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  db.prepare('DELETE FROM reels WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
