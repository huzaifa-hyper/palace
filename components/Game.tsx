"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Volume2, VolumeX, Eye, User, X, Smartphone, Bot, ChevronRight, ArrowDown, Flame, Swords, ShieldCheck, History } from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Rank, Suit, Card, Player, GamePhase, UserProfile, GameMode } from '../types';
import { audioService } from '../services/audioService';
import { MOCK_PLAYER_NAMES } from '../constants';

// --- Utilities ---
const getCardValue = (rank: Rank): number => {
  const values: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return values[rank] || 0;
};

const createDeck = (): Card[] => {
  const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
  const ranks = Object.values(Rank);
  const deck: Card[] = [];
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
  return deck.sort(() => Math.random() - 0.5);
};

export const Game: React.FC<{ mode: GameMode, playerCount: number, userProfile: UserProfile, onExit: () => void }> = ({ mode, playerCount, userProfile, onExit }) => {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [pile, setPile] = useState<Card[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeConstraint, setActiveConstraint] = useState<'NONE' | 'LOWER_THAN_7'>('NONE');
  const [winner, setWinner] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [pileRotations, setPileRotations] = useState<number[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const newDeck = createDeck();
    const initialPlayers: Player[] = [];

    for (let i = 0; i < playerCount; i++) {
      const isHuman = i === 0;
      initialPlayers.push({
        id: i,
        name: isHuman ? userProfile.name : MOCK_PLAYER_NAMES[Math.floor(Math.random() * MOCK_PLAYER_NAMES.length)],
        isHuman,
        hiddenCards: newDeck.splice(0, 3),
        hand: newDeck.splice(0, 7),
        faceUpCards: [],
        hasSelectedSetup: false
      });
    }

    setPlayers(initialPlayers);
    setDeck(newDeck);
    addLog("Welcome to the Palace. Setup your Stronghold!");
  }, [playerCount, userProfile.name]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Game Logic Helpers ---
  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-15), msg]);

  const isLegalMove = (card: Card): boolean => {
    if (card.rank === Rank.Two || card.rank === Rank.Ten || card.rank === Rank.Seven) return true;
    if (pile.length === 0) return true;
    
    const topCard = pile[pile.length - 1];
    if (activeConstraint === 'LOWER_THAN_7') {
      return card.value <= 7;
    }
    return card.value >= topCard.value;
  };

  const drawToThree = (playerIndex: number) => {
    setPlayers(prev => {
      const newPlayers = [...prev];
      const p = { ...newPlayers[playerIndex] };
      const cardsNeeded = 3 - p.hand.length;
      
      if (cardsNeeded > 0 && deck.length > 0) {
        const drawn = deck.slice(0, cardsNeeded);
        setDeck(d => d.slice(cardsNeeded));
        p.hand = [...p.hand, ...drawn];
      }
      
      newPlayers[playerIndex] = p;
      return newPlayers;
    });
  };

  const handlePlayCards = (cardIds: string[], source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    const player = players[turnIndex];
    let cardsToPlay: Card[] = [];

    if (source === 'HAND') cardsToPlay = player.hand.filter(c => cardIds.includes(c.id));
    else if (source === 'FACEUP') cardsToPlay = player.faceUpCards.filter(c => cardIds.includes(c.id));
    else if (source === 'HIDDEN') cardsToPlay = player.hiddenCards.filter(c => cardIds.includes(c.id));

    if (cardsToPlay.length === 0) return;

    // Check legality (first card is enough for sets)
    if (!isLegalMove(cardsToPlay[0])) {
      if (source === 'HIDDEN') {
        addLog(`${player.name} flipped ${cardsToPlay[0].rank}${cardsToPlay[0].suit} - ILLEGAL!`);
        handlePickUp();
        return;
      }
      audioService.playError();
      return;
    }

    // Move cards to pile
    const newRotations = cardsToPlay.map(() => Math.random() * 40 - 20);
    setPile(prev => [...prev, ...cardsToPlay]);
    setPileRotations(prev => [...prev, ...newRotations]);
    
    // Remove from player
    setPlayers(prev => {
      const newPlayers = [...prev];
      const p = { ...newPlayers[turnIndex] };
      if (source === 'HAND') p.hand = p.hand.filter(c => !cardIds.includes(c.id));
      else if (source === 'FACEUP') p.faceUpCards = p.faceUpCards.filter(c => !cardIds.includes(c.id));
      else if (source === 'HIDDEN') p.hiddenCards = p.hiddenCards.filter(c => !cardIds.includes(c.id));
      
      // Endgame Check: If hand <= 1, pick up faceup
      if (p.hand.length <= 1 && p.faceUpCards.length > 0) {
        p.hand = [...p.hand, ...p.faceUpCards];
        p.faceUpCards = [];
        addLog(`${p.name} reclaimed their Stronghold!`);
      }

      newPlayers[turnIndex] = p;
      return newPlayers;
    });

    // Handle Power Cards
    const rank = cardsToPlay[0].rank;
    let nextTurn = (turnIndex + 1) % playerCount;
    let newConstraint: 'NONE' | 'LOWER_THAN_7' = 'NONE';

    if (rank === Rank.Ten) {
      audioService.playBurn();
      addLog(`${player.name} burned the pile! 🔥`);
      setPile([]);
      setPileRotations([]);
      nextTurn = turnIndex; // Burn gives another turn
    } else if (rank === Rank.Two) {
      audioService.playReset();
      addLog(`${player.name} reset the pile. 🔄`);
      nextTurn = turnIndex; // Reset gives another turn
    } else if (rank === Rank.Seven) {
      audioService.playCardPlace();
      addLog(`Next card must be LOWER than 7! 📉`);
      newConstraint = 'LOWER_THAN_7';
    } else {
      audioService.playCardPlace();
      addLog(`${player.name} played ${cardsToPlay.length}x ${rank}.`);
    }

    setActiveConstraint(newConstraint);
    drawToThree(turnIndex);
    setSelectedCardIds([]);

    // Win Check
    const updatedPlayer = players[turnIndex];
    if (updatedPlayer.hand.length === 0 && updatedPlayer.faceUpCards.length === 0 && updatedPlayer.hiddenCards.length === 0) {
      setWinner(updatedPlayer.name);
      setPhase('GAME_OVER');
      audioService.playVictory();
      return;
    }

    setTurnIndex(nextTurn);
  };

  const handlePickUp = () => {
    if (pile.length === 0) {
      setTurnIndex((turnIndex + 1) % playerCount);
      return;
    }

    setPlayers(prev => {
      const newPlayers = [...prev];
      const p = { ...newPlayers[turnIndex] };
      p.hand = [...p.hand, ...pile];
      newPlayers[turnIndex] = p;
      return newPlayers;
    });

    addLog(`${players[turnIndex].name} picked up the pile.`);
    setPile([]);
    setPileRotations([]);
    setActiveConstraint('NONE');
    setTurnIndex((turnIndex + 1) % playerCount);
    audioService.playError();
  };

  const handleSetupConfirm = () => {
    if (selectedCardIds.length !== 3) return;

    setPlayers(prev => {
      const newPlayers = [...prev];
      const p = { ...newPlayers[0] }; // User is 0
      p.faceUpCards = p.hand.filter(c => selectedCardIds.includes(c.id));
      p.hand = p.hand.filter(c => !selectedCardIds.includes(c.id));
      p.hasSelectedSetup = true;
      newPlayers[0] = p;

      // Handle Bots setup
      for (let i = 1; i < playerCount; i++) {
        const bot = { ...newPlayers[i] };
        // Bot strategy: Pick highest values for face-up
        const sortedHand = [...bot.hand].sort((a, b) => b.value - a.value);
        bot.faceUpCards = sortedHand.slice(0, 3);
        bot.hand = sortedHand.slice(3);
        bot.hasSelectedSetup = true;
        newPlayers[i] = bot;
      }

      return newPlayers;
    });

    setSelectedCardIds([]);
    setPhase('PLAYING');
    addLog("Battle Commenced!");
    audioService.playReset();
  };

  // --- Bot AI Turn ---
  useEffect(() => {
    if (phase !== 'PLAYING' || players[turnIndex]?.isHuman || winner) return;

    const botTurnTimer = setTimeout(() => {
      const bot = players[turnIndex];
      
      // Determine playable pool
      let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';
      let playableCards = bot.hand;
      
      if (bot.hand.length === 0) {
        if (bot.faceUpCards.length > 0) {
          source = 'FACEUP';
          playableCards = bot.faceUpCards;
        } else {
          source = 'HIDDEN';
          playableCards = [bot.hiddenCards[0]]; // Must play blind
        }
      }

      // Find best legal card (lowest legal card to save power cards)
      const legalMoves = playableCards.filter(isLegalMove);
      
      if (legalMoves.length > 0) {
        // AI logic: save 2, 7, 10 for when needed
        const nonPower = legalMoves.filter(c => ![Rank.Two, Rank.Seven, Rank.Ten].includes(c.rank));
        const moveCard = (nonPower.length > 0 ? nonPower : legalMoves).sort((a, b) => a.value - b.value)[0];
        
        // Find all cards of same rank to play a set
        const set = playableCards.filter(c => c.rank === moveCard.rank);
        handlePlayCards(set.map(c => c.id), source);
      } else {
        handlePickUp();
      }
    }, 1500);

    return () => clearTimeout(botTurnTimer);
  }, [turnIndex, phase, players, pile, activeConstraint, winner]);

  // --- UI Components ---
  const currentPlayer = players[turnIndex];

  return (
    <div className="flex flex-col h-screen w-full bg-felt relative overflow-hidden select-none">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950/40 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-widest text-amber-500">Palace Rulers</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{mode === 'VS_BOT' ? 'Practice Mode' : 'Pass & Play'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{deck.length} In Treasury</span>
          </div>
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-slate-400 hover:text-white transition-colors">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 relative flex-col md:flex-row">
        {/* Main Table Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          
          {/* Opponents (Top Row) */}
          <div className="absolute top-8 left-0 right-0 flex justify-center gap-12 pointer-events-none">
            {players.filter(p => !p.isHuman).map(opp => (
              <div key={opp.id} className={`flex flex-col items-center gap-3 transition-all ${turnIndex === opp.id ? 'scale-110' : 'opacity-60 scale-95 grayscale'}`}>
                 <div className="relative">
                    <div className={`w-12 h-12 rounded-full bg-slate-800 border-2 ${turnIndex === opp.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-slate-700'} flex items-center justify-center overflow-hidden`}>
                      <Bot size={24} className="text-slate-400" />
                    </div>
                    {turnIndex === opp.id && <div className="absolute -top-1 -right-1 bg-amber-500 w-4 h-4 rounded-full flex items-center justify-center"><RotateCcw size={8} className="text-slate-900 animate-spin" /></div>}
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-white tracking-widest mb-1">{opp.name}</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">{opp.hand.length} Cards</p>
                 </div>
              </div>
            ))}
          </div>

          {/* Central Pile */}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
            {/* Pile Table Glow */}
            <div className="absolute inset-0 bg-amber-500/5 rounded-full blur-3xl" />
            
            {/* Cards in Pile */}
            <div className="relative">
              {pile.length === 0 ? (
                <div className="w-28 h-40 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center flex-col gap-2">
                   <Swords className="text-white/10 w-8 h-8" />
                   <span className="text-[8px] font-black uppercase text-white/10 tracking-[0.2em]">The Field</span>
                </div>
              ) : (
                pile.slice(-5).map((card, i) => (
                  <div key={card.id} className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${pileRotations[pile.length - 1 - (pile.slice(-5).length - 1 - i)]}deg)` }}>
                    <PlayingCard {...card} />
                  </div>
                ))
              )}
            </div>

            {/* Indicator of constraint */}
            {activeConstraint === 'LOWER_THAN_7' && (
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-emerald-600/20 border border-emerald-500/50 px-4 py-1.5 rounded-full backdrop-blur-md animate-bounce flex items-center gap-2">
                 <ArrowDown size={14} className="text-emerald-400" />
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Must be ≤ 7</span>
              </div>
            )}
          </div>

          {/* Player Stronghold / Hidden Row */}
          <div className="absolute bottom-[30%] left-0 right-0 flex justify-center gap-4">
             {players[0]?.hiddenCards.map((c, i) => (
               <div key={`hidden-${i}`} className="relative group">
                 <PlayingCard faceDown />
                 {players[0].faceUpCards[i] && (
                   <div className="absolute -top-4 -right-4 transition-transform group-hover:-translate-y-2">
                      <PlayingCard 
                        {...players[0].faceUpCards[i]} 
                        onClick={() => {
                          if (phase === 'PLAYING' && turnIndex === 0 && players[0].hand.length === 0) {
                            handlePlayCards([players[0].faceUpCards[i].id], 'FACEUP');
                          }
                        }}
                      />
                   </div>
                 )}
                 {/* Hidden Blind Logic */}
                 {phase === 'PLAYING' && turnIndex === 0 && players[0].hand.length === 0 && players[0].faceUpCards.length === 0 && i === 0 && (
                    <button 
                      onClick={() => handlePlayCards([players[0].hiddenCards[0].id], 'HIDDEN')}
                      className="absolute inset-0 z-50 bg-amber-500/20 rounded-xl border-2 border-amber-500 animate-pulse flex items-center justify-center"
                    >
                      <Eye className="text-amber-500" />
                    </button>
                 )}
               </div>
             ))}
          </div>
        </div>

        {/* Sidebar Log */}
        <div className="w-full md:w-64 bg-slate-950/80 backdrop-blur-xl border-l border-white/5 flex flex-col p-4">
          <div className="flex items-center gap-2 mb-4 text-slate-500 border-b border-white/5 pb-2">
             <History size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">Battle Records</span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
             {logs.map((log, i) => (
               <div key={i} className="text-[10px] font-bold text-slate-300 bg-white/5 px-3 py-2 rounded-lg border border-white/5 leading-relaxed">
                 {log}
               </div>
             ))}
             <div ref={logEndRef} />
          </div>
          
          {phase === 'PLAYING' && turnIndex === 0 && !winner && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <button 
                onClick={handlePickUp}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xs py-4 rounded-xl transition-all border border-white/10 uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
              >
                <X size={16} /> Pick Up Pile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hand / Footer Actions */}
      <div className="h-48 md:h-56 bg-slate-950/60 backdrop-blur-2xl border-t border-white/5 p-4 relative z-50">
        {phase === 'SETUP' && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
             <button 
                onClick={handleSetupConfirm}
                disabled={selectedCardIds.length !== 3}
                className={`px-8 py-3 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center gap-2 ${selectedCardIds.length === 3 ? 'bg-amber-500 text-slate-900 scale-110' : 'bg-slate-800 text-slate-500 opacity-50'}`}
             >
                <ShieldCheck size={18} /> Confirm Stronghold ({selectedCardIds.length}/3)
             </button>
             <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest">Select your 3 strongest defense cards</p>
          </div>
        )}

        <div className="flex justify-center items-center h-full relative overflow-x-auto no-scrollbar pb-4">
           {players[0]?.hand.map((card, i) => (
              <div 
                key={card.id} 
                className="transition-all duration-300"
                style={{ 
                  marginLeft: i === 0 ? '0' : '-2rem',
                  zIndex: i,
                  transform: selectedCardIds.includes(card.id) ? 'translateY(-2rem)' : 'translateY(0)'
                }}
              >
                <PlayingCard 
                  {...card} 
                  selected={selectedCardIds.includes(card.id)}
                  highlight={turnIndex === 0 && isLegalMove(card) && phase === 'PLAYING'}
                  onClick={() => {
                    if (phase === 'SETUP') {
                      setSelectedCardIds(prev => 
                        prev.includes(card.id) ? prev.filter(id => id !== card.id) : prev.length < 3 ? [...prev, card.id] : prev
                      );
                      audioService.playClick();
                    } else if (phase === 'PLAYING' && turnIndex === 0) {
                      // Set matching rank for multi-play
                      const sameRankIds = players[0].hand.filter(c => c.rank === card.rank).map(c => c.id);
                      handlePlayCards(sameRankIds, 'HAND');
                    }
                  }}
                />
              </div>
           ))}
        </div>
      </div>

      {/* Victory Modal */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-6">
           <div className="bg-slate-900 border border-amber-500/30 p-12 rounded-[3rem] text-center shadow-2xl max-w-md w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600 to-amber-300"></div>
              <Trophy size={80} className="text-amber-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
              <h2 className="text-4xl font-playfair font-black text-white mb-2">Long Live the Ruler!</h2>
              <p className="text-amber-200 font-bold uppercase tracking-[0.2em] mb-8">{winner} has claimed the Throne</p>
              <button onClick={onExit} className="w-full bg-amber-500 text-slate-900 font-black py-4 rounded-xl hover:bg-amber-400 transition-colors uppercase tracking-widest">Return to Hall</button>
           </div>
        </div>
      )}
    </div>
  );
};
