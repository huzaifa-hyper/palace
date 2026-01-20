import { GameStateSnapshot } from '../types';

export class MultiplayerService {
  private roomId: string | null = null;
  private playerToken: string | null = null;
  private pollInterval: any = null;
  private baseUrl: string = '';
  
  // Callbacks
  private onStateCallback: ((state: GameStateSnapshot) => void) | null = null;
  private onConnectionStatusCallback: ((status: string) => void) | null = null;
  private onDisconnectCallback: ((reason: string) => void) | null = null;

  public isHost: boolean = false;
  public myPeerId: string | null = null;

  constructor() {}

  private async initializeConnection(url: string, endpoint: string, body: object) {
    this.baseUrl = url.replace(/\/$/, '');
    if (this.onConnectionStatusCallback) this.onConnectionStatusCallback('CONNECTING_SIGNALING');

    try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Multiplayer error');
        }

        const data = await response.json();
        this.roomId = data.roomId;
        this.playerToken = data.playerToken;
        this.myPeerId = data.playerId.toString();

        this.startPolling();
        return data;
    } catch (e: any) {
        if (this.onDisconnectCallback) this.onDisconnectCallback(e.message);
        throw e;
    }
  }

  public async createRoom(url: string, playerName: string, maxPlayers: number) {
      this.isHost = true;
      return this.initializeConnection(url, '/api/create', { playerName, maxPlayers });
  }

  public async joinRoom(url: string, roomId: string, playerName: string) {
      this.isHost = false;
      return this.initializeConnection(url, '/api/join', { roomId, playerName });
  }

  public async quickMatch(url: string, playerName: string) {
      this.isHost = false;
      return this.initializeConnection(url, '/api/quick-match', { playerName });
  }

  private startPolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.fetchState();
      this.pollInterval = setInterval(() => this.fetchState(), 2000);
  }

  private async fetchState() {
      if (!this.roomId || !this.playerToken) return;

      try {
          const response = await fetch(`${this.baseUrl}/api/state/${this.roomId}?playerToken=${this.playerToken}`);
          if (!response.ok) return;
          
          const state: GameStateSnapshot = await response.json();

          if (state.players.length === state.maxPlayers && this.onConnectionStatusCallback) {
              if (state.phase !== 'LOBBY') {
                   this.onConnectionStatusCallback('CONNECTED');
              } else {
                   this.onConnectionStatusCallback('WAITING_FOR_OPPONENT');
              }
          }

          if (this.onStateCallback) this.onStateCallback(state);
      } catch (e) {
          console.error("Polling error", e);
      }
  }

  public async sendAction(action: string, payload: any = {}) {
      if (!this.roomId || !this.playerToken) return;

      try {
          await fetch(`${this.baseUrl}/api/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  roomId: this.roomId,
                  playerToken: this.playerToken,
                  action,
                  payload
              })
          });
          this.fetchState();
      } catch (e) {
          console.error("Action failed", e);
      }
  }

  public sendSetup(faceUpCards: any[], hand: any[]) {
    this.sendAction('SETUP_CONFIRM', { faceUpCards, hand });
  }

  public sendPlayCard(cards: any[], source: string) {
    this.sendAction('PLAY_CARD', { cards, source });
  }

  public sendPickup() {
    this.sendAction('PICK_UP');
  }

  public onGameState(cb: (state: GameStateSnapshot) => void) {
    this.onStateCallback = cb;
  }

  public onConnectionStatus(cb: (status: string) => void) {
    this.onConnectionStatusCallback = cb;
  }

  public onPlayerDisconnected(cb: (reason: string) => void) {
    this.onDisconnectCallback = cb;
  }

  public destroy() {
    if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
    }
    this.roomId = null;
    this.playerToken = null;
  }

  public getRoomId() { return this.roomId; }
}

export const p2pService = new MultiplayerService();