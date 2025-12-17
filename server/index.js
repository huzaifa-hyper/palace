
const http = require('http');
const { Server } = require('socket.io');

// --- Game Constants & Helpers ---
const Suit = { Spades: '♠', Hearts: '♥', Diamonds: '♦', Clubs: '♣' };
const Rank = { 
  Two: '2', Three: '3', Four: '4', Five: '5', Six: '6', Seven: '7', 
  Eight: '8', Nine: '9', Ten: '10', Jack: 'J', Queen: 'Q', King: 'K', Ace: 'A' 
};

function getCardValue(rank) {
  switch (rank) {
    case Rank.Two: return 2;
    case Rank.Three: return 3;
    case Rank.Four: return 4;
    case Rank.Five: return 5;
    case Rank.Six: return 6;
    case Rank.Seven: return 7;
    case Rank.Eight: return 8;
    case Rank.Nine: return 9;
    case Rank.Ten: return 10;
    case Rank.Jack: return 11;
    case Rank.Queen: return 12;
    case Rank.King: return 13;
    case Rank.Ace: return 14;
    default: return 0;
  }
}

function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function createDeck() {
  const suits = Object.values(Suit);
  const ranks = Object.values(Rank);
  let deck = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
        value: getCardValue(rank)
      });
    });
  });
  return shuffle(deck);
}

// --- Server Setup ---
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
  res.writeHead(200);
  res.end('Palace Rulers Multiplayer Server (Polling + WebSocket Enabled)');
});

// CRITICAL: Allow Polling + WebSocket
const io = new Server(server, {
  cors: {
    origin: "*", // Allow Farcaster frames / any origin
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'], // MUST include polling for Farcaster
  allowEIO3: true // Improved compatibility
});

// --- Room State Management ---
const rooms = new Map(); // roomId -> GameState

function createInitialState(players) {
  return {
    players: players, // [{id, name, hand, faceUp, hidden, socketId, hasSelectedSetup}]
    deck: createDeck(),
    pile: [],
    pileRotations: [],
    turnIndex: 0,
    phase: 'SETUP',
    activeConstraint: 'NONE',
    mustPlayAgain: false,
    winner: null,
    logs: ["Game Started. Players must fortify their positions."]
  };
}

function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach(player => {
    // Sanitize state for each player to prevent cheating
    const sanitizedPlayers = room.players.map(p => {
      if (p.socketId === player.socketId) return p; // Return full data for self
      // Hide opponents' cards
      return {
        ...p,
        hand: p.hand.map(() => ({ id: 'hidden', suit: '', rank: '', value: 0 })), // Masked
        hiddenCards: p.hiddenCards.map(() => ({ id: 'hidden', suit: '', rank: '', value: 0 })), // Masked
        // FaceUp cards are visible
      };
    });

    const snapshot = {
      players: sanitizedPlayers,
      deckCount: room.deck.length,
      pile: room.pile,
      pileRotations: room.pileRotations,
      turnIndex: room.turnIndex,
      phase: room.phase,
      activeConstraint: room.activeConstraint,
      mustPlayAgain: room.mustPlayAgain,
      winner: room.winner,
      logs: room.logs,
      lastUpdateTimestamp: Date.now()
    };

    io.to(player.socketId).emit('GAME_STATE', snapshot);
  });
}

// --- Game Logic Methods ---

function drawCards(player, deck) {
  const cardsNeeded = 3 - player.hand.length;
  if (cardsNeeded > 0 && deck.length > 0) {
    const drawn = deck.splice(0, Math.min(cardsNeeded, deck.length));
    player.hand.push(...drawn);
  }
}

function advanceTurn(room) {
  room.mustPlayAgain = false;
  room.turnIndex = (room.turnIndex + 1) % room.players.length;
}

function checkWinCondition(player, room) {
  if (player.hand.length === 0 && player.faceUpCards.length === 0 && player.hiddenCards.length === 0) {
    room.winner = player.name;
    room.phase = 'GAME_OVER';
    room.logs.push(`🏆 ${player.name} WINS THE GAME!`);
    return true;
  }
  return false;
}

function checkHandState(player, room) {
    if (player.hand.length <= 1 && player.faceUpCards.length > 0) {
       room.logs.push(`${player.name} picks up their Stronghold!`);
       player.hand.push(...player.faceUpCards);
       player.faceUpCards = [];
       // Sort hand for convenience (optional, difficult on server without re-sorting everything)
    }
}

// --- Socket Handlers ---

io.on('connection', (socket) => {
  console.log('✅ Connected:', socket.id, 'via', socket.conn.transport.name);

  // Monitor transport upgrades
  socket.conn.on("upgrade", (transport) => {
    console.log("⬆️ Upgraded transport to", transport.name);
  });

  socket.on('JOIN_ROOM', ({ roomId, playerName }) => {
    const sanitizedRoomId = roomId.toUpperCase();
    let room = rooms.get(sanitizedRoomId);

    // Create room if it doesn't exist (First player is effectively host/creator)
    if (!room) {
      room = {
        players: [],
        deck: [],
        pile: [],
        pileRotations: [],
        turnIndex: 0,
        phase: 'LOBBY',
        activeConstraint: 'NONE',
        mustPlayAgain: false,
        winner: null,
        logs: []
      };
      rooms.set(sanitizedRoomId, room);
    }

    // Check capacity
    if (room.players.length >= 2) {
      // Check if reconnecting
      const existingPlayer = room.players.find(p => p.name === playerName);
      if (existingPlayer) {
          existingPlayer.socketId = socket.id; // Reconnect
          socket.join(sanitizedRoomId);
          broadcastState(sanitizedRoomId);
          return;
      }
      socket.emit('ERROR', 'Room is full');
      return;
    }

    // Add player
    const playerId = room.players.length; // 0 or 1
    const newPlayer = {
      id: playerId,
      name: playerName || `Player ${playerId + 1}`,
      socketId: socket.id,
      hand: [],
      faceUpCards: [],
      hiddenCards: [],
      hasSelectedSetup: false,
      isHuman: true
    };
    room.players.push(newPlayer);
    socket.join(sanitizedRoomId);
    socket.data.roomId = sanitizedRoomId;
    socket.data.playerId = playerId;

    // Auto-Start when 2 players
    if (room.players.length === 2) {
      const deck = createDeck();
      room.players.forEach(p => {
        p.hiddenCards = deck.splice(0, 3);
        p.hand = deck.splice(0, 7);
      });
      room.deck = deck;
      room.phase = 'SETUP';
      room.logs = ["Both players connected. Setup your Strongholds!"];
    } else {
        room.logs = [`${newPlayer.name} joined. Waiting for opponent...`];
    }

    broadcastState(sanitizedRoomId);
  });

  socket.on('ACTION_SETUP_CONFIRM', ({ faceUpCards, hand }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'SETUP') return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    // Basic validation
    if (faceUpCards.length !== 3) return;

    player.faceUpCards = faceUpCards;
    player.hand = hand;
    player.hasSelectedSetup = true;

    // Check if both ready
    if (room.players.every(p => p.hasSelectedSetup)) {
      room.phase = 'PLAYING';
      room.logs.push("All Rulers Ready. The Battle Begins!");
      room.turnIndex = 0;
    }

    broadcastState(roomId);
  });

  socket.on('ACTION_PICK_UP', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'PLAYING') return;

    const player = room.players[room.turnIndex];
    if (player.socketId !== socket.id) return; // Not your turn

    if (room.pile.length > 0) {
        room.logs.push(`${player.name} picks up the pile (${room.pile.length} cards).`);
        player.hand.push(...room.pile);
    } else {
        room.logs.push(`${player.name} passes.`);
    }

    room.pile = [];
    room.pileRotations = [];
    room.activeConstraint = 'NONE';
    advanceTurn(room);
    broadcastState(roomId);
  });

  socket.on('ACTION_PLAY_CARD', ({ cards, source }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'PLAYING') return;

    const player = room.players[room.turnIndex];
    if (player.socketId !== socket.id) return; // Not your turn

    const cardProto = cards[0];
    
    // --- Validation Logic (Mirrors Client) ---
    const topCard = room.pile.length > 0 ? room.pile[room.pile.length - 1] : null;
    let isValid = false;
    const isTwo = cardProto.rank === Rank.Two;
    const isSeven = cardProto.rank === Rank.Seven;
    const isTen = cardProto.rank === Rank.Ten;

    // Source validation logic implies trusted client for simplicity in mini-app,
    // but we should verify card ownership.
    let sourceArray = [];
    if (source === 'HAND') sourceArray = player.hand;
    else if (source === 'FACEUP') sourceArray = player.faceUpCards;
    else if (source === 'HIDDEN') sourceArray = player.hiddenCards;

    // Ensure player actually has these cards
    const hasCards = cards.every(c => sourceArray.some(sc => sc.id === c.id));
    if (!hasCards) {
        // Potential cheat or desync
        return;
    }
    
    // Rule Validation
    if (source === 'FACEUP' && player.hand.length > 0) return; // Must empty hand first
    if (source === 'HIDDEN' && (player.hand.length > 0 || player.faceUpCards.length > 0)) return;

    if (isTwo || isTen || isSeven) {
        isValid = true;
    } else {
        if (!topCard) isValid = true;
        else {
            if (room.activeConstraint === 'LOWER_THAN_7') {
                if (cardProto.value < 7) isValid = true;
            } else {
                if (cardProto.value >= topCard.value) isValid = true;
            }
        }
    }

    // --- Failure Handling (Pickup) ---
    if (!isValid) {
        if (source === 'HIDDEN') {
            room.logs.push(`${player.name} flips ${cardProto.rank}${cardProto.suit} - FAILED! Picks up pile.`);
            // Move played card to hand
            player.hiddenCards = player.hiddenCards.filter(c => c.id !== cardProto.id);
            player.hand.push(cardProto);
            // Pickup pile
            player.hand.push(...room.pile);
            room.pile = [];
            room.pileRotations = [];
            room.activeConstraint = 'NONE';
            advanceTurn(room);
            broadcastState(roomId);
            return;
        } else {
            // Invalid move for visible cards - ignore
            return;
        }
    }

    // --- Execute Move ---
    // Remove cards from source
    const cardIds = cards.map(c => c.id);
    if (source === 'HAND') player.hand = player.hand.filter(c => !cardIds.includes(c.id));
    else if (source === 'FACEUP') player.faceUpCards = player.faceUpCards.filter(c => !cardIds.includes(c.id));
    else if (source === 'HIDDEN') player.hiddenCards = player.hiddenCards.filter(c => !cardIds.includes(c.id));

    // Add to pile
    cards.forEach(() => {
        room.pileRotations.push(Math.random() * 30 - 15);
    });
    
    // Process Effects
    if (isTen) {
        room.logs.push(`${player.name} burns the pile with ${cards.length > 1 ? cards.length + 'x ' : ''}10! 🔥`);
        room.pile = [];
        room.pileRotations = [];
        room.activeConstraint = 'NONE';
        drawCards(player, room.deck);
        checkHandState(player, room);
        if (checkWinCondition(player, room)) { broadcastState(roomId); return; }
        advanceTurn(room);
    } else if (isTwo) {
        room.logs.push(`${player.name} resets with ${cards.length > 1 ? cards.length + 'x ' : ''}2! 🔄`);
        room.pile.push(...cards); // 2 sits on top but resets value technically
        room.activeConstraint = 'NONE';
        drawCards(player, room.deck);
        checkHandState(player, room);
        if (checkWinCondition(player, room)) { broadcastState(roomId); return; }
        room.mustPlayAgain = true;
        room.logs.push(`${player.name} plays again!`);
    } else {
        room.logs.push(`${player.name} plays ${cards.length > 1 ? cards.length + 'x ' : ''}${cardProto.rank}.`);
        room.pile.push(...cards);
        
        if (room.activeConstraint === 'LOWER_THAN_7' && !isSeven) room.activeConstraint = 'NONE';
        if (isSeven) {
            room.logs.push("📉 Next must be LOWER than 7!");
            room.activeConstraint = 'LOWER_THAN_7';
        }

        drawCards(player, room.deck);
        checkHandState(player, room);
        if (checkWinCondition(player, room)) { broadcastState(roomId); return; }
        advanceTurn(room);
    }

    broadcastState(roomId);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.logs.push(`Player disconnected.`);
        // Note: We don't delete the room immediately to allow reconnects
        // But for simplicity in this version, if empty, delete
        const remaining = room.players.filter(p => p.socketId !== socket.id);
        if (remaining.length === 0) {
            rooms.delete(roomId);
        } else {
             // Notify other player
             broadcastState(roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Palace Server running on port ${PORT}`);
});
