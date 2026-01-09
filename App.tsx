import React, { useState, useEffect } from 'react';
import { Layers, Zap, Trophy, HelpCircle, BookOpen, Play, Crown, Users, Smartphone, Globe, Copy, Check, Search, Wifi, Wallet, AlertTriangle, ExternalLink, ArrowRight, X, Flame, ArrowDown, FileText, Ban, User, Bot, Lock } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { PlayingCard } from './components/PlayingCard';
import { Arbiter } from './components/Arbiter';
import { Game } from './components/Game';
import { RulesSheet } from './components/RulesSheet';
import { Suit, Rank, UserProfile, GameMode, WalletState } from './types';
import { web3Service, SOMNIA_CHAIN_ID } from './services/web3Service';
import { p2pService } from './services/p2pService';
import { GAME_RULES_TEXT } from './constants';

const getSignalingUrl = () => {
  if (process.env.NEXT_PUBLIC_SIGNALING_URL) {
      return process.env.NEXT_PUBLIC_SIGNALING_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8080';
  }
  return 'https://palace-production.up.railway.app';
};

const SIGNALING_URL = getSignalingUrl();

export default function App() {
  const [activeTab, setActiveTab] = useState<'lobby' | 'rules' | 'arbiter'>('lobby');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gameConfig, setGameConfig] = useState<{ mode: GameMode; playerCount: number } | null>(null);
  const [tempName, setTempName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(true);
  const [offlineSetupMode, setOfflineSetupMode] = useState<GameMode | null>(null);
  
  const [lobbyId, setLobbyId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<any[]>([]);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balanceEth: null,
    balanceUsdValue: null,
    isEligible: false,
    chainId: null
  });

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

  useEffect(() => {
    const savedProfile = localStorage.getItem('palace_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setIsProfileModalOpen(false);
    }
  }, []);

  useEffect(() => {
    // Safely detect ethereum provider for event listeners
    const ethereum = (sdk as any)?.wallet?.ethProvider || window?.ethereum;
    
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          handleConnectWallet();
        } else {
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
        handleConnectWallet();
      };
      
      try {
        ethereum.on('accountsChanged', handleAccountsChanged);
        ethereum.on('chainChanged', handleChainChanged);
        
        return () => {
          if (ethereum.removeListener) {
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
            ethereum.removeListener('chainChanged', handleChainChanged);
          }
        };
      } catch (e) {
        console.warn("Error setting up provider listeners:", e);
      }
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
    try {
      setWalletError(null);
      const result = await web3Service.connectWallet();
      
      if (result && result.success && result.address) {
        setWallet({
          isConnected: true,
          address: result.address,
          balanceEth: result.balance || '0',
          balanceUsdValue: result.balanceUsd || 0,
          isEligible: result.isEligible || false,
          chainId: SOMNIA_CHAIN_ID
        });
      } else {
        const errorMsg = result?.message || "Failed to connect wallet.";
        setWalletError(errorMsg);
        setWallet(prev => ({ ...prev, isConnected: false }));
      }
    } catch (e: any) {
      console.error("Unhandled wallet connection error:", e);
      setWalletError(e?.message || "An unexpected error occurred during connection.");
    }
  };

  const checkGameEligibility = () => {
    if (!wallet.isConnected) {
      setWalletError("Access Denied: Please connect your Somnia Testnet wallet to play.");
      return false;
    }
    if (!wallet.isEligible || (wallet.balanceUsdValue || 0) < 0.25) {
      setWalletError(`Insufficient Funds: You need at least $0.25 USD worth of STNET to play.`);
      return false;
    }
    return true;
  };

  const connectToLobby = async (code: string, action: 'create' | 'join') => {
    p2pService.destroy();
    setConnectionStatus('CONNECTING_SIGNALING');
    setStatusMessage('Connecting to Server...');

    p2pService.onConnectionStatus((status) => {
        setConnectionStatus(status);
        if (status === 'WAITING_FOR_OPPONENT') {
            setStatusMessage('Waiting for Opponent...');
        } else if (status === 'ESTABLISHING_P2P') {
            setStatusMessage('Opening P2P Tunnel (WebRTC)...');
        } else if (status === 'CONNECTED') {
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
    
    try {
        await p2pService.connect(SIGNALING_URL, action, code, userProfile?.name || 'Unknown');
    } catch (e: any) {
        setWalletError(e?.message || "Failed to initiate connection. Is the signaling server running?");
        setConnectionStatus(null);
    }
  };

  const handleHostGame = async () => {
    setWalletError(null);
    if (!checkGameEligibility()) return;
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setLobbyId(newCode);
    await connectToLobby(newCode, 'create');
  };

  const handleJoinGame = async () => {
    setWalletError(null);
    if (!checkGameEligibility()) return;
    if (!lobbyId) return;
    await connectToLobby(lobbyId, 'join');
  };

  const handleCancelConnection = () => {
      p2pService.destroy();
      setConnectionStatus(null);
      setGameConfig(null);
  };

  const startLocalGame = (mode: GameMode, playerCount: number) => {
      setWalletError(null);
      if (!checkGameEligibility()) return;
      p2pService.destroy(); 
      setConnectionStatus(null);
      setGameConfig({ mode, playerCount });
      setOfflineSetupMode(null);
  };

  const exitGame = () => {
    p2pService.destroy();
    setGameConfig(null);
    setConnectionStatus(null);
    setActiveTab('lobby');
  };

  const shouldRenderGame = gameConfig && userProfile && (
     (gameConfig.mode === 'VS_BOT' || gameConfig.mode === 'PASS_AND_PLAY') ||
     ((gameConfig.mode === 'ONLINE_HOST' || gameConfig.mode === 'ONLINE_CLIENT') && connectionStatus === 'GAME_ACTIVE')
  );

  if (shouldRenderGame && gameConfig && userProfile) {
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
                  <button onClick={handleCancelConnection} className="px-6 py-3 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">Cancel Connection</button>
              </div>
          </div>
      );
  }

  if (isProfileModalOpen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-[100] bg-felt">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600 to-amber-300"></div>
           <Crown className="w-16 h-16 mx-auto text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
           <h1 className="text-3xl font-playfair font-bold text-amber-100 mb-2">Identify Yourself</h1>
           <p className="text-slate-400 mb-8 font-light">Enter your name to enter the Palace records.</p>
           <form onSubmit={handleCreateProfile} className="space-y-6">
             <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your Name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-lg text-amber-100 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none placeholder-slate-600 transition-all" maxLength={12} />
             <button type="submit" disabled={!tempName.trim()} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100">Claim Throne</button>
           </form>
        </div>
      </div>
    );
  }

  const renderLobby = () => {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
         <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/30">
                  <Wallet className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                   <h3 className="font-bold text-slate-200 text-sm">Somnia Testnet Access</h3>
                   <div className="text-xs text-slate-400">Required to play ANY mode</div>
                </div>
             </div>
             {wallet.isConnected ? (
                <div className="flex items-center gap-4 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-600">
                    <div className="text-right">
                       <div className="text-xs font-bold text-slate-400">{wallet.address?.slice(0,6)}...{wallet.address?.slice(-4)}</div>
                       <div className={`text-sm font-mono font-bold ${wallet.isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
                          {parseFloat(wallet.balanceEth || '0').toFixed(4)} STNET (${wallet.balanceUsdValue?.toFixed(2)})
                       </div>
                    </div>
                    {wallet.isEligible ? <Check className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                </div>
             ) : (
                <button onClick={handleConnectWallet} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg">Connect Wallet</button>
             )}
         </div>

         {walletError && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
               <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
               <div className="flex-1">
                 <div className="text-sm text-red-200"><span className="font-bold block">Access Restricted</span>{walletError}</div>
               </div>
               <button onClick={() => setWalletError(null)} className="ml-auto text-red-400 hover:text-white"><X className="w-4 h-4"/></button>
            </div>
         )}

         <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-400 flex items-center justify-center text-2xl font-bold text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.4)]">{userProfile?.name.charAt(0)}</div>
               <div>
                  <h2 className="text-2xl font-playfair font-bold text-white">{userProfile?.name}</h2>
                  <div className="flex items-center gap-2 text-slate-400 text-sm"><Crown className="w-4 h-4 text-amber-500" /><span>Aspiring Ruler</span></div>
               </div>
            </div>
         </div>

         <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-xs font-bold"><Smartphone className="w-4 h-4" /> Offline Modes</div>
               <div className="relative">
                 {offlineSetupMode === 'VS_BOT' ? (
                   <div className="bg-slate-800/90 border border-emerald-500/50 p-6 rounded-3xl animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-emerald-400 flex items-center gap-2"><Bot size={18}/> Select Bot Count</h3><button onClick={() => setOfflineSetupMode(null)} className="p-1 hover:bg-slate-700 rounded-full"><X size={16}/></button></div>
                      <div className="grid grid-cols-3 gap-3">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('VS_BOT', num)} className="bg-slate-700 hover:bg-emerald-600 py-3 rounded-xl font-bold transition-colors">{num} Players</button>))}</div>
                   </div>
                 ) : (
                   <button onClick={() => { if (checkGameEligibility()) setOfflineSetupMode('VS_BOT'); }} className="w-full group bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-white/5 p-6 rounded-3xl text-left transition-all hover:scale-[1.02] shadow-xl hover:shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Bot className="w-24 h-24 text-white" /></div>
                      {!wallet.isEligible && <div className="absolute top-4 right-4 bg-red-500/20 text-red-400 p-2 rounded-full z-20"><Lock size={20} /></div>}
                      <div className="relative z-10">
                         <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors"><Bot className="w-6 h-6 text-emerald-400" /></div>
                         <h3 className="text-xl font-bold text-white mb-2">Practice vs Bots</h3>
                         <p className="text-slate-400 text-sm leading-relaxed max-w-[80%]">Hone your skills against the Palace AI. Select 2-4 players.</p>
                      </div>
                   </button>
                 )}
               </div>

               <div className="relative">
                 {offlineSetupMode === 'PASS_AND_PLAY' ? (
                   <div className="bg-slate-800/90 border border-purple-500/50 p-6 rounded-3xl animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-purple-400 flex items-center gap-2"><Smartphone size={18}/> Select Player Count</h3><button onClick={() => setOfflineSetupMode(null)} className="p-1 hover:bg-slate-700 rounded-full"><X size={16}/></button></div>
                      <div className="grid grid-cols-3 gap-3">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('PASS_AND_PLAY', num)} className="bg-slate-700 hover:bg-purple-600 py-3 rounded-xl font-bold transition-colors">{num} Players</button>))}</div>
                   </div>
                 ) : (
                   <button onClick={() => { if (checkGameEligibility()) setOfflineSetupMode('PASS_AND_PLAY'); }} className="w-full group bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-white/5 p-6 rounded-3xl text-left transition-all hover:scale-[1.02] shadow-xl hover:shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-24 h-24 text-white" /></div>
                      {!wallet.isEligible && <div className="absolute top-4 right-4 bg-red-500/20 text-red-400 p-2 rounded-full z-20"><Lock size={20} /></div>}
                      <div className="relative z-10">
                         <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors"><Smartphone className="w-6 h-6 text-purple-400" /></div>
                         <h3 className="text-xl font-bold text-white mb-2">Pass & Play</h3>
                         <p className="text-slate-400 text-sm leading-relaxed max-w-[80%]">Play with friends on a single device. Supports 2-4 players.</p>
                      </div>
                   </button>
                 )}
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-xs font-bold"><Globe className="w-4 h-4" /> Palace Rulers Online</div>
               <div className="bg-slate-900/40 p-6 rounded-3xl border border-blue-500/20 relative overflow-hidden opacity-75 grayscale-[50%]">
                  <div className="absolute inset-0 bg-slate-950/60 z-20 flex items-center justify-center"><span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg">COMING SOON</span></div>
                  <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><Zap className="w-5 h-5 text-blue-400" /></div><h3 className="text-lg font-bold text-white">Quick Match</h3></div>
                     <p className="text-xs text-slate-400">Match with random opponents. Ranked play with rewards.</p>
                  </div>
               </div>
               <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/10 relative overflow-hidden opacity-75 grayscale-[50%]">
                   <div className="absolute inset-0 bg-slate-950/60 z-20 flex items-center justify-center"><span className="bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg">COMING SOON</span></div>
                   <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Wifi className="w-5 h-5 text-slate-400" /></div><h3 className="text-lg font-bold text-white">Friend Lobby</h3></div>
                   <div className="grid grid-cols-2 gap-3 opacity-50"><button className="bg-slate-700 p-3 rounded-xl text-sm font-bold">Host</button><button className="bg-slate-700 p-3 rounded-xl text-sm font-bold">Join</button></div>
               </div>
               <div className="bg-slate-900/40 p-6 rounded-3xl border border-amber-500/20 relative overflow-hidden opacity-75 grayscale-[50%]">
                  <div className="absolute inset-0 bg-slate-950/60 z-20 flex items-center justify-center"><span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg">COMING SOON</span></div>
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><Trophy className="w-5 h-5 text-amber-400" /></div><h3 className="text-lg font-bold text-white">Tournament</h3></div>
               </div>
            </div>
         </div>

         <div className="mt-8 bg-slate-900/60 p-6 rounded-3xl border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-50"><Trophy className="w-24 h-24 text-slate-800 rotate-12" /></div>
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4"><span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase">Weekly Rewards</span><span className="text-xs text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded-full">Coming Soon</span></div>
                <h3 className="text-xl font-bold text-white mb-2">The Somnia Pool</h3>
                <p className="text-slate-400 text-sm mb-4 max-w-2xl">Compete for real rewards on the Somnia Testnet chain.</p>
                <div className="grid md:grid-cols-2 gap-4">
                   <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
                      <div className="text-emerald-400 font-bold text-sm mb-1 flex items-center gap-2"><Wallet className="w-4 h-4"/> Deposit</div>
                      <p className="text-xs text-slate-400">Players deposit <strong>$0.25 worth of STNET</strong> into the weekly smart contract pool to verify eligibility.</p>
                   </div>
                   <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
                      <div className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-2"><Crown className="w-4 h-4"/> Win</div>
                      <p className="text-xs text-slate-400">The top 5 players with the most <strong>Quick Match</strong> wins at the end of the week split the pool!</p>
                   </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-4 italic">Note: Friendly multiplayer matches do not count towards the leaderboard. Only ranked Quick Matches qualify.</p>
             </div>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-felt text-slate-200 selection:bg-amber-500/30 font-sans pb-safe-area-bottom">
      <main className="max-w-7xl mx-auto p-4 md:p-6 min-h-[calc(100vh-80px)]">
        {activeTab === 'lobby' && renderLobby()}
        {activeTab === 'rules' && <RulesSheet />}
        {activeTab === 'arbiter' && (<div className="max-w-2xl mx-auto pt-8"><Arbiter /></div>)}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-white/5 px-6 py-4 z-50 md:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setActiveTab('lobby')} className={`flex flex-col items-center gap-1 ${activeTab === 'lobby' ? 'text-amber-500' : 'text-slate-500'}`}><Layers size={20} /><span className="text-[10px] font-bold uppercase tracking-wider">Lobby</span></button>
          <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center gap-1 ${activeTab === 'rules' ? 'text-amber-500' : 'text-slate-500'}`}><BookOpen size={20} /><span className="text-[10px] font-bold uppercase tracking-wider">Rules</span></button>
          <button onClick={() => setActiveTab('arbiter')} className={`flex flex-col items-center gap-1 ${activeTab === 'arbiter' ? 'text-amber-500' : 'text-slate-500'}`}><HelpCircle size={20} /><span className="text-[10px] font-bold uppercase tracking-wider">Arbiter</span></button>
        </div>
      </nav>
      <header className="hidden md:flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg rotate-3"><Crown className="text-slate-900 w-6 h-6" /></div>
            <h1 className="text-2xl font-playfair font-bold text-white tracking-tight">Palace Rulers</h1>
         </div>
         <div className="flex gap-8">
            <button onClick={() => setActiveTab('lobby')} className={`text-sm font-bold uppercase tracking-widest hover:text-amber-500 transition-colors ${activeTab === 'lobby' ? 'text-amber-500' : 'text-slate-400'}`}>Lobby</button>
            <button onClick={() => setActiveTab('rules')} className={`text-sm font-bold uppercase tracking-widest hover:text-amber-500 transition-colors ${activeTab === 'rules' ? 'text-amber-500' : 'text-slate-400'}`}>Rules</button>
            <button onClick={() => setActiveTab('arbiter')} className={`text-sm font-bold uppercase tracking-widest hover:text-amber-500 transition-colors ${activeTab === 'arbiter' ? 'text-amber-500' : 'text-slate-400'}`}>Arbiter</button>
         </div>
      </header>
    </div>
  );
}