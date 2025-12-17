const http = require('http');
const { Server } = require('socket.io');

// 1. Create standard HTTP server (Required for Railway/Caddy to handle TLS)
const server = http.createServer((req, res) => {
  // Basic health check endpoint
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
  res.writeHead(200);
  res.end('Palace Rulers Signaling Server Online (WebSocket Only)');
});

// 2. Attach Socket.IO Server with STRICT WebSocket Config
const io = new Server(server, {
  cors: {
    origin: "*", // Allow Farcaster frames / any origin
    methods: ["GET", "POST"]
  },
  // CRITICAL: Force WebSocket transport to avoid Railway polling issues
  transports: ['websocket'], 
  allowUpgrades: false 
});

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Host creates a room
  socket.on('CREATE_ROOM', ({ roomId, playerId }) => {
     // Check if room exists using Adapter
     const room = io.sockets.adapter.rooms.get(roomId);
     if (room && room.size > 0) {
       socket.emit('ERROR', 'Room already exists');
       return;
     }

     socket.join(roomId);
     // Attach metadata to socket instance
     socket.data = { roomId, playerId, role: 'HOST' };
     
     console.log(`👑 Room ${roomId} CREATED by ${playerId}`);
     
     socket.emit('ROLE_ASSIGNED', { role: 'HOST', isHost: true });
     socket.emit('WAITING_FOR_OPPONENT');
  });

  // Client joins a room
  socket.on('JOIN_ROOM', ({ roomId, playerId }) => {
     const room = io.sockets.adapter.rooms.get(roomId);
     if (!room || room.size === 0) {
       socket.emit('ERROR', 'Room not found. Please check the code.');
       return;
     }

     if (room.size >= 2) {
       socket.emit('ERROR', 'Room is full (Max 2 players)');
       return;
     }

     socket.join(roomId);
     socket.data = { roomId, playerId, role: 'CLIENT' };
     
     console.log(`👤 Player ${playerId} JOINED ${roomId}`);
     
     socket.emit('ROLE_ASSIGNED', { role: 'CLIENT', isHost: false });
     
     // Notify everyone in the room (Host + Client) that we are ready
     io.to(roomId).emit('ROOM_READY', { roomId });
  });

  // Relay WebRTC Signals
  socket.on('SIGNAL', (payload) => {
     const { roomId } = socket.data;
     if (roomId) {
       // Broadcast to everyone in room EXCEPT sender
       socket.to(roomId).emit('SIGNAL', payload);
     }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
     const { roomId, playerId } = socket.data;
     if (roomId) {
       console.log(`💨 Player ${playerId || socket.id} left ${roomId}`);
       // Notify remaining peer
       socket.to(roomId).emit('PLAYER_LEFT', { playerId });
     }
  });
});

// 3. Listen on process.env.PORT (Required for Railway)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO signaling server running on port ${PORT}`);
});