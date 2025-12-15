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

  public myPeerId: string | null = null;

  constructor() {}

  // Initialize as Host
  public async initHost(): Promise<string> {
    const Peer = window.Peer;
    if (!Peer) throw new Error("PeerJS not loaded. Please refresh.");
    
    // Generate a short 4-char code for usability
    const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return new Promise((resolve, reject) => {
      // We use the short code as the Peer ID. 
      // Note: In a real prod app, you'd handle ID collisions.
      this.peer = new Peer(`PALACE-${shortCode}`, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
      });

      this.peer.on('open', (id: string) => {
        this.myPeerId = id;
        console.log('Host initialized:', id);
        resolve(shortCode);
      });

      this.peer.on('connection', (conn: any) => {
        this.handleNewConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        console.error('Peer error:', err);
        reject(err);
      });
    });
  }

  // Initialize as Client and Connect to Host
  public async initClient(hostCode: string, playerData: any): Promise<void> {
    const Peer = window.Peer;
    if (!Peer) throw new Error("PeerJS not loaded. Please refresh.");

    return new Promise((resolve, reject) => {
      this.peer = new Peer(undefined, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
      }); 

      this.peer.on('open', (id: string) => {
        this.myPeerId = id;
        // Connect to host
        const conn = this.peer!.connect(`PALACE-${hostCode.toUpperCase()}`, {
          metadata: playerData
        });

        conn.on('open', () => {
          this.connections.set('HOST', conn);
          conn.on('data', (data: any) => {
            if (this.onMessageCallback) {
              this.onMessageCallback(data as NetworkMessage, 'HOST');
            }
          });
          resolve();
        });

        conn.on('error', (err: any) => reject(err));
      });
      
      this.peer.on('error', (err: any) => reject(err));
    });
  }

  private handleNewConnection(conn: any) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      
      if (this.onConnectionCallback) {
        this.onConnectionCallback(conn.peer, conn.metadata);
      }

      conn.on('data', (data: any) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(data as NetworkMessage, conn.peer);
        }
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        // Handle disconnection logic here if needed
      });
    });
  }

  public broadcast(msg: NetworkMessage) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  public sendToHost(msg: NetworkMessage) {
    const hostConn = this.connections.get('HOST');
    if (hostConn && hostConn.open) {
      hostConn.send(msg);
    }
  }

  public onMessage(cb: (msg: NetworkMessage, connId: string) => void) {
    this.onMessageCallback = cb;
  }

  public onPlayerConnected(cb: (connId: string, metadata: any) => void) {
    this.onConnectionCallback = cb;
  }

  public destroy() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
  }
}

export const p2pService = new P2PService();