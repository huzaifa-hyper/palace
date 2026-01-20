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
  Play,
  Crown
} from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Rank, Suit, Card, Player, GamePhase, UserProfile, GameMode, GameStateSnapshot } from '../types';
import { audioService } from '../services/audioService';
import { MOCK_PLAYER_NAMES } from '../constants';
import { p2pService } from '../services/p2pService';

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
  onExit: () => void,
  remoteState?: GameStateSnapshot | null
}> = ({ mode, playerCount, userProfile, onExit, remoteState }) => {
  const isOnline = mode === 'ONLINE_HOST' || mode === 'ONLINE_CLIENT';
  
  // Local state for non-multiplayer modes
  const [localGame, setLocalGame] = useState<GameState>(() => {
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
      logs: ["Secure your Stronghold!"],
      actionCount: 0
    };
  });

  // Effective game state depends on mode
  const game = isOnline && remoteState ? {
    players: remoteState.players,
    deck: [], // Managed by server
    pile: remoteState.pile,
    pileRotations: remoteState.pileRotations,
    turnIndex: remoteState.turnIndex,
    phase: remoteState.phase,
    activeConstraint: remoteState.activeConstraint,
    winner: remoteState.winner,
    logs: remoteState.logs,
    actionCount: remoteState.lastUpdateTimestamp
  } : localGame;

  // Find current player in either local or remote context
  const myPlayerId = isOnline ? parseInt(p2pService.myPeerId || "0") : 0;
  const isMyTurn = game.turnIndex === myPlayerId;
  const myData = game.players[myPlayerId];

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
    if (!card || card.id === 'hidden') return false;
    if (card.rank === Rank.Two || card.rank === Rank.Ten) return true;
    if (constraint === 'LOWER_THAN_7') return card.value <= 7;
    if (card.rank === Rank.Seven) return true;
    if (currentPile.length === 0) return true;
    const topCard = currentPile[currentPile.length - 1];
    if (!topCard || topCard.rank === Rank.Two) return true;
    return card.value >= topCard.value;
  };

  const playCards = (cardIds: string[], source: 'HAND' | 'FACEUP' | 'HIDDEN') => {
    const player = game.players[game.turnIndex];
    if (!player) return;

    let cardsToPlay: Card[] = [];
    if (source === 'HAND') cardsToPlay = player.hand.filter(c => cardIds.includes(c.id));
    else if (source === 'FACEUP') cardsToPlay = player.faceUpCards.filter(c => cardIds.includes(c.id));
    else if (source === 'HIDDEN') cardsToPlay = player.hiddenCards.filter(c => cardIds.includes(c.id));

    if (cardsToPlay.length === 0) return;

    if (isOnline) {
      p2pService.sendPlayCard(cardsToPlay, source);
      setSelectedCardIds([]);
      setSelectedSource(null);
      return;
    }

    // Local Logic (AI/Pass&Play)
    setLocalGame(prev => {
      const pIdx = prev.turnIndex;
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
            logs: [...prev.logs.slice(-15), `${player.name} failed Blind Siege.`]
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
      let newLog = `${player.name} played ${cardsToPlay.length > 1 ? cardsToPlay.length + 'x ' : ''}${rank}.`;

      if (rank === Rank.Ten) {
        audioService.playBurn();
        nextPile = [];
        nextPileRots = [];
        nextConstraint = 'NONE';
      } else if (rank === Rank.Two) {
        audioService.playReset();
        nextConstraint = 'NONE'; 
        nextIdx = pIdx; 
      } else if (rank === Rank.Ace) {
        audioService.playCardPlace();
        nextConstraint = 'NONE';
      } else if (rank === Rank.Seven) {
        audioService.playCardPlace();
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
    if (isOnline) {
      p2pService.sendPickup();
      setSelectedCardIds([]);
      setSelectedSource(null);
      return;
    }

    setLocalGame(prev => {
      const nextPlayers = [...prev.players];
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
    
    if (isOnline) {
      const faceUp = myData.hand.filter(c => selectedCardIds.includes(c.id));
      const hand = myData.hand.filter(c => !selectedCardIds.includes(c.id));
      p2pService.sendSetup(faceUp, hand);
      setSelectedCardIds([]);
      setSelectedSource(null);
      return;
    }

    setLocalGame(prev => {
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

  // Bot Logic
  useEffect(() => {
    if (isOnline) return;
    const isBotTurn = game.phase === 'PLAYING' && !game.players[game.turnIndex]?.isHuman && !game.winner;
    if (!isBotTurn || botIsThinkingRef.current || lastProcessedActionRef.current === game.actionCount) return;

    botIsThinkingRef.current = true;
    lastProcessedActionRef.current = game.actionCount;
    const timer = setTimeout(() => {
      const bot = game.players[game.turnIndex];
      let pool = bot.hand;
      let source: 'HAND' | 'FACEUP' | 'HIDDEN' = 'HAND';
      
      if (bot.hand.length === 0) {
        if (bot.faceUpCards.length > 0) { source = 'FACEUP'; pool = bot.faceUpCards; }
        else if (bot.hiddenCards.length > 0) { source = 'HIDDEN'; pool = [bot.hiddenCards[0]]; }
      }

      const legal = pool.filter(c => isLegalMove(c, game.pile, game.activeConstraint));
      if (legal.length > 0) {
        const first = legal[0];
        const set = legal.filter(c => c.rank === first.rank);
        playCards(set.map(c => c.id), source);
      } else {
        pickUpPile();
      }
      botIsThinkingRef.current = false;
    }, 1500);
    return () => clearTimeout(timer);
  }, [game.turnIndex, game.phase, game.winner, game.actionCount, isOnline]);

  const handleCardSelection = (card: Card, source: 'HAND' | 'FACEUP') => {
    if (game.phase === 'SETUP' && source === 'HAND') {
      setSelectedCardIds(prev => prev.includes(card.id) ? prev.filter(id => id !== card.id) : prev.length < 3 ? [...prev, card.id] : prev);
      setSelectedSource('HAND');
    } else if (game.phase === 'PLAYING' && isMyTurn) {
      setSelectedCardIds(prev => {
        if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
        if (selectedSource && selectedSource !== source) { setSelectedSource(source); return [card.id]; }
        const pool = source === 'HAND' ? myData.hand : myData.faceUpCards;
        const first = pool.find(c => c.id === prev[0]);
        if (first && first.rank !== card.rank) { setSelectedSource(source); return [card.id]; }
        setSelectedSource(source);
        return [...prev, card.id];
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-felt relative overflow-hidden select-none text-slate-100">
      <header className="h-10 shrink-0 flex items-center justify-between px-4 bg-slate-950/98 border-b border-white/5 z-[200]">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 transition-colors"><X size={16} /></button>
          <div className="h-4 w-px bg-white/10 mx-1"></div>
          <h1 className="text-[10px] sm:text-xs font-playfair font-black text-amber-500 tracking-widest uppercase flex items-center gap-1.5"><Zap size={10} className="fill-amber-500" /> Palace Rulers</h1>
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isOnline ? 'Multiplayer Session' : 'Offline Skirmish'}</div>
      </header>

      <div className="h-12 shrink-0 flex items-center justify-center gap-4 bg-slate-950/40 border-b border-white/5 pointer-events-none">
        {game.players.map(opp => (
          opp.id !== myPlayerId && (
            <div key={opp.id} className={`flex items-center gap-2 transition-all duration-500 ${game.turnIndex === opp.id ? 'opacity-100 scale-105' : 'opacity-30'}`}>
               <div className={`w-8 h-8 rounded-lg bg-slate-800 border flex items-center justify-center ${game.turnIndex === opp.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-700'}`}>
                 {opp.isHuman ? <Crown size={16} className="text-blue-400" /> : <Bot size={16} className="text-slate-600" />}
               </div>
               <p className="text-[10px] font-black uppercase text-white tracking-tight">{opp.name} ({opp.hand.length})</p>
            </div>
          )
        ))}
      </div>

      <main className="flex-1 flex flex-col items-center justify-between min-h-0 relative py-2">
        <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
          <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
             {game.pile.length === 0 ? (
                <div className="w-16 md:w-20 aspect-[2.5/3.5] border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-white/5"><Swords size={28} /></div>
             ) : (
                game.pile.slice(-10).map((card, i) => (
                  <div key={card.id} className="absolute" style={{ transform: `rotate(${game.pileRotations[game.pile.length - 1 - (game.pile.slice(-10).length - 1 - i)]}deg)` }}>
                    <PlayingCard {...card} dimmed={!isMyTurn} />
                  </div>
                ))
             )}
             {game.activeConstraint === 'LOWER_THAN_7' && (
               <div className="absolute -top-4 bg-emerald-500 text-slate-950 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-bounce z-50 shadow-xl">Must play ≤ 7</div>
             )}
          </div>
        </div>

        <div className="w-full shrink-0 flex flex-col items-center gap-3 pb-2">
          {isMyTurn && selectedCardIds.length > 0 && (
            <div className="flex flex-col items-center gap-1.5 z-[150] animate-in slide-in-from-bottom-2 duration-300">
              <button 
                onClick={() => game.phase === 'SETUP' ? confirmSetup() : playCards(selectedCardIds, selectedSource!)} 
                className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-amber-500 text-slate-950 shadow-2xl scale-110`}
              >
                {game.phase === 'SETUP' ? `Confirm Stronghold (${selectedCardIds.length}/3)` : `Play ${selectedCardIds.length}x Set`}
              </button>
            </div>
          )}

          <div className="flex justify-center gap-3 p-3 bg-slate-900/60 rounded-[2rem] border border-white/5 shadow-inner backdrop-blur-sm">
             {myData?.hiddenCards.map((c, i) => (
               <div key={`stronghold-${i}`} className="relative">
                  <PlayingCard faceDown className="scale-90 md:scale-100" />
                  {myData.faceUpCards[i] && (
                    <div className="absolute -top-3 -right-3 z-[100] scale-90 md:scale-100 drop-shadow-2xl">
                       <PlayingCard {...myData.faceUpCards[i]} selected={selectedSource === 'FACEUP' && selectedCardIds.includes(myData.faceUpCards[i].id)}
                         onClick={() => { if (game.phase === 'PLAYING' && isMyTurn && myData.hand.length === 0) handleCardSelection(myData.faceUpCards[i], 'FACEUP'); }} />
                    </div>
                  )}
                  {isMyTurn && myData.hand.length === 0 && myData.faceUpCards.length === 0 && i === 0 && (
                    <button onClick={() => playCards([myData.hiddenCards[0].id], 'HIDDEN')} 
                      className="absolute inset-0 bg-amber-500/20 rounded-xl border-2 border-amber-500 animate-pulse flex items-center justify-center z-50"><Eye size={24} className="text-white" /></button>
                  )}
               </div>
             ))}
          </div>
        </div>
      </main>

      <footer className="h-52 md:h-60 bg-slate-950 border-t border-white/10 relative flex items-center justify-center shrink-0 z-[300] overflow-visible">
        {game.phase === 'PLAYING' && isMyTurn && (
           <button onClick={pickUpPile} className="absolute -top-10 left-4 bg-rose-600 text-white font-black text-[9px] px-5 py-2.5 rounded-xl border border-rose-400/50 uppercase tracking-widest shadow-xl z-[310]">Inherit Pile</button>
        )}
        <div className="w-full h-full flex justify-center items-end overflow-x-auto no-scrollbar scroll-smooth pt-14">
           <div className="flex items-center gap-0.5 px-10 min-w-max pb-8 overflow-visible">
              {myData?.hand.map((card, i) => {
                const isSelected = selectedSource === 'HAND' && selectedCardIds.includes(card.id);
                return (
                  <PlayingCard key={card.id} {...card} selected={isSelected} highlight={isMyTurn && isLegalMove(card, game.pile, game.activeConstraint)} 
                    onClick={() => handleCardSelection(card, 'HAND')} 
                    style={{ marginLeft: i === 0 ? '0' : '-1.5rem', zIndex: isSelected ? 2000 + i : i, transform: isSelected ? 'translateY(-3rem) scale(1.1)' : 'translateY(0)' }} />
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
              <button onClick={onExit} className="w-full bg-amber-500 text-slate-950 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs">Return to Lobby</button>
           </div>
        </div>
      )}
    </div>
  );
};