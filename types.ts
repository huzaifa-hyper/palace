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

export interface RuleSectionData {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarId?: number;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balanceEth: string | null;
  balanceUsdValue: number | null;
  isEligible: boolean; // meets $0.25 requirement
  chainId: number | null;
}

export type GameMode = 'VS_BOT' | 'PASS_AND_PLAY' | 'ONLINE_HOST' | 'ONLINE_CLIENT';

// Game Specific Types
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
  peerId?: string; // For P2P mapping
}

export type GamePhase = 'SETUP' | 'PLAYING' | 'GAME_OVER';

// P2P Network Types
export type NetworkActionType = 'JOIN' | 'START_GAME' | 'PLAY_CARD' | 'PICK_UP' | 'SETUP_CONFIRM' | 'SYNC_STATE';

export interface NetworkMessage {
  type: NetworkActionType;
  payload: any;
  senderId?: string;
}

export interface GameStateSnapshot {
  players: Player[];
  deckCount: number; // Don't send full deck to clients to prevent cheating
  pile: Card[];
  pileRotations: number[];
  turnIndex: number;
  phase: GamePhase;
  activeConstraint: 'NONE' | 'LOWER_THAN_7';
  mustPlayAgain: boolean;
  winner: string | null;
  logs: string[];
}