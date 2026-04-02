const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { moderateText } = require('../moderation');

// Get feed posts
router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const posts = await db.all(`
    SELECT p.*, u.display_name as author_name, u.avatar as author_avatar,
           c.name as publish_as_name, c.icon as publish_as_icon,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN channels c ON p.publish_as_channel_id = c.id
    ORDER BY p.created_at DESC
    LIMIT 50
  `);

  if (userId) {
    const likedPosts = await db.all('SELECT post_id FROM likes WHERE user_id = $1', [userId]);
    const likedSet = new Set(likedPosts.map(l => l.postId));
    posts.forEach(p => p.liked = likedSet.has(p.id));
  }

  res.json(posts);
});

// Get posts by channel
router.get('/channel/:channelId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  const posts = await db.all(`
    SELECT p.*, u.display_name as author_name, u.avatar as author_avatar,
           ch.name as publish_as_name, ch.icon as publish_as_icon,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN channels ch ON p.publish_as_channel_id = ch.id
    WHERE p.channel_id = $1
    ORDER BY p.created_at DESC
    LIMIT 50
  `, [req.params.channelId]);

  if (userId) {
    const likedPosts = await db.all('SELECT post_id FROM likes WHERE user_id = $1', [userId]);
    const likedSet = new Set(likedPosts.map(l => l.postId));
    posts.forEach(p => p.liked = likedSet.has(p.id));
  }

  res.json(posts);
});

// Create post
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

  const { text, channelId, media, publishAs } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Testo richiesto' });
  }

  const modResult = moderateText(text);
  if (!modResult.allowed) {
    await db.run('INSERT INTO moderation_log (id, type, message, user_id) VALUES ($1, $2, $3, $4)',
      [generateId(), 'blocked', `Post bloccato: ${modResult.riskTags.join(', ')}`, userId]);
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

  await db.run(`
    INSERT INTO posts (id, author_id, channel_id, publish_as_channel_id, text, image_base64, video_base64, document_base64, document_name, document_type, media_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [id, userId, channelId || null, publishAsChannelId, modResult.cleanText, imageBase64, videoBase64, documentBase64, documentName, documentType, mediaType]);

  // Log moderation
  const logType = modResult.blockedWords.length > 0 ? 'censored' : 'approved';
  const logMsg = modResult.blockedWords.length > 0 
    ? `Parole censurate: ${modResult.blockedWords.join(', ')}` 
    : 'Post approvato';
  await db.run('INSERT INTO moderation_log (id, type, message, user_id) VALUES ($1, $2, $3, $4)',
    [generateId(), logType, logMsg, userId]);

  // Check for badge
  const postCountRow = await db.get('SELECT COUNT(*) as count FROM posts WHERE author_id = $1', [userId]);
  if (postCountRow.count === 1 || postCountRow.count === '1') {
    const userRow = await db.get('SELECT badges FROM users WHERE id = $1', [userId]);
    const badges = JSON.parse(userRow.badges || '[]');
    if (!badges.includes('first_post')) {
      badges.push('first_post');
      await db.run('UPDATE users SET badges = $1 WHERE id = $2', [JSON.stringify(badges), userId]);
    }
  }

  const post = await db.get(`
    SELECT p.*, u.display_name as author_name, u.avatar as author_avatar
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.id = $1
  `, [id]);

  post.likeCount = 0;
  post.commentCount = 0;
  post.liked = false;

  res.json(post);
});

// Like/unlike post
router.post('/:id/like', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const postId = req.params.id;
  const existing = await db.get('SELECT * FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);

  if (existing) {
    await db.run('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
  } else {
    await db.run('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
    
    // Check for badge
    const post = await db.get('SELECT author_id FROM posts WHERE id = $1', [postId]);
    if (post) {
      const likeCountRow = await db.get(
        'SELECT COUNT(*) as count FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.author_id = $1',
        [post.authorId]
      );
      if (parseInt(likeCountRow.count) >= 10) {
        const userRow = await db.get('SELECT badges FROM users WHERE id = $1', [post.authorId]);
        const badges = JSON.parse(userRow.badges || '[]');
        if (!badges.includes('10_likes')) {
          badges.push('10_likes');
          await db.run('UPDATE users SET badges = $1 WHERE id = $2', [JSON.stringify(badges), post.authorId]);
        }
      }
    }
  }

  const likeCountRow = await db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = $1', [postId]);
  res.json({ liked: !existing, likeCount: parseInt(likeCountRow.count) });
});

// Get comments for post
router.get('/:id/comments', async (req, res) => {
  const comments = await db.all(`
    SELECT c.*, u.display_name as author_name, u.avatar as author_avatar
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.post_id = $1
    ORDER BY c.created_at ASC
  `, [req.params.id]);

  res.json(comments);
});

// Add comment
router.post('/:id/comments', async (req, res) => {
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
    await db.run('INSERT INTO moderation_log (id, type, message, user_id) VALUES ($1, $2, $3, $4)',
      [generateId(), 'blocked', `Commento bloccato: ${modResult.riskTags.join(', ')}`, userId]);
    return res.status(400).json({ error: `Contenuto bloccato: ${modResult.riskTags.join(', ')}` });
  }

  const id = generateId();
  await db.run('INSERT INTO comments (id, post_id, author_id, text) VALUES ($1, $2, $3, $4)',
    [id, req.params.id, userId, modResult.cleanText]);

  const comment = await db.get(`
    SELECT c.*, u.display_name as author_name, u.avatar as author_avatar
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.id = $1
  `, [id]);

  res.json(comment);
});

// Delete post
router.delete('/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const post = await db.get('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  if (!post) {
    return res.status(404).json({ error: 'Post non trovato' });
  }

  if (post.authorId !== userId) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  await db.run('DELETE FROM posts WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
