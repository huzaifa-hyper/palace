
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, RotateCcw, Trophy, Timer, Volume2, VolumeX, Eye, User, X, Globe, Check, Clock, Hand, ChevronRight, ArrowDown, Bot, EyeOff } from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Suit, Rank, Card, Player, GamePhase, UserProfile, GameMode, GameStateSnapshot } from '../types';
import { audioService } from '../services/audioService';
import { MOCK_PLAYER_NAMES } from '../constants';
import { p2pService } from '../services/p2pService';

// --- Game Logic Helpers (Local Only) ---

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
  connectedPeers?: any[]; 
  myPeerId?: string;
  onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ mode, playerCount, userProfile, connectedPeers, myPeerId, onExit }) => {
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
  const [showPassAndPlayInterstitial, setShowPassAndPlayInterstitial] = useState(false);
  
  // Visual State
  const [pileRotations, setPileRotations] = useState<number[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const isOnline = mode === 'ONLINE_HOST' || mode === 'ONLINE_CLIENT';

  // --- Identity Resolution ---
  const myPlayerId = useMemo(() => {
      if (players.length === 0) return -1;
      
      if (isOnline) {
          if (myPeerId) {
             const parsedId = parseInt(myPeerId);
             if (!isNaN(parsedId) && players[parsedId]) {
                 return parsedId;
             }
          }
          return players.findIndex(p => p.name === userProfile.name);
      }
      
      if (mode === 'VS_BOT') return 0;
      if (mode === 'PASS_AND_PLAY') return turnIndex; 
      
      return -1;
  }, [isOnline, mode, players, turnIndex, userProfile.name, myPeerId]);

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

  // --- ONLINE: Synchronization ---
  useEffect(() => {
    if (isOnline) {
        p2pService.onGameState((state: GameStateSnapshot) => {
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

            const lastLog = state.logs[state.logs.length - 1];
            if (lastLog && !logs.includes(lastLog)) {
                if (lastLog.includes('plays')) playSound('PLACE');
                if (lastLog.includes('resets')) playSound('RESET');
                if (lastLog.includes('burns')) playSound('BURN');
                if (lastLog.includes('WINS')) playSound('VICTORY');
                if (lastLog.includes('picks up')) playSound('CLICK');
            }
        });
    }
  }, [isOnline, logs]);

  // --- Initialization (OFFLINE ONLY) ---
  useEffect(() => {
     if (!isOnline) startGameLocal();
  }, []);

  const startGameLocal = () => {
    playSound('CLICK');
    const newDeck = createDeck();
    const newPlayers: Player[] = [];

    for (let i = 0; i < playerCount; i++) {
      let isHuman = false;
      let name = `Bot ${i}`;

      if (mode === 'VS_BOT') {
          isHuman = i === 0;
          if (isHuman) name = userProfile.name;
          else name = MOCK_PLAYER_NAMES[(i - 1) % MOCK_PLAYER_NAMES.length];
      } else if (mode === 'PASS_AND_PLAY') {
          isHuman = true;
          if (i === 0) name = userProfile.name;
          else name = `Player ${i + 1}`;
      }

      const hiddenCards = newDeck.splice(0, 3);
      const hand = newDeck.splice(0, 7);
      
      newPlayers.push({
        id: i,
        name,
        isHuman,
        hiddenCards,
        hand,
        faceUpCards: [],
        hasSelectedSetup: !isHuman,
      });
    }

    // Bot Setup Logic
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
    setShowPassAndPlayInterstitial(false);
    setLogs(["Game Started. Fortify your positions!"]);
  };

  // --- BOT LOGIC (Offline Only) ---
  useEffect(() => {
    if (isOnline || phase !== 'PLAYING') return;

    const currentPlayer = players[turnIndex];
    if (currentPlayer && !currentPlayer.isHuman) {
        const thinkTime = 1200 + Math.random() * 1000;
        const timer = setTimeout(() => {
            executeBotTurn(currentPlayer);
        }, thinkTime);
        return () => clearTimeout(timer);
    }
  }, [turnIndex, phase, players, isOnline]);

  const executeBotTurn = (bot: Player) => {
      let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';
      let availableCards = bot.hand;

      if (bot.hand.length === 0) {
          if (bot.faceUpCards.length > 0) {
              source = 'FACEUP';
              availableCards = bot.faceUpCards;
          } else {
              source = 'HIDDEN';
              availableCards = bot.hiddenCards;
          }
      }

      if (source === 'HIDDEN') {
          if (availableCards.length > 0) {
              attemptPlayCards(bot.id, [availableCards[0]], source);
          }
          return;
      }

      const topCard = pile.length > 0 ? pile[pile.length - 1] : null;

      const groups: Record<string, Card[]> = {};
      availableCards.forEach(c => {
          if (!groups[c.rank]) groups[c.rank] = [];
          groups[c.rank].push(c);
      });

      const validMoves: Card[][] = [];

      Object.values(groups).forEach(group => {
          const sample = group[0];
          let isValid = false;

          const isTwo = sample.rank === Rank.Two;
          const isTen = sample.rank === Rank.Ten;
          const isSeven = sample.rank === Rank.Seven;

          if (isTwo || isTen || isSeven) {
              isValid = true;
          } else if (!topCard) {
              isValid = true;
          } else {
              if (activeConstraint === 'LOWER_THAN_7') {
                  if (sample.value < 7) isValid = true;
              } else {
                  if (sample.value >= topCard.value) isValid = true;
              }
          }

          if (isValid) validMoves.push(group);
      });

      if (validMoves.length === 0) {
          handlePickupPile(bot.id);
          return;
      }

      validMoves.sort((a, b) => {
          const cardA = a[0];
          const cardB = b[0];
          const isPowerA = cardA.rank === Rank.Two || cardA.rank === Rank.Ten;
          const isPowerB = cardB.rank === Rank.Two || cardB.rank === Rank.Ten;
          if (isPowerA && !isPowerB) return 1;
          if (!isPowerA && isPowerB) return -1;
          if (cardA.value !== cardB.value) return cardA.value - cardB.value;
          return b.length - a.length;
      });

      const bestMove = validMoves[0];
      attemptPlayCards(bot.id, bestMove, source);
  };

  // --- Local Game Action Handlers ---

  const addLog = (msg: string) => {
    const newLogs = [...logs, msg];
    setLogs(newLogs);
    return newLogs;
  };

  const advanceTurnLocal = (currentPlayers: Player[]) => {
    setMustPlayAgain(false);
    const nextIndex = (turnIndex + 1) % currentPlayers.length;
    setTurnIndex(nextIndex);
    
    // Pass and Play Logic: Hide Hand immediately
    if (mode === 'PASS_AND_PLAY') {
        setIsHandRevealed(false);
        setShowPassAndPlayInterstitial(true);
    }
    
    return nextIndex;
  };

  const drawCardsLocal = (player: Player, currentDeck: Card[]) => {
    const cardsNeeded = 3 - player.hand.length;
    if (cardsNeeded > 0 && currentDeck.length > 0) {
      const drawn = currentDeck.splice(0, Math.min(cardsNeeded, currentDeck.length));
      player.hand.push(...drawn);
    }
  };

  const checkHandStateLocal = (player: Player, logArray: string[]) => {
    if (player.hand.length <= 1 && player.faceUpCards.length > 0) {
       logArray.push(`${player.name} activates Stronghold!`);
       player.hand.push(...player.faceUpCards);
       player.faceUpCards = [];
       if (!player.isHuman && mode === 'VS_BOT') {
         player.hand.sort((a, b) => a.value - b.value);
       }
    }
  };

  const checkWinConditionLocal = (player: Player) => {
    if (player.hand.length === 0 && player.faceUpCards.length === 0 && player.hiddenCards.length === 0) {
      setWinner(player.name);
      setPhase('GAME_OVER');
      playSound('VICTORY');
      addLog(`🏆 ${player.name} WINS THE GAME!`);
      return true;
    }
    return false;
  };

  const handlePickupPile = (playerIndex: number) => {
    if (isOnline) {
        p2pService.sendPickup();
        return;
    }
    
    if (phase !== 'PLAYING') return;
    const newPlayers = [...players];
    const player = newPlayers[playerIndex];
    let currentLogs = [...logs];

    if (pile.length > 0) {
        currentLogs.push(`${player.name} picks up ${pile.length} cards.`);
        player.hand = [...player.hand, ...pile];
        playSound('CLICK');
    } else {
        currentLogs.push(`${player.name} passes.`);
        playSound('CLICK');
    }

    setLogs(currentLogs);
    setPlayers(newPlayers);
    setPile([]);
    setPileRotations([]);
    setActiveConstraint('NONE');
    setMustPlayAgain(false);
    setSelectedCardIds([]);
    advanceTurnLocal(newPlayers);
  };

  const attemptPlayCards = (playerIndex: number, cards: Card[], source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    if (isOnline) {
        setSelectedCardIds([]);
        p2pService.sendPlayCard(cards, source);
        return;
    }

    const newPlayers = [...players];
    const newDeck = [...deck];
    const player = newPlayers[playerIndex];
    const cardProto = cards[0]; 
    let currentLogs = [...logs];
    
    // --- Validation Logic ---
    if (source === 'FACEUP' && player.hand.length > 0) {
      currentLogs.push("Must empty hand before using Face-Up cards.");
      setLogs(currentLogs);
      playSound('ERROR');
      return;
    }
    if (source === 'HIDDEN' && (player.hand.length > 0 || player.faceUpCards.length > 0)) {
       currentLogs.push("Must empty hand & face-up before using Hidden cards.");
       setLogs(currentLogs);
       playSound('ERROR');
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
      if (!topCard) isValid = true;
      else {
        if (activeConstraint === 'LOWER_THAN_7') {
          if (cardProto.value < 7) isValid = true;
        } else {
          if (cardProto.value >= topCard.value) isValid = true;
        }
      }
    }

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
        advanceTurnLocal(newPlayers);
        return;
      } else {
        currentLogs.push(`Invalid move: ${cardProto.rank} cannot be played.`);
        setLogs(currentLogs);
        playSound('ERROR');
        setSelectedCardIds([]);
        return;
      }
    }

    // --- Execution Logic ---
    const cardIds = cards.map(c => c.id);
    if (source === 'HAND') player.hand = player.hand.filter(c => !cardIds.includes(c.id));
    else if (source === 'FACEUP') player.faceUpCards = player.faceUpCards.filter(c => !cardIds.includes(c.id));
    else if (source === 'HIDDEN') player.hiddenCards = player.hiddenCards.filter(c => !cardIds.includes(c.id));

    const newPileRotations = [...pileRotations];
    cards.forEach(() => { newPileRotations.push(Math.random() * 30 - 15); });
    setPileRotations(newPileRotations);

    if (isTen) {
       currentLogs.push(`${player.name} BURNS the pile! 🔥`);
       playSound('BURN');
       setPile([]); 
       setPileRotations([]);
       setActiveConstraint('NONE');
       drawCardsLocal(player, newDeck);
       checkHandStateLocal(player, currentLogs);
       if (checkWinConditionLocal(player)) return;
       setTurnIndex(turnIndex); // Play again
       setMustPlayAgain(true);
    } else if (isTwo) {
       currentLogs.push(`${player.name} RESETS with ${cards.length > 1 ? cards.length + 'x ' : ''}2! 🔄`);
       playSound('RESET');
       setActiveConstraint('NONE');
       setPile([...pile, ...cards]);
       drawCardsLocal(player, newDeck);
       checkHandStateLocal(player, currentLogs);
       if (checkWinConditionLocal(player)) return;
       setMustPlayAgain(true);
       currentLogs.push(`${player.name} plays again!`);
    } else {
       currentLogs.push(`${player.name} plays ${cards.length > 1 ? cards.length + 'x ' : ''}${cardProto.rank}.`);
       playSound('PLACE');
       setPile([...pile, ...cards]);
       
       if (activeConstraint === 'LOWER_THAN_7' && !isSeven) setActiveConstraint('NONE');
       if (isSeven) {
          currentLogs.push("📉 Next must be LOWER than 7!");
          setActiveConstraint('LOWER_THAN_7');
       }

       drawCardsLocal(player, newDeck);
       checkHandStateLocal(player, currentLogs);
       if (checkWinConditionLocal(player)) return;
       advanceTurnLocal(newPlayers);
    }
    
    setLogs(currentLogs);
    setDeck(newDeck);
    setPlayers(newPlayers);
    setSelectedCardIds([]);
  };

  const handleHumanSetupToggle = (card: Card) => {
    if (myPlayerId === -1 || !players[myPlayerId]) return;
    const pIndex = myPlayerId;
    const newPlayers = players.map(p => ({...p}));
    const p = newPlayers[pIndex];
    p.faceUpCards = [...p.faceUpCards];
    p.hand = [...p.hand];
    
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
    // If Pass & Play, we might need to cycle through all players for setup? 
    // For simplicity in P&P, we might auto-setup for non-primary or let them do it. 
    // The current logic: `isHuman` is true for all in P&P.
    // So we iterate.
    
    const pIndex = myPlayerId;
    const p = players[pIndex];

    if (p.faceUpCards.length !== 3) {
      addLog("Select 3 cards first.");
      playSound('ERROR');
      return;
    }

    if (isOnline) {
       p2pService.sendSetup(p.faceUpCards, p.hand);
       const newPlayers = [...players];
       newPlayers[pIndex] = { ...newPlayers[pIndex], hasSelectedSetup: true };
       setPlayers(newPlayers);
       return;
    }

    const newPlayers = [...players];
    newPlayers[pIndex] = { ...newPlayers[pIndex], hasSelectedSetup: true };
    
    // Check if next player needs setup (Pass & Play)
    if (mode === 'PASS_AND_PLAY') {
       const nextHumanSetup = newPlayers.find(pl => pl.isHuman && !pl.hasSelectedSetup);
       if (nextHumanSetup) {
          // Transition to next player for setup
          setPlayers(newPlayers);
          // If we had a "turn" index for setup, we'd advance it. 
          // Currently `activeSetupPlayer` is derived from `players.find`. 
          // We need an interstitial if we switch people.
          setShowPassAndPlayInterstitial(true);
          return;
       }
    }

    setPlayers(newPlayers);
    
    const allReady = newPlayers.every(pl => pl.hasSelectedSetup);
    if (allReady) {
      setPhase('PLAYING');
      playSound('VICTORY');
      addLog("Battle Begins!");
      setTurnIndex(0);
      setIsHandRevealed(mode !== 'PASS_AND_PLAY');
      setShowPassAndPlayInterstitial(mode === 'PASS_AND_PLAY');
    }
  };

  const handleCardClick = (card: Card, source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    const currentPlayer = players[turnIndex];
    
    if (isOnline) {
    } else {
        if (!currentPlayer.isHuman && mode !== 'PASS_AND_PLAY') return;
        if (mode === 'PASS_AND_PLAY' && !isHandRevealed) return;
    }

    if (source === 'HIDDEN') {
      if (turnIndex !== myPlayerId) return;
      attemptPlayCards(turnIndex, [card], source);
      return;
    }

    if (selectedCardIds.includes(card.id)) {
       setSelectedCardIds(prev => prev.filter(id => id !== card.id));
       playSound('CLICK');
    } else {
       const myHand = players[myPlayerId].hand; 
       const currentSelection = myHand.filter(c => selectedCardIds.includes(c.id));
       
       if (currentSelection.length === 0 || currentSelection[0].rank === card.rank) {
          setSelectedCardIds([...selectedCardIds, card.id]);
          playSound('CLICK');
       } else {
          setSelectedCardIds([card.id]);
          playSound('CLICK');
       }
    }
  };

  // --- Rendering ---

  if (players.length === 0) {
      return <div className="flex items-center justify-center h-full text-white">Loading Game...</div>;
  }

  // Pass & Play Interstitial (Privacy Screen)
  if (showPassAndPlayInterstitial && mode === 'PASS_AND_PLAY' && phase !== 'GAME_OVER') {
      // Determine who's next (either setup or play)
      const setupTarget = players.find(p => p.isHuman && !p.hasSelectedSetup);
      const nextPlayer = setupTarget || players[turnIndex];

      return (
        <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
             <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-amber-500/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <User className="w-10 h-10 text-amber-500" />
             </div>
             <h2 className="text-3xl font-bold text-white mb-2">Pass to {nextPlayer.name}</h2>
             <p className="text-slate-400 mb-8">Tap below when you are ready to reveal your hand.</p>
             <button 
               onClick={() => {
                   setShowPassAndPlayInterstitial(false);
                   setIsHandRevealed(true);
                   playSound('CLICK');
               }}
               className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-full font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
             >
                <Eye className="w-5 h-5" /> I am {nextPlayer.name}
             </button>
        </div>
      );
  }

  const activeSetupPlayer = isOnline ? players[myPlayerId] : players.find(p => p.isHuman && !p.hasSelectedSetup);
  
  if (phase === 'SETUP') {
      if (activeSetupPlayer && !activeSetupPlayer.hasSelectedSetup) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] text-center animate-in fade-in duration-700 w-full max-w-5xl mx-auto p-4">
            <h2 className="text-3xl md:text-5xl font-playfair font-bold text-amber-100 mb-2 drop-shadow-md">Fortify: {activeSetupPlayer.name}</h2>
            <p className="text-slate-400 font-light text-sm md:text-xl mb-8">Choose 3 cards to defend your stronghold.</p>
            <div className="flex flex-col gap-8 w-full">
               <div className="relative p-6 md:p-10 rounded-[2rem] bg-black/20 border border-white/10 backdrop-blur-md min-h-[180px] flex items-center justify-center gap-3">
                  <div className="absolute top-4 left-6 text-xs font-bold text-amber-500/80 tracking-[0.2em] flex items-center gap-2"><Hand className="w-4 h-4"/> STRONGHOLD</div>
                  {activeSetupPlayer.faceUpCards.map(c => <PlayingCard key={c.id} {...c} highlight onClick={() => handleHumanSetupToggle(c)} className="cursor-pointer hover:scale-105 transition-transform" />)}
                  {[...Array(3 - activeSetupPlayer.faceUpCards.length)].map((_, i) => <div key={i} className="w-20 h-28 border-2 border-dashed border-white/20 rounded-lg"></div>)}
               </div>
               <div className="flex justify-center flex-wrap gap-2 md:gap-4 p-2">
                  {activeSetupPlayer.hand.map(c => <PlayingCard key={c.id} {...c} onClick={() => handleHumanSetupToggle(c)} className="cursor-pointer hover:-translate-y-4 transition-all" />)}
               </div>
            </div>
            <button onClick={confirmSetup} disabled={activeSetupPlayer.faceUpCards.length !== 3} className="mt-8 bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-full font-bold shadow-lg flex items-center gap-3 transition-all disabled:opacity-50">
              Confirm Setup <ChevronRight />
            </button>
          </div>
        );
      } else {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white gap-4">
                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
                <p>Waiting for opponent...</p>
            </div>
        );
      }
  }

  let rotationOffset = 0;
  if (isOnline && myPlayerId !== -1) rotationOffset = myPlayerId;
  const bottomPlayer = isOnline ? players[myPlayerId] : (mode === 'PASS_AND_PLAY' ? players[turnIndex] : players[0]);
  if (!bottomPlayer) return <div>Initializing...</div>;

  const otherPlayers = players.filter(p => p.id !== bottomPlayer.id).sort((a, b) => {
      const vA = (a.id - rotationOffset + players.length) % players.length;
      const vB = (b.id - rotationOffset + players.length) % players.length;
      return vA - vB;
  });

  return (
    <div className={`flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-140px)] w-full max-w-7xl mx-auto relative select-none rounded-xl md:rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-1000 bg-felt shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] touch-none`}>
      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-50 pointer-events-none">
        <button onClick={() => setIsMuted(!isMuted)} className="pointer-events-auto bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white border border-white/10">{isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
        <button onClick={onExit} className="pointer-events-auto bg-red-900/20 hover:bg-red-900/40 p-2 rounded-full text-red-400 hover:text-red-200 border border-white/10"><X size={20}/></button>
      </div>

      {/* Game Over */}
      {phase === 'GAME_OVER' && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in p-6 text-center">
           <Trophy className="w-24 h-24 text-amber-500 mb-6 animate-bounce" />
           <h2 className="text-5xl font-playfair font-bold text-amber-100 mb-6">{winner} WINS</h2>
           <button onClick={onExit} className="bg-white text-slate-900 px-10 py-4 rounded-full font-bold flex gap-3 hover:scale-105 transition-all"><RotateCcw /> Return to Lobby</button>
        </div>
      )}

      {/* Opponents Area - Adapts to 1, 2, or 3 opponents */}
      <div className="relative z-10 flex justify-center gap-2 md:gap-16 pt-4 pb-4 md:pt-12 min-h-[100px] md:min-h-[120px] px-2">
        {otherPlayers.map(opp => (
          <div key={opp.id} className="flex flex-col items-center transition-all duration-500 scale-75 md:scale-100">
            <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-bold border-[3px] shadow-xl z-20 transition-all duration-300 ${turnIndex === opp.id ? 'border-amber-500 bg-slate-800 text-amber-500 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
              <span className="font-playfair">{opp.name.charAt(0)}</span>
              {!opp.isHuman && <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700"><Bot size={12} className="text-slate-400"/></div>}
              {turnIndex === opp.id && <div className="absolute -inset-1 border border-amber-500/30 rounded-full animate-ping"></div>}
            </div>
            <div className="text-[10px] md:text-xs text-slate-400 mt-2 font-bold max-w-[80px] truncate text-center">{opp.name}</div>
            <div className="relative mt-1 h-12 w-20 flex justify-center">
                {opp.hand.length > 0 ? (
                    <div className="relative">
                        {Array.from({ length: Math.min(opp.hand.length, 5) }).map((_, i) => (
                             <div key={i} className="absolute w-8 h-12 bg-slate-800 border border-slate-600 rounded shadow-md origin-bottom" style={{ transform: `translateX(${(i-2)*4}px) rotate(${(i-2)*8}deg)` }}></div>
                        ))}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded-full text-[10px] text-white border border-white/10 z-30 font-mono shadow-sm">{opp.hand.length}</div>
                    </div>
                ) : <div className="text-[10px] text-emerald-400 font-bold animate-pulse mt-2 bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-500/20">SAFE</div>}
            </div>
            {/* Opponent Stronghold (Simplified view) */}
            <div className="flex gap-1 mt-1 opacity-50 scale-75">
                {opp.faceUpCards.map((c, i) => (
                    <div key={i} className="w-4 h-6 bg-slate-700 rounded border border-slate-500"></div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Center Arena */}
      <div className="flex-1 relative z-10 flex items-center justify-center gap-4 md:gap-32 -mt-4 md:mt-0">
         {/* Deck */}
         <div className="flex flex-col items-center gap-2 scale-75 md:scale-100 origin-right">
            <span className="text-[10px] tracking-widest text-slate-600 font-bold hidden md:block">DECK</span>
            <div className="relative">
               {deck.length > 0 ? (
                 <>
                   <PlayingCard faceDown className="shadow-2xl z-10" />
                   <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-800 border-2 border-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 z-20">{deck.length}</div>
                 </>
               ) : <div className="w-24 h-36 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-700">EMPTY</div>}
            </div>
         </div>

         {/* Pile */}
         <div className="flex flex-col items-center gap-4 min-w-[120px] md:min-w-[180px] z-20">
            {activeConstraint === 'LOWER_THAN_7' && (
              <div className="absolute -top-12 px-4 py-1.5 bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                <ArrowDown size={14} /> LIMIT &lt; 7
              </div>
            )}
            <div className="relative w-28 h-40 md:w-40 md:h-52 flex items-center justify-center">
               <div className={`absolute inset-0 border-2 border-dashed rounded-xl transition-colors ${activeConstraint === 'LOWER_THAN_7' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/5'}`}></div>
               {pile.length === 0 ? <span className="text-slate-600 font-bold tracking-widest opacity-30 text-sm">DROP ZONE</span> : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {pile.slice(-6).map((card, idx, arr) => (
                       <div key={card.id} className="absolute transition-transform duration-300 ease-out will-change-transform" 
                            style={{ transform: `rotate(${pileRotations[pile.length - arr.length + idx] || 0}deg) translate(${Math.sin(idx)*5}px, ${Math.cos(idx)*5}px)`, zIndex: idx }}>
                          <PlayingCard {...card} className="shadow-md" />
                       </div>
                    ))}
                  </div>
               )}
               {pile.length > 0 && <div className="absolute -bottom-4 bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full text-xs border border-slate-600 shadow-lg font-mono z-30">{pile.length}</div>}
            </div>
         </div>
         
         {/* Log - Hidden on mobile, can be toggled in future */}
         <div className="absolute right-8 top-0 bottom-10 w-72 hidden xl:block pointer-events-none">
            <div className="bg-slate-950/40 backdrop-blur-lg border border-white/5 rounded-2xl h-full flex flex-col pointer-events-auto shadow-2xl overflow-hidden p-4">
               <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2">Game Log</div>
               <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                  {logs.slice(-15).map((log, i) => <div key={i} className="text-sm text-slate-300 border-b border-white/5 pb-1 font-light">{log}</div>)}
                  <div ref={logsEndRef} />
               </div>
            </div>
         </div>
      </div>

      {/* Player Dashboard */}
      <div className={`relative z-20 pt-2 pb-safe-area-bottom px-4 border-t transition-colors duration-700 ${turnIndex === bottomPlayer.id ? 'bg-gradient-to-t from-amber-900/30 via-slate-900/80 to-slate-900/0 border-amber-500/20' : 'bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/0 border-transparent'}`}>
         <div className="max-w-4xl mx-auto flex flex-col gap-1 md:gap-4">
            
            {/* Status Bar */}
            <div className="flex justify-between items-end h-10 md:h-12 px-2 relative z-[200]">
               <div className="flex items-center gap-3 md:gap-4">
                 <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-500 ${turnIndex === bottomPlayer.id ? 'bg-amber-500 text-amber-500 animate-pulse' : 'bg-slate-600 text-slate-600'}`}></div>
                 <span className={`text-base md:text-2xl font-playfair font-bold transition-all duration-500 ${turnIndex === bottomPlayer.id ? 'text-amber-100 drop-shadow-sm' : 'text-slate-500'}`}>
                    {turnIndex === bottomPlayer.id ? (mustPlayAgain ? `${bottomPlayer.name} Plays Again!` : `${bottomPlayer.name}'s Turn`) : `${players[turnIndex].name} is thinking...`}
                 </span>
               </div>
               
               {turnIndex === bottomPlayer.id && (
                 <div className="flex gap-3">
                    {selectedCardIds.length > 0 && (
                      <button onClick={() => {
                        const selected = bottomPlayer.hand.filter(c => selectedCardIds.includes(c.id));
                        if(selected.length > 0) attemptPlayCards(bottomPlayer.id, selected, 'HAND');
                      }} className="bg-amber-600 hover:bg-amber-500 text-white px-4 md:px-6 py-2 rounded-full font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 hover:scale-105 transition-transform text-sm md:text-base">
                        <Play size={14} fill="currentColor" /> Play {selectedCardIds.length}
                      </button>
                    )}
                    <button onClick={() => handlePickupPile(bottomPlayer.id)} className="bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-200 px-4 md:px-6 py-2 rounded-full border border-slate-600 hover:border-red-500/50 transition-all flex items-center gap-2 backdrop-blur-md text-sm md:text-base">
                       <RotateCcw size={14} /> Pick Up
                    </button>
                 </div>
               )}
            </div>

            {/* Hand & Stronghold Area */}
            <div className="flex items-end justify-center gap-2 md:gap-16 min-h-[160px] md:min-h-[220px]">
               {/* Stronghold (Bottom Left) */}
               <div className="flex flex-col items-center gap-1 mb-4 scale-[0.65] md:scale-100 origin-bottom-left group">
                  <div className="relative h-32 w-24">
                    <div className="absolute inset-0 bg-amber-500/5 rounded-xl border border-amber-500/10 transform rotate-3 scale-110"></div>
                    <div className="absolute inset-0 flex justify-center items-end opacity-60">
                       {bottomPlayer.hiddenCards.map((c, i) => (
                          <div key={c.id} onClick={() => handleCardClick(c, 'HIDDEN')} className={`absolute transition-all duration-300 ${bottomPlayer.hand.length === 0 && bottomPlayer.faceUpCards.length === 0 ? 'cursor-pointer hover:-translate-y-6 hover:brightness-125 z-10' : ''}`} style={{ transform: `translateX(${(i-1)*6}px) rotate(${(i-1)*8}deg)` }}>
                             <PlayingCard faceDown className="w-20 h-28 shadow-lg" />
                          </div>
                       ))}
                    </div>
                    <div className="absolute inset-0 flex justify-center items-end mb-6">
                       {bottomPlayer.faceUpCards.map((c, i) => (
                          <div key={c.id} className="absolute transition-all duration-300 hover:-translate-y-2" style={{ transform: `translateX(${(i-1)*16}px) rotate(${(i-1)*6}deg)` }}>
                             <PlayingCard {...c} dimmed={bottomPlayer.hand.length > 0} className="w-20 h-28 shadow-xl" />
                          </div>
                       ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest">Stronghold</span>
               </div>

               {/* Active Hand (Bottom Center) */}
               <div className="flex-1 flex justify-center max-w-2xl pb-4 md:pb-8 overflow-visible relative h-[200px] md:h-[220px] pointer-events-none">
                 <div className="absolute bottom-0 flex items-end justify-center w-full perspective-1000 h-[200px]" onMouseLeave={() => setHoveredCardId(null)}>
                   {bottomPlayer.hand.map((c, i) => {
                     const isSelected = selectedCardIds.includes(c.id);
                     const isHovered = hoveredCardId === c.id;
                     const len = bottomPlayer.hand.length;
                     const center = (len - 1) / 2;
                     // Tighter spread on mobile
                     const spreadFactor = typeof window !== 'undefined' && window.innerWidth < 768 
                         ? (len > 8 ? 20 : 30) // Mobile
                         : (len > 8 ? 25 : 35); // Desktop
                         
                     const rotateFactor = 4;
                     const offset = (i - center) * spreadFactor;
                     const rotate = (i - center) * rotateFactor;
                     const yArch = Math.abs(i - center) * (typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 5);
                     
                     let translateY = yArch;
                     if (isSelected) translateY -= 60;
                     else if (isHovered) translateY -= 30;

                     let scale = 1;
                     if (isSelected) scale = 1.15;
                     else if (isHovered) scale = 1.1;

                     const zIndex = isSelected ? 100 : (isHovered ? 50 : i);

                     return (
                       <div key={c.id} onClick={() => handleCardClick(c, 'HAND')} onMouseEnter={() => setHoveredCardId(c.id)}
                            style={{ zIndex, transform: `translateX(${offset}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`, position: 'absolute', bottom: '10px', transformOrigin: '50% 120%' }}
                            className="pointer-events-auto transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer touch-none will-change-transform">
                          <PlayingCard {...c} selected={isSelected} className={isSelected ? 'shadow-[0_0_40px_rgba(245,158,11,0.6)]' : 'shadow-2xl'} />
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
