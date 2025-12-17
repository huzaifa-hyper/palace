
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

export type GamePhase = 'LOBBY' | 'SETUP' | 'PLAYING' | 'GAME_OVER';

// --- P2P Networking Types ---

// Signaling Server Messages (WebSocket)
export type SignalType = 
  | 'CREATE_ROOM'    // Host requests to create a room
  | 'JOIN_ROOM'      // Client requests to join a room
  | 'ROLE_ASSIGNED'  // Server tells client their role
  | 'ROOM_READY'     // Server tells both that room is full (2 players)
  | 'SIGNAL' 
  | 'PLAYER_LEFT' 
  | 'ERROR'
  | 'WAITING_FOR_OPPONENT';

export interface SignalingMessage {
  type: SignalType;
  payload: any;
}

export interface WebRTCSignal {
  type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE';
  data: any;
}

// Game Data Channel Messages (WebRTC)
export type NetworkActionType = 
  | 'PING'
  | 'SYNC_REQUEST' 
  | 'SYNC_STATE' 
  | 'PLAY_CARD' 
  | 'PICK_UP' 
  | 'SETUP_CONFIRM' 
  | 'START_GAME'
  | 'KICKED';

export interface NetworkMessage {
  type: NetworkActionType;
  payload: any;
  timestamp?: number;
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
  lastUpdateTimestamp: number;
}
