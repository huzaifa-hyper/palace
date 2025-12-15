import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Users, RotateCcw, Trophy, Clock, Flame, ArrowDown, ChevronRight, Hand, Timer, Volume2, VolumeX, EyeOff, Eye, User, X, Globe, Check } from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Suit, Rank, Card, Player, GamePhase, UserProfile, GameMode, GameStateSnapshot } from '../types';
import { audioService } from '../services/audioService';
import { MOCK_PLAYER_NAMES } from '../constants';
import { p2pService } from '../services/p2pService';

// --- Game Logic Helpers ---

const getCardValue = (rank: Rank): number => {
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
};

const createDeck = (): Card[] => {
  const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
  const ranks = Object.values(Rank);
  let deck: Card[] = [];
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
};

const shuffle = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Props ---

interface GameProps {
  mode: GameMode;
  playerCount: number;
  userProfile: UserProfile;
  connectedPeers?: any[]; // For Host
  onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ mode, playerCount, userProfile, connectedPeers, onExit }) => {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [pile, setPile] = useState<Card[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Game Logic State
  const [activeConstraint, setActiveConstraint] = useState<'NONE' | 'LOWER_THAN_7'>('NONE');
  const [mustPlayAgain, setMustPlayAgain] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Interaction State
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isHandRevealed, setIsHandRevealed] = useState<boolean>(false);
  
  // Visual State
  const [pileRotations, setPileRotations] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const isHost = mode === 'ONLINE_HOST';
  const isClient = mode === 'ONLINE_CLIENT';
  const isOnline = isHost || isClient;

  // --- Robust Identity Resolution ---
  const myPlayerId = useMemo(() => {
      if (players.length === 0) return -1;
      
      if (isHost) return 0; // Host is always player 0
      
      if (isClient) {
          // Robust check for peerId
          const myPeerId = p2pService.myPeerId;
          if (!myPeerId) return -1;
          return players.findIndex(p => p.peerId === myPeerId);
      }
      
      if (mode === 'VS_BOT') return 0; // Player is always 0 against bots
      if (mode === 'PASS_AND_PLAY') return turnIndex; // Identity follows turn
      
      return -1;
  }, [isHost, isClient, mode, players, turnIndex]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Sound Helper
  const playSound = (type: 'CLICK' | 'PLACE' | 'ERROR' | 'BURN' | 'RESET' | 'VICTORY') => {
    if (isMuted) return;
    try {
        switch(type) {
            case 'CLICK': audioService.playClick(); break;
            case 'PLACE': audioService.playCardPlace(); break;
            case 'ERROR': audioService.playError(); break;
            case 'BURN': audioService.playBurn(); break;
            case 'RESET': audioService.playReset(); break;
            case 'VICTORY': audioService.playVictory(); break;
        }
    } catch (e) {
        console.warn("Audio failed to play", e);
    }
  };

  // --- Synchronization (Host -> Client) ---
  const broadcastState = (currentState: any = null) => {
    if (!isHost) return;

    // Use current state or provided override
    const snapshot: GameStateSnapshot = {
        players: currentState?.players || players,
        deckCount: currentState?.deck ? currentState.deck.length : deck.length,
        pile: currentState?.pile || pile,
        pileRotations: currentState?.pileRotations || pileRotations,
        turnIndex: currentState?.turnIndex !== undefined ? currentState.turnIndex : turnIndex,
        phase: currentState?.phase || phase,
        activeConstraint: currentState?.activeConstraint || activeConstraint,
        mustPlayAgain: currentState?.mustPlayAgain || mustPlayAgain,
        winner: currentState?.winner || winner,
        logs: currentState?.logs || logs
    };

    p2pService.broadcast({
        type: 'SYNC_STATE',
        payload: snapshot
    });
  };

  // --- Synchronization & Networking ---
  useEffect(() => {
    if (isClient) {
        // Request sync immediately on mount to ensure we get the latest state
        // this fixes the race condition where host broadcasts before we are ready
        const syncInterval = setInterval(() => {
            if (players.length === 0) {
               p2pService.sendToHost({ type: 'SYNC_REQUEST', payload: {} });
            } else {
               clearInterval(syncInterval);
            }
        }, 1000);
        
        // Initial immediate request
        p2pService.sendToHost({ type: 'SYNC_REQUEST', payload: {} });

        p2pService.onMessage((msg) => {
            if (msg.type === 'SYNC_STATE') {
                const state = msg.payload as GameStateSnapshot;
                setPlayers(state.players);
                setDeck(Array(state.deckCount).fill({} as Card)); 
                setPile(state.pile);
                setPileRotations(state.pileRotations);
                setTurnIndex(state.turnIndex);
                setPhase(state.phase);
                setActiveConstraint(state.activeConstraint);
                setMustPlayAgain(state.mustPlayAgain);
                setWinner(state.winner);
                setLogs(state.logs);
                
                // Audio triggers
                const lastLog = state.logs[state.logs.length - 1];
                if (lastLog && !logs.includes(lastLog)) {
                    if (lastLog.includes('plays')) playSound('PLACE');
                    if (lastLog.includes('resets')) playSound('RESET');
                    if (lastLog.includes('burns')) playSound('BURN');
                    if (lastLog.includes('wins')) playSound('VICTORY');
                }
            }
        });
        
        return () => clearInterval(syncInterval);
    }

    if (isHost) {
        p2pService.onMessage((msg, senderId) => {
            if (msg.type === 'SYNC_REQUEST') {
                broadcastState();
            } else if (msg.type === 'PLAY_CARD') {
                // Find player index by senderId
                const pIndex = players.findIndex(p => p.peerId === senderId);
                if (pIndex !== -1 && pIndex === turnIndex) {
                    attemptPlayCards(pIndex, msg.payload.cards, msg.payload.source);
                }
            } else if (msg.type === 'PICK_UP') {
                 const pIndex = players.findIndex(p => p.peerId === senderId);
                 if (pIndex !== -1 && pIndex === turnIndex) {
                     handlePickupPile(pIndex);
                 }
            } else if (msg.type === 'SETUP_CONFIRM') {
                 const pIndex = players.findIndex(p => p.peerId === senderId);
                 if (pIndex !== -1) {
                     handleRemoteSetup(pIndex, msg.payload.faceUpCards, msg.payload.hand);
                 }
            }
        });
    }
  }, [isClient, isHost, players, turnIndex, logs, pile, pileRotations, phase, activeConstraint, mustPlayAgain, winner, deck]); 

  // --- Timer Logic ---
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    // Reset timer when turn changes
    setTimeLeft(20);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [turnIndex, phase, mustPlayAgain]);

  // Handle Timeout Action (Host Only logic)
  useEffect(() => {
    if (timeLeft === 0 && phase === 'PLAYING') {
      // Auto penalty: Pick up pile
      // Only Host runs authoritative logic
      if (!isClient) {
          handlePickupPile(turnIndex, true);
      }
    }
  }, [timeLeft, phase, turnIndex]);

  // --- Initialization ---

  // Trigger start on mount
  useEffect(() => {
     startGame();
  }, []);

  const getRandomMockName = () => {
    return MOCK_PLAYER_NAMES[Math.floor(Math.random() * MOCK_PLAYER_NAMES.length)];
  };

  const startGame = () => {
    // Client waits for sync
    if (isClient) return;

    playSound('CLICK');
    const newDeck = createDeck();
    const newPlayers: Player[] = [];

    // Setup players based on mode
    for (let i = 0; i < playerCount; i++) {
      let isHuman = false;
      let name = `Bot ${i}`;
      let peerId = undefined;

      if (mode === 'VS_BOT') {
          isHuman = i === 0;
          if (isHuman) name = userProfile.name;
      } else if (mode === 'PASS_AND_PLAY') {
          isHuman = true;
          if (i === 0) name = userProfile.name;
          else name = `Player ${i + 1}`;
      } else if (mode === 'ONLINE_HOST') {
          // Host is always player 0
          if (i === 0) {
              isHuman = true;
              name = userProfile.name;
              peerId = 'HOST';
          } else {
              // Map connected peers
              if (connectedPeers && connectedPeers[i]) {
                  isHuman = true; // Remote human
                  name = connectedPeers[i].name;
                  peerId = connectedPeers[i].id;
              } else {
                  // Fallback if peer dropped (shouldn't happen in happy path)
                  name = "Disconnected";
              }
          }
      }

      const hiddenCards = newDeck.splice(0, 3);
      const hand = newDeck.splice(0, 7);
      
      newPlayers.push({
        id: i,
        name,
        isHuman, // For local logic, human means "not AI". For host, remote humans are treated as humans.
        hiddenCards,
        hand,
        faceUpCards: [],
        hasSelectedSetup: !isHuman && mode !== 'ONLINE_HOST', // Bots auto ready. Online players not ready.
        peerId
      });
    }

    // Bot Setup Logic (Local only)
    newPlayers.forEach(p => {
      if (!p.isHuman && mode === 'VS_BOT') {
        const sorted = [...p.hand].sort((a, b) => b.value - a.value);
        p.faceUpCards = sorted.slice(0, 3);
        p.hand = sorted.slice(3);
      }
    });

    setDeck(newDeck);
    setPlayers(newPlayers);
    setPile([]);
    setPileRotations([]);
    setTurnIndex(0);
    setPhase('SETUP');
    setActiveConstraint('NONE');
    setMustPlayAgain(false);
    setWinner(null);
    setIsHandRevealed(mode !== 'PASS_AND_PLAY'); 
    setLogs(["Game Started. Players must fortify their positions."]);

    if (isHost) {
        // Initial broadcast
        // Use a timeout to ensure state is set before broadcast, or pass specific state
        setTimeout(() => {
             const initialState = {
                 players: newPlayers,
                 deck: newDeck,
                 phase: 'SETUP',
                 logs: ["Game Started. Players must fortify their positions."]
             };
             broadcastState(initialState);
        }, 100);
    }
  };

  // --- Game Flow & Rules ---

  const addLog = (msg: string) => {
    const newLogs = [...logs, msg];
    setLogs(newLogs);
    return newLogs;
  };

  const advanceTurn = (currentPlayers: Player[]) => {
    setMustPlayAgain(false);
    const nextIndex = (turnIndex + 1) % currentPlayers.length;
    setTurnIndex(nextIndex);
    
    // In Pass & Play, hide hand on turn switch
    if (mode === 'PASS_AND_PLAY' && currentPlayers[nextIndex].isHuman) {
        setIsHandRevealed(false);
    }
    return nextIndex;
  };

  const drawCards = (player: Player, currentDeck: Card[]) => {
    const cardsNeeded = 3 - player.hand.length;
    if (cardsNeeded > 0 && currentDeck.length > 0) {
      const drawn = currentDeck.splice(0, Math.min(cardsNeeded, currentDeck.length));
      player.hand.push(...drawn);
    }
  };

  const checkHandState = (player: Player, logArray: string[]) => {
    if (player.hand.length <= 1 && player.faceUpCards.length > 0) {
       logArray.push(`${player.name} picks up their Stronghold!`);
       player.hand.push(...player.faceUpCards);
       player.faceUpCards = [];
       if (!player.isHuman && mode === 'VS_BOT') {
         player.hand.sort((a, b) => a.value - b.value);
       }
    }
  };

  const checkWinCondition = (player: Player) => {
    if (player.hand.length === 0 && player.faceUpCards.length === 0 && player.hiddenCards.length === 0) {
      setWinner(player.name);
      setPhase('GAME_OVER');
      playSound('VICTORY');
      addLog(`🏆 ${player.name} WINS THE GAME!`);
      return true;
    }
    return false;
  };

  const handlePickupPile = (playerIndex: number, isTimeout: boolean = false) => {
    // Client just sends request
    if (isClient) {
        p2pService.sendToHost({ type: 'PICK_UP', payload: {} });
        return;
    }
    
    if (phase !== 'PLAYING') return;

    const newPlayers = [...players];
    const player = newPlayers[playerIndex];
    let currentLogs = [...logs];
    
    if (isTimeout) {
        currentLogs.push(`⏳ Time's up! ${player.name} picks up the pile.`);
        playSound('ERROR');
    } else {
        if (pile.length === 0) {
             currentLogs.push(`${player.name} passes.`);
             playSound('CLICK');
             setLogs(currentLogs);
             const nextTurn = advanceTurn(newPlayers);
             
             // Broadcast Update
             if (isHost) {
                 broadcastState({ players: newPlayers, logs: currentLogs, turnIndex: nextTurn, pile: [] });
             }
             return;
        }
        currentLogs.push(`${player.name} picks up the pile (${pile.length} cards).`);
        playSound('CLICK');
    }

    if (pile.length > 0) {
        player.hand = [...player.hand, ...pile];
    }
    
    setLogs(currentLogs);
    setPlayers(newPlayers);
    setPile([]);
    setPileRotations([]);
    setActiveConstraint('NONE');
    setMustPlayAgain(false);
    setSelectedCardIds([]);
    const nextTurn = advanceTurn(newPlayers);

    if (isHost) {
        broadcastState({ 
            players: newPlayers, 
            logs: currentLogs, 
            turnIndex: nextTurn, 
            pile: [], 
            pileRotations: [], 
            activeConstraint: 'NONE', 
            mustPlayAgain: false 
        });
    }
  };

  const attemptPlayCards = (playerIndex: number, cards: Card[], source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    // Client sending request
    if (isClient) {
        p2pService.sendToHost({
            type: 'PLAY_CARD',
            payload: { cards, source }
        });
        // Optimistically clear selection
        setSelectedCardIds([]);
        return;
    }

    const newPlayers = [...players];
    const newDeck = [...deck];
    const player = newPlayers[playerIndex];
    const cardProto = cards[0]; 
    let currentLogs = [...logs];
    
    // --- Validation ---
    if (source === 'FACEUP' && player.hand.length > 0) {
      currentLogs.push("Cannot play Face-Up cards while you have cards in hand.");
      setLogs(currentLogs);
      playSound('ERROR');
      if (isHost) broadcastState({ logs: currentLogs });
      return;
    }
    
    if (source === 'HIDDEN' && (player.hand.length > 0 || player.faceUpCards.length > 0)) {
       currentLogs.push("Cannot play Hidden cards yet.");
       setLogs(currentLogs);
       playSound('ERROR');
       if (isHost) broadcastState({ logs: currentLogs });
       return;
    }

    const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
    let isValid = false;
    
    const isTwo = cardProto.rank === Rank.Two;
    const isSeven = cardProto.rank === Rank.Seven;
    const isTen = cardProto.rank === Rank.Ten;

    if (isTwo || isTen || isSeven) {
      isValid = true;
    } else {
      if (!topCard) {
        isValid = true;
      } else {
        if (activeConstraint === 'LOWER_THAN_7') {
          if (cardProto.value < 7) isValid = true;
        } else {
          if (cardProto.value >= topCard.value) isValid = true;
        }
      }
    }

    // --- Failure Handling ---
    if (!isValid) {
      if (source === 'HIDDEN') {
        currentLogs.push(`${player.name} flips ${cardProto.rank}${cardProto.suit} - FAILED! Picks up pile.`);
        playSound('ERROR');
        player.hand.push(cardProto);
        player.hiddenCards = player.hiddenCards.filter(c => c.id !== cardProto.id);
        player.hand = [...player.hand, ...pile];
        
        setLogs(currentLogs);
        setPlayers(newPlayers);
        setPile([]);
        setPileRotations([]);
        setActiveConstraint('NONE');
        setSelectedCardIds([]);
        const nextTurn = advanceTurn(newPlayers);
        
        if (isHost) {
            broadcastState({
                players: newPlayers, logs: currentLogs, pile: [], pileRotations: [], 
                activeConstraint: 'NONE', turnIndex: nextTurn
            });
        }
        return;
      } else {
        currentLogs.push(`Invalid move: ${cardProto.rank} cannot be played.`);
        setLogs(currentLogs);
        playSound('ERROR');
        setSelectedCardIds([]);
        if (isHost) broadcastState({ logs: currentLogs });
        return;
      }
    }

    // --- Execution ---
    const cardIds = cards.map(c => c.id);
    if (source === 'HAND') {
      player.hand = player.hand.filter(c => !cardIds.includes(c.id));
    } else if (source === 'FACEUP') {
      player.faceUpCards = player.faceUpCards.filter(c => !cardIds.includes(c.id));
    } else if (source === 'HIDDEN') {
      player.hiddenCards = player.hiddenCards.filter(c => !cardIds.includes(c.id));
    }

    const newPileRotations = [...pileRotations];
    cards.forEach(() => {
        newPileRotations.push(Math.random() * 30 - 15);
    });
    setPileRotations(newPileRotations);

    let nextConstraint = activeConstraint;
    let nextMustPlayAgain = false;
    let nextPile = [...pile, ...cards];
    let nextTurn = turnIndex;

    if (isTen) {
       currentLogs.push(`${player.name} burns the pile with ${cards.length > 1 ? cards.length + 'x ' : ''}10! 🔥`);
       playSound('BURN');
       nextPile = []; 
       setPileRotations([]); // Reset rotations locally too, though broadcast handles sync
       nextConstraint = 'NONE';
       
       drawCards(player, newDeck);
       checkHandState(player, currentLogs);
       
       if (checkWinCondition(player)) {
           if (isHost) broadcastState({ winner: player.name, phase: 'GAME_OVER', players: newPlayers, logs: currentLogs });
           return;
       }

       nextTurn = advanceTurn(newPlayers); 
    } 
    else if (isTwo) {
       currentLogs.push(`${player.name} resets with ${cards.length > 1 ? cards.length + 'x ' : ''}2! 🔄`);
       playSound('RESET');
       nextConstraint = 'NONE';
       
       drawCards(player, newDeck);
       checkHandState(player, currentLogs);
       
       if (checkWinCondition(player)) {
           if (isHost) broadcastState({ winner: player.name, phase: 'GAME_OVER', players: newPlayers, logs: currentLogs });
           return;
       }
       
       nextMustPlayAgain = true;
       setMustPlayAgain(true);
       setTimeLeft(20); 
       currentLogs.push(`${player.name} plays again!`);
    }
    else {
       const msg = `${player.name} plays ${cards.length > 1 ? cards.length + 'x ' : ''}${cardProto.rank}.`;
       currentLogs.push(msg);
       playSound('PLACE');
       
       if (activeConstraint === 'LOWER_THAN_7' && !isSeven) {
          nextConstraint = 'NONE';
       }
       if (isSeven) {
          currentLogs.push("📉 Next must be LOWER than 7!");
          nextConstraint = 'LOWER_THAN_7';
       }

       drawCards(player, newDeck);
       checkHandState(player, currentLogs);
       
       if (checkWinCondition(player)) {
           if (isHost) broadcastState({ winner: player.name, phase: 'GAME_OVER', players: newPlayers, logs: currentLogs });
           return;
       }

       nextTurn = advanceTurn(newPlayers);
    }
    
    setLogs(currentLogs);
    setDeck(newDeck);
    setPlayers(newPlayers);
    setPile(nextPile);
    setActiveConstraint(nextConstraint);
    setSelectedCardIds([]);

    if (isHost) {
        broadcastState({
            players: newPlayers,
            deck: newDeck,
            logs: currentLogs,
            pile: nextPile,
            activeConstraint: nextConstraint,
            mustPlayAgain: nextMustPlayAgain,
            turnIndex: nextTurn,
            // Optimization: if burned, send empty pileRotations
            pileRotations: nextPile.length === 0 ? [] : newPileRotations
        });
    }
  };

  // --- Bot AI ---

  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const currentPlayer = players[turnIndex];
    if (currentPlayer && currentPlayer.isHuman) return;
    if (isClient) return; // Clients don't run bot logic
    
    // Safety check if currentPlayer undefined (e.g. state inconsistency)
    if (!currentPlayer) return;

    const botDelay = 1000 + Math.random() * 2000;
    const timer = setTimeout(() => {
      botPlay(turnIndex);
    }, botDelay);

    return () => clearTimeout(timer);
  }, [turnIndex, phase, mustPlayAgain, players]);

  const botPlay = (pIndex: number) => {
    // Validate turn index and players existence
    if (turnIndex !== pIndex || !players[pIndex]) return;

    const player = players[pIndex];
    let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';
    let availableCards = player.hand;

    if (player.hand.length === 0) {
      if (player.faceUpCards.length > 0) {
         source = 'FACEUP';
         availableCards = player.faceUpCards;
      } else {
         source = 'HIDDEN';
         availableCards = player.hiddenCards;
      }
    }

    if (source === 'HIDDEN') {
      const randomIdx = Math.floor(Math.random() * availableCards.length);
      attemptPlayCards(pIndex, [availableCards[randomIdx]], source);
      return;
    }

    const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
    const groups: { [key: number]: Card[] } = {};
    availableCards.forEach(c => {
       if (!groups[c.value]) groups[c.value] = [];
       groups[c.value].push(c);
    });

    const playableGroups: Card[][] = [];
    Object.values(groups).forEach(group => {
       const sample = group[0];
       let canPlay = false;
       if (sample.value === 2 || sample.value === 7 || sample.value === 10) canPlay = true;
       else if (!topCard) canPlay = true;
       else if (activeConstraint === 'LOWER_THAN_7') canPlay = sample.value < 7;
       else canPlay = sample.value >= topCard.value;

       if (canPlay) playableGroups.push(group);
    });

    if (playableGroups.length > 0) {
      playableGroups.sort((a, b) => {
         const valA = a[0].value;
         const valB = b[0].value;
         if (a.length !== b.length) return b.length - a.length;
         if ((valA === 2 || valA === 10) && (valB !== 2 && valB !== 10)) return 1;
         if ((valB === 2 || valB === 10) && (valA !== 2 && valA !== 10)) return -1;
         return valA - valB;
      });

      attemptPlayCards(pIndex, playableGroups[0], source);
    } else {
      handlePickupPile(pIndex);
    }
  };

  // --- Human Interactions ---

  const handleCardClick = (card: Card, source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    if (phase !== 'PLAYING') return;
    
    // Check turn
    if (!players[turnIndex]) return;

    // Check Identity and Turn
    if (myPlayerId === -1) {
        console.warn("Player identity lost or not synchronized.");
        return;
    }

    if (turnIndex !== myPlayerId) {
        return; // Not your turn
    }
    
    const currentPlayer = players[turnIndex];
    if (mode !== 'ONLINE_HOST' && mode !== 'ONLINE_CLIENT' && !currentPlayer.isHuman) return;
    
    if (mode === 'PASS_AND_PLAY' && !isHandRevealed) return;

    if (source === 'HIDDEN') {
      attemptPlayCards(turnIndex, [card], source);
      return;
    }

    if (selectedCardIds.includes(card.id)) {
       setSelectedCardIds(prev => prev.filter(id => id !== card.id));
       playSound('CLICK');
    } else {
       const currentSelection = currentPlayer.hand.filter(c => selectedCardIds.includes(c.id));
       if (currentSelection.length === 0 || currentSelection[0].rank === card.rank) {
          setSelectedCardIds([...selectedCardIds, card.id]);
          playSound('CLICK');
       } else {
          setSelectedCardIds([card.id]);
          playSound('CLICK');
       }
    }
  };

  const handleHumanSetupToggle = (card: Card) => {
    const newPlayers = [...players];
    // In online mode, we only edit our own player
    // Safety check for invalid player ID during early init
    if (myPlayerId === -1 || !newPlayers[myPlayerId]) return;

    const pIndex = myPlayerId; // Use robust ID
    
    const p = newPlayers[pIndex];
    
    if (p.faceUpCards.find(c => c.id === card.id)) {
      p.faceUpCards = p.faceUpCards.filter(c => c.id !== card.id);
      p.hand.push(card);
    } else {
      if (p.faceUpCards.length < 3) {
        p.hand = p.hand.filter(c => c.id !== card.id);
        p.faceUpCards.push(card);
      }
    }
    setPlayers(newPlayers);
    playSound('CLICK');
  };

  const confirmSetup = () => {
    if (myPlayerId === -1) return;

    const pIndex = myPlayerId;
    const p = players[pIndex];

    if (p.faceUpCards.length !== 3) {
      addLog("Select 3 cards first.");
      playSound('ERROR');
      return;
    }
    const newPlayers = [...players];
    newPlayers[pIndex].hasSelectedSetup = true;
    setPlayers(newPlayers);
    
    if (isClient) {
        p2pService.sendToHost({
            type: 'SETUP_CONFIRM',
            payload: { faceUpCards: p.faceUpCards, hand: p.hand }
        });
        return;
    }
    
    // Host / Offline Logic
    const allReady = newPlayers.every(pl => pl.hasSelectedSetup);
    if (allReady) {
      setPhase('PLAYING');
      playSound('VICTORY');
      addLog("All Rulers Ready. The Battle Begins!");
      setTurnIndex(0);
      setIsHandRevealed(mode !== 'PASS_AND_PLAY');
      
      if (isHost) {
          broadcastState({
              players: newPlayers,
              phase: 'PLAYING',
              turnIndex: 0,
              logs: [...logs, "All Rulers Ready. The Battle Begins!"]
          });
      }
    } else {
        if (isHost) {
            broadcastState({ players: newPlayers });
        }
    }
  };

  const handleRemoteSetup = (pIndex: number, faceUpCards: Card[], hand: Card[]) => {
      // Host receives setup from client
      const newPlayers = [...players];
      newPlayers[pIndex].faceUpCards = faceUpCards;
      newPlayers[pIndex].hand = hand;
      newPlayers[pIndex].hasSelectedSetup = true;
      setPlayers(newPlayers);

      const allReady = newPlayers.every(pl => pl.hasSelectedSetup);
      if (allReady) {
          setPhase('PLAYING');
          playSound('VICTORY');
          const newLogs = [...logs, "All Rulers Ready. The Battle Begins!"];
          setLogs(newLogs);
          setTurnIndex(0);
          
          broadcastState({
              players: newPlayers,
              phase: 'PLAYING',
              turnIndex: 0,
              logs: newLogs
          });
      } else {
          broadcastState({ players: newPlayers });
      }
  };

  // --- Safe Data Loading ---
  
  // CRITICAL FIX: Ensure players exist before attempting to render logic
  // This prevents blank screens when connecting/syncing
  if (players.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 text-white gap-4">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-amber-100 font-bold animate-pulse">Syncing Game State...</p>
            {isClient && <p className="text-xs text-slate-500">Waiting for Host...</p>}
         </div>
      );
  }

  // Ensure we have a valid player ID before rendering
  if (isOnline && myPlayerId === -1 && players.length > 0) {
      return (
         <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 text-white">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Identifying Player...</p>
         </div>
      );
  }

  // --- Setup Phase Renderer ---
  // In Online mode, always show setup for 'me'
  const activeSetupPlayer = isOnline && myPlayerId !== -1 ? players[myPlayerId] : players.find(p => p.isHuman && !p.hasSelectedSetup);
  
  if (phase === 'SETUP' && activeSetupPlayer && !activeSetupPlayer.hasSelectedSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center animate-in fade-in duration-700 w-full max-w-5xl mx-auto p-4">
        <div className="mb-4 md:mb-8">
           <h2 className="text-3xl md:text-5xl font-playfair font-bold text-amber-100 mb-2 drop-shadow-md">Fortify: {activeSetupPlayer.name}</h2>
           <p className="text-slate-400 font-light text-sm md:text-xl">Choose 3 cards to defend your stronghold.</p>
        </div>
        <div className="flex flex-col gap-8 w-full">
           <div className="relative p-6 md:p-10 rounded-[2rem] bg-black/20 border border-white/10 backdrop-blur-md min-h-[180px] md:min-h-[250px] flex items-center justify-center gap-3 md:gap-8 shadow-inner">
              <div className="absolute top-4 left-6 text-xs font-bold text-amber-500/80 tracking-[0.2em] flex items-center gap-2">
                 <Hand className="w-4 h-4" /> STRONGHOLD
              </div>
              {activeSetupPlayer.faceUpCards.map(c => (
                <PlayingCard key={c.id} suit={c.suit} rank={c.rank} highlight onClick={() => handleHumanSetupToggle(c)} className="cursor-pointer hover:scale-105 transition-transform duration-300"/>
              ))}
              {[...Array(3 - activeSetupPlayer.faceUpCards.length)].map((_, i) => (
                 <div key={i} className="w-[3.8rem] h-[5.4rem] md:w-24 md:h-36 rounded-lg md:rounded-xl border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border border-white/20"></div>
                 </div>
              ))}
           </div>
           <div className="flex justify-center flex-wrap gap-2 md:gap-4 p-2 md:p-4">
              {activeSetupPlayer.hand.map(c => (
                <PlayingCard key={c.id} suit={c.suit} rank={c.rank} onClick={() => handleHumanSetupToggle(c)} className="cursor-pointer hover:-translate-y-4 transition-all duration-300"/>
              ))}
           </div>
        </div>
        <button onClick={confirmSetup} disabled={activeSetupPlayer.faceUpCards.length !== 3} className="mt-8 bg-gradient-to-r from-amber-600 to-amber-500 text-white px-10 py-4 rounded-full font-bold shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] disabled:opacity-50 disabled:shadow-none disabled:scale-100 flex items-center gap-3 text-lg">
          Confirm Setup <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  } else if (phase === 'SETUP' && isOnline && activeSetupPlayer?.hasSelectedSetup) {
      return (
         <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-bold text-white mb-4">Waiting for other players...</h2>
            <div className="flex gap-2">
                {players.map(p => (
                    <div key={p.id} className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${p.hasSelectedSetup ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {p.hasSelectedSetup ? <Check className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <span className="text-xs mt-2">{p.name}</span>
                    </div>
                ))}
            </div>
         </div>
      );
  }
  
  // --- Active Gameplay ---

  // Visualization logic: Rotate so "Me" is at bottom
  let rotationOffset = 0;
  if (isOnline) {
      // If I am player 1 in a 4 player game, I want player 1 at index 0 visual
      // visual index = (actual index - my index + total) % total
      rotationOffset = myPlayerId !== -1 ? myPlayerId : 0;
  }
  
  // const getVisualIndex = (actualIndex: number) => {
  //    return (actualIndex - rotationOffset + players.length) % players.length;
  // };

  const bottomPlayer = isOnline ? (myPlayerId !== -1 ? players[myPlayerId] : players[0]) : (mode === 'PASS_AND_PLAY' ? players[turnIndex] : players[0]);
  
  // Safety check: if bottomPlayer is still invalid, show loader
  if (!bottomPlayer) {
      return (
       <div className="flex items-center justify-center h-full w-full bg-slate-950">
          <div className="text-white">Connecting...</div>
       </div>
    );
  }

  // Filter others to display at top
  // We need to order them visually clockwise based on "Me" position
  const otherPlayers = players.filter(p => p.id !== bottomPlayer.id).sort((a, b) => {
      // Calculate relative visual index for each player
      const visualIndexA = (a.id - rotationOffset + players.length) % players.length;
      const visualIndexB = (b.id - rotationOffset + players.length) % players.length;
      return visualIndexA - visualIndexB;
  });

  const getTableColor = () => {
    if (activeConstraint === 'LOWER_THAN_7') return 'shadow-[inset_0_0_150px_rgba(16,185,129,0.15)]'; 
    const topCard = pile[pile.length - 1];
    if (topCard?.rank === Rank.Two) return 'shadow-[inset_0_0_150px_rgba(59,130,246,0.15)]';
    if (topCard?.rank === Rank.Ten) return 'shadow-[inset_0_0_150px_rgba(249,115,22,0.15)]';
    return 'shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]';
  };

  // --- Pass & Play Curtain ---
  if (mode === 'PASS_AND_PLAY' && players[turnIndex].isHuman && !isHandRevealed) {
    return (
       <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 p-6 text-center animate-in fade-in">
          <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-amber-500 mb-8 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
             <User className="w-12 h-12 text-amber-500" />
          </div>
          <h2 className="text-4xl font-playfair font-bold text-white mb-4">Pass device to {players[turnIndex].name}</h2>
          <p className="text-slate-400 mb-12">Your turn is ready. Reveal your hand to play.</p>
          <button onClick={() => setIsHandRevealed(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-12 py-5 rounded-full font-bold text-xl shadow-lg flex items-center gap-3 transition-transform hover:scale-105">
             <Eye className="w-6 h-6" /> Reveal Hand
          </button>
       </div>
    );
  }

  // --- Main Board Render ---

  return (
    <div className={`flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-140px)] w-full max-w-7xl mx-auto relative select-none rounded-xl md:rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-1000 bg-felt ${getTableColor()}`}>
      
      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-50 pointer-events-none">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="pointer-events-auto bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white border border-white/10"
        >
           {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button 
          onClick={onExit}
          className="pointer-events-auto bg-red-900/20 hover:bg-red-900/40 p-2 rounded-full text-red-400 hover:text-red-200 border border-white/10"
        >
           <X className="w-5 h-5" />
        </button>
      </div>

      {/* Game Over Overlay */}
      {phase === 'GAME_OVER' && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-700 p-6 text-center">
           <div className="relative">
             <div className="absolute inset-0 bg-amber-500 blur-[80px] opacity-20 rounded-full"></div>
             <Trophy className="relative w-24 h-24 md:w-32 md:h-32 text-amber-500 mb-6 md:mb-8 animate-[bounce_2s_infinite]" />
           </div>
           <h2 className="text-5xl md:text-8xl font-playfair font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-100 to-amber-600 mb-6">{winner} WINS</h2>
           <button onClick={onExit} className="bg-white hover:bg-slate-100 text-slate-900 px-10 py-4 rounded-full font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] text-lg"><RotateCcw className="w-5 h-5" /> Return to Lobby</button>
        </div>
      )}

      {/* Opponents Area */}
      <div className="relative z-10 flex justify-center gap-2 md:gap-16 pt-6 pb-4 md:pt-12 min-h-[120px]">
        {otherPlayers.map(opp => (
          <div key={opp.id} className="flex flex-col items-center transition-all duration-500 group">
            <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-bold border-[3px] transition-all duration-500 shadow-xl z-20 ${turnIndex === opp.id ? 'border-amber-500 bg-slate-800 text-amber-500 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
              <span className="text-xs md:text-lg font-playfair">{opp.name.charAt(0)}</span>
              {(isOnline || mode === 'ONLINE_CLIENT') && (
                 <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border border-slate-900">
                    <Globe className="w-2 h-2 md:w-3 md:h-3 text-white" />
                 </div>
              )}
              {turnIndex === opp.id && (
                  <>
                    <div className="absolute -inset-1 border border-amber-500/30 rounded-full animate-ping"></div>
                    <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] rotate-[-90deg]">
                       <circle r="34" cx="40" cy="40" className="fill-none stroke-amber-500/20 stroke-2" />
                       <circle r="34" cx="40" cy="40" className="fill-none stroke-amber-500 stroke-2 transition-all duration-1000" 
                               style={{ strokeDasharray: 215, strokeDashoffset: 215 - (215 * timeLeft) / 20 }} />
                    </svg>
                  </>
              )}
            </div>
            
            <div className="text-[10px] md:text-xs text-slate-400 mt-2 font-bold max-w-[80px] truncate">{opp.name}</div>

            <div className="relative mt-1 h-12 w-20 flex justify-center">
                {opp.hand.length > 0 ? (
                    <div className="relative">
                        {Array.from({ length: Math.min(opp.hand.length, 5) }).map((_, i) => {
                             const rotate = (i - (Math.min(opp.hand.length, 5) - 1) / 2) * 10;
                             const y = Math.abs(i - (Math.min(opp.hand.length, 5) - 1) / 2) * 2;
                             return (
                                <div key={i} className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-12 bg-slate-800 border border-slate-600 rounded shadow-md origin-bottom transition-transform duration-300"
                                     style={{ transform: `translateX(${(i - 2) * 4}px) translateY(${y}px) rotate(${rotate}deg)` }}>
                                     <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(45deg,#000_0px,#000_1px,transparent_1px,transparent_4px)]"></div>
                                </div>
                             )
                        })}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-white border border-white/10 z-30">
                            {opp.hand.length}
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] text-emerald-400 font-bold tracking-widest animate-pulse mt-2">SAFE</div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Arena Center */}
      <div className="flex-1 relative z-10 flex items-center justify-center gap-8 md:gap-32 -mt-4 md:mt-0">
         {/* Deck */}
         <div className="flex flex-col items-center gap-3 scale-90 md:scale-100 group cursor-pointer">
            <span className="text-[10px] tracking-[0.3em] text-slate-600 font-bold group-hover:text-amber-500 transition-colors">DECK</span>
            <div className="relative transition-transform duration-300 group-hover:-translate-y-1">
               {deck.length > 0 ? (
                 <>
                   {deck.length > 1 && <div className="absolute top-1 left-1 w-[3.8rem] h-[5.4rem] md:w-24 md:h-36 bg-slate-900 rounded-lg md:rounded-xl border border-slate-700 shadow-sm"></div>}
                   {deck.length > 5 && <div className="absolute top-2 left-2 w-[3.8rem] h-[5.4rem] md:w-24 md:h-36 bg-slate-900 rounded-lg md:rounded-xl border border-slate-700 shadow-sm"></div>}
                   <PlayingCard faceDown className="shadow-2xl z-10" />
                   <div className="absolute -top-3 -right-3 w-6 h-6 md:w-8 md:h-8 bg-slate-800 border-2 border-slate-600 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-300 z-20 shadow-lg">{deck.length}</div>
                 </>
               ) : <div className="w-[3.8rem] h-[5.4rem] md:w-24 md:h-36 border-2 border-dashed border-slate-800 rounded-lg md:rounded-xl flex items-center justify-center text-[10px] md:text-xs text-slate-700">EMPTY</div>}
            </div>
         </div>

         {/* Pile Area */}
         <div className="flex flex-col items-center gap-4 min-w-[140px] md:min-w-[180px] scale-100 z-20">
            {activeConstraint === 'LOWER_THAN_7' && (
              <div className="absolute -top-12 px-4 py-1.5 bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md">
                <ArrowDown className="w-4 h-4" /> LIMIT &lt; 7
              </div>
            )}
            
            <div className="relative w-32 h-44 md:w-40 md:h-52 flex items-center justify-center">
               <div className={`absolute inset-0 border-2 border-dashed rounded-xl md:rounded-2xl transition-all duration-500 ${activeConstraint === 'LOWER_THAN_7' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/5'}`}></div>
               {pile.length === 0 ? (
                   <span className="text-slate-600 font-bold tracking-widest opacity-30 text-sm">DROP ZONE</span>
               ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {pile.slice(-6).map((card, idx, arr) => (
                       <div key={card.id} className="absolute transition-transform duration-300 ease-out will-change-transform" 
                            style={{ 
                                transform: `rotate(${pileRotations[pile.length - arr.length + idx] || 0}deg) translate(${Math.sin(idx)*5}px, ${Math.cos(idx)*5}px)`, 
                                zIndex: idx 
                            }}>
                          <PlayingCard {...card} className={idx === arr.length - 1 ? 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]' : 'shadow-md brightness-90'} />
                       </div>
                    ))}
                  </div>
               )}
               {pile.length > 0 && (
                   <div className="absolute -bottom-4 bg-slate-800/80 backdrop-blur text-slate-300 px-3 py-1 rounded-full text-xs border border-slate-600 shadow-lg font-mono tracking-tighter z-30">
                       {pile.length} CARDS
                   </div>
               )}
            </div>
         </div>
         
         {/* Desktop Log */}
         <div className="absolute right-8 top-0 bottom-10 w-72 hidden xl:block pointer-events-none">
            <div className="bg-slate-950/40 backdrop-blur-lg border border-white/5 rounded-2xl h-full flex flex-col pointer-events-auto shadow-2xl overflow-hidden">
               <div className="p-4 border-b border-white/5 bg-white/5 text-xs font-bold text-slate-400 tracking-widest text-center uppercase">Game Log</div>
               <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                  {logs.slice(-15).map((log, i) => (
                    <div key={i} className="text-sm text-slate-300 border-b border-white/5 pb-2 last:border-0 leading-relaxed font-light">
                        {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
               </div>
            </div>
         </div>
      </div>

      {/* Mobile Log Toast */}
      {logs.length > 0 && (
         <div className="xl:hidden absolute top-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-2 rounded-full text-xs md:text-sm text-slate-200 pointer-events-none z-0 border border-white/10 max-w-[90%] truncate shadow-xl">
            {logs[logs.length - 1]}
         </div>
      )}

      {/* Player Dashboard (Bottom) */}
      <div className={`relative z-20 pt-4 pb-2 px-4 border-t transition-colors duration-700 ${turnIndex === bottomPlayer.id ? 'bg-gradient-to-t from-amber-900/30 via-slate-900/80 to-slate-900/0 border-amber-500/20' : 'bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/0 border-transparent'}`}>
         <div className="max-w-4xl mx-auto flex flex-col gap-2 md:gap-4">
            
            <div className="flex justify-between items-end h-10 md:h-12 px-2 relative z-[200]">
               <div className="flex items-center gap-3 md:gap-4">
                 <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-500 ${turnIndex === bottomPlayer.id ? 'bg-amber-500 text-amber-500 animate-pulse' : 'bg-slate-600 text-slate-600'}`}></div>
                 <div className="flex flex-col">
                    <span className={`text-lg md:text-2xl font-playfair font-bold transition-all duration-500 ${turnIndex === bottomPlayer.id ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-500 drop-shadow-sm' : 'text-slate-500'}`}>
                        {turnIndex === bottomPlayer.id ? (mustPlayAgain ? `${bottomPlayer.name} Plays Again!` : `${bottomPlayer.name}'s Turn`) : `${players[turnIndex].name} is playing...`}
                    </span>
                 </div>
                 {turnIndex === bottomPlayer.id && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono font-bold transition-all duration-300 ${timeLeft <= 5 ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                       <Timer className="w-3 h-3" /> {timeLeft}s
                    </div>
                 )}
               </div>
               
               {/* Actions - Only visible if it's THIS bottom player's turn */}
               {turnIndex === bottomPlayer.id && (
                 <div className="flex gap-3">
                    {selectedCardIds.length > 0 && (
                      <button onClick={() => {
                        const selected = bottomPlayer.hand.filter(c => selectedCardIds.includes(c.id));
                        if(selected.length > 0) attemptPlayCards(bottomPlayer.id, selected, 'HAND');
                      }} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 md:px-6 md:py-2.5 rounded-full font-bold shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-in fade-in slide-in-from-bottom-2 text-xs md:text-sm flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer">
                        <Play className="w-3 h-3 fill-current" /> Play {selectedCardIds.length}
                      </button>
                    )}
                    <button onClick={() => handlePickupPile(bottomPlayer.id)} className="bg-slate-800/80 hover:bg-red-900/40 text-slate-300 hover:text-red-200 px-4 py-2 md:px-6 md:py-2.5 rounded-full border border-slate-600 hover:border-red-500/50 transition-all flex items-center gap-2 text-xs md:text-sm backdrop-blur-md cursor-pointer">
                       <RotateCcw className="w-3 h-3 md:w-4 md:h-4" /> Pick Up
                    </button>
                 </div>
               )}
            </div>

            {/* Hand Area */}
            <div className="flex items-end justify-center gap-4 md:gap-16 min-h-[160px] md:min-h-[220px]">
               {/* Stronghold */}
               <div className="flex flex-col items-center gap-2 mb-2 md:mb-4 scale-75 md:scale-100 origin-bottom-left group">
                  <div className="relative h-32 w-24">
                    <div className="absolute inset-0 bg-amber-500/5 rounded-xl border border-amber-500/10 transform rotate-3 scale-110"></div>
                    {/* Hidden Base */}
                    <div className="absolute inset-0 flex justify-center items-end opacity-60">
                       {bottomPlayer.hiddenCards.map((c, i) => (
                          <div key={c.id} onClick={() => handleCardClick(c, 'HIDDEN')} 
                               className={`absolute transition-all duration-300 ${bottomPlayer.hand.length === 0 && bottomPlayer.faceUpCards.length === 0 ? 'cursor-pointer hover:-translate-y-6 hover:brightness-125 z-10' : ''}`}
                               style={{ transform: `translateX(${(i-1)*6}px) rotate(${(i-1)*8}deg)` }}>
                             <PlayingCard faceDown className="w-20 h-28 shadow-lg" />
                          </div>
                       ))}
                    </div>
                    {/* Face Up */}
                    <div className="absolute inset-0 flex justify-center items-end mb-6">
                       {bottomPlayer.faceUpCards.map((c, i) => (
                          <div key={c.id} className="absolute transition-all duration-300 hover:-translate-y-2" style={{ transform: `translateX(${(i-1)*16}px) rotate(${(i-1)*6}deg)` }}>
                             <PlayingCard {...c} dimmed={bottomPlayer.hand.length > 0} className="w-20 h-28 shadow-xl" />
                          </div>
                       ))}
                    </div>
                  </div>
                  <span className="text-[9px] md:text-[10px] text-amber-500/60 font-bold uppercase tracking-[0.2em] group-hover:text-amber-400 transition-colors">Stronghold</span>
               </div>

               {/* Active Hand */}
               <div className="flex-1 flex justify-center max-w-2xl pb-4 md:pb-8 overflow-visible relative h-[160px] md:h-[220px] pointer-events-none">
                 <div className="absolute bottom-0 flex items-end justify-center w-full perspective-1000 h-[200px]" onMouseLeave={() => setHoveredCardId(null)}>
                   {bottomPlayer.hand.map((c, i) => {
                     const isSelected = selectedCardIds.includes(c.id);
                     const isHovered = hoveredCardId === c.id;
                     const len = bottomPlayer.hand.length;
                     const center = (len - 1) / 2;
                     const spreadFactor = len > 8 ? 25 : (len > 4 ? 35 : 45);
                     const rotateFactor = len > 10 ? 2.5 : 4;
                     const offset = (i - center) * spreadFactor;
                     const rotate = (i - center) * rotateFactor;
                     const yArch = Math.abs(i - center) * (len > 8 ? 2 : 5);
                     
                     let translateY = yArch;
                     if (isSelected) translateY -= 60;
                     else if (isHovered) translateY -= 30;

                     let scale = 1;
                     if (isSelected) scale = 1.15;
                     else if (isHovered) scale = 1.1;

                     const zIndex = isSelected ? 100 : (isHovered ? 50 : i);

                     return (
                       <div key={c.id} 
                            onClick={() => handleCardClick(c, 'HAND')}
                            onMouseEnter={() => setHoveredCardId(c.id)}
                            style={{ 
                              zIndex: zIndex, 
                              transform: `translateX(${offset}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                              position: 'absolute',
                              bottom: '0px',
                              transformOrigin: '50% 120%'
                            }}
                            className="pointer-events-auto transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer touch-none will-change-transform">
                          <PlayingCard 
                             {...c} 
                             selected={isSelected} 
                             className={isSelected ? 'shadow-[0_0_40px_rgba(245,158,11,0.6)]' : 'shadow-2xl'} 
                          />
                       </div>
                     );
                   })}
                 </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}