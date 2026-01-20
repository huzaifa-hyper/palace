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
  PlayCircle,
  Clock
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
  const [setupStep, setSetupStep] = useState<'IDLE' | 'AI_SELECT' | 'WAITING'>('IDLE');
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
    setActiveTab('lobby');
  }, []);

  const startLocalGame = (mode: GameMode, playerCount: number) => {
    if (!isConnected || !isEligible) return;
    setGameConfig({ mode, playerCount });
    setSetupStep('IDLE');
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
                     
                     {setupStep === 'AI_SELECT' ? (
                        <div className="bg-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] animate-in slide-in-from-left-4">
                          <div className="flex justify-between items-center mb-8">
                             <h3 className="font-playfair font-black text-2xl text-emerald-400">AI Challenge</h3>
                             <button onClick={() => setSetupStep('IDLE')} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
                          </div>
                          <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest font-black">Select Total Rulers (You + AI Bots)</p>
                          <div className="grid grid-cols-3 gap-6">
                            {[2, 3, 4].map(num => (
                              <button key={num} onClick={() => startLocalGame('VS_BOT', num)} className="bg-slate-800 hover:bg-emerald-600 text-white py-8 rounded-2xl font-black text-2xl border border-white/5 transition-all hover:scale-105 active:scale-95">{num}</button>
                            ))}
                          </div>
                       </div>
                     ) : (
                       <div className="grid sm:grid-cols-2 gap-6">
                        <button onClick={() => setSetupStep('AI_SELECT')} className="bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-105 group relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-white/5 transform group-hover:scale-110 transition-transform"><Bot size={80} /></div>
                            <Bot className="w-8 h-8 text-emerald-400 mb-4" />
                            <h3 className="text-xl font-bold text-white font-playfair">AI Duel</h3>
                            <p className="text-slate-500 text-[10px] uppercase mt-1">Multi-Ruler AI Combat</p>
                        </button>
                        <button onClick={() => startLocalGame('PASS_AND_PLAY', 2)} className="bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-105 group relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-white/5 transform group-hover:scale-110 transition-transform"><Users size={80} /></div>
                            <Users className="w-8 h-8 text-purple-400 mb-4" />
                            <h3 className="text-xl font-bold text-white font-playfair">Local Pass</h3>
                            <p className="text-slate-500 text-[10px] uppercase mt-1">Shared Device Combat</p>
                        </button>
                       </div>
                     )}
                  </div>

                  <div className="space-y-6">
                     <div className="text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black flex items-center gap-2"><Globe size={14} /> Global Sovereignty</div>
                     
                     <div className="bg-slate-900/40 p-12 rounded-[2.5rem] border border-blue-500/10 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-6">
                           <Clock className="w-10 h-10 text-blue-400 animate-pulse" />
                        </div>
                        <h3 className="text-3xl font-playfair font-black text-blue-100 mb-2">Coming Soon</h3>
                        <p className="text-slate-500 text-xs font-light max-w-[240px] leading-relaxed uppercase tracking-widest mb-8">
                           Global multiplayer and ranked quick-match are being prepared for the next stage of the testnet.
                        </p>
                        
                        <div className="flex gap-4 opacity-40 pointer-events-none grayscale">
                           <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                              <Zap size={14} className="text-blue-400" />
                              <span className="text-[10px] font-black uppercase">Create</span>
                           </div>
                           <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                              <Hash size={14} className="text-blue-400" />
                              <span className="text-[10px] font-black uppercase">Join</span>
                           </div>
                           <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                              <PlayCircle size={14} className="text-blue-400" />
                              <span className="text-[10px] font-black uppercase">Quick</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="bg-slate-900/60 p-12 rounded-[3rem] text-center space-y-8 shadow-2xl border border-white/5">
                  <div className="relative inline-block">
                    <Lock className="w-20 h-20 text-slate-700 mx-auto" />
                    <div className="absolute -inset-4 bg-amber-500/5 blur-2xl rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-playfair font-black text-amber-100">Access Restricted</h3>
                    <p className="text-slate-400 text-sm font-light mt-2 max-w-sm mx-auto">Connect your Somnia wallet and ensure a balance of at least {MIN_STT_REQUIRED} STT to enter the Palace.</p>
                  </div>
                  {!isConnected ? (
                    <button onClick={connect} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95">Connect Wallet</button>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-xl text-amber-500 text-xs font-bold uppercase">Treasury Check: {parseFloat(balance).toFixed(2)} STT</div>
                      <a href="https://testnet.somnia.network/" target="_blank" className="text-amber-500 underline text-xs font-black uppercase tracking-widest hover:text-amber-400 transition-colors">Refill STT at Faucet</a>
                    </div>
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
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-2 transition-all ${activeTab === tab.id ? 'text-amber-500 scale-110' : 'text-slate-600'}`}>
              <tab.icon size={22} />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Header for Desktop */}
      <header className="hidden md:flex items-center justify-between px-16 py-8 max-w-7xl mx-auto">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg"><Crown className="text-slate-900" /></div>
            <h1 className="text-3xl font-playfair font-black text-white tracking-tighter">Palace Rulers</h1>
         </div>
         <div className="flex gap-12">
            {['lobby', 'rules', 'arbiter'].map((tab) => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all relative py-2 ${activeTab === tab ? 'text-amber-500' : 'text-slate-600 hover:text-slate-300'}`}
               >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>}
               </button>
            ))}
         </div>
      </header>
    </div>
  );
}
