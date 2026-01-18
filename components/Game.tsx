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
} from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Rank, Suit, Card, Player, GamePhase, UserProfile, GameMode } from '../types';
import { audioService } from '../services/audioService';
import { MOCK_PLAYER_NAMES } from '../constants';

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
    try { audioService.playReset(); } catch(e) {}
  }, [playerCount, userProfile.name]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-15), msg]);

  const isLegalMove = (card: Card): boolean => {
    if (card.rank === Rank.Two || card.rank === Rank.Ten || card.rank === Rank.Seven) return true;
    if (pile.length === 0) return true;
    const topCard = pile[pile.length - 1];
    if (activeConstraint === 'LOWER_THAN_7') return card.value <= 7;
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

    if (!isLegalMove(cards[0])) {
      if (source === 'HIDDEN') {
        addLog(`${player.name} failed the Blind Siege! 🚫`);
        setPile(prev => [...prev, ...cards]);
        setPileRotations(prev => [...prev, Math.random() * 20 - 10]);
        setTimeout(pickUpPile, 500);
        return;
      }
      try { audioService.playError(); } catch(e) {}
      return;
    }

    const newRots = cards.map(() => Math.random() * 40 - 20);
    setPile(prev => [...prev, ...cards]);
    setPileRotations(prev => [...prev, ...newRots]);
    
    setPlayers(prev => {
      const next = [...prev];
      const p = { ...next[pIdx] };
      if (source === 'HAND') p.hand = p.hand.filter(c => !cardIds.includes(c.id));
      else if (source === 'FACEUP') p.faceUpCards = p.faceUpCards.filter(c => !cardIds.includes(c.id));
      else if (source === 'HIDDEN') p.hiddenCards = p.hiddenCards.filter(c => !cardIds.includes(c.id));
      
      if (p.hand.length === 0 && p.faceUpCards.length > 0) {
        p.hand = [...p.faceUpCards];
        p.faceUpCards = [];
        addLog(`${p.name} seized their Stronghold! 🏰`);
      }
      next[pIdx] = p;
      return next;
    });

    const rank = cards[0].rank;
    let nextIdx = (turnIndex + 1) % playerCount;
    let nextConstraint: 'NONE' | 'LOWER_THAN_7' = 'NONE';

    if (rank === Rank.Ten) {
      try { audioService.playBurn(); } catch(e) {}
      addLog(`${player.name} BURNED the pile! 🔥`);
      setPile([]);
      setPileRotations([]);
      nextIdx = pIdx;
    } else if (rank === Rank.Two) {
      try { audioService.playReset(); } catch(e) {}
      addLog(`${player.name} reset the cycle. 🔄`);
      nextIdx = pIdx;
    } else if (rank === Rank.Seven) {
      try { audioService.playCardPlace(); } catch(e) {}
      addLog(`Next must be ≤ 7! 📉`);
      nextConstraint = 'LOWER_THAN_7';
    } else {
      try { audioService.playCardPlace(); } catch(e) {}
      addLog(`${player.name} played ${cards.length}x ${rank}.`);
    }

    setActiveConstraint(nextConstraint);
    drawToThree(pIdx);
    setSelectedCardIds([]);

    const updated = players[pIdx];
    if (updated.hand.length === 0 && updated.faceUpCards.length === 0 && updated.hiddenCards.length === 0) {
      setWinner(updated.name);
      setPhase('GAME_OVER');
      try { audioService.playVictory(); } catch(e) {}
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
    addLog(`${players[turnIndex].name} inherited the pile.`);
    setPile([]);
    setPileRotations([]);
    setActiveConstraint('NONE');
    setTurnIndex((turnIndex + 1) % playerCount);
    try { audioService.playError(); } catch(e) {}
  };

  const confirmSetup = () => {
    if (selectedCardIds.length !== 3) return;
    setPlayers(prev => {
      const next = [...prev];
      const user = { ...next[0] };
      user.faceUpCards = user.hand.filter(c => selectedCardIds.includes(c.id));
      user.hand = user.hand.filter(c => !selectedCardIds.includes(c.id));
      user.hasSelectedSetup = true;
      next[0] = user;

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
    try { audioService.playReset(); } catch(e) {}
  };

  useEffect(() => {
    if (phase !== 'PLAYING' || players[turnIndex]?.isHuman || winner) return;
    const timer = setTimeout(() => {
      const bot = players[turnIndex];
      let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';
      let pool = bot.hand;
      if (bot.hand.length === 0) {
        if (bot.faceUpCards.length > 0) { source = 'FACEUP'; pool = bot.faceUpCards; }
        else { source = 'HIDDEN'; pool = [bot.hiddenCards[0]]; }
      }
      const legal = pool.filter(isLegalMove);
      if (legal.length > 0) {
        const nonPower = legal.filter(c => ![Rank.Two, Rank.Seven, Rank.Ten].includes(c.rank));
        const chosen = (nonPower.length > 0 ? nonPower : legal).sort((a, b) => a.value - b.value)[0];
        const set = pool.filter(c => c.rank === chosen.rank);
        playCards(set.map(c => c.id), source);
      } else {
        pickUpPile();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [turnIndex, phase, players, pile, activeConstraint, winner]);

  return (
    <div className="flex flex-col h-screen w-full bg-felt relative overflow-hidden select-none text-slate-100">
      {/* Zone 1: Header */}
      <header className="h-10 flex items-center justify-between px-4 bg-slate-950/95 backdrop-blur-xl border-b border-white/5 z-[100] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="p-1 hover:bg-rose-500/20 rounded-full text-slate-400 hover:text-rose-400 transition-all"><X size={14} /></button>
          <div className="h-4 w-px bg-white/10"></div>
          <div>
            <h1 className="text-[10px] md:text-xs font-playfair font-black text-amber-500 tracking-tighter flex items-center gap-1 leading-none"><Zap size={10} className="fill-amber-500" /> PALACE RULERS</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/10">
             <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
             <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">{deck.length} IN BANK</span>
           </div>
           <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 text-slate-400 hover:text-white transition-all">{isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
        </div>
      </header>

      {/* Zone 2 & 3: Main Game Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        <div className="flex-1 flex flex-col min-h-0 relative">
          
          {/* Top: Opponents Row (Zone 2) */}
          <div className="h-10 md:h-12 flex items-center justify-center gap-4 shrink-0 pointer-events-none px-2 bg-slate-950/20">
            {players.filter(p => !p.isHuman).map(opp => (
              <div key={opp.id} className={`flex items-center gap-1.5 transition-all ${turnIndex === opp.id ? 'opacity-100 scale-105' : 'opacity-30 grayscale'}`}>
                 <div className={`w-6 h-6 rounded bg-slate-800 border ${turnIndex === opp.id ? 'border-amber-500 shadow-lg' : 'border-slate-700'} flex items-center justify-center`}>
                   <Bot size={12} className={turnIndex === opp.id ? 'text-amber-500' : 'text-slate-600'} />
                 </div>
                 <p className="text-[6px] md:text-[8px] font-black uppercase text-white tracking-widest truncate max-w-[60px]">{opp.name} ({opp.hand.length})</p>
              </div>
            ))}
          </div>

          {/* Middle: Battlefield (Zone 3) */}
          <div className="flex-1 flex flex-col items-center justify-between p-2 md:p-4 min-h-0 relative">
            
            {/* Battlefield: Central Pile */}
            <div className="flex-1 flex items-center justify-center w-full relative min-h-[120px] max-h-[260px]">
              <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center z-10">
                {pile.length === 0 ? (
                  <div className="w-14 h-20 md:w-20 md:h-28 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center flex-col gap-1 text-white/5">
                    <Swords size={16} />
                  </div>
                ) : (
                  pile.slice(-5).map((card, i) => (
                    <div key={card.id} className="absolute inset-0 flex items-center justify-center pointer-events-auto" style={{ transform: `rotate(${pileRotations[pile.length - 1 - (pile.slice(-5).length - 1 - i)]}deg)` }}>
                      <PlayingCard {...card} dimmed={turnIndex !== 0} />
                    </div>
                  ))
                )}
                {activeConstraint === 'LOWER_THAN_7' && (
                   <div className="absolute -bottom-4 bg-emerald-500 text-slate-900 px-2 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest animate-bounce shadow-xl z-[60]">MUST BE ≤ 7</div>
                )}
              </div>
            </div>

            {/* Battlefield: Action UI (Confirm Button) */}
            {phase === 'SETUP' && (
              <div className="flex flex-col items-center gap-1 my-2 shrink-0 z-[120] relative">
                <button 
                   onClick={confirmSetup} 
                   disabled={selectedCardIds.length !== 3} 
                   className={`px-6 py-2 rounded-full font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-2xl border ${selectedCardIds.length === 3 ? 'bg-amber-500 text-slate-950 scale-110 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : 'bg-slate-800 text-slate-600 opacity-60 cursor-not-allowed border-white/5'}`}
                >
                   <ShieldCheck size={14} /> CONFIRM STRONGHOLD ({selectedCardIds.length}/3)
                </button>
                <p className="text-[7px] text-amber-500 font-black uppercase tracking-widest px-3 py-1 rounded bg-slate-950/60 border border-amber-500/10 backdrop-blur-sm">Pick 3 Strategic Defense Cards</p>
              </div>
            )}

            {/* Battlefield: Player's Stronghold (Base of Battleground) */}
            <div className="h-18 md:h-26 shrink-0 flex items-center justify-center w-full z-40 bg-white/5 rounded-2xl border border-white/5 p-1 mb-2 shadow-inner">
               <div className="flex justify-center gap-3 md:gap-5 pointer-events-auto relative">
                  {players[0]?.hiddenCards.map((c, i) => (
                    <div key={`def-${i}`} className="relative">
                      <PlayingCard faceDown className="shadow-2xl scale-95 sm:scale-100" />
                      {players[0].faceUpCards[i] && (
                        <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 scale-95 sm:scale-100">
                            <PlayingCard 
                              {...players[0].faceUpCards[i]} 
                              onClick={() => { if (phase === 'PLAYING' && turnIndex === 0 && players[0].hand.length === 0) playCards([players[0].faceUpCards[i].id], 'FACEUP'); }} 
                            />
                        </div>
                      )}
                      {turnIndex === 0 && players[0].hand.length === 0 && players[0].faceUpCards.length === 0 && i === 0 && (
                          <button onClick={() => playCards([players[0].hiddenCards[0].id], 'HIDDEN')} className="absolute inset-0 bg-amber-500/40 rounded-lg border-2 border-amber-500 animate-pulse flex items-center justify-center z-50"><Eye size={18} className="text-white" /></button>
                      )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Log Area */}
        <aside className="w-full md:w-44 bg-slate-950/90 p-2 flex flex-col border-t md:border-t-0 md:border-l border-white/5 h-16 md:h-auto shrink-0 z-[60]">
          <div className="flex items-center gap-1.5 mb-1 text-slate-600 font-black text-[6px] uppercase tracking-widest border-b border-white/5 pb-1"><History size={8} /> BATTLE LOG</div>
          <div className="flex-1 overflow-y-auto space-y-0.5 no-scrollbar text-[7px] leading-tight">
             {logs.map((log, i) => <div key={i} className="font-bold text-slate-500 bg-white/5 p-1 rounded border border-white/5">{log}</div>)}
             <div ref={logEndRef} />
          </div>
          {phase === 'PLAYING' && turnIndex === 0 && (
            <button onClick={pickUpPile} className="mt-1 w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-[7px] py-1 rounded transition-all border border-white/10 uppercase tracking-widest shadow-lg">INHERIT PILE</button>
          )}
        </aside>
      </div>

      {/* Zone 4: Footer (The Hand) */}
      <footer className="h-24 md:h-32 bg-slate-950/98 border-t border-white/10 p-1 relative flex flex-col items-center justify-center z-[110] shrink-0 overflow-visible">
        <div className="w-full h-full flex justify-center items-center overflow-x-auto no-scrollbar py-1">
           <div className="flex items-center gap-0.5 px-10 min-w-max">
              {players[0]?.hand.map((card, i) => {
                // Adaptive overlap for large hands
                const overlap = players[0].hand.length > 7 ? '-1.8rem' : '-1.4rem';
                return (
                  <div 
                    key={card.id} 
                    className="transition-all duration-300 relative" 
                    style={{ 
                      marginLeft: i === 0 ? '0' : overlap, 
                      zIndex: i + (selectedCardIds.includes(card.id) ? 100 : 0), 
                      transform: selectedCardIds.includes(card.id) ? 'translateY(-1rem) scale(1.05)' : 'translateY(0)' 
                    }}
                  >
                    <PlayingCard 
                      {...card} 
                      selected={selectedCardIds.includes(card.id)} 
                      highlight={turnIndex === 0 && isLegalMove(card) && phase === 'PLAYING'} 
                      onClick={() => {
                        if (phase === 'SETUP') setSelectedCardIds(prev => prev.includes(card.id) ? prev.filter(id => id !== card.id) : prev.length < 3 ? [...prev, card.id] : prev);
                        else if (phase === 'PLAYING' && turnIndex === 0) playCards(players[0].hand.filter(c => c.rank === card.rank).map(c => c.id), 'HAND');
                      }} 
                    />
                  </div>
                );
              })}
           </div>
        </div>
      </footer>

      {/* Overlays */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center z-[500] p-6">
           <div className="bg-slate-900 border border-amber-500/30 p-8 rounded-3xl text-center shadow-2xl max-w-xs w-full animate-in zoom-in duration-300">
              <Trophy size={40} className="text-amber-500 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <h2 className="text-xl font-playfair font-black text-white mb-1 uppercase tracking-tighter leading-none">CROWN CLAIMED</h2>
              <p className="text-amber-400 font-black uppercase tracking-[0.2em] text-[8px] mb-6">{winner} ascends the throne</p>
              <button onClick={onExit} className="w-full bg-amber-500 text-slate-950 font-black py-3 rounded-lg hover:bg-amber-400 transition-all uppercase tracking-widest text-[8px] shadow-lg">RETURN TO KINGDOM</button>
           </div>
        </div>
      )}
    </div>
  );
};