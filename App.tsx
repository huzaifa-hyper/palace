"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layers, 
  HelpCircle, 
  BookOpen, 
  Crown, 
  Smartphone, 
  Globe, 
  Wallet, 
  AlertTriangle, 
  X, 
  Bot, 
  Loader2, 
  ShieldCheck,
  Power,
  Users,
  Zap,
  Lock,
  ArrowRight,
  Hash,
  PlayCircle
} from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { Arbiter } from './components/Arbiter';
import { Game } from './components/Game';
import { RulesSheet } from './components/RulesSheet';
import { UserProfile, GameMode, GameStateSnapshot } from './types';
import { SOMNIA_CHAIN_ID, web3Service } from './services/web3Service';
import { p2pService } from './services/p2pService';
import { useMinimumBalance, MIN_STT_REQUIRED } from './hooks/useMinimumBalance';
import { useWallet } from './hooks/useWallet';

const SIGNALING_SERVER = "http://localhost:8080"; // Default locally, usually injected in prod

export default function App() {
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'lobby' | 'rules' | 'arbiter'>('lobby');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gameConfig, setGameConfig] = useState<{ mode: GameMode; playerCount: number } | null>(null);
  const [tempName, setTempName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(true);
  const [setupStep, setSetupStep] = useState<'IDLE' | 'CREATE_SELECT' | 'JOIN_INPUT' | 'WAITING'>('IDLE');
  const [joinCode, setJoinCode] = useState('');
  const [roomInfo, setRoomInfo] = useState<{ code: string; current: number; max: number } | null>(null);
  const [multiplayerState, setMultiplayerState] = useState<GameStateSnapshot | null>(null);

  const { address, isConnected, chainId, connect, disconnect, switchChain, isConnecting } = useWallet();
  const isMismatched = isConnected && chainId !== SOMNIA_CHAIN_ID;
  const { isEligible, balance, isLoading: isBalanceLoading } = useMinimumBalance();

  useEffect(() => {
    setHasMounted(true);
    sdk.actions.ready().catch(console.warn);

    if (typeof window !== 'undefined' && 
        window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
      // In prod, this should be handled by your domain config
    }
  }, []);

  useEffect(() => {
    const savedProfile = localStorage.getItem('palace_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setIsProfileModalOpen(false);
    }
  }, []);

  const exitGame = useCallback(() => {
    p2pService.destroy();
    setGameConfig(null);
    setSetupStep('IDLE');
    setMultiplayerState(null);
    setActiveTab('lobby');
  }, []);

  const startLocalGame = useCallback((mode: GameMode, playerCount: number) => {
    if (!isConnected || !isEligible) return;
    p2pService.destroy(); 
    setGameConfig({ mode, playerCount });
  }, [isConnected, isEligible]);

  const handleCreateRoom = async (count: number) => {
    if (!userProfile) return;
    try {
      const data = await p2pService.createRoom(SIGNALING_SERVER, userProfile.name, count);
      setRoomInfo({ code: data.roomId, current: 1, max: count });
      setSetupStep('WAITING');
      setupP2PListeners();
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinRoom = async () => {
    if (!userProfile || !joinCode) return;
    try {
      const data = await p2pService.joinRoom(SIGNALING_SERVER, joinCode, userProfile.name);
      setRoomInfo({ code: data.roomId, current: 0, max: 0 }); // Server will update this via state
      setSetupStep('WAITING');
      setupP2PListeners();
    } catch (e) {
      alert("Room not found or full");
    }
  };

  const handleQuickMatch = async () => {
    if (!userProfile) return;
    try {
      const data = await p2pService.quickMatch(SIGNALING_SERVER, userProfile.name);
      setRoomInfo({ code: data.roomId, current: 1, max: 2 });
      setSetupStep('WAITING');
      setupP2PListeners();
    } catch (e) {
      console.error(e);
    }
  };

  const setupP2PListeners = () => {
    p2pService.onGameState((state) => {
      setMultiplayerState(state);
      if (roomInfo) {
          setRoomInfo(prev => prev ? { ...prev, current: state.players.length, max: state.maxPlayers } : null);
      }
      if (state.phase !== 'LOBBY' && !gameConfig) {
          setGameConfig({ mode: 'ONLINE_HOST', playerCount: state.maxPlayers }); // Mode acts as flag
      }
    });
    p2pService.onConnectionStatus((status) => {
      if (status === 'CONNECTED' && !gameConfig) {
        // Trigger game start handled by state phase check above
      }
    });
  };

  if (!hasMounted) return null;

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
  };

  if (gameConfig && userProfile && isConnected && isEligible) {
    return (
      <Game 
        mode={gameConfig.mode} 
        playerCount={gameConfig.playerCount} 
        userProfile={userProfile}
        onExit={exitGame}
      />
    );
  }

  if (isProfileModalOpen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-[100] bg-felt">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600 to-amber-300"></div>
           <Crown className="w-16 h-16 mx-auto text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
           <h1 className="text-3xl font-playfair font-bold text-amber-100 mb-2">Identify Yourself</h1>
           <p className="text-slate-400 mb-8 font-light">Enter your name to join the Sovereign ranks.</p>
           <form onSubmit={handleCreateProfile} className="space-y-6">
             <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your Name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-lg text-amber-100 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all" maxLength={12} />
             <button type="submit" disabled={!tempName.trim()} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 uppercase tracking-widest text-xs">Enter Palace</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-felt text-slate-200 selection:bg-amber-500/30 font-sans pb-safe-area-bottom">
      <main className="max-w-7xl mx-auto p-4 md:p-6 min-h-[calc(100vh-80px)]">
        {activeTab === 'lobby' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
             <div className="bg-slate-900/60 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Wallet className="w-7 h-7 text-amber-500" />
                    </div>
                    <div>
                       <h3 className="font-playfair font-bold text-slate-100 text-lg">Royal Treasury</h3>
                       <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Somnia Testnet Identity</div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-6">
                    {isConnecting ? (
                      <div className="flex items-center gap-3 text-slate-400 text-sm font-bold uppercase tracking-widest">
                         <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                         Syncing...
                      </div>
                    ) : isConnected && address ? (
                       <div className="flex items-center gap-6 bg-slate-950/80 px-6 py-3 rounded-2xl border border-white/5">
                           <div className="text-right">
                              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{web3Service.shortenAddress(address)}</div>
                              <div className={`text-base font-mono font-black flex items-center gap-2 justify-end ${isEligible ? 'text-emerald-400' : 'text-amber-500'}`}>
                                 {isBalanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${parseFloat(balance).toFixed(3)} STT`}
                                 {isEligible ? <ShieldCheck className="w-5 h-5" /> : <Zap className="w-4 h-4" />}
                              </div>
                           </div>
                           <button onClick={disconnect} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"><Power size={20} /></button>
                       </div>
                    ) : (
                       <button onClick={connect} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 border-0">Connect Wallet</button>
                    )}
                 </div>
             </div>

             {isMismatched && (
               <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse shadow-xl">
                  <div className="flex items-center gap-3">
                     <AlertTriangle className="w-5 h-5 text-amber-500" />
                     <span className="text-xs text-amber-100 font-black uppercase tracking-widest">Protocol Sync Error: Switch to Somnia Testnet</span>
                  </div>
                  <button onClick={switchChain} className="bg-amber-500 text-slate-950 px-6 py-2 rounded-xl text-[10px] font-black shadow-lg hover:bg-amber-400 transition-all uppercase tracking-widest">Fix Sync</button>
               </div>
             )}

             {isConnected && isEligible ? (
               <div className="grid lg:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
                  <div className="space-y-6">
                     <div className="flex items-center gap-2 text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black"><Smartphone className="w-4 h-4" /> Combat Training</div>
                     <div className="grid sm:grid-cols-2 gap-6">
                       <button onClick={() => startLocalGame('VS_BOT', 2)} className="w-full group bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Bot className="w-24 h-24 text-white" /></div>
                          <div className="relative z-10">
                             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20"><Bot className="w-6 h-6 text-emerald-400" /></div>
                             <h3 className="text-xl font-bold text-white mb-1 font-playfair tracking-tight">AI Duel</h3>
                             <p className="text-slate-500 text-[10px] leading-relaxed font-light">Practice against Palace AI.</p>
                          </div>
                       </button>
                       <button onClick={() => startLocalGame('PASS_AND_PLAY', 2)} className="w-full group bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Users className="w-24 h-24 text-white" /></div>
                          <div className="relative z-10">
                             <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20"><Smartphone className="w-6 h-6 text-purple-400" /></div>
                             <h3 className="text-xl font-bold text-white mb-1 font-playfair tracking-tight">Local Pass</h3>
                             <p className="text-slate-500 text-[10px] leading-relaxed font-light">Hand-held local combat.</p>
                          </div>
                       </button>
                     </div>
                  </div>

                  <div className="space-y-6 h-full flex flex-col">
                     <div className="flex items-center gap-2 text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black"><Globe className="w-4 h-4" /> Global Sovereignty</div>
                     
                     {setupStep === 'WAITING' ? (
                       <div className="flex-1 bg-slate-900 border-2 border-blue-500/50 p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 backdrop-blur-xl">
                          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 animate-pulse"><Loader2 size={40} className="text-blue-400 animate-spin" /></div>
                          <div className="space-y-2">
                             <h4 className="text-2xl font-playfair font-black text-white uppercase tracking-widest">Waiting for Rulers</h4>
                             <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-black">{roomInfo?.current} / {roomInfo?.max} Connected</p>
                          </div>
                          <div className="bg-slate-950 px-10 py-6 rounded-3xl border border-white/10 shadow-2xl space-y-2">
                             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Room Secret</p>
                             <div className="text-4xl font-mono font-black text-blue-400 tracking-[0.3em]">{roomInfo?.code}</div>
                          </div>
                          <button onClick={exitGame} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors">Abort Mission</button>
                       </div>
                     ) : setupStep === 'CREATE_SELECT' ? (
                       <div className="flex-1 bg-slate-900 border border-blue-500/20 p-8 rounded-[2.5rem] animate-in slide-in-from-right-4">
                          <div className="flex justify-between items-center mb-8">
                             <h3 className="font-playfair font-black text-2xl text-blue-400">Assemble Legions</h3>
                             <button onClick={() => setSetupStep('IDLE')} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
                          </div>
                          <p className="text-xs text-slate-500 mb-8 uppercase tracking-widest font-black">Choose Total Rulers</p>
                          <div className="grid grid-cols-3 gap-6">
                            {[2, 3, 4].map(num => (
                              <button key={num} onClick={() => handleCreateRoom(num)} className="bg-slate-800 hover:bg-blue-600 text-white py-8 rounded-2xl font-black text-2xl transition-all shadow-xl hover:scale-105 border border-white/5">{num}</button>
                            ))}
                          </div>
                       </div>
                     ) : setupStep === 'JOIN_INPUT' ? (
                       <div className="flex-1 bg-slate-900 border border-blue-500/20 p-8 rounded-[2.5rem] animate-in slide-in-from-right-4">
                          <div className="flex justify-between items-center mb-8">
                             <h3 className="font-playfair font-black text-2xl text-blue-400">Enter Secret</h3>
                             <button onClick={() => setSetupStep('IDLE')} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
                          </div>
                          <div className="space-y-6">
                             <input 
                               type="text" 
                               value={joinCode} 
                               onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
                               placeholder="CODE" 
                               className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-4 py-6 text-center text-4xl font-mono font-black text-blue-400 tracking-[0.5em] focus:border-blue-500 outline-none"
                               maxLength={6}
                             />
                             <button 
                               onClick={handleJoinRoom}
                               disabled={joinCode.length < 6}
                               className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl disabled:opacity-50 transition-all"
                             >Join Stronghold</button>
                          </div>
                       </div>
                     ) : (
                       <div className="flex-1 bg-slate-900/60 p-8 rounded-[2.5rem] border border-blue-500/10 relative overflow-hidden backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button onClick={() => setSetupStep('CREATE_SELECT')} className="flex flex-col items-center justify-center gap-4 bg-slate-950/60 hover:bg-blue-600/10 border border-white/5 rounded-3xl p-6 transition-all group">
                             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform"><Zap className="text-blue-400" /></div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Create Room</span>
                          </button>
                          <button onClick={() => setSetupStep('JOIN_INPUT')} className="flex flex-col items-center justify-center gap-4 bg-slate-950/60 hover:bg-blue-600/10 border border-white/5 rounded-3xl p-6 transition-all group">
                             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform"><Hash className="text-blue-400" /></div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Join with Code</span>
                          </button>
                          <button onClick={handleQuickMatch} className="sm:col-span-2 flex items-center justify-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-3xl p-6 font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
                             <PlayCircle size={20} /> Quick Match
                          </button>
                       </div>
                     )}
                  </div>
               </div>
             ) : (
               <div className="bg-slate-900/60 backdrop-blur-3xl border border-amber-500/20 p-12 md:p-20 rounded-[3rem] text-center space-y-8 animate-in fade-in duration-500">
                  <div className="relative inline-block">
                    <Lock className="w-20 h-20 text-slate-700 mx-auto" />
                    <div className="absolute -inset-4 bg-amber-500/5 blur-2xl rounded-full -z-10"></div>
                  </div>
                  <div className="max-w-md mx-auto space-y-4">
                    <h3 className="text-3xl font-playfair font-black text-amber-100">Access Restricted</h3>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">
                      To enter the combat grounds, a Ruler must be verified. 
                      Connect your Somnia wallet and ensure a treasury of at least <strong>{MIN_STT_REQUIRED} STT</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {!isConnected ? (
                      <button onClick={connect} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3">
                        <Wallet size={16} /> Connect Wallet
                      </button>
                    ) : !isEligible ? (
                      <div className="space-y-4">
                        <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-xl text-red-400 text-xs font-bold uppercase tracking-widest">
                          Insufficient Funds: {parseFloat(balance).toFixed(3)} / {MIN_STT_REQUIRED} STT
                        </div>
                        <a href="https://testnet.somnia.network/" target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-700 text-amber-500 px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-amber-500/20 flex items-center justify-center gap-3">
                          Refill Treasury <ArrowRight size={16} />
                        </a>
                      </div>
                    ) : null}
                  </div>
               </div>
             )}
          </div>
        )}
        {activeTab === 'rules' && <RulesSheet />}
        {activeTab === 'arbiter' && (<div className="max-w-3xl mx-auto pt-10"><Arbiter /></div>)}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-t border-white/5 px-8 py-5 z-50 md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {[
            { id: 'lobby', icon: Layers, label: 'Palace' },
            { id: 'rules', icon: BookOpen, label: 'Codex' },
            { id: 'arbiter', icon: HelpCircle, label: 'Arbiter' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-2 transition-all ${activeTab === tab.id ? 'text-amber-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
              <tab.icon size={22} />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <header className="hidden md:flex items-center justify-between px-16 py-10 max-w-7xl mx-auto">
         <div className="flex items-center gap-5 group cursor-default">
            <div className="w-14 h-14 bg-amber-500 rounded-[1.25rem] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] rotate-3 group-hover:rotate-6 transition-transform duration-500"><Crown className="text-slate-900 w-8 h-8" /></div>
            <div>
              <h1 className="text-4xl font-playfair font-black text-white tracking-tighter leading-none">Palace Rulers</h1>
              <p className="text-[8px] font-black text-amber-500/60 uppercase tracking-[0.5em] mt-1.5 ml-1">Strategy Codex Alpha</p>
            </div>
         </div>
         <div className="flex gap-16">
            {['lobby', 'rules', 'arbiter'].map((tab) => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`text-xs font-black uppercase tracking-[0.4em] transition-all relative py-3 group ${activeTab === tab ? 'text-amber-500' : 'text-slate-600 hover:text-slate-300'}`}
               >
                  {tab}
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 transition-all duration-300 ${activeTab === tab ? 'opacity-100' : 'opacity-0 scale-x-0 group-hover:opacity-40 group-hover:scale-x-100 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
               </button>
            ))}
         </div>
      </header>
    </div>
  );
}