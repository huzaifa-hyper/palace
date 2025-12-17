
const express = require('express');
const cors = require('cors');
const http = require('http');

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

// --- App Setup ---
const app = express();
app.use(cors());
app.use(express.json()); // Updated from body-parser

// --- Room State Management ---
// Map<roomId, GameState>
const rooms = new Map();

function broadcastState(roomId) {
  // In HTTP polling, we don't push. We just update the timestamp.
  const room = rooms.get(roomId);
  if (room) {
      room.lastUpdateTimestamp = Date.now();
  }
}

function createInitialState() {
  return {
    players: [], // [{id, name, token, hand, faceUp, hidden, hasSelectedSetup}]
    deck: [],
    pile: [],
    pileRotations: [],
    turnIndex: 0,
    phase: 'LOBBY',
    activeConstraint: 'NONE',
    mustPlayAgain: false,
    winner: null,
    logs: [],
    lastUpdateTimestamp: Date.now()
  };
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
    }
}

// --- API Endpoints ---

app.get('/health', (req, res) => res.send('Palace Rulers HTTP Server OK'));

// JOIN / CREATE GAME
app.post('/api/join', (req, res) => {
    const { roomId, playerName } = req.body;
    const sanitizedId = roomId ? roomId.toUpperCase() : 'DEFAULT';
    
    let room = rooms.get(sanitizedId);
    if (!room) {
        room = createInitialState();
        rooms.set(sanitizedId, room);
    }

    // Check if player exists (Reconnect)
    const existingPlayer = room.players.find(p => p.name === playerName);
    if (existingPlayer) {
        return res.json({ 
            success: true, 
            roomId: sanitizedId, 
            playerToken: existingPlayer.token, 
            playerId: existingPlayer.id 
        });
    }

    if (room.players.length >= 2) {
        return res.status(403).json({ success: false, message: 'Room is full' });
    }

    // Add new player
    const playerId = room.players.length;
    const playerToken = Math.random().toString(36).substring(2);
    
    const newPlayer = {
      id: playerId,
      name: playerName || `Player ${playerId + 1}`,
      token: playerToken,
      hand: [],
      faceUpCards: [],
      hiddenCards: [],
      hasSelectedSetup: false
    };
    room.players.push(newPlayer);

    // Auto-Start Logic
    if (room.players.length === 2) {
        room.deck = createDeck();
        room.players.forEach(p => {
            p.hiddenCards = room.deck.splice(0, 3);
            p.hand = room.deck.splice(0, 7);
        });
        room.phase = 'SETUP';
        room.logs.push("Both players connected. Setup your Strongholds!");
    } else {
        room.logs.push(`${newPlayer.name} joined. Waiting for opponent...`);
    }

    broadcastState(sanitizedId);

    res.json({ 
        success: true, 
        roomId: sanitizedId, 
        playerToken, 
        playerId 
    });
});

// GET GAME STATE (Polling Endpoint)
app.get('/api/state/:roomId', (req, res) => {
    const { roomId } = req.params;
    const { playerToken } = req.query; // Auth to see own cards
    
    const room = rooms.get(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Sanitize State
    const sanitizedPlayers = room.players.map(p => {
        if (p.token === playerToken) return p; // Return full data for self
        return {
            ...p,
            token: undefined, // Hide token
            hand: p.hand.map(() => ({ id: 'hidden', suit: '', rank: '', value: 0 })), 
            hiddenCards: p.hiddenCards.map(() => ({ id: 'hidden', suit: '', rank: '', value: 0 })),
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
        lastUpdateTimestamp: room.lastUpdateTimestamp
    };

    res.json(snapshot);
});

// GAME ACTIONS
app.post('/api/action', (req, res) => {
    const { roomId, playerToken, action, payload } = req.body;
    
    const room = rooms.get(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const player = room.players.find(p => p.token === playerToken);
    if (!player) return res.status(403).json({ message: 'Invalid token' });

    // --- Action Handlers ---

    if (action === 'SETUP_CONFIRM') {
        if (room.phase !== 'SETUP') return res.status(400).json({message: 'Invalid phase'});
        player.faceUpCards = payload.faceUpCards;
        player.hand = payload.hand;
        player.hasSelectedSetup = true;

        if (room.players.every(p => p.hasSelectedSetup)) {
            room.phase = 'PLAYING';
            room.logs.push("All Rulers Ready. The Battle Begins!");
            room.turnIndex = 0;
        }
    } 
    else if (action === 'PICK_UP') {
        if (room.phase !== 'PLAYING' || room.players[room.turnIndex].id !== player.id) return res.status(400).send();
        
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
    }
    else if (action === 'PLAY_CARD') {
        if (room.phase !== 'PLAYING' || room.players[room.turnIndex].id !== player.id) return res.status(400).send();
        
        const { cards, source } = payload;
        const cardProto = cards[0];
        
        // --- Validation Logic ---
        const topCard = room.pile.length > 0 ? room.pile[room.pile.length - 1] : null;
        let isValid = false;
        const isTwo = cardProto.rank === Rank.Two;
        const isSeven = cardProto.rank === Rank.Seven;
        const isTen = cardProto.rank === Rank.Ten;

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

        if (!isValid) {
            if (source === 'HIDDEN') {
                room.logs.push(`${player.name} flips ${cardProto.rank}${cardProto.suit} - FAILED! Picks up pile.`);
                player.hiddenCards = player.hiddenCards.filter(c => c.id !== cardProto.id);
                player.hand.push(cardProto);
                player.hand.push(...room.pile);
                room.pile = [];
                room.pileRotations = [];
                room.activeConstraint = 'NONE';
                advanceTurn(room);
                broadcastState(roomId);
                return res.json({ success: true });
            } else {
                return res.status(400).json({ message: 'Invalid Move' });
            }
        }

        // Execute Move
        const cardIds = cards.map(c => c.id);
        if (source === 'HAND') player.hand = player.hand.filter(c => !cardIds.includes(c.id));
        else if (source === 'FACEUP') player.faceUpCards = player.faceUpCards.filter(c => !cardIds.includes(c.id));
        else if (source === 'HIDDEN') player.hiddenCards = player.hiddenCards.filter(c => !cardIds.includes(c.id));

        cards.forEach(() => room.pileRotations.push(Math.random() * 30 - 15));

        if (isTen) {
            room.logs.push(`${player.name} burns the pile with ${cards.length > 1 ? cards.length + 'x ' : ''}10! 🔥`);
            room.pile = [];
            room.pileRotations = [];
            room.activeConstraint = 'NONE';
            drawCards(player, room.deck);
            checkHandState(player, room);
            if (checkWinCondition(player, room)) { broadcastState(roomId); return res.json({success:true}); }
            advanceTurn(room);
        } else if (isTwo) {
            room.logs.push(`${player.name} resets with ${cards.length > 1 ? cards.length + 'x ' : ''}2! 🔄`);
            room.pile.push(...cards);
            room.activeConstraint = 'NONE';
            drawCards(player, room.deck);
            checkHandState(player, room);
            if (checkWinCondition(player, room)) { broadcastState(roomId); return res.json({success:true}); }
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
            if (checkWinCondition(player, room)) { broadcastState(roomId); return res.json({success:true}); }
            advanceTurn(room);
        }
    }

    broadcastState(roomId);
    res.json({ success: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Palace HTTP REST Server running on port ${PORT}`);
});
