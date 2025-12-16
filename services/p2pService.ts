import { NetworkMessage, SignalingMessage, WebRTCSignal } from '../types';

// Configuration
// In production, this should point to your deployed signaling server.
// If running locally, it defaults to localhost.
const getSignalingUrl = () => {
    if (typeof window !== 'undefined') {
        // Automatically switch between ws:// and wss:// based on current protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        
        // If we are in production (not localhost), assume the signaling server is on the same host or a known variable
        // For this demo, we use a placeholder that you MUST replace with your actual backend URL for Vercel/Fly deployment
        if (host !== 'localhost' && host !== '127.0.0.1') {
            // REPLACE THIS with your actual production signaling server URL
            // e.g., 'wss://palace-rulers-signaling.fly.dev'
            return process.env.NEXT_PUBLIC_SIGNALING_URL || 'wss://palace-rulers-signaling.fly.dev'; 
        }
        return `${protocol}//${host}:8080`;
    }
    return 'ws://localhost:8080';
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
    // Add TURN servers here for production reliability (e.g. Coturn or Twilio)
  ]
};

export class P2PService {
  private socket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  // State
  public myPeerId: string | null = null;
  private roomId: string | null = null;
  private isHost: boolean = false;
  
  // Callbacks
  private onMessageCallback: ((msg: NetworkMessage, senderId: string) => void) | null = null;
  private onConnectionCallback: ((peerId: string, meta: any) => void) | null = null;
  private onDisconnectCallback: ((peerId: string) => void) | null = null;

  constructor() {}

  /**
   * Initialize Host: Creates room on signaling server and waits for joiner.
   */
  public async initHost(): Promise<string> {
    this.isHost = true;
    const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.roomId = shortCode;
    this.myPeerId = `HOST-${Math.floor(Math.random() * 10000)}`;

    await this.connectToSignalingServer();
    this.sendSignal('JOIN_ROOM', { roomId: this.roomId, playerId: this.myPeerId });

    return shortCode;
  }

  /**
   * Initialize Client: Connects to signaling server and joins room.
   */
  public async initClient(code: string, metadata: any): Promise<void> {
    this.isHost = false;
    this.roomId = code.toUpperCase();
    this.myPeerId = `CLIENT-${Math.floor(Math.random() * 10000)}`;

    await this.connectToSignalingServer();
    this.sendSignal('JOIN_ROOM', { roomId: this.roomId, playerId: this.myPeerId });
  }

  // --- Signaling (WebSocket) ---

  private connectToSignalingServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
          const url = getSignalingUrl();
          console.log("Connecting to Signaling Server:", url);
          this.socket = new WebSocket(url); 
      } catch(e) {
          console.error("Invalid WS URL");
          reject(e);
          return;
      }

      this.socket.onopen = () => {
        console.log("Connected to Signaling Server");
        resolve();
      };

      this.socket.onerror = (err) => {
        console.warn("Signaling Server Error. Ensure the server is running.", err);
        reject(err);
      };

      this.socket.onclose = () => {
          console.log("Signaling Server Disconnected");
      };

      this.socket.onmessage = async (event) => {
        try {
          const msg: SignalingMessage = JSON.parse(event.data);
          await this.handleSignalingMessage(msg);
        } catch (e) {
          console.error("Signal parse error", e);
        }
      };
    });
  }

  private sendSignal(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  private async handleSignalingMessage(msg: SignalingMessage) {
    switch (msg.type) {
      case 'PLAYER_JOINED':
        console.log("Player joined lobby:", msg.payload.playerId);
        break;

      case 'READY_TO_SIGNAL':
        // Both players are in. Host initiates the Offer.
        if (this.isHost) {
          this.setupPeerConnection();
          this.createDataChannel(); // Host creates channel
          const offer = await this.peerConnection!.createOffer();
          await this.peerConnection!.setLocalDescription(offer);
          this.sendSignal('SIGNAL', { type: 'OFFER', data: offer });
        }
        break;

      case 'SIGNAL':
        const signal: WebRTCSignal = msg.payload;
        if (!this.peerConnection) this.setupPeerConnection();

        if (signal.type === 'OFFER') {
          // Client receives Offer
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await this.peerConnection!.createAnswer();
          await this.peerConnection!.setLocalDescription(answer);
          this.sendSignal('SIGNAL', { type: 'ANSWER', data: answer });
        } 
        else if (signal.type === 'ANSWER') {
          // Host receives Answer
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal.data));
        } 
        else if (signal.type === 'ICE_CANDIDATE') {
          // Add candidate
          if (signal.data) {
            await this.peerConnection!.addIceCandidate(new RTCIceCandidate(signal.data));
          }
        }
        break;
        
      case 'PLAYER_LEFT':
        this.cleanup();
        if (this.onDisconnectCallback) this.onDisconnectCallback(msg.payload.playerId);
        break;
        
      case 'ERROR':
        console.error("Signaling Error:", msg.payload);
        if (this.onDisconnectCallback) this.onDisconnectCallback("Server Error");
        break;
    }
  }

  // --- WebRTC Core ---

  private setupPeerConnection() {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // ICE Candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('SIGNAL', { type: 'ICE_CANDIDATE', data: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log("P2P Connection State:", this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
         if (this.onDisconnectCallback) this.onDisconnectCallback("Peer");
      }
    };

    // Client: Wait for Data Channel
    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  private createDataChannel() {
    if (!this.peerConnection) return;
    // Host creates the channel
    const channel = this.peerConnection.createDataChannel("game-data", {
      ordered: true, // TCP-like ordering is crucial for game state
      maxRetransmits: 5 // Retry a few times then fail (semi-reliable)
    });
    this.setupDataChannel(channel);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    
    this.dataChannel.onopen = () => {
      console.log("Data Channel OPEN");
      // Notify UI
      if (this.onConnectionCallback) {
        this.onConnectionCallback(this.isHost ? "CLIENT" : "HOST", {});
      }
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const msg: NetworkMessage = JSON.parse(event.data);
        if (msg.type === 'PING') return; // Heartbeat
        
        if (this.onMessageCallback) {
          // If we are Host, we treat sender as the other player.
          // If Client, sender is Host.
          const sender = this.isHost ? "CLIENT" : "HOST";
          this.onMessageCallback(msg, sender);
        }
      } catch (e) {
        console.error("Data Channel JSON parse error", e);
      }
    };
    
    this.dataChannel.onclose = () => {
        console.log("Data Channel CLOSED");
        if (this.onDisconnectCallback) this.onDisconnectCallback("Peer Closed");
    };
  }

  // --- Public API ---

  public broadcast(msg: NetworkMessage) {
    this.send(msg);
  }

  public sendToHost(msg: NetworkMessage) {
    this.send(msg);
  }

  private send(msg: NetworkMessage) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      msg.senderId = this.myPeerId || 'UNKNOWN';
      msg.timestamp = Date.now();
      this.dataChannel.send(JSON.stringify(msg));
    } else {
      console.warn("Attempted to send over closed DataChannel");
    }
  }

  public kickPeer(peerId: string) {
      this.send({ type: 'KICKED', payload: {} });
      setTimeout(() => this.cleanup(), 500);
  }

  public onMessage(cb: (msg: NetworkMessage, connId: string) => void) {
    this.onMessageCallback = cb;
  }

  public onPlayerConnected(cb: (connId: string, metadata: any) => void) {
    this.onConnectionCallback = cb;
  }
  
  public onPlayerDisconnected(cb: (connId: string) => void) {
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
  }
}

export const p2pService = new P2PService();