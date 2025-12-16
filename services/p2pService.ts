import { NetworkMessage, SignalingMessage, WebRTCSignal } from '../types';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export class P2PService {
  private socket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  // State
  public myPeerId: string | null = null;
  public roomId: string | null = null;
  public isHost: boolean = false;
  
  // Queue for ICE candidates received before remote description
  private candidateQueue: RTCIceCandidate[] = [];

  // Callbacks
  private onMessageCallback: ((msg: NetworkMessage, senderId: string) => void) | null = null;
  private onConnectionCallback: ((status: string) => void) | null = null;
  private onDisconnectCallback: ((reason: string) => void) | null = null;

  constructor() {}

  // --- Strict Connection Flow ---
  public async connect(url: string, action: 'create' | 'join', roomId: string, playerName: string): Promise<void> {
    this.cleanup(); // Safety cleanup
    this.roomId = roomId;
    this.myPeerId = `PLAYER-${Math.floor(Math.random() * 100000)}`;
    
    console.log(`[P2P] Starting connection to Room: ${roomId} via ${url}`);
    if (this.onConnectionCallback) this.onConnectionCallback('CONNECTING_SIGNALING');

    try {
        // Step 1: Connect WebSocket
        await this.connectToSignalingServer(url);
        
        // Step 2: Create or Join Room
        const signalType = action === 'create' ? 'CREATE_ROOM' : 'JOIN_ROOM';
        console.log(`[P2P] WS Connected. Sending ${signalType}...`);
        
        this.sendSignal(signalType, { roomId, playerId: this.myPeerId });
        
    } catch (e) {
        console.error("[P2P] Failed to connect:", e);
        if (this.onDisconnectCallback) this.onDisconnectCallback("Signaling Connection Failed");
    }
  }

  private connectToSignalingServer(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("[P2P] Connecting to:", url);
      
      try {
          this.socket = new WebSocket(url);
      } catch (e) {
          return reject(e);
      }

      this.socket.onopen = () => {
        console.log("[P2P] WS Open");
        resolve();
      };

      this.socket.onerror = (err) => {
        // In browsers, error events give very little info due to security
        console.error("[P2P] WS Error Event:", err);
      };

      this.socket.onmessage = async (event) => {
        try {
          const msg: SignalingMessage = JSON.parse(event.data);
          await this.handleSignalingMessage(msg);
        } catch (e) {
          console.error("[P2P] Signal parse error", e);
        }
      };
      
      this.socket.onclose = (event) => {
          console.log("[P2P] WS Closed", event.code, event.reason);
          let reason = "Disconnected";
          if (event.code === 1006) reason = "Connection Refused (Check URL/Server)";
          if (event.code === 1000) reason = "Closed Normally";
          if (this.onDisconnectCallback) this.onDisconnectCallback(reason);
          
          // Clean up if the socket closes unexpectedly
          if (this.peerConnection) this.cleanup();
      };
    });
  }

  private sendSignal(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
        console.warn("[P2P] Cannot send signal, socket not open");
    }
  }

  private async handleSignalingMessage(msg: SignalingMessage) {
    console.log("[P2P] Received Signal:", msg.type);

    switch (msg.type) {
      case 'ROLE_ASSIGNED':
        // Server tells us if we are Host or Client
        this.isHost = msg.payload.role === 'HOST';
        console.log(`[P2P] Role Assigned: ${msg.payload.role}`);
        break;

      case 'WAITING_FOR_OPPONENT':
        if (this.onConnectionCallback) this.onConnectionCallback('WAITING_FOR_OPPONENT');
        break;

      case 'ROOM_READY':
        // Step 3: Room Ready -> Start WebRTC
        console.log("[P2P] Room Ready. Starting WebRTC Handshake...");
        if (this.onConnectionCallback) this.onConnectionCallback('ESTABLISHING_P2P');
        
        this.setupPeerConnection();
        
        // Strict Order: ONLY Host creates the offer
        if (this.isHost) {
            console.log("[P2P] I am Host. Creating Offer...");
            this.createDataChannel();
            const offer = await this.peerConnection!.createOffer();
            await this.peerConnection!.setLocalDescription(offer);
            this.sendSignal('SIGNAL', { type: 'OFFER', data: offer });
        } else {
            console.log("[P2P] I am Client. Waiting for Offer...");
        }
        break;

      case 'SIGNAL':
        const signal: WebRTCSignal = msg.payload;
        if (!this.peerConnection) this.setupPeerConnection();

        if (signal.type === 'OFFER') {
          // Client receives offer
          if (this.isHost) {
              console.warn("[P2P] Host received OFFER (Unexpected)");
              return; 
          }
          console.log("[P2P] Received OFFER. Creating Answer...");
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.data));
          this.processCandidateQueue(); 
          
          const answer = await this.peerConnection!.createAnswer();
          await this.peerConnection!.setLocalDescription(answer);
          this.sendSignal('SIGNAL', { type: 'ANSWER', data: answer });
        } 
        else if (signal.type === 'ANSWER') {
          // Host receives answer
          if (!this.isHost) {
              console.warn("[P2P] Client received ANSWER (Unexpected)");
              return;
          }
          console.log("[P2P] Received ANSWER. Setting Remote Description...");
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.data));
          this.processCandidateQueue();
        } 
        else if (signal.type === 'ICE_CANDIDATE') {
          // Both receive candidates
          if (signal.data) {
             const candidate = new RTCIceCandidate(signal.data);
             if (this.peerConnection!.remoteDescription) {
                 await this.peerConnection!.addIceCandidate(candidate);
             } else {
                 console.log("[P2P] Queuing ICE Candidate (No remote desc yet)");
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
              try {
                await this.peerConnection!.addIceCandidate(c);
              } catch (e) {
                  console.error("Error adding queued ice candidate", e);
              }
          }
      }
  }

  private setupPeerConnection() {
    if (this.peerConnection) return;

    console.log("[P2P] Initializing RTCPeerConnection");
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

    // Client handles Data Channel here (passive)
    if (!this.isHost) {
        this.peerConnection.ondatachannel = (event) => {
            console.log("[P2P] Received Data Channel from Host");
            this.setupDataChannel(event.channel);
        };
    }
  }

  private createDataChannel() {
    if (!this.peerConnection) return;
    console.log("[P2P] Creating Data Channel (Host)");
    const channel = this.peerConnection.createDataChannel("game-data", { ordered: true });
    this.setupDataChannel(channel);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    
    this.dataChannel.onopen = () => {
      console.log("[P2P] Data Channel OPEN - Game Ready");
      if (this.onConnectionCallback) {
        this.onConnectionCallback('CONNECTED');
      }
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
    if (this.socket) this.socket.close();
    
    this.dataChannel = null;
    this.peerConnection = null;
    this.socket = null;
    this.candidateQueue = [];
  }
}

export const p2pService = new P2PService();