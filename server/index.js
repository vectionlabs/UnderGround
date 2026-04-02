const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { db, generateId } = require('./db');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const channelsRoutes = require('./routes/channels');
const groupsRoutes = require('./routes/groups');
const messagesRoutes = require('./routes/messages');
const reelsRoutes = require('./routes/reels');

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction 
  ? [process.env.RENDER_EXTERNAL_URL, 'https://underground.onrender.com']
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Track online users: { oderId: { oderId, username, displayName, avatar, socketId } }
const onlineUsers = new Map();

// Middleware - allow all origins in production for simplicity
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));

// Debug logging in production
if (isProduction) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/reels', reelsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  // Catch-all for SPA routing (must be after API routes)
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // User joins with their ID
  socket.on('user:join', (userData) => {
    if (!userData?.userId) return;
    
    onlineUsers.set(userData.userId, {
      userId: userData.userId,
      oderId: userData.userId,
      username: userData.username,
      displayName: userData.displayName,
      avatar: userData.avatar,
      socketId: socket.id,
    });
    
    socket.userId = userData.userId;
    
    // Join personal room for DMs
    socket.join(`user:${userData.userId}`);
    
    // Broadcast online users
    io.emit('users:online', Array.from(onlineUsers.values()));
    console.log('👤 User joined:', userData.username);
  });

  // Join a group room
  socket.on('group:join', (groupId) => {
    socket.join(`group:${groupId}`);
    console.log(`👥 Socket ${socket.id} joined group ${groupId}`);
  });

  // Leave a group room
  socket.on('group:leave', (groupId) => {
    socket.leave(`group:${groupId}`);
  });

  // Send direct message
  socket.on('dm:send', async (data) => {
    const { receiverId, text } = data;
    if (!socket.userId || !receiverId || !text?.trim()) return;

    const sender = await db.get('SELECT id, username, display_name, avatar FROM users WHERE id = $1', [socket.userId]);
    if (!sender) return;

    const id = generateId();
    await db.run(`
      INSERT INTO direct_messages (id, sender_id, receiver_id, text)
      VALUES ($1, $2, $3, $4)
    `, [id, socket.userId, receiverId, text.trim()]);

    const message = {
      id,
      senderId: socket.userId,
      senderName: sender.displayName,
      senderAvatar: sender.avatar,
      receiverId,
      text: text.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Send to receiver
    io.to(`user:${receiverId}`).emit('dm:receive', message);
    // Send back to sender for confirmation
    socket.emit('dm:sent', message);
  });

  // Send group message
  socket.on('group:message', async (data) => {
    const { groupId, text } = data;
    if (!socket.userId || !groupId || !text?.trim()) return;

    const sender = await db.get('SELECT id, username, display_name, avatar FROM users WHERE id = $1', [socket.userId]);
    if (!sender) return;

    // Check if user is member
    const isMember = await db.get('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, socket.userId]);
    if (!isMember) return;

    const id = generateId();
    await db.run(`
      INSERT INTO group_messages (id, group_id, sender_id, text)
      VALUES ($1, $2, $3, $4)
    `, [id, groupId, socket.userId, text.trim()]);

    const message = {
      id,
      groupId,
      senderId: socket.userId,
      senderName: sender.displayName,
      senderAvatar: sender.avatar,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    // Broadcast to all group members
    io.to(`group:${groupId}`).emit('group:newMessage', message);
  });

  // Typing indicators
  socket.on('typing:start', ({ recipientId, groupId }) => {
    const user = onlineUsers.get(socket.userId);
    if (!user) return;
    
    if (groupId) {
      socket.to(`group:${groupId}`).emit('typing:update', { userId: socket.userId, oderId: socket.userId, username: user.displayName, groupId, typing: true });
    } else if (recipientId) {
      io.to(`user:${recipientId}`).emit('typing:update', { userId: socket.userId, oderId: socket.userId, username: user.displayName, typing: true });
    }
  });

  socket.on('typing:stop', ({ recipientId, groupId }) => {
    if (groupId) {
      socket.to(`group:${groupId}`).emit('typing:update', { userId: socket.userId, oderId: socket.userId, groupId, typing: false });
    } else if (recipientId) {
      io.to(`user:${recipientId}`).emit('typing:update', { userId: socket.userId, oderId: socket.userId, typing: false });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('users:online', Array.from(onlineUsers.values()));
      console.log('👋 User disconnected:', socket.userId);
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Errore interno del server' });
});

server.listen(PORT, () => {
  console.log(`🚀 UnderGround API server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});
