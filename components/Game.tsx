
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Trophy, 
  Eye, 
  Bot, 
  Swords, 
  ShieldCheck, 
  Zap,
  Crown,
  Users,
  Layers
} from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Rank, Suit, Card, Player, GamePhase, UserProfile, GameMode } from '../types';
import { audioService } from '../services/audioService';

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
    const actualCount = Math.max(2, playerCount);
    
    for (let i = 0; i < actualCount; i++) {
      const isHuman = mode === 'PASS_AND_PLAY' || i === 0;
      let pName = "";
      if (isHuman && i === 0) {
        pName = userProfile.name;
      } else if (mode === 'PASS_AND_PLAY') {
        pName = `Ruler ${i + 1}`;
      } else {
        pName = `Opponent ${i}`; 
      }

      initialPlayers.push({
        id: i,
        name: pName,
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
      logs: ["Fortify your Stronghold for the coming battle."],
      actionCount: 0
    };
  });

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<'HAND' | 'FACEUP' | null>(null);
  const botThinkingRef = useRef(false);
  const lastProcessedActionRef = useRef<number>(-1);

  const currentPlayer = game.players[game.turnIndex];
  
  const perspectivePlayer = useMemo(() => {
    if (mode === 'VS_BOT') return game.players[0];
    return currentPlayer;
  }, [mode, game.players, currentPlayer]);

  // Rule Effect: Automatically pickup stronghold cards when hand has 1 card left and deck is empty
  // This side effect ensures the jump happens immediately whenever the state satisfies the rule.
  useEffect(() => {
    if (game.phase !== 'PLAYING' || game.deck.length > 0) return;

    const playersNeedingReclaim = game.players.filter(p => 
      p.hand.length <= 1 && p.faceUpCards.length > 0
    );

    if (playersNeedingReclaim.length > 0) {
      setGame(prev => {
        const nextPlayers = [...prev.players];
        let changed = false;
        
        nextPlayers.forEach((p, idx) => {
          if (p.hand.length <= 1 && p.faceUpCards.length > 0) {
            const newP = { ...p };
            newP.hand = [...p.hand, ...p.faceUpCards];
            newP.faceUpCards = [];
            nextPlayers[idx] = newP;
            changed = true;
          }
        });

        if (!changed) return prev;
        return {
          ...prev,
          players: nextPlayers,
          logs: [...prev.logs.slice(-5), "Stronghold Fortifications Reclaimed!"]
        };
      });
    }
  }, [game.players, game.deck.length, game.phase]);

  const isLegalMove = (card: Card, currentPile: Card[], constraint: 'NONE' | 'LOWER_THAN_7'): boolean => {
    if (!card) return false;
    if (card.rank === Rank.Two || card.rank === Rank.Seven || card.rank === Rank.Ten) return true;
    if (constraint === 'LOWER_THAN_7') return card.value <= 7;
    if (currentPile.length === 0) return true;
    const topCard = currentPile[currentPile.length - 1];
    if (topCard.rank === Rank.Two) return true;
    return card.value >= topCard.value;
  };

  const playCards = (cardIds: string[], source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    setGame(prev => {
      const pIdx = prev.turnIndex;
      const player = prev.players[pIdx];
      let cardsToPlay: Card[] = [];

      if (source === 'HAND') cardsToPlay = player.hand.filter(c => cardIds.includes(c.id));
      else if (source === 'FACEUP') cardsToPlay = player.faceUpCards.filter(c => cardIds.includes(c.id));
      else if (source === 'HIDDEN') cardsToPlay = player.hiddenCards.filter(c => cardIds.includes(c.id));

      if (cardsToPlay.length === 0) return prev;
      
      const cardToTest = cardsToPlay[0];
      const isLegal = isLegalMove(cardToTest, prev.pile, prev.activeConstraint);

      if (!isLegal) {
        if (source === 'HIDDEN') {
          audioService.playError();
          const nextPlayers = [...prev.players];
          const p = { ...nextPlayers[pIdx] };
          p.hiddenCards = p.hiddenCards.filter(c => !cardIds.includes(c.id));
          p.hand = [...p.hand, cardToTest, ...prev.pile];
          nextPlayers[pIdx] = p;
          return {
            ...prev,
            players: nextPlayers,
            pile: [],
            pileRotations: [],
            activeConstraint: 'NONE',
            turnIndex: (prev.turnIndex + 1) % prev.players.length,
            actionCount: prev.actionCount + 1,
            logs: [...prev.logs.slice(-5), `${player.name} failed Blind Siege with ${cardToTest.rank}!`]
          };
        }
        audioService.playError();
        return prev;
      }

      const rank = cardsToPlay[0].rank;
      const newRots = cardsToPlay.map(() => Math.random() * 40 - 20);
      let nextIdx = (prev.turnIndex + 1) % prev.players.length;
      let nextConstraint: 'NONE' | 'LOWER_THAN_7' = 'NONE';
      let nextPile = [...prev.pile, ...cardsToPlay];
      let newLog = `${player.name} played ${cardsToPlay.length > 1 ? cardsToPlay.length + 'x ' : ''}${rank}.`;

      if (rank === Rank.Ten) {
        audioService.playBurn();
        nextPile = [];
        nextConstraint = 'NONE';
        newLog = `${player.name} BURNED the pile! 🔥`;
      } else if (rank === Rank.Two) {
        audioService.playReset();
        nextIdx = pIdx; 
        nextConstraint = 'NONE';
        newLog = `${player.name} reset the pile and commands another turn.`;
      } else if (rank === Rank.Seven) {
        audioService.playCardPlace();
        nextConstraint = 'LOWER_THAN_7';
        newLog = `${player.name} used The Lowering (7). Next player must play ≤ 7!`;
      } else {
        audioService.playCardPlace();
      }

      const nextPlayers = [...prev.players];
      const p = { ...nextPlayers[pIdx] };
      if (source === 'HAND') p.hand = p.hand.filter(c => !cardIds.includes(c.id));
      else if (source === 'FACEUP') p.faceUpCards = p.faceUpCards.filter(c => !cardIds.includes(c.id));
      else if (source === 'HIDDEN') p.hiddenCards = p.hiddenCards.filter(c => !cardIds.includes(c.id));

      let nextDeck = [...prev.deck];
      const needed = 3 - p.hand.length;
      if (needed > 0 && nextDeck.length > 0) {
        p.hand.push(...nextDeck.splice(0, Math.min(needed, nextDeck.length)));
      }

      // Check for immediate Stronghold reclaim if deck is dry and hand is low
      if (p.hand.length <= 1 && nextDeck.length === 0 && p.faceUpCards.length > 0) {
        p.hand = [...p.hand, ...p.faceUpCards];
        p.faceUpCards = [];
        newLog += " (Stronghold Reclaimed!)";
      }

      nextPlayers[pIdx] = p;
      let finalPhase = prev.phase;
      let winner = prev.winner;
      if (p.hand.length === 0 && p.faceUpCards.length === 0 && p.hiddenCards.length === 0) {
        winner = p.name;
        finalPhase = 'GAME_OVER';
        audioService.playVictory();
      }

      return {
        ...prev,
        players: nextPlayers,
        deck: nextDeck,
        pile: nextPile,
        pileRotations: [...prev.pileRotations, ...newRots],
        turnIndex: nextIdx,
        activeConstraint: nextConstraint,
        phase: finalPhase,
        winner,
        logs: [...prev.logs.slice(-5), newLog],
        actionCount: prev.actionCount + 1
      };
    });
    setSelectedCardIds([]);
    setSelectedSource(null);
  };

  const pickUpPile = () => {
    setGame(prev => {
      const nextPlayers = [...prev.players];
      const pIdx = prev.turnIndex;
      const p = { ...nextPlayers[pIdx] };
      p.hand = [...p.hand, ...prev.pile];
      nextPlayers[pIdx] = p;
      return {
        ...prev,
        players: nextPlayers,
        pile: [],
        pileRotations: [],
        activeConstraint: 'NONE',
        turnIndex: (prev.turnIndex + 1) % prev.players.length,
        actionCount: prev.actionCount + 1,
        logs: [...prev.logs.slice(-5), `${p.name} inherited the pile.`]
      };
    });
    audioService.playError();
    setSelectedCardIds([]);
    setSelectedSource(null);
  };

  const confirmSetup = () => {
    if (selectedCardIds.length !== 3) return;
    setGame(prev => {
      const nextPlayers = [...prev.players];
      const pIdx = prev.turnIndex;
      const p = { ...nextPlayers[pIdx] };
      p.faceUpCards = p.hand.filter(c => selectedCardIds.includes(c.id));
      p.hand = p.hand.filter(c => !selectedCardIds.includes(c.id));
      p.hasSelectedSetup = true;
      nextPlayers[pIdx] = p;

      if (mode === 'VS_BOT') {
        for (let i = 1; i < nextPlayers.length; i++) {
          if (nextPlayers[i].isHuman) continue;
          const b = { ...nextPlayers[i] };
          const sorted = [...b.hand].sort((x, y) => y.value - x.value);
          b.faceUpCards = sorted.slice(0, 3);
          b.hand = sorted.slice(3);
          b.hasSelectedSetup = true;
          nextPlayers[i] = b;
        }
      }

      const allReady = nextPlayers.every(x => x.hasSelectedSetup);
      return {
        ...prev,
        players: nextPlayers,
        phase: allReady ? 'PLAYING' : 'SETUP',
        turnIndex: allReady ? 0 : (pIdx + 1) % nextPlayers.length,
        logs: allReady ? ["The Skirmish Begins!"] : prev.logs,
        actionCount: prev.actionCount + 1
      };
    });
    setSelectedCardIds([]);
    setSelectedSource(null);
  };

  const handleCardSelection = (card: Card, source: 'HAND' | 'FACEUP') => {
    if (!perspectivePlayer?.isHuman) return;
    if (mode === 'VS_BOT' && game.turnIndex !== 0) return;

    if (game.phase === 'SETUP') {
      if (source !== 'HAND') return;
      setSelectedCardIds(prev => {
        if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
        if (prev.length < 3) return [...prev, card.id];
        return prev;
      });
      setSelectedSource('HAND');
    } else if (game.phase === 'PLAYING') {
      // Rule Implementation: Cards in the Stronghold (FACEUP) cannot be manually selected.
      // They MUST automatically move to the hand footer to be played.
      if (source === 'FACEUP') return;

      setSelectedCardIds(prev => {
        if (prev.includes(card.id)) {
          const next = prev.filter(id => id !== card.id);
          if (next.length === 0) setSelectedSource(null);
          return next;
        }
        if (selectedSource && selectedSource !== source) {
          setSelectedSource(source);
          return [card.id];
        }
        const firstId = prev[0];
        const pool = source === 'HAND' ? perspectivePlayer.hand : perspectivePlayer.faceUpCards;
        const firstCard = pool?.find(c => c.id === firstId);
        if (firstCard && firstCard.rank !== card.rank) {
          setSelectedSource(source);
          return [card.id];
        }
        setSelectedSource(source);
        return [...prev, card.id];
      });
    }
  };

  useEffect(() => {
    const isBotTurn = game.phase === 'PLAYING' && currentPlayer && !currentPlayer.isHuman && !game.winner;
    if (!isBotTurn || botThinkingRef.current || lastProcessedActionRef.current === game.actionCount) return;

    botThinkingRef.current = true;
    lastProcessedActionRef.current = game.actionCount;
    
    const thinkingTime = 1200 + Math.random() * 800;
    const timer = setTimeout(() => {
      const bot = game.players[game.turnIndex];
      if (!bot) { botThinkingRef.current = false; return; }

      let pool: Card[] = bot.hand;
      let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';

      if (bot.hand.length === 0) {
        if (bot.faceUpCards.length > 0) { source = 'FACEUP'; pool = bot.faceUpCards; }
        else if (bot.hiddenCards.length > 0) { source = 'HIDDEN'; pool = [bot.hiddenCards[0]]; }
      }

      const legalCards = pool.filter(c => isLegalMove(c, game.pile, game.activeConstraint));

      if (legalCards.length > 0) {
        const groups: Record<string, Card[]> = {};
        legalCards.forEach(c => { groups[c.rank] = groups[c.rank] || []; groups[c.rank].push(c); });
        const sortedRanks = Object.keys(groups).sort((a, b) => getCardValue(a as Rank) - getCardValue(b as Rank));
        let bestRank = sortedRanks[0];
        
        if (groups[Rank.Ten] && game.pile.length >= 4) {
          bestRank = Rank.Ten;
        } else if (sortedRanks.length > 1 && [Rank.Two, Rank.Seven, Rank.Ten].includes(bestRank as Rank)) {
          const normalRanks = sortedRanks.filter(r => ![Rank.Two, Rank.Seven, Rank.Ten].includes(r as Rank));
          if (normalRanks.length > 0) bestRank = normalRanks[0];
        }

        playCards(groups[bestRank].map(c => c.id), source);
      } else {
        pickUpPile();
      }
      botThinkingRef.current = false;
    }, thinkingTime);

    return () => { clearTimeout(timer); botThinkingRef.current = false; };
  }, [game.turnIndex, game.phase, game.winner, game.actionCount]);

  return (
    <div className="flex flex-col h-screen w-full bg-felt relative overflow-hidden select-none text-slate-100">
      <header className="h-10 shrink-0 flex items-center justify-between px-4 bg-slate-950/98 border-b border-white/5 z-[200]">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 transition-colors"><X size={16} /></button>
          <h1 className="text-xs font-playfair font-black text-amber-500 tracking-widest uppercase">Palace Rulers</h1>
        </div>
        <div className="text-[10px] font-black uppercase text-amber-500 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          {mode === 'PASS_AND_PLAY' ? 'LOCAL PASS' : 'VS AI'}
        </div>
      </header>

      <div className="h-14 shrink-0 flex items-center justify-center gap-6 bg-slate-950/40 border-b border-white/5 overflow-x-auto no-scrollbar px-4">
        {game.players.map(p => (
          <div key={p.id} className={`flex items-center gap-3 transition-all ${game.turnIndex === p.id ? 'opacity-100 scale-105' : 'opacity-40'}`}>
             <div className={`w-10 h-10 rounded-xl bg-slate-800 border flex items-center justify-center shadow-lg ${game.turnIndex === p.id ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-700'}`}>
               {p.isHuman ? <Users size={16} className="text-purple-400" /> : <Bot size={18} className="text-amber-500" />}
             </div>
             <div className="flex flex-col">
               <p className="text-[10px] font-black uppercase text-white leading-none mb-1">{p.name}</p>
               <div className="flex items-center gap-1">
                  <Layers size={10} className="text-slate-500" />
                  <span className="text-[9px] font-mono font-bold text-amber-500">{p.hand.length}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      <main className="flex-1 flex flex-col items-center justify-between min-h-0 py-4 relative">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/30 px-8 py-2.5 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-xl z-50">
          <Crown size={14} className="text-amber-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {currentPlayer?.isHuman ? "Your Strategic Play" : `${currentPlayer?.name}'s Turn`}
          </span>
        </div>

        <div className="flex-1 w-full flex items-center justify-center relative">
          <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
             {game.pile.length === 0 ? (
                <div className="w-20 md:w-24 aspect-[2.5/3.5] border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-white/5"><Swords size={40} /></div>
             ) : (
                game.pile.slice(-10).map((card, i) => (
                  <div key={card.id} className="absolute transition-all duration-300" style={{ transform: `rotate(${game.pileRotations[game.pile.length - 1 - (game.pile.slice(-10).length - 1 - i)]}deg)` }}>
                    <PlayingCard {...card} />
                  </div>
                ))
             )}
             {game.activeConstraint === 'LOWER_THAN_7' && (
               <div className="absolute -top-10 bg-emerald-500 text-slate-950 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl animate-bounce">Play ≤ 7</div>
             )}
          </div>
        </div>

        <div className="w-full shrink-0 flex flex-col items-center gap-4 pb-4">
          {selectedCardIds.length > 0 && (
            <button 
              onClick={() => game.phase === 'SETUP' ? confirmSetup() : playCards(selectedCardIds, selectedSource!)} 
              disabled={game.phase === 'SETUP' && selectedCardIds.length !== 3}
              className="px-10 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all border-b-4 border-amber-600 active:translate-y-1 active:border-b-0"
            >
              {game.phase === 'SETUP' ? `Confirm Stronghold (${selectedCardIds.length}/3)` : 'Execute Move'}
            </button>
          )}

          {/* Stronghold area: Visual only during playing phase. Cards must jump to hand to be playable. */}
          <div className="flex justify-center gap-4 p-4 bg-slate-900/40 rounded-[2.5rem] border border-white/5">
             {[0, 1, 2].map((i) => (
               <div key={i} className="relative">
                  <PlayingCard faceDown className="opacity-40" />
                  {perspectivePlayer?.faceUpCards[i] && (
                    <div className="absolute -top-3 -right-3 z-[100] shadow-2xl">
                       <PlayingCard 
                         {...perspectivePlayer.faceUpCards[i]} 
                         selected={selectedCardIds.includes(perspectivePlayer.faceUpCards[i].id)} 
                         onClick={() => handleCardSelection(perspectivePlayer.faceUpCards[i], 'FACEUP')} 
                         className={game.phase === 'PLAYING' ? 'cursor-default' : 'cursor-pointer'}
                       />
                    </div>
                  )}
               </div>
             ))}
          </div>
        </div>
      </main>

      <footer className="h-56 md:h-64 bg-slate-950 border-t border-white/10 flex items-center justify-center shrink-0 relative">
        {game.phase === 'PLAYING' && game.turnIndex === perspectivePlayer?.id && perspectivePlayer.isHuman && (
           <button onClick={pickUpPile} className="absolute -top-10 left-6 bg-rose-600 text-white font-black text-[9px] px-5 py-2.5 rounded-xl border-b-4 border-rose-800 uppercase tracking-widest z-[310] transition-all active:translate-y-0.5 active:border-b-0">
             Inherit Pile
           </button>
        )}
        
        <div className="w-full h-full flex justify-center items-end overflow-x-auto no-scrollbar pt-12 pb-8">
           <div className="flex items-center px-16 min-w-max">
              {perspectivePlayer?.hand.map((card, i) => (
                <PlayingCard 
                  key={card.id} 
                  {...card} 
                  selected={selectedCardIds.includes(card.id)} 
                  onClick={() => handleCardSelection(card, 'HAND')}
                  highlight={perspectivePlayer.id === game.turnIndex && perspectivePlayer.isHuman && isLegalMove(card, game.pile, game.activeConstraint)}
                  style={{ 
                    marginLeft: i === 0 ? '0' : '-2.5rem',
                    transform: selectedCardIds.includes(card.id) ? 'translateY(-1.5rem)' : 'translateY(0)',
                    zIndex: selectedCardIds.includes(card.id) ? 1000 : i
                  }} 
                />
              ))}
           </div>
        </div>
      </footer>

      {game.winner && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center z-[1000] p-8">
           <div className="bg-slate-900 border border-amber-500/30 p-16 rounded-[4rem] text-center shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-500">
              <Trophy size={64} className="text-amber-500 mx-auto mb-8" />
              <h2 className="text-4xl font-playfair font-black text-white mb-2 uppercase">Victorious</h2>
              <p className="text-amber-400 font-black uppercase tracking-[0.3em] text-[10px] mb-12">{game.winner} has risen to power</p>
              <button onClick={onExit} className="w-full bg-amber-500 text-slate-950 font-black py-5 rounded-3xl uppercase tracking-widest text-xs shadow-lg">Return to Palace</button>
           </div>
        </div>
      )}
    </div>
  );
};
