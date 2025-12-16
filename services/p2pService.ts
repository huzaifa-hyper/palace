import { NetworkMessage, SignalingMessage, WebRTCSignal } from '../types';

const getSignalingUrl = () => {
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        
        // If production (not localhost)
        if (host !== 'localhost' && host !== '127.0.0.1') {
            return process.env.NEXT_PUBLIC_SIGNALING_URL || 'wss://palace-rulers-signaling.fly.dev'; 
        }
        // Localhost fallback
        return `${protocol}//${host}:8080`;
    }
    return 'ws://localhost:8080';
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

interface PeerConnection {
    pc: RTCPeerConnection;
    dc: RTCDataChannel | null;
}

export class P2PService {
  private socket: WebSocket | null = null;
  
  // Multi-peer management: Map<PeerId, ConnectionObj>
  private peers: Map<string, PeerConnection> = new Map();
  
  // State
  public myPeerId: string | null = null;
  private roomId: string | null = null;
  private isHost: boolean = false;
  
  // Callbacks
  private onMessageCallback: ((msg: NetworkMessage, senderId: string) => void) | null = null;
  private onConnectionCallback: ((peerId: string, meta: any) => void) | null = null;
  private onDisconnectCallback: ((peerId: string) => void) | null = null;

  constructor() {}

  public async initHost(): Promise<string> {
    this.isHost = true;
    this.peers.clear();
    const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.roomId = shortCode;
    this.myPeerId = `HOST-${Math.floor(Math.random() * 10000)}`;

    await this.connectToSignalingServer();
    this.sendSignal('JOIN_ROOM', { roomId: this.roomId, playerId: this.myPeerId });

    return shortCode;
  }

  public async initClient(code: string, metadata: any): Promise<void> {
    this.isHost = false;
    this.peers.clear();
    this.roomId = code.toUpperCase();
    this.myPeerId = `CLIENT-${Math.floor(Math.random() * 10000)}`;

    await this.connectToSignalingServer();
    this.sendSignal('JOIN_ROOM', { roomId: this.roomId, playerId: this.myPeerId });
  }

  // --- Signaling ---

  private connectToSignalingServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
          const url = getSignalingUrl();
          console.log("Connecting to Signaling Server:", url);
          this.socket = new WebSocket(url); 
      } catch(e) {
          reject(e);
          return;
      }

      this.socket.onopen = () => resolve();
      this.socket.onerror = (err) => reject(err);
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
        // Only Host needs to react to new players joining to initiate connection
        if (this.isHost) {
            console.log("Host detected new player:", msg.payload.playerId);
            this.createConnection(msg.payload.playerId, true); // Initiate
        }
        break;

      case 'SIGNAL':
        const { type, data, targetPeerId, senderPeerId } = msg.payload;
        
        // Filter signals meant for others
        if (targetPeerId !== this.myPeerId) return;

        let conn = this.peers.get(senderPeerId);
        
        if (!conn) {
             // If we receive an OFFER and we don't have a connection, create one (Responder)
             if (type === 'OFFER') {
                 conn = this.createConnection(senderPeerId, false);
             } else {
                 console.warn("Received non-offer signal for unknown peer", senderPeerId);
                 return;
             }
        }

        const { pc } = conn;

        if (type === 'OFFER') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignal('SIGNAL', { 
              type: 'ANSWER', 
              data: answer, 
              targetPeerId: senderPeerId, 
              senderPeerId: this.myPeerId 
          });
        } 
        else if (type === 'ANSWER') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } 
        else if (type === 'ICE_CANDIDATE') {
          if (data) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data));
            } catch (e) {
                console.warn("Failed to add ICE candidate", e);
            }
          }
        }
        break;
        
      case 'PLAYER_LEFT':
        const pid = msg.payload.playerId;
        this.closePeer(pid);
        if (this.onDisconnectCallback) this.onDisconnectCallback(pid);
        break;
        
      case 'ERROR':
        if (this.onDisconnectCallback) this.onDisconnectCallback("Server Error: " + msg.payload);
        break;
    }
  }

  // --- WebRTC Management ---

  private createConnection(remotePeerId: string, initiator: boolean): PeerConnection {
      if (this.peers.has(remotePeerId)) return this.peers.get(remotePeerId)!;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      const conn: PeerConnection = { pc, dc: null };
      
      this.peers.set(remotePeerId, conn);

      // ICE Handler
      pc.onicecandidate = (event) => {
          if (event.candidate) {
              this.sendSignal('SIGNAL', {
                  type: 'ICE_CANDIDATE',
                  data: event.candidate,
                  targetPeerId: remotePeerId,
                  senderPeerId: this.myPeerId
              });
          }
      };

      pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              this.closePeer(remotePeerId);
              if (this.onDisconnectCallback) this.onDisconnectCallback(remotePeerId);
          }
      };

      if (initiator) {
          // Host creates Data Channel
          const dc = pc.createDataChannel("game-data", { ordered: true });
          conn.dc = dc;
          this.setupDataChannel(dc, remotePeerId);
          
          // Create Offer
          pc.createOffer().then(offer => {
              return pc.setLocalDescription(offer);
          }).then(() => {
              this.sendSignal('SIGNAL', {
                  type: 'OFFER',
                  data: pc.localDescription,
                  targetPeerId: remotePeerId,
                  senderPeerId: this.myPeerId
              });
          });
      } else {
          // Client waits for Data Channel
          pc.ondatachannel = (event) => {
              conn.dc = event.channel;
              this.setupDataChannel(event.channel, remotePeerId);
          };
      }

      return conn;
  }

  private setupDataChannel(dc: RTCDataChannel, remotePeerId: string) {
      dc.onopen = () => {
          console.log(`Data Channel OPEN with ${remotePeerId}`);
          if (this.onConnectionCallback) {
              this.onConnectionCallback(remotePeerId, {});
          }
      };
      
      dc.onmessage = (event) => {
          try {
              const msg: NetworkMessage = JSON.parse(event.data);
              if (msg.type === 'PING') return;
              if (this.onMessageCallback) {
                  this.onMessageCallback(msg, remotePeerId);
              }
          } catch(e) {
              console.error("Parse Error", e);
          }
      };

      dc.onclose = () => {
          console.log(`Data Channel CLOSED with ${remotePeerId}`);
          this.closePeer(remotePeerId);
          if (this.onDisconnectCallback) this.onDisconnectCallback(remotePeerId);
      };
  }

  private closePeer(peerId: string) {
      const conn = this.peers.get(peerId);
      if (conn) {
          if (conn.dc) conn.dc.close();
          conn.pc.close();
          this.peers.delete(peerId);
      }
  }

  // --- Public API ---

  public broadcast(msg: NetworkMessage) {
      // Send to all connected peers
      this.peers.forEach((conn, pid) => {
          this.sendToPeer(conn, msg, pid);
      });
  }

  public sendToHost(msg: NetworkMessage) {
      // As client, we usually only have one peer (the Host)
      // But we iterate just in case
      this.peers.forEach((conn, pid) => {
          this.sendToPeer(conn, msg, pid);
      });
  }

  private sendToPeer(conn: PeerConnection, msg: NetworkMessage, peerId: string) {
      if (conn.dc && conn.dc.readyState === 'open') {
          msg.senderId = this.myPeerId || 'UNKNOWN';
          msg.timestamp = Date.now();
          conn.dc.send(JSON.stringify(msg));
      }
  }

  public kickPeer(peerId: string) {
      const conn = this.peers.get(peerId);
      if (conn) {
          this.sendToPeer(conn, { type: 'KICKED', payload: {} }, peerId);
          setTimeout(() => this.closePeer(peerId), 500);
      }
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
    this.peers.forEach(conn => {
        if(conn.dc) conn.dc.close();
        conn.pc.close();
    });
    this.peers.clear();
    if (this.socket) this.socket.close();
    this.socket = null;
  }
}

export const p2pService = new P2PService();