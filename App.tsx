import React, { useState, useEffect } from 'react';
import { Layers, Zap, Trophy, HelpCircle, BookOpen, Play, Crown, Users, Smartphone, Globe, Copy, Check, Search, Wifi, Wallet, AlertTriangle, ExternalLink, ArrowRight, X, Flame, ArrowDown, FileText, Ban, User, Bot } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { PlayingCard } from './components/PlayingCard';
import { Arbiter } from './components/Arbiter';
import { Game } from './components/Game';
import { RulesSheet } from './components/RulesSheet';
import { Suit, Rank, UserProfile, GameMode, WalletState } from './types';
import { web3Service } from './services/web3Service';
import { p2pService } from './services/p2pService';
import { GAME_RULES_TEXT } from './constants';

// --- Dynamic Signaling URL Logic ---
const getSignalingUrl = () => {
  // 1. Env Var (Best for custom deployments)
  if (process.env.NEXT_PUBLIC_SIGNALING_URL) {
      return process.env.NEXT_PUBLIC_SIGNALING_URL;
  }

  // 2. Local Development (Explicit Check)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8080';
  }

  // 3. Production Fallback - RAILWAY (Socket.IO uses HTTPS)
  return 'https://palace-production.up.railway.app';
};

const SIGNALING_URL = getSignalingUrl();

export default function App() {
  const [activeTab, setActiveTab] = useState<'lobby' | 'rules' | 'arbiter'>('lobby');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gameConfig, setGameConfig] = useState<{ mode: GameMode; playerCount: number } | null>(null);
  const [tempName, setTempName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(true);
  
  // P2P State
  const [lobbyId, setLobbyId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // --- Wallet State ---
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balanceEth: null,
    balanceUsdValue: null,
    isEligible: false,
    chainId: null
  });

  // --- Initialize Farcaster SDK ---
  useEffect(() => {
    const initSdk = async () => {
      try {
        await sdk.actions.ready();
      } catch (err) {
        console.warn("Failed to call sdk.actions.ready():", err);
      }
    };
    initSdk();
  }, []);

  // --- Profile Logic ---
  useEffect(() => {
    const savedProfile = localStorage.getItem('palace_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setIsProfileModalOpen(false);
    }
  }, []);

  // --- Wallet Event Listeners ---
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) handleConnectWallet();
        else setWallet({ isConnected: false, address: null, balanceEth: null, balanceUsdValue: null, isEligible: false, chainId: null });
      };
      const handleChainChanged = () => handleConnectWallet();
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // --- Deterministic Room ID Detection ---
  useEffect(() => {
      const initContext = async () => {
          try {
              const context = await sdk.context;
              if (context?.location?.cast?.hash) {
                  // Use Cast Hash as Room ID
                  setLobbyId(context.location.cast.hash.substring(0, 6).toUpperCase());
              } else {
                  // Browser Fallback: Check URL Params
                  const params = new URLSearchParams(window.location.search);
                  const rid = params.get('room');
                  if (rid) setLobbyId(rid.toUpperCase());
              }
          } catch(e) {
              console.log("Not in Farcaster context");
          }
      };
      initContext();
  }, []);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    const newProfile: UserProfile = {
      id: `ROYAL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: tempName.trim(),
      avatarId: Math.floor(Math.random() * 5)
    };
    setUserProfile(newProfile);
    localStorage.setItem('palace_profile', JSON.stringify(newProfile));
    setIsProfileModalOpen(false);
    setActiveTab('lobby');
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    const result = await web3Service.connectWallet();
    if (result.success && result.address) {
      setWallet({
        isConnected: true,
        address: result.address,
        balanceEth: result.balance || '0',
        balanceUsdValue: result.balanceUsd || 0,
        isEligible: result.isEligible || false,
        chainId: 1946
      });
    } else {
      setWalletError(result.message || "Failed to connect wallet.");
      setWallet(prev => ({ ...prev, isConnected: false }));
    }
  };

  const checkMultiplayerEligibility = () => {
    if (!wallet.isConnected) {
      setWalletError("Please connect your Soneium Minato wallet to play multiplayer.");
      return false;
    }
    if (!wallet.isEligible || (wallet.balanceUsdValue || 0) < 0.25) {
      setWalletError(`Insufficient Funds. You need at least $0.25 USD worth of Soneium ETH to play.`);
      return false;
    }
    return true;
  };

  // --- Unified Multiplayer Flow ---
  
  const connectToLobby = async (code: string, action: 'create' | 'join') => {
    p2pService.destroy();
    setConnectionStatus('CONNECTING_SIGNALING');
    setStatusMessage('Connecting to Server...');

    // Setup Listeners
    p2pService.onConnectionStatus((status) => {
        setConnectionStatus(status);
        if (status === 'WAITING_FOR_OPPONENT') {
            setStatusMessage('Waiting for Opponent...');
            setIsHost(true);
        } else if (status === 'ESTABLISHING_P2P') {
            setStatusMessage('Opening P2P Tunnel (WebRTC)...');
        } else if (status === 'CONNECTED') {
            // Success!
            setGameConfig({ mode: p2pService.isHost ? 'ONLINE_HOST' : 'ONLINE_CLIENT', playerCount: 2 });
            setConnectionStatus('GAME_ACTIVE');
            setConnectedPeers([{ id: 'OPPONENT', name: 'Opponent' }]);
        }
    });

    p2pService.onPlayerDisconnected((reason) => {
        setConnectionStatus(null);
        setGameConfig(null);
        setWalletError(`Connection Lost: ${reason}`);
    });
    
    p2pService.onMessage((msg) => {
        // Game Logic Handlers injected later by Game component
    });

    try {
        console.log("Connecting to:", SIGNALING_URL);
        await p2pService.connect(SIGNALING_URL, action, code, userProfile?.name || 'Unknown');
    } catch (e) {
        setWalletError("Failed to initiate connection. Is the signaling server running?");
        setConnectionStatus(null);
    }
  };

  const handleHostGame = async () => {
    setWalletError(null);
    if (!checkMultiplayerEligibility()) return;
    
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setLobbyId(newCode);
    await connectToLobby(newCode, 'create');
  };

  const handleJoinGame = async () => {
    setWalletError(null);
    if (!checkMultiplayerEligibility()) return;
    if (!lobbyId) return;
    
    await connectToLobby(lobbyId, 'join');
  };

  const handleCancelConnection = () => {
      p2pService.destroy();
      setConnectionStatus(null);
      setGameConfig(null);
  };

  const exitGame = () => {
    p2pService.destroy();
    setGameConfig(null);
    setConnectionStatus(null);
    setActiveTab('lobby');
  };

  // --- Renderers ---

  if (gameConfig && userProfile && connectionStatus === 'GAME_ACTIVE') {
    return (
      <Game 
        mode={gameConfig.mode} 
        playerCount={gameConfig.playerCount} 
        userProfile={userProfile}
        connectedPeers={connectedPeers}
        myPeerId={p2pService.myPeerId || undefined}
        onExit={exitGame}
      />
    );
  }

  // Connection Overlay
  if (connectionStatus && connectionStatus !== 'GAME_ACTIVE') {
      return (
          <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-[100] bg-felt">
              <div className="max-w-md w-full text-center">
                  <div className="mb-8 relative">
                      <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse"></div>
                      <Globe className="w-16 h-16 text-amber-500 mx-auto relative z-10 animate-[spin_3s_linear_infinite]" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">{statusMessage}</h2>
                  <p className="text-slate-400 text-sm mb-6 font-mono">Lobby ID: {lobbyId}</p>
                  
                  {connectionStatus === 'WAITING_FOR_OPPONENT' && (
                      <div className="bg-slate-900 p-4 rounded-xl border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-2">
                          <p className="text-xs text-slate-500 mb-2">Share this Lobby ID with your opponent</p>
                          <div className="text-3xl font-mono font-bold text-white tracking-widest select-all">{lobbyId}</div>
                      </div>
                  )}

                  <div className="flex justify-center gap-2 mb-6">
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTING_SIGNALING' ? 'bg-blue-500 animate-bounce' : 'bg-slate-700'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'WAITING_FOR_OPPONENT' ? 'bg-amber-500 animate-bounce' : 'bg-slate-700'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'ESTABLISHING_P2P' ? 'bg-green-500 animate-bounce' : 'bg-slate-700'}`}></div>
                  </div>

                  <button 
                     onClick={handleCancelConnection}
                     className="px-6 py-3 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                      Cancel Connection
                  </button>
              </div>
          </div>
      );
  }

  // Profile Modal
  if (isProfileModalOpen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-[100] bg-felt">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600 to-amber-300"></div>
           <Crown className="w-16 h-16 mx-auto text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
           <h1 className="text-3xl font-playfair font-bold text-amber-100 mb-2">Identify Yourself</h1>
           <p className="text-slate-400 mb-8 font-light">Enter your name to enter the Palace records.</p>
           
           <form onSubmit={handleCreateProfile} className="space-y-6">
             <input 
               type="text" 
               value={tempName}
               onChange={(e) => setTempName(e.target.value)}
               placeholder="Your Name"
               className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-lg text-amber-100 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none placeholder-slate-600 transition-all"
               maxLength={12}
             />
             <button 
               type="submit" 
               disabled={!tempName.trim()}
               className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
             >
               Claim Throne
             </button>
           </form>
        </div>
      </div>
    );
  }

  const renderLobby = () => {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
         {/* Wallet Status Bar */}
         <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/30">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                   <h3 className="font-bold text-slate-200 text-sm">Soneium Minato Access</h3>
                   <div className="text-xs text-slate-400">Required for Online Multiplayer</div>
                </div>
             </div>
             
             {wallet.isConnected ? (
                <div className="flex items-center gap-4 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-600">
                    <div className="text-right">
                       <div className="text-xs font-bold text-slate-400">
                         {wallet.address?.slice(0,6)}...{wallet.address?.slice(-4)}
                       </div>
                       <div className={`text-sm font-mono font-bold ${wallet.isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
                          {parseFloat(wallet.balanceEth || '0').toFixed(4)} ETH (${wallet.balanceUsdValue?.toFixed(2)})
                       </div>
                    </div>
                    {wallet.isEligible ? (
                       <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                       <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                </div>
             ) : (
                <button 
                  onClick={handleConnectWallet}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg"
                >
                   Connect Wallet
                </button>
             )}
         </div>

         {/* Wallet Error Toast */}
         {walletError && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
               <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
               <div className="flex-1">
                 <div className="text-sm text-red-200">
                    <span className="font-bold block">Connection Alert</span>
                    {walletError}
                 </div>
                 {walletError.includes("Metamask not installed") && (
                   <a 
                     href="https://metamask.io/download/" 
                     target="_blank" 
                     rel="noreferrer"
                     className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-red-400 hover:text-white hover:underline"
                   >
                     Install MetaMask <ExternalLink className="w-3 h-3" />
                   </a>
                 )}
               </div>
               <button onClick={() => setWalletError(null)} className="ml-auto text-red-400 hover:text-white"><Check className="w-4 h-4"/></button>
            </div>
         )}

         {/* Profile Card */}
         <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                 {userProfile?.name.charAt(0).toUpperCase()}
               </div>
               <div>
                 <h2 className="text-2xl font-playfair font-bold text-amber-100">{userProfile?.name}</h2>
                 <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-white/10 mt-1">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Royal ID:</span>
                    <span className="text-xs text-amber-500 font-mono font-bold tracking-wider">{userProfile?.id}</span>
                    <button className="text-slate-500 hover:text-white" onClick={() => navigator.clipboard.writeText(userProfile?.id || '')}>
                       <Copy className="w-3 h-3" />
                    </button>
                 </div>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           
           {/* HOST GAME */}
           <div className="bg-gradient-to-br from-amber-600/20 to-amber-900/20 p-6 rounded-3xl border border-amber-500/30 hover:border-amber-500 transition-all group relative overflow-hidden">
               <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg border border-amber-500/20">
                        <Crown className="w-6 h-6 fill-current" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-white">Host Game</h3>
                        <p className="text-slate-300 text-xs">Create a new lobby.</p>
                     </div>
                  </div>
                  
                  <button 
                     onClick={handleHostGame}
                     disabled={!wallet.isEligible}
                     className="w-full bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-200 py-3 rounded-xl font-bold transition-all border border-amber-500/20 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                     Create Lobby <ArrowRight className="w-4 h-4" />
                  </button>
                  
                   {!wallet.isEligible && (
                     <div className="mt-3 text-xs text-red-400 bg-red-900/20 p-2 rounded-lg border border-red-500/20 flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> Eligible wallet required
                     </div>
                  )}
               </div>
           </div>

           {/* JOIN GAME */}
           <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
              <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg border border-blue-500/20">
                        <Wifi className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-white">Join Game</h3>
                        <p className="text-slate-300 text-xs">Enter a lobby code.</p>
                     </div>
                  </div>

                  <div className="flex gap-2">
                     <input 
                        type="text" 
                        value={lobbyId}
                        onChange={(e) => setLobbyId(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="CODE"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono font-bold tracking-widest w-full text-center focus:outline-none focus:border-blue-500"
                     />
                     <button 
                        onClick={handleJoinGame}
                        disabled={!wallet.isEligible || lobbyId.length < 3}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        Join
                     </button>
                  </div>
              </div>
           </div>

           {/* OFFLINE MODES */}
           <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5 hover:border-slate-500/50 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center mb-3 text-slate-300">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Practice vs Bots</h3>
              <p className="text-xs text-slate-400 mb-4">Solo training.</p>
              <div className="flex gap-2">
                 {[2, 3, 4].map(num => (
                   <button 
                     key={num}
                     onClick={() => setGameConfig({ mode: 'VS_BOT', playerCount: num })}
                     className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-xs font-bold transition-colors"
                   >
                     {num} P
                   </button>
                 ))}
              </div>
           </div>

           <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5 hover:border-slate-500/50 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center mb-3 text-slate-300">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Pass & Play</h3>
              <p className="text-xs text-slate-400 mb-4">Local multiplayer.</p>
              <div className="flex gap-2">
                 {[2, 3, 4].map(num => (
                   <button 
                     key={num}
                     onClick={() => setGameConfig({ mode: 'PASS_AND_PLAY', playerCount: num })}
                     className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-xs font-bold transition-colors"
                   >
                     {num} P
                   </button>
                 ))}
              </div>
           </div>

         </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'lobby': return renderLobby();
      case 'rules': return <RulesSheet />;
      case 'arbiter': return <Arbiter />;
      default: return renderLobby();
    }
  };

  return (
    <div className="min-h-screen bg-felt text-slate-200 safe-area-bottom flex flex-col">
       <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
         {renderContent()}
       </div>

       {/* Bottom Navigation */}
       <div className="sticky bottom-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 z-50">
          <div className="max-w-md mx-auto flex justify-between items-center bg-slate-900 rounded-full p-1 border border-white/10 shadow-2xl">
             <button 
               onClick={() => setActiveTab('lobby')}
               className={`flex-1 flex flex-col items-center py-2 px-4 rounded-full transition-all ${activeTab === 'lobby' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Lobby</span>
             </button>
             <button 
               onClick={() => setActiveTab('rules')}
               className={`flex-1 flex flex-col items-center py-2 px-4 rounded-full transition-all ${activeTab === 'rules' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <BookOpen className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Rules</span>
             </button>
             <button 
               onClick={() => setActiveTab('arbiter')}
               className={`flex-1 flex flex-col items-center py-2 px-4 rounded-full transition-all ${activeTab === 'arbiter' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <Bot className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Arbiter</span>
             </button>
          </div>
       </div>
    </div>
  );
}