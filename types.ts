import React from 'react';

export enum Suit {
  Spades = '♠',
  Hearts = '♥',
  Diamonds = '♦',
  Clubs = '♣'
}

export enum Rank {
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',
  Queen = 'Q',
  King = 'K',
  Ace = 'A'
}

export interface UserProfile {
  id: string;
  name: string;
  avatarId?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export type GameMode = 'VS_BOT' | 'PASS_AND_PLAY' | 'ONLINE_HOST' | 'ONLINE_CLIENT';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  hand: Card[];
  faceUpCards: Card[];
  hiddenCards: Card[];
  hasSelectedSetup: boolean;
  peerId?: string;
}

export type GamePhase = 'LOBBY' | 'SETUP' | 'PLAYING' | 'GAME_OVER';

export interface GameStateSnapshot {
  players: Player[];
  deckCount: number;
  pile: Card[];
  pileRotations: number[];
  turnIndex: number;
  phase: GamePhase;
  activeConstraint: 'NONE' | 'LOWER_THAN_7';
  mustPlayAgain: boolean;
  winner: string | null;
  logs: string[];
  lastUpdateTimestamp: number;
  maxPlayers: number;
}