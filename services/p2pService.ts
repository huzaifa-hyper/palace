import { io, Socket } from 'socket.io-client';
import { GameStateSnapshot } from '../types';

export class MultiplayerService {
  private socket: Socket | null = null;
  private onStateCallback: ((state: GameStateSnapshot) => void) | null = null;
  private onErrorCallback: ((msg: string) => void) | null = null;

  // Callbacks expected by App.tsx
  private onConnectionStatusCallback: ((status: string) => void) | null = null;
  private onDisconnectCallback: ((reason: string) => void) | null = null;
  private onMessageCallback: ((msg: any) => void) | null = null;

  // State expected by App.tsx
  public isHost: boolean = false;
  public myPeerId: string | null = null;

  constructor() {}

  public async connect(url: string, action: 'create' | 'join', roomId: string, playerName: string): Promise<void> {
    if (this.socket) {
        this.socket.disconnect();
    }

    console.log(`[Multiplayer] Connecting to ${url} for room ${roomId}`);
    if (this.onConnectionStatusCallback) this.onConnectionStatusCallback('CONNECTING_SIGNALING');

    return new Promise((resolve, reject) => {
        try {
            this.socket = io(url, {
                transports: ['websocket'],
                upgrade: false,
                reconnectionAttempts: 5,
                timeout: 10000
            });

            this.socket.on('connect', () => {
                console.log('[Multiplayer] Socket Connected');
                this.myPeerId = this.socket?.id || 'unknown';
                
                // Send Join request (Server handles creation if new)
                this.socket?.emit('JOIN_ROOM', { roomId, playerName });
            });

            this.socket.on('connect_error', (err) => {
                console.error('[Multiplayer] Connection Error', err);
                if (this.onDisconnectCallback) this.onDisconnectCallback(err.message);
                reject(err);
            });

            this.socket.on('disconnect', (reason) => {
                 console.log('[Multiplayer] Disconnected:', reason);
                 if (this.onDisconnectCallback) this.onDisconnectCallback(reason);
            });

            // --- Server Events ---

            this.socket.on('ROLE_ASSIGNED', (payload: { role: string, isHost: boolean }) => {
                this.isHost = payload.isHost;
            });

            this.socket.on('WAITING_FOR_OPPONENT', () => {
                 if (this.onConnectionStatusCallback) this.onConnectionStatusCallback('WAITING_FOR_OPPONENT');
            });

            this.socket.on('GAME_STATE', (state: GameStateSnapshot) => {
                 // If we receive game state with 2 players, we are fully connected
                 if (state.players.length === 2) {
                     // Only trigger CONNECTED status if we weren't already playing (to avoid re-triggering lobby UI)
                     if (this.onConnectionStatusCallback) {
                         // We rely on App.tsx to check this status and switch to Game view
                         this.onConnectionStatusCallback('CONNECTED');
                     }
                 }
                 if (this.onStateCallback) this.onStateCallback(state);
            });

            this.socket.on('ERROR', (msg: string) => {
                 console.error('[Multiplayer] Server Error:', msg);
                 if (this.onErrorCallback) this.onErrorCallback(msg);
                 if (this.onDisconnectCallback) this.onDisconnectCallback(msg);
            });

            resolve();
        } catch (e) {
            reject(e);
        }
    });
  }

  // --- Game Actions (Called by Game.tsx) ---

  public sendSetup(faceUpCards: any[], hand: any[]) {
    this.socket?.emit('ACTION_SETUP_CONFIRM', { faceUpCards, hand });
  }

  public sendPlayCard(cards: any[], source: string) {
    this.socket?.emit('ACTION_PLAY_CARD', { cards, source });
  }

  public sendPickup() {
    this.socket?.emit('ACTION_PICK_UP');
  }

  public onGameState(cb: (state: GameStateSnapshot) => void) {
    this.onStateCallback = cb;
  }

  public onError(cb: (msg: string) => void) {
    this.onErrorCallback = cb;
  }

  // --- App Integration Methods (Called by App.tsx) ---

  public onConnectionStatus(cb: (status: string) => void) {
    this.onConnectionStatusCallback = cb;
  }

  public onPlayerDisconnected(cb: (reason: string) => void) {
    this.onDisconnectCallback = cb;
  }

  public onMessage(cb: (msg: any) => void) {
      this.onMessageCallback = cb;
  }

  public destroy() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const p2pService = new MultiplayerService();