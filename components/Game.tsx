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
  Zap,
  Play
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

interface GameState {
  players: Player[];
  deck: Card[];
  pile: Card[];
  pileRotations: number[];
  turnIndex: number;
  phase: GamePhase;
  activeConstraint: 'NONE' | 'LOWER_THAN_7';
  winner: string | null;
  logs: string[];
  actionCount: number;
}

export const Game: React.FC<{ 
  mode: GameMode, 
  playerCount: number, 
  userProfile: UserProfile, 
  onExit: () => void 
}> = ({ mode, playerCount, userProfile, onExit }) => {
  const [game, setGame] = useState<GameState>(() => {
    const newDeck = createDeck();
    const initialPlayers: Player[] = [];
    const actualPlayerCount = Math.max(2, playerCount || 2);
    
    for (let i = 0; i < actualPlayerCount; i++) {
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
    return {
      players: initialPlayers,
      deck: newDeck,
      pile: [],
      pileRotations: [],
      turnIndex: 0,
      phase: 'SETUP',
      activeConstraint: 'NONE',
      winner: null,
      logs: ["Treasury distributed. Secure your Stronghold!"],
      actionCount: 0
    };
  });

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<'HAND' | 'FACEUP' | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  const botIsThinkingRef = useRef<boolean>(false);
  const lastProcessedActionRef = useRef<number>(-1);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [game.logs]);

  const isLegalMove = (card: Card, currentPile: Card[], constraint: 'NONE' | 'LOWER_THAN_7'): boolean => {
    if (!card) return false;
    if (card.rank === Rank.Two || card.rank === Rank.Ten) return true;
    if (constraint === 'LOWER_THAN_7') return card.value <= 7;
    if (card.rank === Rank.Seven) return true;
    if (currentPile.length === 0) return true;
    const topCard = currentPile[currentPile.length - 1];
    if (topCard.rank === Rank.Two) return true;
    return card.value >= topCard.value;
  };

  const playCards = (cardIds: string[], source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    if (cardIds.length > 1 && source !== 'HIDDEN') {
      audioService.playError();
      return;
    }

    setGame(prev => {
      const pIdx = prev.turnIndex;
      if (!prev.players[pIdx]) return prev;
      
      const player = prev.players[pIdx];
      let cardsToPlay: Card[] = [];

      if (source === 'HAND') cardsToPlay = player.hand.filter(c => cardIds.includes(c.id));
      else if (source === 'FACEUP') cardsToPlay = player.faceUpCards.filter(c => cardIds.includes(c.id));
      else if (source === 'HIDDEN') cardsToPlay = player.hiddenCards.filter(c => cardIds.includes(c.id));

      if (cardsToPlay.length === 0) return prev;

      if (!isLegalMove(cardsToPlay[0], prev.pile, prev.activeConstraint)) {
        if (source === 'HIDDEN') {
          audioService.playError();
          const nextPlayers = [...prev.players];
          const p = { ...nextPlayers[pIdx] };
          p.hiddenCards = p.hiddenCards.filter(c => !cardIds.includes(c.id));
          p.hand = [...p.hand, ...cardsToPlay, ...prev.pile];
          nextPlayers[pIdx] = p;

          return {
            ...prev,
            players: nextPlayers,
            pile: [],
            pileRotations: [],
            activeConstraint: 'NONE',
            turnIndex: (prev.turnIndex + 1) % prev.players.length,
            actionCount: prev.actionCount + 1,
            logs: [...prev.logs.slice(-15), `${player.name} failed Blind Siege: ${cardsToPlay[0].rank}${cardsToPlay[0].suit}! 🚫`]
          };
        }
        audioService.playError();
        return prev;
      }

      const rank = cardsToPlay[0].rank;
      const newRots = cardsToPlay.map(() => Math.random() * 40 - 20);
      
      let nextIdx = (prev.turnIndex + 1) % prev.players.length;
      let nextConstraint: 'NONE' | 'LOWER_THAN_7' = prev.activeConstraint;
      let nextPile = [...prev.pile, ...cardsToPlay];
      let nextPileRots = [...prev.pileRotations, ...newRots];
      let newLog = `${player.name} played ${rank}.`;

      if (rank === Rank.Ten) {
        audioService.playBurn();
        newLog = `${player.name} BURNED the pile! 🔥 Turn passes.`;
        nextPile = [];
        nextPileRots = [];
        nextConstraint = 'NONE';
      } else if (rank === Rank.Two) {
        audioService.playReset();
        newLog = `${player.name} reset with a 2. Go again! 🔄`;
        nextConstraint = 'NONE'; 
        nextIdx = pIdx; 
      } else if (rank === Rank.Ace) {
        audioService.playCardPlace();
        // RULE UPDATE: You can not throw any card after A. Turn passes.
        newLog = `${player.name} played an Ace. Turn passes. 👑`;
        nextConstraint = 'NONE';
        // nextIdx already defaults to (pIdx + 1) % length
      } else if (rank === Rank.Seven) {
        audioService.playCardPlace();
        newLog = `Next ruler must play ≤ 7! 📉`;
        nextConstraint = 'LOWER_THAN_7';
      } else {
        audioService.playCardPlace();
        nextConstraint = 'NONE'; 
      }

      const nextPlayers = [...prev.players];
      const p = { ...nextPlayers[pIdx] };
      if (source === 'HAND') p.hand = p.hand.filter(c => !cardIds.includes(c.id));
      else if (source === 'FACEUP') p.faceUpCards = p.faceUpCards.filter(c => !cardIds.includes(c.id));
      else if (source === 'HIDDEN') p.hiddenCards = p.hiddenCards.filter(c => !cardIds.includes(c.id));

      let nextDeck = [...prev.deck];
      const needed = 3 - p.hand.length;
      if (needed > 0 && nextDeck.length > 0) {
        const drawn = nextDeck.splice(0, Math.min(needed, nextDeck.length));
        p.hand = [...p.hand, ...drawn];
      }

      if (p.hand.length === 0 && nextDeck.length === 0 && p.faceUpCards.length > 0) {
        p.hand = [...p.faceUpCards];
        p.faceUpCards = [];
        newLog += ` ${p.name} seized their Stronghold! 🏰`;
      }

      nextPlayers[pIdx] = p;

      let finalWinner = prev.winner;
      let finalPhase = prev.phase;
      if (p.hiddenCards.length === 0 && p.faceUpCards.length === 0 && p.hand.length === 0) {
        finalWinner = p.name;
        finalPhase = 'GAME_OVER';
        audioService.playVictory();
      }

      return {
        ...prev,
        players: nextPlayers,
        deck: nextDeck,
        pile: nextPile,
        pileRotations: nextPileRots,
        turnIndex: nextIdx,
        activeConstraint: nextConstraint,
        winner: finalWinner,
        phase: finalPhase,
        logs: [...prev.logs.slice(-15), newLog],
        actionCount: prev.actionCount + 1
      };
    });
    setSelectedCardIds([]);
    setSelectedSource(null);
  };

  const pickUpPile = () => {
    setGame(prev => {
      const nextPlayers = [...prev.players];
      if (!nextPlayers[prev.turnIndex]) return prev;
      
      const p = { ...nextPlayers[prev.turnIndex] };
      p.hand = [...p.hand, ...prev.pile];
      nextPlayers[prev.turnIndex] = p;

      return {
        ...prev,
        players: nextPlayers,
        pile: [],
        pileRotations: [],
        activeConstraint: 'NONE',
        turnIndex: (prev.turnIndex + 1) % prev.players.length,
        actionCount: prev.actionCount + 1,
        logs: [...prev.logs.slice(-15), `${p.name} inherited the pile.`]
      };
    });
    setSelectedCardIds([]);
    setSelectedSource(null);
    audioService.playError();
  };

  const confirmSetup = () => {
    if (selectedCardIds.length !== 3) return;
    setGame(prev => {
      const nextPlayers = [...prev.players];
      const user = { ...nextPlayers[0] };
      user.faceUpCards = user.hand.filter(c => selectedCardIds.includes(c.id));
      user.hand = user.hand.filter(c => !selectedCardIds.includes(c.id));
      user.hasSelectedSetup = true;
      nextPlayers[0] = user;

      for (let i = 1; i < nextPlayers.length; i++) {
        const bot = { ...nextPlayers[i] };
        const sorted = [...bot.hand].sort((a, b) => b.value - a.value);
        bot.faceUpCards = sorted.slice(0, 3);
        bot.hand = sorted.slice(3);
        bot.hasSelectedSetup = true;
        nextPlayers[i] = bot;
      }
      audioService.playReset();
      return {
        ...prev,
        players: nextPlayers,
        phase: 'PLAYING',
        logs: [...prev.logs.slice(-15), "Battle Commenced!"],
        actionCount: prev.actionCount + 1
      };
    });
    setSelectedCardIds([]);
    setSelectedSource(null);
  };

  useEffect(() => {
    const isBotTurn = game.phase === 'PLAYING' && !game.players[game.turnIndex]?.isHuman && !game.winner;
    if (!isBotTurn || botIsThinkingRef.current || lastProcessedActionRef.current === game.actionCount) return;

    botIsThinkingRef.current = true;
    lastProcessedActionRef.current = game.actionCount;
    const thinkingTime = 1200 + Math.random() * 800;

    const timer = setTimeout(() => {
      const bot = game.players[game.turnIndex];
      if (!bot) {
        botIsThinkingRef.current = false;
        return;
      }
      
      let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';
      let pool = bot.hand;
      
      if (bot.hand.length === 0) {
        if (bot.faceUpCards.length > 0) { 
          source = 'FACEUP'; 
          pool = bot.faceUpCards; 
        } else if (bot.hiddenCards.length > 0) { 
          source = 'HIDDEN'; 
          pool = [bot.hiddenCards[0]]; 
        }
      }

      const legal = pool.filter(c => isLegalMove(c, game.pile, game.activeConstraint));
      
      if (legal.length > 0) {
        const nonPower = legal.filter(c => ![Rank.Two, Rank.Seven, Rank.Ten, Rank.Ace].includes(c.rank));
        const powerCards = legal.filter(c => [Rank.Two, Rank.Seven, Rank.Ten, Rank.Ace].includes(c.rank));
        
        let chosen;
        if (nonPower.length > 0) {
          chosen = nonPower.sort((a, b) => a.value - b.value)[0];
        } else {
          chosen = powerCards[Math.floor(Math.random() * powerCards.length)];
        }
        
        playCards([chosen.id], source);
      } else {
        pickUpPile();
      }
      botIsThinkingRef.current = false;
    }, thinkingTime);

    return () => {
      clearTimeout(timer);
      botIsThinkingRef.current = false;
    };
  }, [game.turnIndex, game.phase, game.winner, game.actionCount]);

  const handleCardSelection = (card: Card, source: 'HAND' | 'FACEUP') => {
    if (game.phase === 'SETUP' && source === 'HAND') {
      setSelectedCardIds(prev => 
        prev.includes(card.id) ? prev.filter(id => id !== card.id) : prev.length < 3 ? [...prev, card.id] : prev
      );
      setSelectedSource('HAND');
    } else if (game.phase === 'PLAYING' && game.turnIndex === 0) {
      setSelectedCardIds(prev => {
        if (prev.includes(card.id)) {
          setSelectedSource(null);
          return [];
        }
        setSelectedSource(source);
        return [card.id];
      });
    }
  };

  const getActiveSelection = () => {
    if (!selectedSource) return [];
    const pool = selectedSource === 'HAND' ? game.players[0]?.hand : game.players[0]?.faceUpCards;
    return pool?.filter(c => selectedCardIds.includes(c.id)) || [];
  };

  const currentSelection = getActiveSelection();
  const isSelectionLegal = currentSelection.length === 1 && isLegalMove(currentSelection[0], game.pile, game.activeConstraint);

  return (
    <div className="flex flex-col h-screen w-full bg-felt relative overflow-hidden select-none text-slate-100">
      <header className="h-10 shrink-0 flex items-center justify-between px-4 bg-slate-950/98 border-b border-white/5 z-[200]">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"><X size={16} /></button>
          <div className="h-4 w-px bg-white/10 mx-1"></div>
          <h1 className="text-[10px] sm:text-xs font-playfair font-black text-amber-500 tracking-widest uppercase flex items-center gap-1.5"><Zap size={10} className="fill-amber-500" /> Palace Rulers</h1>
        </div>
        <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-slate-400 hover:text-white transition-all">{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      </header>

      <div className="h-12 shrink-0 flex items-center justify-center gap-4 bg-slate-950/40 border-b border-white/5 pointer-events-none">
        {game.players.filter(p => !p.isHuman).map(opp => (
          <div key={opp.id} className={`flex items-center gap-2 transition-all duration-500 ${game.turnIndex === opp.id ? 'opacity-100 scale-105' : 'opacity-30'}`}>
             <div className={`w-8 h-8 rounded-lg bg-slate-800 border flex items-center justify-center ${game.turnIndex === opp.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-700'}`}>
               <Bot size={16} className={game.turnIndex === opp.id ? 'text-amber-500' : 'text-slate-600'} />
             </div>
             <p className="text-[10px] font-black uppercase text-white tracking-tight">{opp.name} ({opp.hand.length})</p>
          </div>
        ))}
      </div>

      <main className="flex-1 flex flex-col items-center justify-between min-h-0 overflow-hidden relative py-2">
        <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
          <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
             {game.pile.length === 0 ? (
                <div className="w-16 md:w-20 aspect-[2.5/3.5] border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-white/5"><Swords size={28} /></div>
             ) : (
                game.pile.slice(-5).map((card, i) => (
                  <div key={card.id} className="absolute" style={{ transform: `rotate(${game.pileRotations[game.pile.length - 1 - (game.pile.slice(-5).length - 1 - i)]}deg)` }}>
                    <PlayingCard {...card} dimmed={game.turnIndex !== 0} />
                  </div>
                ))
             )}
             {game.activeConstraint === 'LOWER_THAN_7' && (
               <div className="absolute -top-4 bg-emerald-500 text-slate-950 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-bounce z-50 shadow-xl">Must play ≤ 7</div>
             )}
          </div>
        </div>

        <div className="w-full shrink-0 flex flex-col items-center gap-3 pb-2">
          {((game.phase === 'SETUP' && selectedCardIds.length > 0) || (game.phase === 'PLAYING' && game.turnIndex === 0 && selectedCardIds.length > 0)) && (
            <div className="flex flex-col items-center gap-1.5 z-[150] animate-in slide-in-from-bottom-2 duration-300">
              <button 
                onClick={() => {
                  if (game.phase === 'SETUP') confirmSetup();
                  else if (selectedSource) playCards(selectedCardIds, selectedSource);
                }} 
                disabled={game.phase === 'SETUP' ? selectedCardIds.length !== 3 : !isSelectionLegal}
                className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-2xl ${
                  (game.phase === 'SETUP' ? selectedCardIds.length === 3 : isSelectionLegal) ? 'bg-amber-500 text-slate-950 scale-110 border-amber-400' : 'bg-rose-900/40 text-rose-300 cursor-not-allowed grayscale'
                }`}
              >
                {game.phase === 'SETUP' ? <ShieldCheck size={14} /> : <Play size={14} />}
                {game.phase === 'SETUP' ? `Confirm Stronghold (${selectedCardIds.length}/3)` : isSelectionLegal ? `Play Card` : 'Illegal Move'}
              </button>
            </div>
          )}

          <div className="flex justify-center gap-3 p-3 bg-slate-900/60 rounded-[2rem] border border-white/5 shadow-inner backdrop-blur-sm">
             {game.players[0]?.hiddenCards.map((c, i) => (
               <div key={`stronghold-${i}`} className="relative">
                  <PlayingCard faceDown className="scale-90 md:scale-100" />
                  {game.players[0].faceUpCards[i] && (
                    <div className="absolute -top-3 -right-3 z-[100] scale-90 md:scale-100 drop-shadow-2xl">
                       <PlayingCard {...game.players[0].faceUpCards[i]} selected={selectedSource === 'FACEUP' && selectedCardIds.includes(game.players[0].faceUpCards[i].id)}
                         onClick={() => { if (game.phase === 'PLAYING' && game.turnIndex === 0 && game.players[0].hand.length === 0) handleCardSelection(game.players[0].faceUpCards[i], 'FACEUP'); }} />
                    </div>
                  )}
                  {game.turnIndex === 0 && game.players[0].hand.length === 0 && game.players[0].faceUpCards.length === 0 && i === 0 && (
                    <button onClick={() => playCards([game.players[0].hiddenCards[0].id], 'HIDDEN')} 
                      className="absolute inset-0 bg-amber-500/20 rounded-xl border-2 border-amber-500 animate-pulse flex items-center justify-center z-50"><Eye size={24} className="text-white" /></button>
                  )}
               </div>
             ))}
          </div>
        </div>
      </main>

      <footer className="h-52 md:h-60 bg-slate-950 border-t border-white/10 relative flex items-center justify-center shrink-0 z-[300] overflow-visible">
        {game.phase === 'PLAYING' && game.turnIndex === 0 && (
           <button onClick={pickUpPile} className="absolute -top-10 left-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-[9px] px-5 py-2.5 rounded-xl border border-rose-400/50 uppercase tracking-widest shadow-xl z-[310] transition-all">Inherit Pile</button>
        )}
        <div className="w-full h-full flex justify-center items-end overflow-x-auto no-scrollbar scroll-smooth pt-14">
           <div className="flex items-center gap-0.5 px-10 min-w-max pb-8 overflow-visible">
              {game.players[0]?.hand.map((card, i) => {
                const isSelected = selectedSource === 'HAND' && selectedCardIds.includes(card.id);
                const overlap = game.players[0].hand.length > 8 ? '-2rem' : '-1.5rem';
                return (
                  <PlayingCard key={card.id} {...card} selected={isSelected} highlight={game.turnIndex === 0 && isLegalMove(card, game.pile, game.activeConstraint) && game.phase === 'PLAYING'} 
                    onClick={() => handleCardSelection(card, 'HAND')} 
                    style={{ marginLeft: i === 0 ? '0' : overlap, zIndex: isSelected ? 2000 + i : i, transform: isSelected ? 'translateY(-3.5rem) scale(1.15)' : 'translateY(0)', boxShadow: isSelected ? '0 30px 60px rgba(0,0,0,0.8), 0 0 20px rgba(245,158,11,0.3)' : 'none' }} />
                );
              })}
           </div>
        </div>
      </footer>

      {game.winner && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center z-[1000] p-6">
           <div className="bg-slate-900 border border-amber-500/30 p-12 rounded-[2.5rem] text-center shadow-2xl max-w-sm w-full animate-in zoom-in-95">
              <Trophy size={56} className="text-amber-500 mx-auto mb-8" />
              <h2 className="text-4xl font-playfair font-black text-white mb-2 uppercase tracking-tight">Crown Claimed</h2>
              <p className="text-amber-400 font-black uppercase tracking-widest text-xs mb-10">{game.winner} has ascended</p>
              <button onClick={onExit} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs">Return to Lobby</button>
           </div>
        </div>
      )}
    </div>
  );
};