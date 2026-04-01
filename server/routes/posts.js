const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get feed posts
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const posts = db.prepare(`
    SELECT p.*, u.displayName as authorName, u.avatar as authorAvatar,
           c.name as publishAsName, c.icon as publishAsIcon,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
           (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount
    FROM posts p
    JOIN users u ON p.authorId = u.id
    LEFT JOIN channels c ON p.publishAsChannelId = c.id
    ORDER BY p.createdAt DESC
    LIMIT 50
  `).all();

  // Get if current user liked each post
  if (userId) {
    const likedPosts = db.prepare('SELECT postId FROM likes WHERE userId = ?').all(userId);
    const likedSet = new Set(likedPosts.map(l => l.postId));
    posts.forEach(p => p.liked = likedSet.has(p.id));
  }

  res.json(posts);
});

// Get posts by channel
router.get('/channel/:channelId', (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const posts = db.prepare(`
    SELECT p.*, u.displayName as authorName, u.avatar as authorAvatar,
           ch.name as publishAsName, ch.icon as publishAsIcon,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
           (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount
    FROM posts p
    JOIN users u ON p.authorId = u.id
    LEFT JOIN channels ch ON p.publishAsChannelId = ch.id
    WHERE p.channelId = ?
    ORDER BY p.createdAt DESC
    LIMIT 50
  `).all(req.params.channelId);

  if (userId) {
    const likedPosts = db.prepare('SELECT postId FROM likes WHERE userId = ?').all(userId);
    const likedSet = new Set(likedPosts.map(l => l.postId));
    posts.forEach(p => p.liked = likedSet.has(p.id));
  }

  res.json(posts);
});

// Create post
router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { text, channelId, media, publishAs } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Testo richiesto' });
  }

  const modResult = moderateText(text);
  if (!modResult.allowed) {
    db.prepare('INSERT INTO moderation_log (id, type, message, userId) VALUES (?, ?, ?, ?)').run(
      generateId(), 'blocked', `Post bloccato: ${modResult.riskTags.join(', ')}`, userId
    );
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  const mediaType = media?.type || 'text';
  const imageBase64 = media?.type === 'image' ? media.dataBase64 : null;
  const videoBase64 = media?.type === 'video' ? media.dataBase64 : null;
  const documentBase64 = media?.type === 'document' ? media.dataBase64 : null;
  const documentName = media?.type === 'document' ? media.fileName : null;
  const documentType = media?.type === 'document' ? media.mimeType : null;
  const publishAsChannelId = publishAs || null;

  db.prepare(`
    INSERT INTO posts (id, authorId, channelId, publishAsChannelId, text, imageBase64, videoBase64, documentBase64, documentName, documentType, mediaType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, channelId || null, publishAsChannelId, modResult.cleanText, imageBase64, videoBase64, documentBase64, documentName, documentType, mediaType);

  // Log moderation
  const logType = modResult.blockedWords.length > 0 ? 'censored' : 'approved';
  const logMsg = modResult.blockedWords.length > 0 
    ? `Parole censurate: ${modResult.blockedWords.join(', ')}` 
    : 'Post approvato';
  db.prepare('INSERT INTO moderation_log (id, type, message, userId) VALUES (?, ?, ?, ?)').run(
    generateId(), logType, logMsg, userId
  );

  // Check for badge
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE authorId = ?').get(userId).count;
  if (postCount === 1) {
    const user = db.prepare('SELECT badges FROM users WHERE id = ?').get(userId);
    const badges = JSON.parse(user.badges || '[]');
    if (!badges.includes('first_post')) {
      badges.push('first_post');
      db.prepare('UPDATE users SET badges = ? WHERE id = ?').run(JSON.stringify(badges), userId);
    }
  }

  const post = db.prepare(`
    SELECT p.*, u.displayName as authorName, u.avatar as authorAvatar
    FROM posts p
    JOIN users u ON p.authorId = u.id
    WHERE p.id = ?
  `).get(id);

  post.likeCount = 0;
  post.commentCount = 0;
  post.liked = false;

  res.json(post);
});

// Like/unlike post
router.post('/:id/like', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const postId = req.params.id;
  const existing = db.prepare('SELECT * FROM likes WHERE postId = ? AND userId = ?').get(postId, userId);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE postId = ? AND userId = ?').run(postId, userId);
  } else {
    db.prepare('INSERT INTO likes (postId, userId) VALUES (?, ?)').run(postId, userId);
    
    // Check for badge
    const post = db.prepare('SELECT authorId FROM posts WHERE id = ?').get(postId);
    if (post) {
      const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes l JOIN posts p ON l.postId = p.id WHERE p.authorId = ?').get(post.authorId).count;
      if (likeCount >= 10) {
        const user = db.prepare('SELECT badges FROM users WHERE id = ?').get(post.authorId);
        const badges = JSON.parse(user.badges || '[]');
        if (!badges.includes('10_likes')) {
          badges.push('10_likes');
          db.prepare('UPDATE users SET badges = ? WHERE id = ?').run(JSON.stringify(badges), post.authorId);
        }
      }
    }
  }

  const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE postId = ?').get(postId).count;
  res.json({ liked: !existing, likeCount });
});

// Get comments for post
router.get('/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.displayName as authorName, u.avatar as authorAvatar
    FROM comments c
    JOIN users u ON c.authorId = u.id
    WHERE c.postId = ?
    ORDER BY c.createdAt ASC
  `).all(req.params.id);

  res.json(comments);
});

// Add comment
router.post('/:id/comments', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Testo richiesto' });
  }

  const modResult = moderateText(text);
  if (!modResult.allowed) {
    db.prepare('INSERT INTO moderation_log (id, type, message, userId) VALUES (?, ?, ?, ?)').run(
      generateId(), 'blocked', `Commento bloccato: ${modResult.riskTags.join(', ')}`, userId
    );
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  db.prepare('INSERT INTO comments (id, postId, authorId, text) VALUES (?, ?, ?, ?)').run(
    id, req.params.id, userId, modResult.cleanText
  );

  const comment = db.prepare(`
    SELECT c.*, u.displayName as authorName, u.avatar as authorAvatar
    FROM comments c
    JOIN users u ON c.authorId = u.id
    WHERE c.id = ?
  `).get(id);

  res.json(comment);
});

// Delete post
router.delete('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post non trovato' });
  }

  if (post.authorId !== userId) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
