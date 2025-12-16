import { NetworkMessage, SignalingMessage, WebRTCSignal } from '../types';

// Deterministic Signaling URL
const getSignalingUrl = () => {
    // If we have a robust environment var, use it. 
    // Otherwise fallback to likely production URL or localhost only if strictly dev.
    if (process.env.NEXT_PUBLIC_SIGNALING_URL) {
        return process.env.NEXT_PUBLIC_SIGNALING_URL;
    }
    // Fallback for Railway/Fly deployment patterns if env is missing in client build
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return 'wss://palace-rulers-signaling.up.railway.app'; // Example or generic fallback
    }
    return 'ws://localhost:8080';
};

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

  // --- Unified Connect Flow ---
  public async connect(roomId: string, playerName: string): Promise<void> {
    this.cleanup(); // Safety cleanup
    this.roomId = roomId;
    this.myPeerId = `PLAYER-${Math.floor(Math.random() * 100000)}`;
    
    // Notify UI
    if (this.onConnectionCallback) this.onConnectionCallback('CONNECTING_SIGNALING');

    try {
        await this.connectToSignalingServer();
        // Send Join Request
        this.sendSignal('JOIN_ROOM', { roomId, playerId: this.myPeerId });
    } catch (e) {
        console.error("Failed to connect to signaling", e);
        if (this.onDisconnectCallback) this.onDisconnectCallback("Signaling Connection Failed");
    }
  }

  private connectToSignalingServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = getSignalingUrl();
      console.log("Connecting to WS:", url);
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log("WS Open");
        resolve();
      };

      this.socket.onerror = (err) => {
        console.error("WS Error", err);
        reject(err);
      };

      this.socket.onmessage = async (event) => {
        try {
          const msg: SignalingMessage = JSON.parse(event.data);
          await this.handleSignalingMessage(msg);
        } catch (e) {
          console.error("Signal parse error", e);
        }
      };
      
      this.socket.onclose = () => {
          if (this.onDisconnectCallback) this.onDisconnectCallback("Signaling Disconnected");
      };
    });
  }

  private sendSignal(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  private async handleSignalingMessage(msg: SignalingMessage) {
    console.log("Received Signal:", msg.type);

    switch (msg.type) {
      case 'ROLE_ASSIGNED':
        // Server tells us if we are Host or Client
        this.isHost = msg.payload.role === 'HOST';
        if (this.onConnectionCallback) {
            this.onConnectionCallback(this.isHost ? 'WAITING_FOR_OPPONENT' : 'CONNECTING_PEER');
        }
        console.log(`Role Assigned: ${msg.payload.role}`);
        break;

      case 'ROOM_READY':
        console.log("Room Ready. Starting WebRTC Handshake...");
        if (this.onConnectionCallback) this.onConnectionCallback('ESTABLISHING_P2P');
        
        // Strict Order: Host creates connection & offer. Client creates connection & waits.
        this.setupPeerConnection();
        
        if (this.isHost) {
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
          // Client receives offer
          if (this.isHost) return; // Host shouldn't receive offers in this flow
          console.log("Received OFFER");
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.data));
          this.processCandidateQueue(); // Apply any queued ICE candidates
          
          const answer = await this.peerConnection!.createAnswer();
          await this.peerConnection!.setLocalDescription(answer);
          this.sendSignal('SIGNAL', { type: 'ANSWER', data: answer });
        } 
        else if (signal.type === 'ANSWER') {
          // Host receives answer
          if (!this.isHost) return;
          console.log("Received ANSWER");
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
          if(c) await this.peerConnection!.addIceCandidate(c);
      }
  }

  private setupPeerConnection() {
    if (this.peerConnection) return;

    console.log("Setting up RTCPeerConnection");
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('SIGNAL', { type: 'ICE_CANDIDATE', data: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log("P2P State:", this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'failed') {
         if (this.onDisconnectCallback) this.onDisconnectCallback("P2P Connection Failed");
      }
    };

    // Client handles Data Channel here
    if (!this.isHost) {
        this.peerConnection.ondatachannel = (event) => {
            console.log("Received Data Channel from Host");
            this.setupDataChannel(event.channel);
        };
    }
  }

  private createDataChannel() {
    if (!this.peerConnection) return;
    console.log("Creating Data Channel (Host)");
    const channel = this.peerConnection.createDataChannel("game-data", { ordered: true });
    this.setupDataChannel(channel);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    
    this.dataChannel.onopen = () => {
      console.log("Data Channel OPEN - Game Ready");
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
        if (this.onDisconnectCallback) this.onDisconnectCallback("Peer Connection Closed");
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
