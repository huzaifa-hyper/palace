import { io, Socket } from 'socket.io-client';
import { NetworkMessage, SignalingMessage, WebRTCSignal, SignalType } from '../types';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export class P2PService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  // State
  public myPeerId: string | null = null;
  public roomId: string | null = null;
  public isHost: boolean = false;
  
  private candidateQueue: RTCIceCandidate[] = [];

  // Callbacks
  private onMessageCallback: ((msg: NetworkMessage, senderId: string) => void) | null = null;
  private onConnectionCallback: ((status: string) => void) | null = null;
  private onDisconnectCallback: ((reason: string) => void) | null = null;

  constructor() {}

  // --- Socket.IO Connection Flow ---
  public async connect(url: string, action: 'create' | 'join', roomId: string, playerName: string): Promise<void> {
    this.cleanup();
    this.roomId = roomId;
    this.myPeerId = `PLAYER-${Math.floor(Math.random() * 100000)}`;
    
    console.log(`[P2P] Starting Socket.IO connection to Room: ${roomId} via ${url}`);
    if (this.onConnectionCallback) this.onConnectionCallback('CONNECTING_SIGNALING');

    return new Promise((resolve, reject) => {
        try {
            // Initialize Socket.IO with WebSocket transport preferred
            this.socket = io(url, {
                transports: ['websocket', 'polling'], // Fallback enabled
                reconnectionAttempts: 5
            });

            this.socket.on('connect', () => {
                console.log("[P2P] Socket Connected:", this.socket?.id);
                // Trigger Room Action immediately upon connection
                const event = action === 'create' ? 'CREATE_ROOM' : 'JOIN_ROOM';
                this.socket?.emit(event, { roomId, playerId: this.myPeerId });
                resolve();
            });

            this.socket.on('connect_error', (err) => {
                console.error("[P2P] Socket Connection Error:", err);
                if (this.onDisconnectCallback) this.onDisconnectCallback(`Connection Failed: ${err.message}`);
                reject(err);
            });

            this.socket.on('disconnect', (reason) => {
                console.log("[P2P] Socket Disconnected:", reason);
                if (this.onDisconnectCallback && reason !== 'io client disconnect') {
                    this.onDisconnectCallback("Signaling Disconnected");
                }
            });

            // Map Socket.IO events to internal handler
            this.setupSocketListeners();

        } catch (e) {
            console.error("[P2P] Init Error:", e);
            reject(e);
        }
    });
  }

  private setupSocketListeners() {
      if (!this.socket) return;

      // Event Mapping
      this.socket.on('ROLE_ASSIGNED', (payload) => this.handleSignalingMessage({ type: 'ROLE_ASSIGNED', payload }));
      this.socket.on('WAITING_FOR_OPPONENT', () => this.handleSignalingMessage({ type: 'WAITING_FOR_OPPONENT', payload: null }));
      this.socket.on('ROOM_READY', (payload) => this.handleSignalingMessage({ type: 'ROOM_READY', payload }));
      this.socket.on('SIGNAL', (payload) => this.handleSignalingMessage({ type: 'SIGNAL', payload }));
      this.socket.on('PLAYER_LEFT', (payload) => this.handleSignalingMessage({ type: 'PLAYER_LEFT', payload }));
      this.socket.on('ERROR', (msg) => this.handleSignalingMessage({ type: 'ERROR', payload: msg }));
  }

  private sendSignal(type: SignalType, payload: any) {
    if (this.socket && this.socket.connected) {
        // We only send 'SIGNAL' type events manually via this method for WebRTC exchange
        // Room creation/joining is handled in connect()
        if (type === 'SIGNAL') {
            this.socket.emit('SIGNAL', payload);
        }
    } else {
        console.warn("[P2P] Cannot send signal, socket not connected");
    }
  }

  private async handleSignalingMessage(msg: SignalingMessage) {
    console.log("[P2P] Received Signal:", msg.type);

    switch (msg.type) {
      case 'ROLE_ASSIGNED':
        this.isHost = msg.payload.role === 'HOST';
        console.log(`[P2P] Role Assigned: ${msg.payload.role}`);
        break;

      case 'WAITING_FOR_OPPONENT':
        if (this.onConnectionCallback) this.onConnectionCallback('WAITING_FOR_OPPONENT');
        break;

      case 'ROOM_READY':
        console.log("[P2P] Room Ready. Starting WebRTC Handshake...");
        if (this.onConnectionCallback) this.onConnectionCallback('ESTABLISHING_P2P');
        
        this.setupPeerConnection();
        
        if (this.isHost) {
            console.log("[P2P] I am Host. Creating Offer...");
            this.createDataChannel();
            const offer = await this.peerConnection!.createOffer();
            await this.peerConnection!.setLocalDescription(offer);
            this.sendSignal('SIGNAL', { type: 'OFFER', data: offer });
        }
        break;

      case 'SIGNAL':
        const signal: WebRTCSignal = msg.payload;
        if (!this.peerConnection) this.setupPeerConnection();

        if (signal.type === 'OFFER') {
          if (this.isHost) return; // Ignore if host
          console.log("[P2P] Received OFFER. Creating Answer...");
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.data));
          this.processCandidateQueue(); 
          
          const answer = await this.peerConnection!.createAnswer();
          await this.peerConnection!.setLocalDescription(answer);
          this.sendSignal('SIGNAL', { type: 'ANSWER', data: answer });
        } 
        else if (signal.type === 'ANSWER') {
          if (!this.isHost) return; // Ignore if client
          console.log("[P2P] Received ANSWER. Setting Remote Description...");
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.data));
          this.processCandidateQueue();
        } 
        else if (signal.type === 'ICE_CANDIDATE') {
          if (signal.data) {
             const candidate = new RTCIceCandidate(signal.data);
             if (this.peerConnection!.remoteDescription) {
                 await this.peerConnection!.addIceCandidate(candidate);
             } else {
                 this.candidateQueue.push(candidate);
             }
          }
        }
        break;
        
      case 'PLAYER_LEFT':
        if (this.onDisconnectCallback) this.onDisconnectCallback("Opponent Left");
        this.cleanup();
        break;
        
      case 'ERROR':
        if (this.onDisconnectCallback) this.onDisconnectCallback(msg.payload);
        break;
    }
  }

  private async processCandidateQueue() {
      while(this.candidateQueue.length > 0) {
          const c = this.candidateQueue.shift();
          if(c) {
              try { await this.peerConnection!.addIceCandidate(c); } catch (e) { console.error(e); }
          }
      }
  }

  private setupPeerConnection() {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('SIGNAL', { type: 'ICE_CANDIDATE', data: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log("[P2P] Connection State:", this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'failed') {
         if (this.onDisconnectCallback) this.onDisconnectCallback("P2P Connection Failed");
      }
    };

    if (!this.isHost) {
        this.peerConnection.ondatachannel = (event) => {
            console.log("[P2P] Received Data Channel from Host");
            this.setupDataChannel(event.channel);
        };
    }
  }

  private createDataChannel() {
    if (!this.peerConnection) return;
    const channel = this.peerConnection.createDataChannel("game-data", { ordered: true });
    this.setupDataChannel(channel);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    
    this.dataChannel.onopen = () => {
      console.log("[P2P] Data Channel OPEN - Game Ready");
      if (this.onConnectionCallback) this.onConnectionCallback('CONNECTED');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const msg: NetworkMessage = JSON.parse(event.data);
        if (msg.type === 'PING') return;
        if (this.onMessageCallback) {
          const sender = this.isHost ? "CLIENT" : "HOST";
          this.onMessageCallback(msg, sender);
        }
      } catch (e) {
        console.error("Data Channel JSON parse error", e);
      }
    };
    
    this.dataChannel.onclose = () => {
        if (this.onDisconnectCallback) this.onDisconnectCallback("Data Channel Closed");
    };
  }

  // --- Public API ---

  public send(msg: NetworkMessage) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      msg.senderId = this.myPeerId || 'UNKNOWN';
      msg.timestamp = Date.now();
      this.dataChannel.send(JSON.stringify(msg));
    }
  }

  public broadcast(msg: NetworkMessage) { this.send(msg); }
  public sendToHost(msg: NetworkMessage) { this.send(msg); }

  public onMessage(cb: (msg: NetworkMessage, connId: string) => void) {
    this.onMessageCallback = cb;
  }

  public onConnectionStatus(cb: (status: string) => void) {
    this.onConnectionCallback = cb;
  }
  
  public onPlayerDisconnected(cb: (reason: string) => void) {
      this.onDisconnectCallback = cb;
  }

  public destroy() {
    this.cleanup();
  }

  private cleanup() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
    }
    this.dataChannel = null;
    this.peerConnection = null;
    this.candidateQueue = [];
  }
}

export const p2pService = new P2PService();