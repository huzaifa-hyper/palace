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

const SIGNALING_SERVER = "http://localhost:8080"; 

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
    setRoomInfo(null);
    setActiveTab('lobby');
  }, []);

  const setupP2PListeners = useCallback(() => {
    p2pService.onGameState((state) => {
      setMultiplayerState(state);
      setRoomInfo(prev => prev ? { ...prev, current: state.players.length, max: state.maxPlayers } : { code: p2pService.getRoomId() || "", current: state.players.length, max: state.maxPlayers });
      
      if (state.phase !== 'LOBBY' && !gameConfig) {
          setGameConfig({ mode: 'ONLINE_HOST', playerCount: state.maxPlayers }); 
      }
    });
    p2pService.onConnectionStatus((status) => {
      if (status === 'DISCONNECTED') exitGame();
    });
  }, [gameConfig, exitGame]);

  const handleCreateRoom = async (count: number) => {
    if (!userProfile) return;
    try {
      const data = await p2pService.createRoom(SIGNALING_SERVER, userProfile.name, count);
      setRoomInfo({ code: data.roomId, current: 1, max: count });
      setSetupStep('WAITING');
      setupP2PListeners();
    } catch (e) {
      alert("Failed to create room");
    }
  };

  const handleJoinRoom = async (codeOverride?: string) => {
    const code = codeOverride || joinCode;
    if (!userProfile || !code) return;
    try {
      const data = await p2pService.joinRoom(SIGNALING_SERVER, code, userProfile.name);
      setRoomInfo({ code: data.roomId, current: 0, max: 0 }); 
      setSetupStep('WAITING');
      setupP2PListeners();
    } catch (e) {
      alert("Room not found or full");
      setSetupStep('IDLE');
    }
  };

  const handleQuickMatch = async () => {
    if (!userProfile) return;
    try {
      const data = await p2pService.quickMatch(SIGNALING_SERVER, userProfile.name);
      if (data.isJoin) {
        handleJoinRoom(data.roomId);
      } else {
        setRoomInfo({ code: data.roomId, current: 1, max: 2 });
        setSetupStep('WAITING');
        setupP2PListeners();
      }
    } catch (e) {
      alert("Quickmatch unavailable");
    }
  };

  const startLocalGame = (mode: GameMode, playerCount: number) => {
    if (!isConnected || !isEligible) return;
    setGameConfig({ mode, playerCount });
  };

  if (!hasMounted) return null;

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    const newProfile: UserProfile = {
      id: `ROYAL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: tempName.trim()
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
        remoteState={multiplayerState}
      />
    );
  }

  if (isProfileModalOpen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-[100] bg-felt">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 p-12 rounded-3xl shadow-2xl max-w-md w-full text-center">
           <Crown className="w-16 h-16 mx-auto text-amber-500 mb-6" />
           <h1 className="text-3xl font-playfair font-bold text-amber-100 mb-2">Identify Yourself</h1>
           <form onSubmit={handleCreateProfile} className="space-y-6">
             <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your Name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-lg text-amber-100 focus:ring-2 focus:ring-amber-500 outline-none" maxLength={12} />
             <button type="submit" disabled={!tempName.trim()} className="w-full bg-amber-500 text-slate-900 font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 uppercase tracking-widest text-xs">Enter Palace</button>
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
             <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20"><Wallet className="w-7 h-7 text-amber-500" /></div>
                    <div>
                       <h3 className="font-playfair font-bold text-slate-100 text-lg">Royal Treasury</h3>
                       <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Somnia Testnet Identity</div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-6">
                    {isConnecting ? (
                      <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                    ) : isConnected && address ? (
                       <div className="flex items-center gap-4 bg-slate-950/80 px-6 py-3 rounded-2xl border border-white/5">
                           <div className="text-right">
                              <div className="text-xs font-black text-slate-400 uppercase mb-1">{web3Service.shortenAddress(address)}</div>
                              <div className={`text-sm font-mono font-black flex items-center gap-2 justify-end ${isEligible ? 'text-emerald-400' : 'text-amber-500'}`}>
                                 {isBalanceLoading ? '...' : `${parseFloat(balance).toFixed(2)} STT`}
                                 {isEligible && <ShieldCheck className="w-4 h-4" />}
                              </div>
                           </div>
                           <button onClick={disconnect} className="p-2 hover:bg-white/5 rounded-xl text-slate-500"><Power size={18} /></button>
                       </div>
                    ) : (
                       <button onClick={connect} className="bg-amber-500 text-slate-950 px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Connect Wallet</button>
                    )}
                 </div>
             </div>

             {isMismatched && (
               <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <span className="text-xs text-amber-100 font-black uppercase">Switch to Somnia Testnet</span>
                  <button onClick={switchChain} className="bg-amber-500 text-slate-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Fix Sync</button>
               </div>
             )}

             {isConnected && isEligible ? (
               <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                     <div className="text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black flex items-center gap-2"><Smartphone size={14} /> Training Grounds</div>
                     <div className="grid sm:grid-cols-2 gap-6">
                       <button onClick={() => startLocalGame('VS_BOT', 2)} className="bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-105">
                          <Bot className="w-8 h-8 text-emerald-400 mb-4" />
                          <h3 className="text-xl font-bold text-white font-playfair">AI Duel</h3>
                          <p className="text-slate-500 text-[10px] uppercase mt-1">Single Player Practice</p>
                       </button>
                       <button onClick={() => startLocalGame('PASS_AND_PLAY', 2)} className="bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-105">
                          <Users className="w-8 h-8 text-purple-400 mb-4" />
                          <h3 className="text-xl font-bold text-white font-playfair">Local Pass</h3>
                          <p className="text-slate-500 text-[10px] uppercase mt-1">Two Player Couch Mode</p>
                       </button>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black flex items-center gap-2"><Globe size={14} /> Global Sovereignty</div>
                     
                     {setupStep === 'WAITING' ? (
                       <div className="bg-slate-900 border-2 border-blue-500/50 p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6">
                          <Loader2 size={40} className="text-blue-400 animate-spin" />
                          <div>
                             <h4 className="text-2xl font-playfair font-black text-white uppercase tracking-widest">Waiting for Rulers</h4>
                             <p className="text-xs text-slate-500 uppercase font-black">{roomInfo?.current} / {roomInfo?.max || '?'} Ready</p>
                          </div>
                          <div className="bg-slate-950 px-10 py-6 rounded-3xl border border-white/10">
                             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Room Secret</p>
                             <div className="text-4xl font-mono font-black text-blue-400 tracking-widest">{roomInfo?.code}</div>
                          </div>
                          <button onClick={exitGame} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Abort</button>
                       </div>
                     ) : setupStep === 'CREATE_SELECT' ? (
                       <div className="bg-slate-900 border border-blue-500/20 p-8 rounded-[2.5rem]">
                          <div className="flex justify-between items-center mb-8">
                             <h3 className="font-playfair font-black text-2xl text-blue-400">Assemble Legions</h3>
                             <button onClick={() => setSetupStep('IDLE')} className="p-2 text-slate-500"><X size={20}/></button>
                          </div>
                          <div className="grid grid-cols-3 gap-6">
                            {[2, 3, 4].map(num => (
                              <button key={num} onClick={() => handleCreateRoom(num)} className="bg-slate-800 hover:bg-blue-600 text-white py-8 rounded-2xl font-black text-2xl border border-white/5">{num}</button>
                            ))}
                          </div>
                       </div>
                     ) : setupStep === 'JOIN_INPUT' ? (
                       <div className="bg-slate-900 border border-blue-500/20 p-8 rounded-[2.5rem]">
                          <div className="flex justify-between items-center mb-8">
                             <h3 className="font-playfair font-black text-2xl text-blue-400">Enter Secret</h3>
                             <button onClick={() => setSetupStep('IDLE')} className="p-2 text-slate-500"><X size={20}/></button>
                          </div>
                          <div className="space-y-6 text-center">
                             <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-4 py-6 text-center text-4xl font-mono font-black text-blue-400 outline-none" maxLength={6} />
                             <button onClick={() => handleJoinRoom()} disabled={joinCode.length < 6} className="w-full bg-blue-500 text-slate-950 py-5 rounded-2xl font-black text-xs uppercase disabled:opacity-50">Join Stronghold</button>
                          </div>
                       </div>
                     ) : (
                       <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-blue-500/10 grid grid-cols-2 gap-4">
                          <button onClick={() => setSetupStep('CREATE_SELECT')} className="flex flex-col items-center justify-center gap-4 bg-slate-950/60 border border-white/5 rounded-3xl p-6 hover:bg-blue-500/10">
                             <Zap className="text-blue-400" />
                             <span className="text-[10px] font-black uppercase text-slate-300">Create</span>
                          </button>
                          <button onClick={() => setSetupStep('JOIN_INPUT')} className="flex flex-col items-center justify-center gap-4 bg-slate-950/60 border border-white/5 rounded-3xl p-6 hover:bg-blue-500/10">
                             <Hash className="text-blue-400" />
                             <span className="text-[10px] font-black uppercase text-slate-300">Join</span>
                          </button>
                          <button onClick={handleQuickMatch} className="col-span-2 flex items-center justify-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6 font-black uppercase text-xs shadow-xl">
                             <PlayCircle size={20} /> Quick Match
                          </button>
                       </div>
                     )}
                  </div>
               </div>
             ) : (
               <div className="bg-slate-900/60 p-12 rounded-[3rem] text-center space-y-8">
                  <Lock className="w-20 h-20 text-slate-700 mx-auto" />
                  <div>
                    <h3 className="text-3xl font-playfair font-black text-amber-100">Access Restricted</h3>
                    <p className="text-slate-400 text-sm font-light mt-2">Connect your Somnia wallet with 1.0 STT to play.</p>
                  </div>
                  {!isConnected ? (
                    <button onClick={connect} className="bg-amber-500 text-slate-950 px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Connect Wallet</button>
                  ) : (
                    <a href="https://testnet.somnia.network/" target="_blank" className="text-amber-500 underline text-xs font-black uppercase">Refill Treasury</a>
                  )}
               </div>
             )}
          </div>
        )}
        {activeTab === 'rules' && <RulesSheet />}
        {activeTab === 'arbiter' && (<div className="max-w-3xl mx-auto pt-10"><Arbiter /></div>)}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-t border-white/5 px-8 py-5 z-50 md:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {[
            { id: 'lobby', icon: Layers, label: 'Palace' },
            { id: 'rules', icon: BookOpen, label: 'Codex' },
            { id: 'arbiter', icon: HelpCircle, label: 'Arbiter' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-2 ${activeTab === tab.id ? 'text-amber-500' : 'text-slate-600'}`}>
              <tab.icon size={22} />
              <span className="text-[10px] font-black uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}