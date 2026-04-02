const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Get user's friends
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
        END as display_name,
        CASE 
          WHEN f.user1_id = $1 THEN u2.avatar
          ELSE u1.avatar
        END as avatar,
        f.created_at as added_at
      FROM friendships f
      JOIN users u1 ON f.user1_id = u1.id
      JOIN users u2 ON f.user2_id = u2.id
      WHERE (f.user1_id = $1 OR f.user2_id = $1) 
        AND f.status = 'accepted'
        AND f.user1_id != f.user2_id
    `;
    
    const result = await db.all(query, [userId]);
    res.json(result);
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

    // Get pending friend requests sent to current user
    const query = `
      SELECT 
        fr.id,
        u.id as sender_id,
        u.username,
        u.display_name,
        u.avatar,
        fr.created_at
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    
    const result = await db.all(query, [userId]);
    res.json(result);
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
    
    console.log('🔍 Search request:', { userId, query, headers: req.headers });
    
    if (!userId) {
      console.log('❌ No userId in headers');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!query || query.length < 2) {
      console.log('❌ Query too short:', query);
      return res.json([]);
    }

    const searchPattern = `%${query}%`;
    
    // First, let's check if users table exists and has data
    try {
      const countResult = await db.all('SELECT COUNT(*) as count FROM users WHERE banned = false');
      console.log('👥 Total users in DB:', countResult[0]?.count);
    } catch (countError) {
      console.error('❌ Error counting users:', countError);
    }
    
    // Simple search without friendships dependency first
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.avatar,
        u.bio,
        false as is_friend
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
    
    console.log('🔍 Executing search:', { userId, query, searchPattern });
    console.log('🔍 SQL Query:', userQuery);
    
    const result = await db.all(userQuery, [userId, searchPattern, query]);
    console.log('🔍 Search results:', result.length, 'users found');
    console.log('🔍 Results data:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error searching users:', error);
    console.error('❌ Error stack:', error.stack);
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

    console.log('🐛 Debug: Getting all users...');
    
    const result = await db.all(`
      SELECT id, username, display_name, banned 
      FROM users 
      WHERE banned = false 
      ORDER BY username
      LIMIT 10
    `);
    
    console.log('🐛 Debug: All users:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test database connection
router.get('/test/db', async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test basic connection
    const timeResult = await db.all('SELECT NOW() as current_time');
    console.log('🧪 DB time:', timeResult[0]?.currentTime);
    
    // Test users table
    const userCount = await db.all('SELECT COUNT(*) as count FROM users');
    console.log('🧪 Total users:', userCount[0]?.count);
    
    // Test sample users
    const sampleUsers = await db.all('SELECT id, username, display_name FROM users LIMIT 5');
    console.log('🧪 Sample users:', sampleUsers);
    
    res.json({
      success: true,
      currentTime: timeResult[0]?.currentTime,
      totalUsers: userCount[0]?.count,
      sampleUsers: sampleUsers
    });
  } catch (error) {
    console.error('❌ DB test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
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

        
    // Check if already friends
    const friendshipCheck = await db.all(
      'SELECT id FROM friendships WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)) AND status = $3',
      [userId, targetUserId, 'accepted']
    );
    
    if (friendshipCheck.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }
    
    // Check if request already exists
    const requestCheck = await db.all(
      'SELECT id FROM friend_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status = $3',
      [userId, targetUserId, 'pending']
    );
    
    if (requestCheck.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    // Create friend request
    await db.run(
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

        
    // Get the friend request
    const requestQuery = await db.all(
      'SELECT sender_id, receiver_id FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = $3',
      [requestId, userId, 'pending']
    );
    
    if (requestQuery.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    const { senderId, receiverId } = requestQuery[0];
    
    // Update request status
    await db.run(
      'UPDATE friend_requests SET status = $1 WHERE id = $2',
      ['accepted', requestId]
    );
    
    // Create friendship
    await db.run(
      'INSERT INTO friendships (user1_id, user2_id, status) VALUES ($1, $2, $3)',
      [senderId, receiverId, 'accepted']
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

        
    // Update request status
    await db.run(
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

        
    // Remove friendship
    await db.run(
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
