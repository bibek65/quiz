const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');

const app = express();
app.use(express.json());

const server = createServer(app);

// Increase max listeners to prevent memory leak warnings
server.setMaxListeners(20);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Track connected clients
const connectedClients = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  connectedClients.set(socket.id, socket);
  
  socket.on('join-quiz', (quizId) => {
    // Leave any previous rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id && room.startsWith('quiz-')) {
        socket.leave(room);
      }
    });
    
    socket.join(`quiz-${quizId}`);
    console.log(`Socket ${socket.id} joined quiz ${quizId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
    connectedClients.delete(socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// HTTP endpoint to emit events from Next.js
app.post('/emit', (req, res) => {
  const { quizId, event, data } = req.body;
  io.to(`quiz-${quizId}`).emit(event, data);
  console.log(`Emitted ${event} to quiz-${quizId}`);
  res.json({ success: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectedClients: connectedClients.size,
    rooms: Array.from(io.sockets.adapter.rooms.keys())
  });
});

const port = process.env.PORT || 4000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${port}`);
});

// Cleanup on process termination
process.on('SIGTERM', () => {
  console.log('Shutting down socket server...');
  io.close();
  server.close();
});

process.on('SIGINT', () => {
  console.log('Shutting down socket server...');
  io.close();
  server.close();
});

module.exports = io;
