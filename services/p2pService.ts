
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
  private onMessageCallback: ((msg: any) => void) | null = null;

  public isHost: boolean = false;
  public myPeerId: string | null = null; // Used for UI identity mapping

  constructor() {}

  public async connect(url: string, action: 'create' | 'join', roomId: string, playerName: string): Promise<void> {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    
    if (this.onConnectionStatusCallback) this.onConnectionStatusCallback('CONNECTING_SIGNALING');

    try {
        const response = await fetch(`${this.baseUrl}/api/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerName })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to join');
        }

        const data = await response.json();
        this.roomId = data.roomId;
        this.playerToken = data.playerToken;
        this.myPeerId = data.playerId.toString(); // Map server ID to peer ID for Game.tsx

        // Start Polling
        this.startPolling();

    } catch (e: any) {
        if (this.onDisconnectCallback) this.onDisconnectCallback(e.message);
        throw e;
    }
  }

  private startPolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      
      // Initial fetch
      this.fetchState();

      // Poll every 2 seconds
      this.pollInterval = setInterval(() => {
          this.fetchState();
      }, 2000);
  }

  private async fetchState() {
      if (!this.roomId || !this.playerToken) return;

      try {
          const response = await fetch(`${this.baseUrl}/api/state/${this.roomId}?playerToken=${this.playerToken}`);
          if (!response.ok) return; // Silent fail on poll
          
          const state: GameStateSnapshot = await response.json();

          // Check if game started
          if (state.players.length === 2 && this.onConnectionStatusCallback) {
              // Notify App.tsx that we are ready to play
              // We check if phase is not lobby to ensure smoother transition
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

  private async sendAction(action: string, payload: any = {}) {
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
          // Immediate poll after action for snappier UI
          this.fetchState();
      } catch (e) {
          console.error("Action failed", e);
      }
  }

  // --- Game Actions ---

  public sendSetup(faceUpCards: any[], hand: any[]) {
    this.sendAction('SETUP_CONFIRM', { faceUpCards, hand });
  }

  public sendPlayCard(cards: any[], source: string) {
    this.sendAction('PLAY_CARD', { cards, source });
  }

  public sendPickup() {
    this.sendAction('PICK_UP');
  }

  // --- Registration Methods ---

  public onGameState(cb: (state: GameStateSnapshot) => void) {
    this.onStateCallback = cb;
  }

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
    if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
    }
    this.roomId = null;
    this.playerToken = null;
  }
}

export const p2pService = new MultiplayerService();
