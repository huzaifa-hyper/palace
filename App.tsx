import React, { useState, useEffect } from 'react';
import { Layers, Zap, Trophy, HelpCircle, BookOpen, Play, Crown, Users, Smartphone, Globe, Copy, Check, Search, Wifi, Wallet, AlertTriangle, ExternalLink, ArrowRight, X, Flame, ArrowDown, FileText, Ban, User, Bot } from 'lucide-react';
import { PlayingCard } from './components/PlayingCard';
import { Arbiter } from './components/Arbiter';
import { Game } from './components/Game';
import { RulesSheet } from './components/RulesSheet';
import { Suit, Rank, UserProfile, GameMode, WalletState } from './types';
import { web3Service } from './services/web3Service';
import { p2pService } from './services/p2pService';
import { GAME_RULES_TEXT } from './constants';

export default function App() {
  const [activeTab, setActiveTab] = useState<'lobby' | 'rules' | 'arbiter'>('lobby');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gameConfig, setGameConfig] = useState<{ mode: GameMode; playerCount: number } | null>(null);
  const [tempName, setTempName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(true);
  
  // P2P State
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [hostCode, setHostCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  
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

  // --- Profile Logic ---
  useEffect(() => {
    // Check local storage for profile
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
        if (accounts.length > 0) {
          // Re-connect to update balance and eligibility for new account
          handleConnectWallet();
        } else {
          // Disconnected
          setWallet({
            isConnected: false,
            address: null,
            balanceEth: null,
            balanceUsdValue: null,
            isEligible: false,
            chainId: null
          });
        }
      };

      const handleChainChanged = () => {
        // Page reload is recommended by Metamask on chain change, but we can just re-connect logic
        handleConnectWallet();
      };

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
      // Ensure we clear connected state on failure
      setWallet(prev => ({ ...prev, isConnected: false }));
    }
  };

  const checkMultiplayerEligibility = () => {
    if (!wallet.isConnected) {
      setWalletError("Please connect your Soneium Minato wallet to play multiplayer.");
      return false;
    }
    // Strict Double Check
    if (!wallet.isEligible || (wallet.balanceUsdValue || 0) < 0.25) {
      setWalletError(`Insufficient Funds. You need at least $0.25 USD worth of Soneium ETH to play.`);
      return false;
    }
    return true;
  };

  // --- P2P Logic ---

  const handleHostGame = async (playerCount: number) => {
    setWalletError(null);
    if (!checkMultiplayerEligibility()) return;
    
    // Explicit safety cleanup
    p2pService.destroy();

    setIsMatchmaking(true);
    setIsHost(true);
    setMyPeerId(null);
    
    try {
        const code = await p2pService.initHost();
        setHostCode(code);
        
        // Capture peer ID after init
        if (p2pService.myPeerId) {
            setMyPeerId(p2pService.myPeerId);
            setConnectedPeers([{ id: p2pService.myPeerId, name: userProfile?.name, isMe: true }]); // Add self
        }
        
        setGameConfig({ mode: 'ONLINE_HOST', playerCount }); // Pre-set config but don't start
        
        // Listen for players joining
        p2pService.onPlayerConnected((id, metadata) => {
            setConnectedPeers(prev => {
                // Avoid duplicates
                if (prev.some(p => p.id === id)) return prev;
                // For Host, the incoming ID is the actual Peer ID of the client
                return [...prev, { id, name: "Challenger", isMe: false }];
            });
        });

        // Listen for players leaving/disconnecting
        p2pService.onPlayerDisconnected((id) => {
             setConnectedPeers(prev => prev.filter(p => p.id !== id));
        });

    } catch (err) {
        console.error(err);
        setWalletError("Failed to initialize Host. Ensure local signaling server is running (node server/index.js) and accessible at ws://localhost:8080.");
        setIsMatchmaking(false);
    }
  };

  const handleKickPlayer = (peerId: string) => {
      p2pService.kickPeer(peerId);
      // Optimistic UI update
      setConnectedPeers(prev => prev.filter(p => p.id !== peerId));
  };

  const handleJoinGame = async () => {
    setWalletError(null);
    if (!checkMultiplayerEligibility()) return;
    if (joinCode.length !== 4) return;

    // Explicit safety cleanup
    p2pService.destroy();

    setIsMatchmaking(true);
    setIsHost(false);
    setMyPeerId(null);

    try {
        await p2pService.initClient(joinCode, { name: userProfile?.name });
        
        if (p2pService.myPeerId) {
            setMyPeerId(p2pService.myPeerId);
        }

        // Wait for signals from Host
        p2pService.onMessage((msg) => {
            if (msg.type === 'START_GAME') {
                // Host started game
                setGameConfig({ mode: 'ONLINE_CLIENT', playerCount: msg.payload.playerCount });
                setIsMatchmaking(false);
            } else if (msg.type === 'KICKED') {
                // Handle being kicked
                p2pService.destroy();
                setIsMatchmaking(false);
                setHostCode(null);
                setJoinCode('');
                setWalletError("You were kicked from the lobby by the host.");
            }
        });

        // Handle if host disconnects abruptly
        p2pService.onPlayerDisconnected(() => {
             setIsMatchmaking(false);
             setWalletError("Connection to host lost.");
        });

    } catch (err) {
        console.error(err);
        setWalletError("Could not find game. Check code or server connection.");
        setIsMatchmaking(false);
    }
  };

  const handleStartHostedGame = () => {
      // Broadcast start signal to all connected peers
      p2pService.broadcast({
          type: 'START_GAME',
          payload: { playerCount: connectedPeers.length }
      });
      // Start local
      setGameConfig({ mode: 'ONLINE_HOST', playerCount: connectedPeers.length });
      setIsMatchmaking(false);
  };

  const handleCancelMatchmaking = () => {
      p2pService.destroy();
      setIsMatchmaking(false);
      setHostCode(null);
      setConnectedPeers([]);
      setJoinCode('');
      setMyPeerId(null);
  };

  const exitGame = () => {
    p2pService.destroy();
    setGameConfig(null);
    setHostCode(null);
    setConnectedPeers([]);
    setMyPeerId(null);
    setActiveTab('lobby');
  };

  // --- Renderers ---

  if (gameConfig && userProfile && !isMatchmaking) {
    return (
      <Game 
        mode={gameConfig.mode} 
        playerCount={gameConfig.playerCount} 
        userProfile={userProfile}
        connectedPeers={isHost ? connectedPeers : undefined}
        myPeerId={myPeerId || undefined}
        onExit={exitGame}
      />
    );
  }

  // Lobby/Matchmaking Overlay
  if (isMatchmaking) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 z-[100] bg-felt">
         <button onClick={handleCancelMatchmaking} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
            <X className="w-6 h-6 text-slate-400" />
         </button>

         {isHost ? (
             <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 p-8 rounded-3xl shadow-2xl text-center">
                <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-playfair font-bold text-amber-100 mb-2">Hosting Court</h2>
                <p className="text-slate-400 text-sm mb-6">Share this code with your subjects.</p>
                
                <div className="bg-slate-950 border border-amber-500/50 rounded-xl p-4 mb-8">
                    <div className="text-4xl font-mono font-bold text-amber-400 tracking-widest">{hostCode}</div>
                </div>

                <div className="space-y-3 mb-8 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Players ({connectedPeers.length}/{gameConfig?.playerCount})</h3>
                    </div>
                    {connectedPeers.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-white/5 group">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${p.isMe ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                {p.name?.charAt(0) || '?'}
                            </div>
                            <span className="text-slate-200 font-bold flex-1 truncate">{p.name} {p.isMe && '(You)'}</span>
                            {p.isMe ? (
                                <Crown className="w-4 h-4 text-amber-500" />
                            ) : (
                                <button 
                                    onClick={() => handleKickPlayer(p.id)}
                                    className="p-1.5 rounded-full bg-red-900/20 hover:bg-red-600 text-red-400 hover:text-white transition-colors"
                                    title="Kick Player"
                                >
                                    <Ban className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    {Array.from({ length: Math.max(0, (gameConfig?.playerCount || 4) - connectedPeers.length) }).map((_, i) => (
                         <div key={`wait-${i}`} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-dashed border-slate-700">
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                             </div>
                             <span className="text-slate-500 italic text-sm">Waiting for player...</span>
                         </div>
                    ))}
                </div>

                <button 
                  onClick={handleStartHostedGame}
                  disabled={connectedPeers.length < 2} // Allow starting with min 2
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Game
                </button>
             </div>
         ) : (
             <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 p-8 rounded-3xl shadow-2xl text-center">
                <Wifi className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-playfair font-bold text-blue-100 mb-2">Joining Court</h2>
                <p className="text-slate-400 text-sm mb-6">Waiting for the ruler to start the game...</p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 mb-6">
                    <div className="text-sm text-slate-500 mb-1">Connected to Room</div>
                    <div className="text-2xl font-mono font-bold text-white tracking-widest">{joinCode}</div>
                </div>
                <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    Waiting for host...
                </div>
             </div>
         )}
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
                    <span className="font-bold block">Access Denied</span>
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
           
           {/* HOST GAME - P2P */}
           <div className="bg-gradient-to-br from-amber-600/20 to-amber-900/20 p-6 rounded-3xl border border-amber-500/30 hover:border-amber-500 transition-all group lg:col-span-2 relative overflow-hidden">
               <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg border border-amber-500/20">
                        <Crown className="w-6 h-6 fill-current" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-bold text-white">Host a Game</h3>
                        <p className="text-slate-300 text-sm">Create a private court for your friends.</p>
                     </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-6">
                     {[2, 3].map(num => (
                        <button 
                           key={num}
                           onClick={() => handleHostGame(num)}
                           disabled={!wallet.isEligible}
                           className="flex-1 min-w-[100px] bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-200 py-3 rounded-xl font-bold transition-all border border-amber-500/20 shadow-md disabled:opacity-50 disabled:hover:bg-slate-800 disabled:cursor-not-allowed group-disabled:pointer-events-none"
                        >
                           {num} Players
                        </button>
                     ))}
                  </div>
                  {!wallet.isEligible && (
                     <div className="flex items-center gap-2 mt-4 text-xs text-red-400 bg-red-900/20 p-2 rounded-lg inline-flex border border-red-500/20">
                        <Wallet className="w-3 h-3" /> Connect eligible wallet to Host
                     </div>
                  )}
               </div>
           </div>

           {/* JOIN GAME - P2P */}
           <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group lg:col-span-2 relative overflow-hidden">
               <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex items-center gap-4 flex-1">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg border border-blue-500/20 shrink-0">
                        <Wifi className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-white">Join a Game</h3>
                        <p className="text-slate-300 text-sm">Enter the code provided by the Host.</p>
                     </div>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto">
                     <input 
                        type="text" 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                        placeholder="CODE"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono font-bold tracking-widest w-24 text-center focus:outline-none focus:border-blue-500"
                     />
                     <button 
                        onClick={handleJoinGame}
                        disabled={!wallet.isEligible || joinCode.length !== 4}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                     >
                        Join <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>
               </div>
                {!wallet.isEligible && (
                     <div className="flex items-center gap-2 mt-4 text-xs text-red-400 bg-red-900/20 p-2 rounded-lg inline-flex border border-red-500/20">
                        <Wallet className="w-3 h-3" /> Connect eligible wallet to Join
                     </div>
                  )}
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
                     onClick={() => {
                         setGameConfig({ mode: 'VS_BOT', playerCount: num });
                     }}
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
                     onClick={() => {
                         setGameConfig({ mode: 'PASS_AND_PLAY', playerCount: num });
                     }}
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

       {/* Simplified Bottom Navigation */}
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