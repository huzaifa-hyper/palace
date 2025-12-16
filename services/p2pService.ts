import { NetworkMessage } from '../types';

// Access Peer from global window object injected by UMD script
declare global {
    interface Window {
      Peer: any;
    }
}

export class P2PService {
  private peer: any | null = null;
  private connections: Map<string, any> = new Map();
  private onMessageCallback: ((msg: NetworkMessage, connId: string) => void) | null = null;
  private onConnectionCallback: ((connId: string, metadata: any) => void) | null = null;
  private onDisconnectionCallback: ((connId: string) => void) | null = null;

  public myPeerId: string | null = null;
  private heartbeatInterval: any = null;

  constructor() {}

  // Initialize as Host
  public async initHost(): Promise<string> {
    const Peer = window.Peer;
    if (!Peer) throw new Error("PeerJS not loaded. Please refresh.");
    
    // Generate a short 4-char code for usability
    const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const peerId = `PALACE-${shortCode}`;
    
    return new Promise((resolve, reject) => {
      // 15s timeout to prevent hanging
      const timeout = setTimeout(() => {
          if (this.peer) {
            this.peer.destroy();
            this.peer = null;
          }
          reject(new Error("Connection to multiplayer server timed out. Check your internet connection."));
      }, 15000);

      try {
        this.peer = new Peer(peerId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            },
            debug: 1,
            pingInterval: 5000,
        });
      } catch (e) {
          clearTimeout(timeout);
          reject(e);
          return;
      }

      this.peer.on('open', (id: string) => {
        clearTimeout(timeout);
        this.myPeerId = id;
        console.log('Host initialized:', id);
        this.startHeartbeat();
        resolve(shortCode);
      });

      this.peer.on('connection', (conn: any) => {
        this.handleNewConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        console.error('Peer error:', err);
        if (!this.myPeerId) {
            clearTimeout(timeout);
            reject(err);
        }
      });

      this.peer.on('disconnected', () => {
          console.warn('Peer disconnected from signaling server. Attempting reconnect...');
          this.peer.reconnect();
      });
    });
  }

  // Initialize as Client and Connect to Host
  public async initClient(hostCode: string, playerData: any): Promise<void> {
    const Peer = window.Peer;
    if (!Peer) throw new Error("PeerJS not loaded. Please refresh.");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
          if (this.peer) {
              this.peer.destroy();
              this.peer = null;
          }
          reject(new Error("Connection to multiplayer server timed out."));
      }, 15000);

      try {
        this.peer = new Peer(undefined, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            },
            debug: 1
        }); 
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
        return;
      }

      this.peer.on('open', (id: string) => {
        this.myPeerId = id;
        const hostId = `PALACE-${hostCode.toUpperCase()}`;
        
        // Connect to host
        const conn = this.peer!.connect(hostId, {
          metadata: playerData,
          reliable: true,
          serialization: 'json'
        });

        conn.on('open', () => {
          clearTimeout(timeout);
          this.connections.set('HOST', conn);
          
          conn.on('data', (data: any) => {
            if (data && data.type === 'PING') return; // Ignore heartbeat

            if (this.onMessageCallback) {
              this.onMessageCallback(data as NetworkMessage, 'HOST');
            }
          });
          resolve();
        });

        conn.on('error', (err: any) => {
            console.error("Connection error:", err);
            clearTimeout(timeout);
            reject(err);
        });
        
        conn.on('close', () => {
             // Handle host disconnect
             if (this.onDisconnectionCallback) {
                 this.onDisconnectionCallback('HOST');
             }
        });
      });
      
      this.peer.on('error', (err: any) => {
          console.error("Peer error:", err);
          clearTimeout(timeout);
          reject(err);
      });
    });
  }

  private handleNewConnection(conn: any) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      
      if (this.onConnectionCallback) {
        this.onConnectionCallback(conn.peer, conn.metadata);
      }

      conn.on('data', (data: any) => {
        if (data && data.type === 'PING') return;

        if (this.onMessageCallback) {
          this.onMessageCallback(data as NetworkMessage, conn.peer);
        }
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        if (this.onDisconnectionCallback) {
            this.onDisconnectionCallback(conn.peer);
        }
      });
      
      // Handle connection errors (often treated as close)
      conn.on('error', (err: any) => {
          console.error(`Connection error with ${conn.peer}:`, err);
          this.connections.delete(conn.peer);
          if (this.onDisconnectionCallback) {
              this.onDisconnectionCallback(conn.peer);
          }
      });
    });
  }

  private startHeartbeat() {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      // Send a ping every 5 seconds to keep connection alive through NAT
      this.heartbeatInterval = setInterval(() => {
          this.broadcast({ type: 'PING', payload: {} });
      }, 5000);
  }

  public broadcast(msg: NetworkMessage) {
    this.connections.forEach(conn => {
      if (conn.open) {
          try {
             conn.send(msg);
          } catch (e) {
             console.warn("Failed to send message to peer:", conn.peer);
          }
      }
    });
  }

  public sendToHost(msg: NetworkMessage) {
    const hostConn = this.connections.get('HOST');
    if (hostConn && hostConn.open) {
      try {
        hostConn.send(msg);
      } catch (e) {
         console.warn("Failed to send message to Host");
      }
    }
  }
  
  public kickPeer(peerId: string) {
      const conn = this.connections.get(peerId);
      if (conn) {
          if (conn.open) {
              // Send message first
              try {
                conn.send({ type: 'KICKED', payload: {} });
              } catch (e) {}
              
              // Small delay to ensure message sends before close
              setTimeout(() => {
                  try {
                    conn.close();
                  } catch(e) {}
                  this.connections.delete(peerId);
              }, 100);
          } else {
              this.connections.delete(peerId);
          }
      }
  }

  public onMessage(cb: (msg: NetworkMessage, connId: string) => void) {
    this.onMessageCallback = cb;
  }

  public onPlayerConnected(cb: (connId: string, metadata: any) => void) {
    this.onConnectionCallback = cb;
  }
  
  public onPlayerDisconnected(cb: (connId: string) => void) {
      this.onDisconnectionCallback = cb;
  }

  public destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    this.onMessageCallback = null;
    this.onConnectionCallback = null;
    this.onDisconnectionCallback = null;
    this.myPeerId = null;
  }
}

export const p2pService = new P2PService();