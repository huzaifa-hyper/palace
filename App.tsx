import React, { useState, useEffect } from 'react';
import { Layers, Zap, Trophy, HelpCircle, BookOpen, Play, Crown, Users, Smartphone, Globe, Copy, Check, Search, Wifi, Wallet, AlertTriangle, ExternalLink, ArrowRight, X } from 'lucide-react';
import { PlayingCard } from './components/PlayingCard';
import { Arbiter } from './components/Arbiter';
import { Game } from './components/Game';
import { Suit, Rank, UserProfile, GameMode, WalletState } from './types';
import { web3Service } from './services/web3Service';
import { p2pService } from './services/p2pService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'setup' | 'gameplay' | 'power' | 'endgame' | 'arbiter' | 'lobby'>('setup');
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
    }
  };

  const checkMultiplayerEligibility = () => {
    if (!wallet.isConnected) {
      setWalletError("Please connect your Soneium Minato wallet to play multiplayer.");
      return false;
    }
    if (!wallet.isEligible) {
      setWalletError(`Insufficient Funds. You need at least $0.25 USD worth of Soneium ETH to play.`);
      return false;
    }
    return true;
  };

  // --- P2P Logic ---

  const handleHostGame = async (playerCount: number) => {
    setWalletError(null);
    if (!checkMultiplayerEligibility()) return;
    
    setIsMatchmaking(true);
    setIsHost(true);
    
    try {
        const code = await p2pService.initHost();
        setHostCode(code);
        setConnectedPeers([{ id: 'HOST', name: userProfile?.name, isMe: true }]); // Add self
        setGameConfig({ mode: 'ONLINE_HOST', playerCount }); // Pre-set config but don't start
        
        // Listen for players
        p2pService.onPlayerConnected((id, metadata) => {
            setConnectedPeers(prev => {
                const newList = [...prev, { id, name: metadata.name, isMe: false }];
                return newList;
            });
        });

    } catch (err) {
        console.error(err);
        setWalletError("Failed to initialize Host. PeerJS server might be down.");
        setIsMatchmaking(false);
    }
  };

  const handleJoinGame = async () => {
    setWalletError(null);
    if (!checkMultiplayerEligibility()) return;
    if (joinCode.length !== 4) return;

    setIsMatchmaking(true);
    setIsHost(false);

    try {
        await p2pService.initClient(joinCode, { name: userProfile?.name });
        // Wait for Start Game signal from Host
        p2pService.onMessage((msg) => {
            if (msg.type === 'START_GAME') {
                // Host started game
                setGameConfig({ mode: 'ONLINE_CLIENT', playerCount: msg.payload.playerCount });
                setIsMatchmaking(false);
            }
        });
    } catch (err) {
        console.error(err);
        setWalletError("Could not find game. Check the code.");
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
  };

  const exitGame = () => {
    p2pService.destroy();
    setGameConfig(null);
    setHostCode(null);
    setConnectedPeers([]);
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
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Players in Lobby</h3>
                    {connectedPeers.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-white/5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${p.isMe ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                {p.name.charAt(0)}
                            </div>
                            <span className="text-slate-200 font-bold">{p.name} {p.isMe && '(You)'}</span>
                            {i === 0 && <Crown className="w-4 h-4 text-amber-500 ml-auto" />}
                        </div>
                    ))}
                    {Array.from({ length: Math.max(0, gameConfig!.playerCount - connectedPeers.length) }).map((_, i) => (
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
                     {[2, 3, 4].map(num => (
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

      case 'setup':
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
            <div className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-playfair font-bold text-amber-400 mb-6 flex items-center gap-3">
                <Layers className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> The Foundation
              </h2>
              <p className="text-sm md:text-lg text-slate-300 leading-relaxed mb-8 font-light">
                Before the battle begins, every ruler must fortify their palace. This formation is your final line of protection.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-6 text-sm md:text-base">
                  <div className="flex items-start gap-4 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 border border-slate-700 group-hover:border-amber-500/50 flex items-center justify-center shrink-0 font-bold text-amber-500 transition-colors">1</div>
                    <p className="text-slate-300 pt-1 md:pt-2">Start with <strong>3 hidden cards</strong> (face-down). These are your last resort. No peeking.</p>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 border border-slate-700 group-hover:border-amber-500/50 flex items-center justify-center shrink-0 font-bold text-amber-500 transition-colors">2</div>
                    <p className="text-slate-300 pt-1 md:pt-2">You receive <strong>7 cards</strong> for your hand.</p>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 border border-slate-700 group-hover:border-amber-500/50 flex items-center justify-center shrink-0 font-bold text-amber-500 transition-colors">3</div>
                    <p className="text-slate-300 pt-1 md:pt-2">Strategically choose <strong>3 high-value cards</strong> from your hand to place face-up on your hidden pile.</p>
                  </div>
                </div>

                {/* Visualizer */}
                <div className="relative h-56 md:h-72 bg-black/20 rounded-2xl border border-dashed border-slate-700/50 flex items-center justify-center p-4 overflow-hidden">
                  <div className="absolute top-4 text-xs text-slate-500 uppercase tracking-[0.2em] font-bold">Stronghold Formation</div>
                  
                  {/* Hidden Cards */}
                  <div className="flex gap-4 absolute top-16 opacity-60 scale-90 md:scale-100 transition-transform hover:scale-105 duration-500">
                     <PlayingCard faceDown className="transform -rotate-6 shadow-lg" />
                     <PlayingCard faceDown className="transform translate-y-2 shadow-lg" />
                     <PlayingCard faceDown className="transform rotate-6 shadow-lg" />
                  </div>

                  {/* Face Up Cards */}
                  <div className="flex gap-4 absolute top-20 z-10 scale-90 md:scale-100 transition-transform hover:scale-105 duration-500 hover:-translate-y-2">
                     <PlayingCard suit={Suit.Diamonds} rank={Rank.King} className="transform -rotate-6 hover:rotate-0 transition-transform shadow-2xl" />
                     <PlayingCard suit={Suit.Spades} rank={Rank.Ten} className="transform translate-y-2 hover:translate-y-0 transition-transform shadow-2xl" />
                     <PlayingCard suit={Suit.Clubs} rank={Rank.Two} className="transform rotate-6 hover:rotate-0 transition-transform shadow-2xl" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center pb-8">
              <button 
                onClick={() => setActiveTab('lobby')}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white px-10 py-4 rounded-full font-bold shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] text-lg"
              >
                Go to Arena Lobby <Play className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        );
      
      // ... keep other cases (gameplay, power, endgame, arbiter) same as before ...
      // Just shortening for XML response size if needed, but since I have to return full file content:
      
      case 'gameplay':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
             <div className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-playfair font-bold text-amber-400 mb-6 flex items-center gap-3">
                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> Rules of Engagement
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-colors">
                    <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Hierarchy</h3>
                    <div className="flex items-center gap-3 text-lg md:text-2xl font-bold text-amber-500 flex-wrap font-playfair">
                      <span>A</span>
                      <span className="text-slate-600 text-sm">►</span>
                      <span>K</span>
                      <span className="text-slate-600 text-sm">►</span>
                      <span>Q</span>
                      <span className="text-slate-600 text-sm">►</span>
                      <span>J</span>
                      <span className="text-slate-600 text-sm">►</span>
                      <span className="text-slate-400 text-base font-sans">#</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-400 mt-4 italic border-t border-slate-700/50 pt-2">"Suits hold no power here."</p>
                 </div>
                 <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-colors">
                    <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> The Golden Rule</h3>
                    <p className="text-slate-300 text-sm md:text-lg leading-relaxed">
                      You must play a card <strong>equal to or higher</strong> than the current top card.
                    </p>
                 </div>
              </div>

              <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 flex gap-5 items-start">
                <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                </div>
                <div>
                  <h4 className="font-bold text-red-200 text-lg">The Penalty</h4>
                  <p className="text-red-300/80 text-sm md:text-base mt-1">
                    Cannot make a move? You must <strong>pick up the entire pile</strong> and add it to your hand.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'power':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
             <div className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-playfair font-bold text-amber-400 mb-8 flex items-center gap-3">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> Power Cards
              </h2>
              <p className="text-slate-300 mb-8 text-lg font-light">
                These artifacts break the rules of hierarchy. Use them wisely.
              </p>

              <div className="grid gap-6">
                {/* 2 - Reset */}
                <div className="flex items-center gap-6 md:gap-8 bg-slate-800/50 p-6 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-colors group">
                  <div className="transform transition-transform group-hover:scale-110 group-hover:rotate-3 shrink-0">
                     <PlayingCard rank={Rank.Two} suit={Suit.Clubs} className="scale-90 origin-left shadow-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-blue-100 font-playfair">The Reset (2)</h3>
                    <p className="text-slate-400 mt-2 text-sm md:text-base leading-relaxed">
                      Resets the pile's value. The slate is wiped clean, and you get to <strong>play again immediately</strong>.
                    </p>
                  </div>
                </div>

                {/* 7 - Lower */}
                <div className="flex items-center gap-6 md:gap-8 bg-slate-800/50 p-6 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-colors group">
                  <div className="transform transition-transform group-hover:scale-110 group-hover:-rotate-3 shrink-0">
                     <PlayingCard rank={Rank.Seven} suit={Suit.Diamonds} className="scale-90 origin-left shadow-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-emerald-100 font-playfair">The Limiter (7)</h3>
                    <p className="text-slate-400 mt-2 text-sm md:text-base leading-relaxed">
                      Reverses the hierarchy. The next player must play a card <strong>lower than 7</strong>.
                    </p>
                  </div>
                </div>

                {/* 10 - Burn */}
                <div className="flex items-center gap-6 md:gap-8 bg-slate-800/50 p-6 rounded-2xl border border-white/5 hover:border-orange-500/50 transition-colors group">
                   <div className="transform transition-transform group-hover:scale-110 group-hover:rotate-6 shrink-0">
                     <PlayingCard rank={Rank.Ten} suit={Suit.Spades} className="scale-90 origin-left shadow-xl" />
                   </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-orange-100 font-playfair">The Incinerator (10)</h3>
                    <p className="text-slate-400 mt-2 text-sm md:text-base leading-relaxed">
                      Completely removes the pile from the game. The current turn ends, and the next player starts fresh.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'endgame':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
             <div className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-playfair font-bold text-amber-400 mb-6 flex items-center gap-3">
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> The Finale
              </h2>
              
              <div className="space-y-8 text-sm md:text-base">
                <div className="relative pl-10 border-l-2 border-slate-700/50">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900"></div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-200">1. Exhaustion</h3>
                  <p className="text-slate-400 mt-1">Empty your hand completely.</p>
                </div>

                <div className="relative pl-10 border-l-2 border-slate-700/50">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 animate-pulse border-4 border-slate-900"></div>
                  <h3 className="text-lg md:text-xl font-bold text-amber-400">2. The Stronghold</h3>
                  <p className="text-slate-300 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 mt-3 shadow-inner">
                    When you have <strong>1 card</strong> left in hand, you pick up your 3 face-up cards.
                  </p>
                </div>

                <div className="relative pl-10 border-l-2 border-slate-700/50">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900"></div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-200">3. Blind Faith</h3>
                  <p className="text-slate-400 mt-1 leading-relaxed">
                    Once face-up cards are gone, play the final 3 hidden cards blindly. Fate decides your victory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'arbiter':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0 h-full">
             <Arbiter />
          </div>
        );
    }
  };

  return (
    <div className="h-[100dvh] text-slate-100 flex flex-col md:flex-row overflow-hidden fixed inset-0 bg-felt">
      {/* Sidebar Navigation - Desktop */}
      <nav className="hidden md:flex w-72 bg-slate-950/80 backdrop-blur-xl border-r border-white/5 flex-col shrink-0 z-50">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-3xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-600 drop-shadow-sm leading-tight">
            Palace Rulers
          </h1>
          <p className="text-[10px] text-slate-500 mt-3 tracking-[0.3em] uppercase font-bold">Royal Edition</p>
        </div>
        
        <div className="flex-1 p-4 space-y-2">
          {[
            { id: 'lobby', label: 'Play Arena', icon: Play, special: true },
            { id: 'setup', label: 'Setup', icon: Layers },
            { id: 'gameplay', label: 'Rules', icon: BookOpen },
            { id: 'power', label: 'Power Cards', icon: Zap },
            { id: 'endgame', label: 'Endgame', icon: Trophy },
            { id: 'arbiter', label: 'The Arbiter', icon: HelpCircle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`
                flex items-center gap-4 w-full p-4 rounded-xl transition-all font-medium text-sm
                ${activeTab === item.id 
                  ? 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 text-amber-100 shadow-inner border border-amber-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${item.special && activeTab !== 'lobby' ? 'text-amber-500' : ''}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        
        {userProfile && (
           <div className="p-4 border-t border-white/5">
              <div className="bg-slate-900/50 rounded-xl p-3 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center font-bold text-xs">
                    {userProfile.name.charAt(0)}
                 </div>
                 <div className="overflow-hidden">
                    <div className="text-sm font-bold truncate text-amber-100">{userProfile.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{userProfile.id}</div>
                 </div>
              </div>
           </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto no-scrollbar relative">
        <div className={`h-full ${activeTab === 'lobby' || activeTab === 'play' ? 'p-0 md:p-6' : 'p-4 md:p-12 max-w-6xl mx-auto'}`}>
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 z-50 px-2 py-2 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center">
          {[
            { id: 'lobby', label: 'Play', icon: Play, special: true },
            { id: 'setup', label: 'Setup', icon: Layers },
            { id: 'gameplay', label: 'Rules', icon: BookOpen },
            { id: 'power', label: 'Power', icon: Zap },
            { id: 'arbiter', label: 'Arbiter', icon: HelpCircle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`
                flex flex-col items-center justify-center gap-1 p-2 rounded-xl w-16
                ${activeTab === item.id 
                  ? 'text-amber-400 bg-white/5' 
                  : 'text-slate-500'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${item.special && activeTab === 'lobby' ? 'fill-current' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}