"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  RotateCcw, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Eye, 
  Bot, 
  ArrowDown, 
  Flame, 
  Swords, 
  ShieldCheck, 
  History,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Rank, Suit, Card, Player, GamePhase, UserProfile, GameMode } from '../types';
import { audioService } from '../services/audioService';
import { MOCK_PLAYER_NAMES } from '../constants';

// --- Card Engine Utilities ---
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

export const Game: React.FC<{ 
  mode: GameMode, 
  playerCount: number, 
  userProfile: UserProfile, 
  onExit: () => void 
}> = ({ mode, playerCount, userProfile, onExit }) => {
  // --- Game State ---
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
    addLog("Treasury distributed. Secure your Stronghold!");
    audioService.playReset();
  }, [playerCount, userProfile.name]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Core Mechanics ---
  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-12), msg]);

  const isLegalMove = (card: Card): boolean => {
    if (card.rank === Rank.Two || card.rank === Rank.Ten || card.rank === Rank.Seven) return true;
    if (pile.length === 0) return true;
    
    const topCard = pile[pile.length - 1];
    if (activeConstraint === 'LOWER_THAN_7') {
      return card.value <= 7;
    }
    // Matching rank is always legal
    if (card.rank === topCard.rank) return true;
    return card.value >= topCard.value;
  };

  const drawToThree = (playerIdx: number) => {
    setPlayers(prev => {
      const nextPlayers = [...prev];
      const p = { ...nextPlayers[playerIdx] };
      const needed = 3 - p.hand.length;
      
      if (needed > 0 && deck.length > 0) {
        const drawn = deck.slice(0, needed);
        setDeck(d => d.slice(needed));
        p.hand = [...p.hand, ...drawn];
      }
      
      nextPlayers[playerIdx] = p;
      return nextPlayers;
    });
  };

  const playCards = (cardIds: string[], source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    const pIdx = turnIndex;
    const player = players[pIdx];
    let cards: Card[] = [];

    if (source === 'HAND') cards = player.hand.filter(c => cardIds.includes(c.id));
    else if (source === 'FACEUP') cards = player.faceUpCards.filter(c => cardIds.includes(c.id));
    else if (source === 'HIDDEN') cards = player.hiddenCards.filter(c => cardIds.includes(c.id));

    if (cards.length === 0) return;

    // Check legality
    if (!isLegalMove(cards[0])) {
      if (source === 'HIDDEN') {
        addLog(`${player.name} failed the Blind Siege! 🚫`);
        pickUpPile();
        return;
      }
      audioService.playError();
      return;
    }

    // Move to pile
    const newRots = cards.map(() => Math.random() * 40 - 20);
    setPile(prev => [...prev, ...cards]);
    setPileRotations(prev => [...prev, ...newRots]);
    
    // Update Player
    setPlayers(prev => {
      const next = [...prev];
      const p = { ...next[pIdx] };
      if (source === 'HAND') p.hand = p.hand.filter(c => !cardIds.includes(c.id));
      else if (source === 'FACEUP') p.faceUpCards = p.faceUpCards.filter(c => !cardIds.includes(c.id));
      else if (source === 'HIDDEN') p.hiddenCards = p.hiddenCards.filter(c => !cardIds.includes(c.id));
      
      // Stronghold Reclaim Check (Phase transition)
      if (p.hand.length === 0 && p.faceUpCards.length > 0) {
        p.hand = [...p.faceUpCards];
        p.faceUpCards = [];
        addLog(`${p.name} seized their Stronghold! 🏰`);
      }
      next[pIdx] = p;
      return next;
    });

    // Post-Play Logic (Powers)
    const rank = cards[0].rank;
    let nextIdx = (turnIndex + 1) % playerCount;
    let nextConstraint: 'NONE' | 'LOWER_THAN_7' = 'NONE';

    if (rank === Rank.Ten) {
      audioService.playBurn();
      addLog(`${player.name} BURNED the pile! 🔥`);
      setPile([]);
      setPileRotations([]);
      nextIdx = pIdx; //Ten gives extra turn
    } else if (rank === Rank.Two) {
      audioService.playReset();
      addLog(`${player.name} reset the cycle. 🔄`);
      nextIdx = pIdx; //Two gives extra turn
    } else if (rank === Rank.Seven) {
      audioService.playCardPlace();
      addLog(`Gravity shift: Must play ≤ 7! 📉`);
      nextConstraint = 'LOWER_THAN_7';
    } else {
      audioService.playCardPlace();
      addLog(`${player.name} played ${cards.length}x ${rank}.`);
    }

    setActiveConstraint(nextConstraint);
    drawToThree(pIdx);
    setSelectedCardIds([]);

    // Victory Check
    const updated = players[pIdx];
    if (updated.hand.length === 0 && updated.faceUpCards.length === 0 && updated.hiddenCards.length === 0) {
      setWinner(updated.name);
      setPhase('GAME_OVER');
      audioService.playVictory();
      return;
    }

    setTurnIndex(nextIdx);
  };

  const pickUpPile = () => {
    if (pile.length === 0) {
      setTurnIndex((turnIndex + 1) % playerCount);
      return;
    }

    setPlayers(prev => {
      const next = [...prev];
      const p = { ...next[turnIndex] };
      p.hand = [...p.hand, ...pile];
      next[turnIndex] = p;
      return next;
    });

    addLog(`${players[turnIndex].name} picked up the pile.`);
    setPile([]);
    setPileRotations([]);
    setActiveConstraint('NONE');
    setTurnIndex((turnIndex + 1) % playerCount);
    audioService.playError();
  };

  const confirmSetup = () => {
    if (selectedCardIds.length !== 3) return;

    setPlayers(prev => {
      const next = [...prev];
      // User setup
      const user = { ...next[0] };
      user.faceUpCards = user.hand.filter(c => selectedCardIds.includes(c.id));
      user.hand = user.hand.filter(c => !selectedCardIds.includes(c.id));
      user.hasSelectedSetup = true;
      next[0] = user;

      // Bots setup
      for (let i = 1; i < playerCount; i++) {
        const bot = { ...next[i] };
        const sorted = [...bot.hand].sort((a, b) => b.value - a.value);
        bot.faceUpCards = sorted.slice(0, 3);
        bot.hand = sorted.slice(3);
        bot.hasSelectedSetup = true;
        next[i] = bot;
      }
      return next;
    });

    setPhase('PLAYING');
    addLog("Battle Commenced!");
    audioService.playReset();
  };

  // --- AI Turn Loop ---
  useEffect(() => {
    if (phase !== 'PLAYING' || players[turnIndex]?.isHuman || winner) return;

    const timer = setTimeout(() => {
      const bot = players[turnIndex];
      let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';
      let pool = bot.hand;

      if (bot.hand.length === 0) {
        if (bot.faceUpCards.length > 0) {
          source = 'FACEUP';
          pool = bot.faceUpCards;
        } else {
          source = 'HIDDEN';
          pool = [bot.hiddenCards[0]];
        }
      }

      const legal = pool.filter(isLegalMove);
      if (legal.length > 0) {
        const nonPower = legal.filter(c => ![Rank.Two, Rank.Seven, Rank.Ten].includes(c.rank));
        const card = (nonPower.length > 0 ? nonPower : legal).sort((a, b) => a.value - b.value)[0];
        const set = pool.filter(c => c.rank === card.rank);
        playCards(set.map(c => c.id), source);
      } else {
        pickUpPile();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [turnIndex, phase, players, pile, activeConstraint, winner]);

  return (
    <div className="flex flex-col h-screen w-full bg-felt relative overflow-hidden select-none">
      {/* Header HUD */}
      <header className="flex items-center justify-between px-8 py-4 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
          <div className="h-8 w-px bg-white/10"></div>
          <div>
            <h1 className="text-xl font-playfair font-black text-amber-500 tracking-tighter flex items-center gap-2">
              PALACE RULERS
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{mode.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="hidden sm:flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
             <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{deck.length} IN TREASURY</span>
           </div>
           <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-slate-400 hover:text-white">
             {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Battleground */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          
          {/* Top: Opponents */}
          <div className="absolute top-12 left-0 right-0 flex justify-center gap-16 pointer-events-none">
            {players.filter(p => !p.isHuman).map(opp => (
              <div key={opp.id} className={`flex flex-col items-center gap-3 transition-all duration-500 ${turnIndex === opp.id ? 'scale-110 opacity-100' : 'opacity-40 grayscale'}`}>
                 <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-slate-800 border-2 ${turnIndex === opp.id ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'border-slate-700'} flex items-center justify-center`}>
                      <Bot size={28} className={turnIndex === opp.id ? 'text-amber-500' : 'text-slate-600'} />
                    </div>
                    {turnIndex === opp.id && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 p-1 rounded-full shadow-lg border border-slate-900">
                        <RotateCcw size={10} className="text-slate-900 animate-spin" />
                      </div>
                    )}
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-white tracking-widest mb-0.5">{opp.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{opp.hand.length} CARDS</p>
                 </div>
              </div>
            ))}
          </div>

          {/* Center: The Pile */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className={`absolute inset-0 bg-amber-500/5 rounded-full blur-[80px] transition-opacity ${pile.length > 0 ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className="relative">
              {pile.length === 0 ? (
                <div className="w-32 h-44 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center flex-col gap-4">
                   <Swords size={32} className="text-white/5" />
                   <span className="text-[8px] font-black uppercase text-white/5 tracking-widest">The Field</span>
                </div>
              ) : (
                pile.slice(-10).map((card, i) => (
                  <div key={card.id} className="absolute inset-0 flex items-center justify-center" style={{ 
                    transform: `rotate(${pileRotations[pile.length - 1 - (pile.slice(-10).length - 1 - i)]}deg) translate(${i * 1.5}px, ${i * -0.5}px)` 
                  }}>
                    <PlayingCard {...card} />
                  </div>
                ))
              )}
            </div>

            {activeConstraint === 'LOWER_THAN_7' && (
              <div className="absolute -bottom-16 bg-emerald-900/40 border border-emerald-500/30 px-5 py-2 rounded-full backdrop-blur-md animate-bounce flex items-center gap-2">
                 <ArrowDown size={14} className="text-emerald-400" />
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Must be ≤ 7</span>
              </div>
            )}
          </div>

          {/* Defense Row: Stronghold & Hidden */}
          <div className="absolute bottom-[25%] flex justify-center gap-4">
             {players[0]?.hiddenCards.map((c, i) => (
               <div key={`defense-${i}`} className="relative group perspective-1000">
                 <PlayingCard faceDown className="shadow-2xl" />
                 {players[0].faceUpCards[i] && (
                   <div className="absolute -top-4 -right-4 transition-all duration-300 group-hover:-translate-y-2">
                      <PlayingCard 
                        {...players[0].faceUpCards[i]} 
                        onClick={() => {
                          if (phase === 'PLAYING' && turnIndex === 0 && players[0].hand.length === 0) {
                            playCards([players[0].faceUpCards[i].id], 'FACEUP');
                          }
                        }}
                      />
                   </div>
                 )}
                 {phase === 'PLAYING' && turnIndex === 0 && players[0].hand.length === 0 && players[0].faceUpCards.length === 0 && i === 0 && (
                    <button 
                      onClick={() => playCards([players[0].hiddenCards[0].id], 'HIDDEN')}
                      className="absolute inset-0 z-50 bg-amber-500/20 rounded-xl border-2 border-amber-500 animate-pulse flex items-center justify-center"
                    >
                      <Eye className="text-amber-500" size={32} />
                    </button>
                 )}
               </div>
             ))}
          </div>
        </div>

        {/* Action Sidebar */}
        <aside className="w-full md:w-72 bg-slate-950/80 backdrop-blur-xl border-l border-white/5 flex flex-col p-4 z-50">
          <div className="flex items-center gap-2 mb-4 text-slate-500 font-black text-[10px] uppercase tracking-widest">
             <History size={14} /> Battle Records
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-2">
             {logs.map((log, i) => (
               <div key={i} className="text-[10px] font-bold text-slate-400 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 leading-relaxed">
                 {log}
               </div>
             ))}
             <div ref={logEndRef} />
          </div>
          
          {phase === 'PLAYING' && turnIndex === 0 && !winner && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <button 
                onClick={pickUpPile}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-4 rounded-xl transition-all border border-white/10 uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
              >
                Pick Up Pile
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Footer Hand Area */}
      <footer className="h-56 md:h-64 bg-slate-950 border-t border-white/10 p-4 relative z-[60]">
        {phase === 'SETUP' && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full px-6">
             <button 
                onClick={confirmSetup}
                disabled={selectedCardIds.length !== 3}
                className={`px-10 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-2xl flex items-center gap-2 ${selectedCardIds.length === 3 ? 'bg-amber-500 text-slate-950 scale-105' : 'bg-slate-800 text-slate-600 opacity-50'}`}
             >
                <ShieldCheck size={18} /> Confirm Stronghold ({selectedCardIds.length}/3)
             </button>
             <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest">Select your 3 defense cards</p>
          </div>
        )}

        <div className="flex justify-center items-center h-full relative overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-1 min-w-min px-12">
              {players[0]?.hand.map((card, i) => (
                <div 
                  key={card.id} 
                  className="transition-all duration-300"
                  style={{ 
                    marginLeft: i === 0 ? '0' : '-2.5rem',
                    zIndex: i + (selectedCardIds.includes(card.id) ? 100 : 0),
                    transform: selectedCardIds.includes(card.id) ? 'translateY(-2.5rem) scale(1.05)' : 'translateY(0)'
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
                        const sameRank = players[0].hand.filter(c => c.rank === card.rank).map(c => c.id);
                        playCards(sameRank, 'HAND');
                      }
                    }}
                  />
                </div>
              ))}
           </div>
        </div>
      </footer>

      {/* Winner Overlay */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-[200] p-8">
           <div className="bg-slate-900 border border-amber-500/40 p-12 rounded-[3rem] text-center shadow-2xl max-w-md w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600 to-amber-300"></div>
              <Trophy size={80} className="text-amber-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
              <h2 className="text-4xl font-playfair font-black text-white mb-2 tracking-tighter uppercase">Ruler Enthroned</h2>
              <p className="text-amber-400 font-black uppercase tracking-[0.3em] mb-10 text-sm">{winner} has claimed the Throne</p>
              <button onClick={onExit} className="w-full bg-amber-500 text-slate-950 font-black py-4 rounded-xl hover:bg-amber-400 transition-colors uppercase tracking-widest text-xs">Return to Palace</button>
           </div>
        </div>
      )}
    </div>
  );
};
