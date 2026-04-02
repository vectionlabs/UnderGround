const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all friends for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const query = `
      SELECT 
        f.id,
        f.friend_id as "friendId",
        f.created_at as "createdAt",
        u.username as "friendUsername",
        u.display_name as "friendDisplayName",
        u.avatar as "friendAvatar"
      FROM friends f
      JOIN users u ON (f.friend_id = u.id)
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friend requests for current user
router.get('/requests', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const query = `
      SELECT 
        fr.id,
        fr.requester_id as "requesterId",
        fr.created_at as "createdAt",
        u.username as "requesterUsername",
        u.display_name as "requesterDisplayName",
        u.avatar as "requesterAvatar"
      FROM friend_requests fr
      JOIN users u ON (fr.requester_id = u.id)
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send friend request
router.post('/request', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { userId: targetUserId } = req.body;
    
    if (!userId || !targetUserId) {
      return res.status(400).json({ error: 'User ID and target user ID required' });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if already friends
    const friendsCheck = await db.query(
      'SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2',
      [userId, targetUserId]
    );
    
    if (friendsCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const requestCheck = await db.query(
      'SELECT 1 FROM friend_requests WHERE requester_id = $1 AND receiver_id = $2 AND status = $3',
      [userId, targetUserId, 'pending']
    );
    
    if (requestCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Create friend request
    const query = `
      INSERT INTO friend_requests (requester_id, receiver_id, status)
      VALUES ($1, $2, 'pending')
      RETURNING id
    `;
    
    const result = await db.query(query, [userId, targetUserId]);
    res.json({ success: true, requestId: result.rows[0].id });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept friend request
router.post('/accept/:requestId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { requestId } = req.params;
    
    if (!userId || !requestId) {
      return res.status(400).json({ error: 'User ID and request ID required' });
    }

    // Get request details
    const requestQuery = `
      UPDATE friend_requests 
      SET status = 'accepted'
      WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING requester_id
    `;
    
    const requestResult = await db.query(requestQuery, [requestId, userId]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const requesterId = requestResult.rows[0].requester_id;

    // Create friendship (both directions)
    await db.query('BEGIN');
    
    try {
      await db.query(
        'INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)',
        [userId, requesterId]
      );
      
      await db.query(
        'INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)',
        [requesterId, userId]
      );
      
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline friend request
router.post('/decline/:requestId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { requestId } = req.params;
    
    if (!userId || !requestId) {
      return res.status(400).json({ error: 'User ID and request ID required' });
    }

    const query = `
      UPDATE friend_requests 
      SET status = 'declined'
      WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
    `;
    
    const result = await db.query(query, [requestId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove friend
router.delete('/:friendId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { friendId } = req.params;
    
    if (!userId || !friendId) {
      return res.status(400).json({ error: 'User ID and friend ID required' });
    }

    // Remove friendship (both directions)
    const query = `
      DELETE FROM friends 
      WHERE (user_id = $1 AND friend_id = $2) 
         OR (user_id = $2 AND friend_id = $1)
    `;
    
    const result = await db.query(query, [userId, friendId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { q } = req.query;
    
    if (!userId || !q) {
      return res.status(400).json({ error: 'User ID and search query required' });
    }

    if (q.length < 2) {
      return res.json([]);
    }

    const searchQuery = `
      SELECT 
        id,
        username,
        display_name as "displayName",
        avatar,
        bio
      FROM users 
      WHERE (
        username ILIKE $1 
        OR display_name ILIKE $1
      )
      AND id != $2
      AND id NOT IN (
        SELECT friend_id FROM friends WHERE user_id = $2
      )
      ORDER BY username
      LIMIT 20
    `;
    
    const result = await db.query(searchQuery, [`%${q}%`, userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
