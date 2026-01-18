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
      
      {/* 1. Header (Fixed Height) */}
      <header className="h-10 flex items-center justify-between px-4 bg-slate-950/98 border-b border-white/5 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="p-1 hover:bg-rose-500/20 rounded-full text-slate-400 hover:text-rose-400"><X size={18} /></button>
          <div className="h-4 w-px bg-white/10"></div>
          <h1 className="text-xs font-playfair font-black text-amber-500 tracking-tighter uppercase"><Zap size={12} className="inline mr-1 fill-amber-500" /> Palace Rulers</h1>
        </div>
        <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 text-slate-400 hover:text-white transition-all">{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      </header>

      {/* 2. Opponents Row */}
      <div className="h-12 flex items-center justify-center gap-6 shrink-0 pointer-events-none bg-slate-950/20 border-b border-white/5">
        {players.filter(p => !p.isHuman).map(opp => (
          <div key={opp.id} className={`flex items-center gap-2 transition-all ${turnIndex === opp.id ? 'opacity-100 scale-105' : 'opacity-30'}`}>
             <div className={`w-8 h-8 rounded-lg bg-slate-800 border flex items-center justify-center ${turnIndex === opp.id ? 'border-amber-500 shadow-lg' : 'border-slate-700'}`}>
               <Bot size={16} className={turnIndex === opp.id ? 'text-amber-500' : 'text-slate-600'} />
             </div>
             <p className="text-[10px] font-black uppercase text-white">{opp.name} ({opp.hand.length})</p>
          </div>
        ))}
      </div>

      {/* 3. Main Battlefield Area (Scrollable/Flex if needed) */}
      <div className="flex-1 flex flex-col items-center justify-around min-h-0 overflow-hidden px-4 py-2 relative">
        
        {/* Central Pile Container */}
        <div className="w-full flex-1 flex items-center justify-center relative min-h-0">
          <div className="relative w-full h-full flex items-center justify-center max-h-[300px]">
             {pile.length === 0 ? (
                <div className="w-20 aspect-[2.5/3.5] border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center text-white/5">
                  <Swords size={24} />
                </div>
             ) : (
                pile.slice(-5).map((card, i) => (
                  <div key={card.id} className="absolute" style={{ transform: `rotate(${pileRotations[pile.length - 1 - (pile.slice(-5).length - 1 - i)]}deg)` }}>
                    <PlayingCard {...card} dimmed={turnIndex !== 0} />
                  </div>
                ))
             )}
             {activeConstraint === 'LOWER_THAN_7' && (
               <div className="absolute top-0 bg-emerald-500 text-slate-950 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-bounce z-50 shadow-xl">MUST BE ≤ 7</div>
             )}
          </div>
        </div>

        {/* Central Action Area for Setup */}
        {phase === 'SETUP' && (
          <div className="my-2 flex flex-col items-center gap-2 z-[60] animate-in fade-in slide-in-from-bottom-2">
            <button 
              onClick={confirmSetup} 
              disabled={selectedCardIds.length !== 3} 
              className={`px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-2xl ${selectedCardIds.length === 3 ? 'bg-amber-500 text-slate-950 scale-110' : 'bg-slate-800 text-slate-600 opacity-60'}`}
            >
              <ShieldCheck size={16} /> Confirm Stronghold ({selectedCardIds.length}/3)
            </button>
            <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest">Select 3 Defense Cards from your hand</p>
          </div>
        )}

        {/* Player Stronghold Layer */}
        <div className="w-full flex justify-center items-center py-2 shrink-0">
          <div className="flex gap-4 p-2 bg-slate-950/40 rounded-2xl border border-white/5 shadow-inner">
            {players[0]?.hiddenCards.map((c, i) => (
              <div key={`stronghold-${i}`} className="relative">
                 <PlayingCard faceDown className="scale-90 md:scale-100" />
                 {players[0].faceUpCards[i] && (
                   <div className="absolute -top-3 -right-3 z-10 scale-90 md:scale-100">
                      <PlayingCard 
                        {...players[0].faceUpCards[i]} 
                        onClick={() => { if (phase === 'PLAYING' && turnIndex === 0 && players[0].hand.length === 0) playCards([players[0].faceUpCards[i].id], 'FACEUP'); }} 
                      />
                   </div>
                 )}
                 {turnIndex === 0 && players[0].hand.length === 0 && players[0].faceUpCards.length === 0 && i === 0 && (
                   <button onClick={() => playCards([players[0].hiddenCards[0].id], 'HIDDEN')} className="absolute inset-0 bg-amber-500/20 rounded-lg border-2 border-amber-500 animate-pulse flex items-center justify-center z-50">
                     <Eye size={24} className="text-white" />
                   </button>
                 )}
              </div>
            ))}
          </div>
        </div>

        {/* Logs Banner (Overlay-like) */}
        <div className="absolute top-4 right-4 w-40 max-h-24 overflow-y-auto no-scrollbar pointer-events-none hidden md:flex flex-col gap-1 z-20">
           {logs.slice(-4).map((log, i) => (
             <div key={i} className="bg-slate-950/80 p-2 rounded-lg border border-white/5 text-[8px] font-bold text-slate-400 uppercase tracking-widest shadow-lg">{log}</div>
           ))}
        </div>
      </div>

      {/* 4. Player Hand (Fixed Footer) */}
      <footer className="h-28 md:h-36 bg-slate-950 border-t border-white/10 p-2 relative flex items-center justify-center shrink-0 z-[100] overflow-visible">
        {phase === 'PLAYING' && turnIndex === 0 && (
           <button onClick={pickUpPile} className="absolute -top-4 left-4 bg-slate-900 text-white font-black text-[10px] px-4 py-2 rounded-lg border border-white/10 uppercase tracking-widest shadow-xl z-[110] hover:bg-slate-800">Inherit Pile</button>
        )}
        
        <div className="w-full h-full flex justify-center items-center overflow-x-auto no-scrollbar py-2">
           <div className="flex items-center gap-1 px-8 min-w-max">
              {players[0]?.hand.map((card, i) => {
                // Adaptive overlap to handle large hands without stretching or breaking
                const overlap = players[0].hand.length > 8 ? '-2rem' : '-1.5rem';
                return (
                  <div 
                    key={card.id} 
                    className="transition-all duration-300 relative" 
                    style={{ 
                      marginLeft: i === 0 ? '0' : overlap, 
                      zIndex: i + (selectedCardIds.includes(card.id) ? 100 : 0), 
                      transform: selectedCardIds.includes(card.id) ? 'translateY(-1.5rem) scale(1.05)' : 'translateY(0)' 
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

      {/* Victory Modal */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center z-[1000] p-6">
           <div className="bg-slate-900 border border-amber-500/30 p-10 rounded-[2rem] text-center shadow-[0_0_50px_rgba(245,158,11,0.2)] max-w-sm w-full animate-in zoom-in duration-300">
              <Trophy size={48} className="text-amber-500 mx-auto mb-6" />
              <h2 className="text-3xl font-playfair font-black text-white mb-2 uppercase">Crown Claimed</h2>
              <p className="text-amber-400 font-black uppercase tracking-widest text-xs mb-8">{winner} has ascended the throne</p>
              <button onClick={onExit} className="w-full bg-amber-500 text-slate-900 font-black py-4 rounded-xl hover:bg-amber-400 transition-all uppercase tracking-widest text-xs shadow-lg">Return to Lobby</button>
           </div>
        </div>
      )}
    </div>
  );
};