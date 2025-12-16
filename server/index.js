const http = require('http');
const WebSocket = require('ws');

// 1. Create standard HTTP server (Required for Railway/Caddy to handle TLS)
const server = http.createServer((req, res) => {
  // Basic health check endpoint
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
  res.writeHead(200);
  res.end('Palace Rulers Signaling Server Online');
});

// 2. Attach WebSocket Server to the HTTP instance
const wss = new WebSocket.Server({ server });

// Room State: Map<roomId, Set<WebSocket>>
const rooms = new Map();
// Socket Meta: Map<WebSocket, { roomId, playerId, role }>
const socketMeta = new Map();

wss.on('connection', (ws) => {
  console.log('✅ New WebSocket Connection');
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      const { type, payload } = data;

      switch (type) {
        case 'JOIN_ROOM': {
          const { roomId, playerId } = payload;
          
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          const room = rooms.get(roomId);

          // Idempotency check
          if (room.has(ws)) return;

          // Strict 2-Player Limit
          if (room.size >= 2) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: 'Room is full (Max 2 players)' }));
            return;
          }

          // Add player
          room.add(ws);
          
          // Assign Role: First = HOST, Second = CLIENT
          const role = room.size === 1 ? 'HOST' : 'CLIENT';
          socketMeta.set(ws, { roomId, playerId, role });
          
          console.log(`👤 Player joined ${roomId} as ${role}. Total: ${room.size}`);

          // Acknowledge Join & Role
          ws.send(JSON.stringify({
             type: 'ROLE_ASSIGNED',
             payload: { role, isHost: role === 'HOST' }
          }));

          // Check for Match
          if (room.size === 2) {
             console.log(`🚀 Room ${roomId} is READY. Broadcasting start...`);
             room.forEach(client => {
                 if (client.readyState === WebSocket.OPEN) {
                     client.send(JSON.stringify({ type: 'ROOM_READY', payload: { roomId } }));
                 }
             });
          } else {
             ws.send(JSON.stringify({ type: 'WAITING_FOR_OPPONENT' }));
          }
          break;
        }

        case 'SIGNAL': {
          // Relay WebRTC signals (Offer/Answer/ICE)
          const meta = socketMeta.get(ws);
          if (meta && meta.roomId) {
            const room = rooms.get(meta.roomId);
            if (room) {
                // Forward to the *other* peer in the room
                room.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'SIGNAL', payload }));
                    }
                });
            }
          }
          break;
        }

        case 'LEAVE_ROOM':
          handleDisconnect(ws);
          break;
      }
    } catch (e) {
      console.error('❌ Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
  
  ws.on('error', (err) => {
      console.error('❌ WS Error:', err);
  });
});

function handleDisconnect(ws) {
  const meta = socketMeta.get(ws);
  if (meta) {
    const { roomId, playerId } = meta;
    const room = rooms.get(roomId);
    
    if (room) {
      room.delete(ws);
      console.log(`💨 Player ${playerId} left ${roomId}. Remaining: ${room.size}`);
      
      if (room.size === 0) {
        rooms.delete(roomId);
      } else {
        // Notify remaining player that opponent left
        room.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'PLAYER_LEFT',
                    payload: { playerId }
                }));
            }
        });
      }
    }
    socketMeta.delete(ws);
  }
}

// Keep-Alive Heartbeat
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

// 3. Listen on process.env.PORT (Required for Railway)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});