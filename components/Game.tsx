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
  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-15), msg]);

  const isLegalMove = (card: Card): boolean => {
    // Special cards are always legal to play on anything
    if (card.rank === Rank.Two || card.rank === Rank.Ten || card.rank === Rank.Seven) return true;
    if (pile.length === 0) return true;
    
    const topCard = pile[pile.length - 1];
    
    // Check for rank 7 constraint (must play 7 or lower)
    if (activeConstraint === 'LOWER_THAN_7') {
      return card.value <= 7;
    }

    // Normal play: must be equal or higher
    // Exception: If top card is a 7, it's just a value 7, but doesn't force "Lower" until the NEXT turn
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

    // Check legality (use the first card in a set to validate)
    if (!isLegalMove(cards[0])) {
      if (source === 'HIDDEN') {
        addLog(`${player.name} failed the Blind Siege with ${cards[0].rank}${cards[0].suit}! 🚫`);
        setPile(prev => [...prev, ...cards]); // Card is revealed then pile picked up
        setPileRotations(prev => [...prev, Math.random() * 20 - 10]);
        setTimeout(() => pickUpPile(), 500);
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
      
      // Endgame Check: If hand is empty but has Stronghold, pick it up
      if (p.hand.length === 0 && p.faceUpCards.length > 0) {
        p.hand = [...p.faceUpCards];
        p.faceUpCards = [];
        addLog(`${p.name} seized their Stronghold! 🏰`);
      }
      next[pIdx] = p;
      return next;
    });

    // Handle Power Card Effects
    const rank = cards[0].rank;
    let nextIdx = (turnIndex + 1) % playerCount;
    let nextConstraint: 'NONE' | 'LOWER_THAN_7' = 'NONE';

    if (rank === Rank.Ten) {
      audioService.playBurn();
      addLog(`${player.name} BURNED the pile! 🔥`);
      setPile([]);
      setPileRotations([]);
      nextIdx = pIdx; // Burn gives extra turn
    } else if (rank === Rank.Two) {
      audioService.playReset();
      addLog(`${player.name} reset the cycle. 🔄`);
      nextIdx = pIdx; // Reset gives extra turn
    } else if (rank === Rank.Seven) {
      audioService.playCardPlace();
      addLog(`Next play must be ≤ 7! 📉`);
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

    addLog(`${players[turnIndex].name} inherited the pile.`);
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
        // Strategy: Choose highest value cards for face-up
        const sorted = [...bot.hand].sort((a, b) => b.value - a.value);
        bot.faceUpCards = sorted.slice(0, 3);
        bot.hand = sorted.slice(3);
        bot.hasSelectedSetup = true;
        next[i] = bot;
      }
      return next;
    });

    setPhase('PLAYING');
    addLog("The Battle Commenced!");
    audioService.playReset();
  };

  // --- AI Logic Loop ---
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
        // AI Strategy: Play the lowest legal card, saving power cards (2, 7, 10) for emergencies
        const nonPower = legal.filter(c => ![Rank.Two, Rank.Seven, Rank.Ten].includes(c.rank));
        const chosenCard = (nonPower.length > 0 ? nonPower : legal).sort((a, b) => a.value - b.value)[0];
        // Play all cards of the same rank (set)
        const set = pool.filter(c => c.rank === chosenCard.rank);
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
      <header className="flex items-center justify-between px-8 py-4 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 z-[60]">
        <div className="flex items-center gap-6">
          <button onClick={onExit} className="p-2 hover:bg-rose-500/20 rounded-full transition-all text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20">
            <X size={24} />
          </button>
          <div className="h-8 w-px bg-white/10"></div>
          <div>
            <h1 className="text-xl font-playfair font-black text-amber-500 tracking-tighter flex items-center gap-2">
              <Zap size={18} className="fill-amber-500" /> PALACE RULERS
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{mode.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="hidden sm:flex items-center gap-3 bg-slate-900/80 px-5 py-2 rounded-2xl border border-white/10 shadow-inner">
             <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{deck.length} IN TREASURY</span>
           </div>
           <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-slate-400 hover:text-white transition-all hover:scale-110">
             {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Battleground Table */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          
          {/* Top: Opponent Avatars */}
          <div className="absolute top-12 left-0 right-0 flex justify-center gap-16 pointer-events-none">
            {players.filter(p => !p.isHuman).map(opp => (
              <div key={opp.id} className={`flex flex-col items-center gap-4 transition-all duration-700 ${turnIndex === opp.id ? 'scale-110 opacity-100' : 'opacity-40 grayscale'}`}>
                 <div className="relative">
                    <div className={`w-16 h-16 rounded-[2rem] bg-slate-800 border-2 ${turnIndex === opp.id ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'border-slate-700'} flex items-center justify-center transition-all`}>
                      <Bot size={32} className={turnIndex === opp.id ? 'text-amber-500' : 'text-slate-600'} />
                    </div>
                    {turnIndex === opp.id && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 p-1.5 rounded-full shadow-lg border-2 border-slate-900">
                        <RotateCcw size={12} className="text-slate-900 animate-spin" />
                      </div>
                    )}
                 </div>
                 <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-white tracking-[0.2em]">{opp.name}</p>
                    <div className="flex items-center gap-2 justify-center">
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                       <span className="text-[9px] font-bold text-slate-500 uppercase">{opp.hand.length} CARDS</span>
                    </div>
                 </div>
              </div>
            ))}
          </div>

          {/* Central conflict: The Pile */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
            {/* Ambient Glow */}
            <div className={`absolute inset-0 bg-amber-500/5 rounded-full blur-[100px] transition-opacity ${pile.length > 0 ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className="relative z-10">
              {pile.length === 0 ? (
                <div className="w-32 h-44 sm:w-40 sm:h-56 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center flex-col gap-4 group transition-all hover:border-white/10">
                   <Swords size={40} className="text-white/5 group-hover:text-white/10 transition-colors" />
                   <span className="text-[8px] font-black uppercase text-white/5 tracking-[0.5em]">The Field</span>
                </div>
              ) : (
                pile.slice(-12).map((card, i) => (
                  <div key={card.id} className="absolute inset-0 flex items-center justify-center" style={{ 
                    transform: `rotate(${pileRotations[pile.length - 1 - (pile.slice(-12).length - 1 - i)]}deg) translate(${i * 1.5}px, ${i * -0.5}px)` 
                  }}>
                    <PlayingCard {...card} />
                  </div>
                ))
              )}
            </div>

            {/* Special constraint banner */}
            {activeConstraint === 'LOWER_THAN_7' && (
              <div className="absolute -bottom-16 bg-emerald-950/60 border border-emerald-500/30 px-6 py-2.5 rounded-full backdrop-blur-md animate-bounce flex items-center gap-3 shadow-2xl z-20">
                 <ArrowDown size={16} className="text-emerald-400" />
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Must be ≤ 7</span>
              </div>
            )}
          </div>

          {/* Defense Row: Stronghold (Face Up) & Hidden */}
          <div className="absolute bottom-[28%] flex justify-center gap-6">
             {players[0]?.hiddenCards.map((c, i) => (
               <div key={`defense-${i}`} className="relative group perspective-1000">
                 {/* Face Down Card (The Blind Siege) */}
                 <PlayingCard faceDown className="shadow-2xl" />
                 
                 {/* Stronghold Card (The Face-up defense) */}
                 {players[0].faceUpCards[i] && (
                   <div className="absolute -top-6 -right-6 transition-all duration-300 group-hover:-translate-y-4">
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

                 {/* Blind Siege Interaction (Only when hand and face-up are empty) */}
                 {phase === 'PLAYING' && turnIndex === 0 && players[0].hand.length === 0 && players[0].faceUpCards.length === 0 && i === 0 && (
                    <button 
                      onClick={() => playCards([players[0].hiddenCards[0].id], 'HIDDEN')}
                      className="absolute inset-0 z-50 bg-amber-500/30 rounded-2xl border-2 border-amber-500 animate-pulse flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.5)]"
                    >
                      <Eye className="text-amber-100 drop-shadow-lg" size={40} />
                    </button>
                 )}
               </div>
             ))}
          </div>
        </div>

        {/* Action Sidebar: History Log & Context */}
        <aside className="w-full md:w-80 bg-slate-950/80 backdrop-blur-3xl border-l border-white/5 flex flex-col p-6 z-50">
          <div className="flex items-center gap-3 mb-8 text-slate-500 font-black text-[10px] uppercase tracking-[0.4em] border-b border-white/5 pb-4">
             <History size={16} className="text-amber-500" /> Conquest Records
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
             {logs.map((log, i) => (
               <div key={i} className="text-[11px] font-bold text-slate-300 bg-white/5 px-4 py-3 rounded-2xl border border-white/5 leading-relaxed animate-in fade-in slide-in-from-right-4">
                 {log}
               </div>
             ))}
             <div ref={logEndRef} />
          </div>
          
          {phase === 'PLAYING' && turnIndex === 0 && !winner && (
            <div className="mt-8 pt-8 border-t border-white/5">
              <button 
                onClick={pickUpPile}
                className="w-full group bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-5 rounded-[1.5rem] transition-all border border-white/10 uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95"
              >
                <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Inherit Pile
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Footer Area: Player Hand & Global Actions */}
      <footer className="h-64 md:h-72 bg-slate-950 border-t border-white/10 p-6 relative z-[70] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        {phase === 'SETUP' && (
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-6">
             <button 
                onClick={confirmSetup}
                disabled={selectedCardIds.length !== 3}
                className={`px-12 py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center gap-4 group ${selectedCardIds.length === 3 ? 'bg-amber-500 text-slate-950 scale-105 hover:scale-110 active:scale-95' : 'bg-slate-800 text-slate-600 opacity-50'}`}
             >
                <ShieldCheck size={20} className={selectedCardIds.length === 3 ? 'animate-bounce' : ''} /> Solidify Defense ({selectedCardIds.length}/3)
                <ChevronRight size={16} />
             </button>
             <div className="bg-slate-900/90 border border-amber-500/20 px-6 py-2 rounded-full backdrop-blur-md">
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-2"><Info size={12}/> Pick your 3 best tactical defenses for your face-up Stronghold</p>
             </div>
          </div>
        )}

        <div className="flex justify-center items-center h-full relative overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-1 min-w-min px-20">
              {players[0]?.hand.map((card, i) => (
                <div 
                  key={card.id} 
                  className="transition-all duration-300"
                  style={{ 
                    marginLeft: i === 0 ? '0' : '-3rem',
                    zIndex: i + (selectedCardIds.includes(card.id) ? 100 : 0),
                    transform: selectedCardIds.includes(card.id) ? 'translateY(-3.5rem) scale(1.05)' : 'translateY(0)'
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
                        // Play all cards of the same rank automatically for strategy
                        const sameRankIds = players[0].hand.filter(c => c.rank === card.rank).map(c => c.id);
                        playCards(sameRankIds, 'HAND');
                      }
                    }}
                  />
                </div>
              ))}
           </div>
        </div>
      </footer>

      {/* Victory / Game Over Overlay */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center z-[500] p-8">
           <div className="bg-slate-900 border border-amber-500/40 p-16 rounded-[4rem] text-center shadow-[0_0_100px_rgba(245,158,11,0.2)] max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 duration-700">
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600"></div>
              <div className="relative mb-12">
                 <Trophy size={100} className="text-amber-500 mx-auto drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]" />
                 <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full -z-10 animate-pulse" />
              </div>
              <h2 className="text-5xl font-playfair font-black text-white mb-4 tracking-tighter uppercase">Ruler Enthroned</h2>
              <p className="text-amber-400 font-black uppercase tracking-[0.4em] mb-12 text-sm">{winner} HAS CLAIMED THE PALACE</p>
              <button 
                onClick={onExit} 
                className="w-full bg-amber-500 text-slate-950 font-black py-5 rounded-3xl hover:bg-amber-400 transition-all uppercase tracking-[0.3em] shadow-2xl active:scale-95"
              >
                Return to Kingdom
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
