const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  // Basic health check endpoint
  res.writeHead(200);
  res.end('Palace Rulers Signaling Server Online');
});

const wss = new WebSocket.Server({ server });

// Map<RoomID, Set<WebSocket>>
const rooms = new Map();
// Map<WebSocket, { roomId: string, playerId: string }>
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
          
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          
          const room = rooms.get(roomId);
          
          // Check if player is already in room (reconnect logic could go here)
          // For now, simple limit
          if (room.size >= 2) {
             // Check if one of the sockets is actually dead
             let deadCount = 0;
             room.forEach(client => {
                 if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                     deadCount++;
                     room.delete(client);
                 }
             });
             
             if (room.size >= 2) {
                 ws.send(JSON.stringify({ type: 'ERROR', payload: 'Room full' }));
                 return;
             }
          }

          room.add(ws);
          socketMeta.set(ws, { roomId, playerId });
          
          console.log(`Player ${playerId} joined room ${roomId}. Size: ${room.size}`);

          // Notify other player in room
          broadcastToRoom(ws, roomId, {
            type: 'PLAYER_JOINED',
            payload: { playerId }
          });

          // If room is now full (2 players), notify Host to start signaling
          if (room.size === 2) {
             const players = Array.from(room).map(c => socketMeta.get(c).playerId);
             broadcastToRoom(null, roomId, { type: 'READY_TO_SIGNAL', payload: { players } });
          }
          break;
        }

        case 'SIGNAL': {
          // Relays OFFER, ANSWER, ICE_CANDIDATE
          const { roomId } = socketMeta.get(ws) || {};
          if (roomId) {
            broadcastToRoom(ws, roomId, { type: 'SIGNAL', payload });
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
      room.delete(ws);
      if (room.size === 0) {
        rooms.delete(roomId);
      } else {
        // Notify remaining player
        broadcastToRoom(ws, roomId, {
          type: 'PLAYER_LEFT',
          payload: { playerId }
        });
      }
    }
    socketMeta.delete(ws);
    console.log(`Player ${playerId} disconnected`);
  }
}

function broadcastToRoom(senderWs, roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const msgString = JSON.stringify(message);
  for (const client of room) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(msgString);
    }
  }
}

// Heartbeat interval to keep connections alive through load balancers
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