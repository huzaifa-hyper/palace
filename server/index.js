const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Palace Rulers Signaling Server Online');
});

const wss = new WebSocket.Server({ server });

// Room Structure: { clients: WebSocket[] } - clients[0] is HOST, clients[1] is CLIENT
const rooms = new Map();
// Socket Meta: { roomId, playerId, role }
const socketMeta = new Map();

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'JOIN_ROOM': {
          const { roomId, playerId } = payload;
          
          let room = rooms.get(roomId);
          if (!room) {
            room = { clients: [] };
            rooms.set(roomId, room);
          }

          // Check if already in room (idempotency)
          if (room.clients.includes(ws)) return;

          // Enforce 2 player limit for strict Host/Client logic
          if (room.clients.length >= 2) {
             ws.send(JSON.stringify({ type: 'ERROR', payload: 'Room full' }));
             return;
          }

          room.clients.push(ws);
          
          // Determine Role
          const role = room.clients.length === 1 ? 'HOST' : 'CLIENT';
          socketMeta.set(ws, { roomId, playerId, role });
          
          console.log(`Player ${playerId} joined ${roomId} as ${role}. Total: ${room.clients.length}`);

          // 1. Tell the player their role
          ws.send(JSON.stringify({
             type: 'ROLE_ASSIGNED',
             payload: { role, isHost: role === 'HOST' }
          }));

          // 2. If Room is full (2 players), broadcast ROOM_READY
          if (room.clients.length === 2) {
             console.log(`Room ${roomId} is READY.`);
             room.clients.forEach(client => {
                 if (client.readyState === WebSocket.OPEN) {
                     client.send(JSON.stringify({ type: 'ROOM_READY', payload: { roomId } }));
                 }
             });
          }
          break;
        }

        case 'SIGNAL': {
          // Relays OFFER, ANSWER, ICE_CANDIDATE
          const meta = socketMeta.get(ws);
          if (meta && meta.roomId) {
            const room = rooms.get(meta.roomId);
            if (room) {
                // Broadcast to OTHER peer in the room
                room.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'SIGNAL', payload }));
                    }
                });
            }
          }
          break;
        }
        
        case 'LEAVE_ROOM': {
            handleDisconnect(ws);
            break;
        }
      }
    } catch (e) {
      console.error('Error parsing message', e);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function handleDisconnect(ws) {
  const meta = socketMeta.get(ws);
  if (meta) {
    const { roomId, playerId } = meta;
    const room = rooms.get(roomId);
    
    if (room) {
      // Remove client
      room.clients = room.clients.filter(c => c !== ws);
      
      if (room.clients.length === 0) {
        rooms.delete(roomId);
      } else {
        // Notify remaining player
        room.clients.forEach(client => {
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
    console.log(`Player ${playerId} disconnected`);
  }
}

// Keep-Alive
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});