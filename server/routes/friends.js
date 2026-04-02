const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// Get user's friends
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    
    // Get friendships where user is either user1 or user2 and status is 'accepted'
    const query = `
      SELECT 
        CASE 
          WHEN f.user1_id = $1 THEN u2.id
          ELSE u1.id
        END as id,
        CASE 
          WHEN f.user1_id = $1 THEN u2.username
          ELSE u1.username
        END as username,
        CASE 
          WHEN f.user1_id = $1 THEN u2.display_name
          ELSE u1.display_name
        END as displayName,
        CASE 
          WHEN f.user1_id = $1 THEN u2.avatar
          ELSE u1.avatar
        END as avatar,
        f.created_at as addedAt
      FROM friendships f
      JOIN users u1 ON f.user1_id = u1.id
      JOIN users u2 ON f.user2_id = u2.id
      WHERE (f.user1_id = $1 OR f.user2_id = $1) 
        AND f.status = 'accepted'
        AND f.user1_id != f.user2_id
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friend requests
router.get('/requests', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    
    // Get pending friend requests sent to current user
    const query = `
      SELECT 
        fr.id,
        u.id as senderId,
        u.username,
        u.display_name,
        u.avatar,
        fr.created_at
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users (for adding friends)
router.get('/search', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const query = req.query.q;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const db = getDB();
    const searchPattern = `%${query}%`;
    
    // Simple search without friendships dependency first
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.avatar,
        u.bio,
        false as isFriend
      FROM users u
      WHERE u.id != $1 
        AND (
          LOWER(u.username) LIKE LOWER($2) OR 
          LOWER(u.display_name) LIKE LOWER($2)
        )
        AND u.banned = false
      ORDER BY 
        CASE 
          WHEN LOWER(u.username) = LOWER($3) THEN 1
          WHEN LOWER(u.username) LIKE LOWER($3) THEN 2
          WHEN LOWER(u.display_name) LIKE LOWER($3) THEN 3
          ELSE 4
        END,
        u.username
      LIMIT 20
    `;
    
    console.log('🔍 Searching users:', { userId, query, searchPattern });
    
    const result = await db.query(userQuery, [userId, searchPattern, query]);
    console.log('🔍 Search results:', result.rows.length, 'users found');
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug: Get all users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    const result = await db.query(`
      SELECT id, username, display_name, banned 
      FROM users 
      WHERE banned = false 
      ORDER BY username
      LIMIT 10
    `);
    
    console.log('🐛 Debug: All users:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send friend request
router.post('/request', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { userId: targetUserId } = req.body;
    
    if (!userId || !targetUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const db = getDB();
    
    // Check if already friends
    const friendshipCheck = await db.query(
      'SELECT id FROM friendships WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)) AND status = $3',
      [userId, targetUserId, 'accepted']
    );
    
    if (friendshipCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }
    
    // Check if request already exists
    const requestCheck = await db.query(
      'SELECT id FROM friend_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status = $3',
      [userId, targetUserId, 'pending']
    );
    
    if (requestCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    // Create friend request
    await db.query(
      'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
      [userId, targetUserId, 'pending']
    );
    
    res.json({ success: true });
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
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();
    
    // Get the friend request
    const requestQuery = await db.query(
      'SELECT sender_id, receiver_id FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = $3',
      [requestId, userId, 'pending']
    );
    
    if (requestQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    const { sender_id, receiver_id } = requestQuery.rows[0];
    
    // Update request status
    await db.query(
      'UPDATE friend_requests SET status = $1 WHERE id = $2',
      ['accepted', requestId]
    );
    
    // Create friendship
    await db.query(
      'INSERT INTO friendships (user1_id, user2_id, status) VALUES ($1, $2, $3)',
      [sender_id, receiver_id, 'accepted']
    );
    
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
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();
    
    // Update request status
    await db.query(
      'UPDATE friend_requests SET status = $1 WHERE id = $2 AND receiver_id = $3',
      ['declined', requestId, userId]
    );
    
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
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();
    
    // Remove friendship
    await db.query(
      'DELETE FROM friendships WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))',
      [userId, friendId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
