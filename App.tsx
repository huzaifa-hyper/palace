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
  X, 
  Bot, 
  Loader2, 
  ShieldCheck,
  Power,
  Users,
  Zap,
  Lock,
  PlayCircle,
  Clock,
  Trophy,
  Coins,
  Ticket,
  Share2,
  Users2,
  ShieldEllipsis
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
      <main className="max-w-7xl mx-auto p-4 md:p-6 min-h-[calc(100vh-80px)] space-y-10">
        
        {/* Top Bar / Wallet Stats */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20"><Wallet className="w-6 h-6 text-amber-500" /></div>
               <div>
                  <h3 className="font-playfair font-bold text-slate-100 text-base">Royal Treasury</h3>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Somnia Testnet Network</div>
               </div>
            </div>
            
            <div className="flex items-center gap-6">
               {isConnecting ? (
                 <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
               ) : isConnected && address ? (
                  <div className="flex items-center gap-4 bg-slate-950/80 px-5 py-2.5 rounded-2xl border border-white/5">
                      <div className="text-right">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{web3Service.shortenAddress(address)}</div>
                         <div className={`text-sm font-mono font-black flex items-center gap-2 justify-end ${isEligible ? 'text-emerald-400' : 'text-amber-500'}`}>
                            {isBalanceLoading ? '...' : `${parseFloat(balance).toFixed(2)} STT`}
                            {isEligible && <ShieldCheck className="w-3.5 h-3.5" />}
                         </div>
                      </div>
                      <button onClick={disconnect} className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-500 transition-colors"><Power size={16} /></button>
                  </div>
               ) : (
                  <button onClick={connect} className="bg-amber-500 text-slate-950 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-amber-400 transition-all">Connect Wallet</button>
               )}
            </div>
        </div>

        {activeTab === 'lobby' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
             
             {isMismatched && (
               <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <span className="text-xs text-amber-100 font-black uppercase">Switch to Somnia Testnet</span>
                  <button onClick={switchChain} className="bg-amber-500 text-slate-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Fix Sync</button>
               </div>
             )}

             {isConnected && isEligible ? (
               <div className="grid md:grid-cols-2 gap-8">
                  
                  {/* Zone 1: Training (The Academy) */}
                  <div className="space-y-6">
                     <div className="text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black flex items-center gap-2 px-2"><Smartphone size={14} /> The Academy</div>
                     
                     {setupStep === 'AI_SELECT' ? (
                        <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-[2.5rem] animate-in slide-in-from-left-4 h-full flex flex-col min-h-[360px]">
                          <div className="flex justify-between items-center mb-6">
                             <h3 className="font-playfair font-black text-xl text-emerald-400 uppercase tracking-tight">AI Challenge</h3>
                             <button onClick={() => setSetupStep('IDLE')} className="p-1.5 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full"><X size={16}/></button>
                          </div>
                          <p className="text-[10px] text-slate-500 mb-8 uppercase tracking-[0.2em] font-black">Select Party Size</p>
                          <div className="grid grid-cols-3 gap-4 flex-1">
                            {[2, 3, 4].map(num => (
                              <button key={num} onClick={() => startLocalGame('VS_BOT', num)} className="bg-slate-800 hover:bg-emerald-600 text-white py-10 rounded-2xl font-black text-3xl border border-white/5 transition-all hover:scale-105 active:scale-95 shadow-lg">{num}</button>
                            ))}
                          </div>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                        <button onClick={() => setSetupStep('AI_SELECT')} className="bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] group relative overflow-hidden shadow-xl border-l-emerald-500/20 border-l-4">
                            <div className="absolute -right-6 -top-6 text-emerald-500/5 transform group-hover:scale-110 transition-transform"><Bot size={120} /></div>
                            <Bot className="w-8 h-8 text-emerald-400 mb-4" />
                            <h3 className="text-2xl font-bold text-white font-playfair mb-1">AI Duel</h3>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">Multi-Ruler Practice</p>
                        </button>
                        <button onClick={() => startLocalGame('PASS_AND_PLAY', 2)} className="bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] group relative overflow-hidden shadow-xl border-l-purple-500/20 border-l-4">
                            <div className="absolute -right-6 -top-6 text-purple-500/5 transform group-hover:scale-110 transition-transform"><Users size={120} /></div>
                            <Users className="w-8 h-8 text-purple-400 mb-4" />
                            <h3 className="text-2xl font-bold text-white font-playfair mb-1">Local Pass</h3>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">Shared Device Skirmish</p>
                        </button>
                       </div>
                     )}
                  </div>

                  {/* Zone 2: Tournament (The Arena) */}
                  <div className="space-y-6">
                    <div className="text-amber-500/60 uppercase tracking-[0.4em] text-[10px] font-black flex items-center gap-2 px-2"><Trophy size={14} /> The Arena</div>
                    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border-2 border-amber-500/20 p-8 rounded-[2.5rem] flex flex-col relative group overflow-hidden shadow-2xl min-h-[360px]">
                        <div className="absolute -right-10 -bottom-10 text-amber-500/5 rotate-12 group-hover:scale-110 transition-transform"><Trophy size={200} /></div>
                        
                        <div className="flex items-center justify-between mb-8">
                           <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg"><Coins className="text-amber-500" /></div>
                           <div className="bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">Live Prize Pool</div>
                        </div>

                        <h3 className="text-3xl font-playfair font-black text-white mb-2 leading-none uppercase tracking-tight">Imperial Tournament</h3>
                        <p className="text-amber-500/70 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Conquer for SOMI Tokens</p>

                        <div className="space-y-5 flex-1">
                           <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center shrink-0"><Ticket size={16} className="text-amber-400" /></div>
                              <p className="text-xs text-slate-400 leading-relaxed font-light">Deposit <span className="text-white font-bold">5 STT</span> to the prize pool to receive your <span className="text-amber-400 font-bold uppercase tracking-tighter">Tournament Pass</span>.</p>
                           </div>
                           <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center shrink-0"><Crown size={16} className="text-amber-400" /></div>
                              <p className="text-xs text-slate-400 leading-relaxed font-light">The Elite Rulers with the <span className="text-white font-bold">most wins</span> will claim <span className="text-emerald-400 font-bold uppercase tracking-tighter">SOMI Tokens</span> from the pool.</p>
                           </div>
                        </div>

                        <button className="w-full mt-10 bg-amber-500 text-slate-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 z-10">
                           Join Prize Pool
                        </button>
                    </div>
                  </div>

                  {/* Zone 3: Project Exclusive (Sovereign Alliances) */}
                  <div className="space-y-6">
                    <div className="text-indigo-400 uppercase tracking-[0.4em] text-[10px] font-black flex items-center gap-2 px-2"><Share2 size={14} /> Sovereign Alliances</div>
                    <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 p-8 rounded-[2.5rem] flex flex-col relative group overflow-hidden shadow-2xl min-h-[360px]">
                        <div className="absolute -right-10 -top-10 text-indigo-500/5 rotate-[-15deg] group-hover:scale-110 transition-transform"><Share2 size={240} /></div>
                        
                        <div className="flex items-center justify-between mb-8">
                           <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg"><Users2 className="text-indigo-400" /></div>
                           <div className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">Project Portals</div>
                        </div>

                        <h3 className="text-3xl font-playfair font-black text-white mb-2 leading-none uppercase tracking-tight">Project Exclusive</h3>
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Community Conquests</p>

                        <div className="space-y-5 flex-1">
                           <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center shrink-0"><ShieldEllipsis size={16} className="text-indigo-400" /></div>
                              <p className="text-xs text-slate-400 leading-relaxed font-light">Launch <span className="text-white font-bold">self-funded tournaments</span> where your community earns <span className="text-indigo-400 font-bold uppercase tracking-tighter">Native Tokens</span> or SOMI.</p>
                           </div>
                           <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center shrink-0"><Share2 size={16} className="text-indigo-400" /></div>
                              <p className="text-xs text-slate-400 leading-relaxed font-light">Set <span className="text-white font-bold">Social Quests</span> (Like/Follow/RT) to gate entry. Choose between <span className="text-white font-bold">Public Sieges</span> or <span className="text-white font-bold">Private Skirmishes</span>.</p>
                           </div>
                        </div>

                        <button className="w-full mt-10 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 z-10">
                           Launch Partnership
                        </button>
                    </div>
                  </div>

                  {/* Zone 4: Multiplayer (The World) */}
                  <div className="space-y-6">
                     <div className="text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black flex items-center gap-2 px-2"><Globe size={14} /> The World</div>
                     
                     <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-blue-500/10 flex flex-col items-center justify-center text-center relative overflow-hidden h-full min-h-[360px] shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none"></div>
                        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-6 shadow-xl relative z-10">
                           <Clock className="w-10 h-10 text-blue-400 animate-pulse" />
                        </div>
                        <h3 className="text-3xl font-playfair font-black text-blue-100 mb-2 uppercase tracking-tight relative z-10">Coming Soon</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10 relative z-10">Multiplayer & Ranked</p>
                        
                        <p className="text-slate-500 text-xs font-light max-w-[240px] leading-relaxed uppercase tracking-widest mb-10 relative z-10 opacity-70">
                           Global match-making and P2P combat are being prepared for the next stage of the Sovereign Testnet.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-3 opacity-30 pointer-events-none grayscale relative z-10">
                           <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                              <Zap size={14} className="text-blue-400" />
                              <span className="text-[10px] font-black uppercase">Create</span>
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
               <div className="bg-slate-900/60 p-12 rounded-[3rem] text-center space-y-8 shadow-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none"></div>
                  <div className="relative inline-block">
                    <Lock className="w-20 h-20 text-slate-700 mx-auto" />
                    <div className="absolute -inset-4 bg-amber-500/5 blur-2xl rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-playfair font-black text-amber-100 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-slate-400 text-sm font-light mt-3 max-w-sm mx-auto">Connect your Somnia wallet and ensure a balance of at least <span className="text-amber-500 font-bold">{MIN_STT_REQUIRED} STT</span> to enter the Royal Palace.</p>
                  </div>
                  {!isConnected ? (
                    <button onClick={connect} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95">Connect Wallet</button>
                  ) : (
                    <div className="flex flex-col items-center gap-5">
                      <div className="bg-amber-500/10 border border-amber-500/20 px-8 py-4 rounded-2xl text-amber-500 text-sm font-black uppercase tracking-widest shadow-inner">Treasury Balance: {parseFloat(balance).toFixed(2)} STT</div>
                      <a href="https://testnet.somnia.network/" target="_blank" className="text-amber-500 underline text-[10px] font-black uppercase tracking-[0.4em] hover:text-amber-400 transition-colors">Refill Treasury via Faucet</a>
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
      <header className="hidden md:flex items-center justify-between px-16 py-8 max-w-7xl mx-auto border-b border-white/5 mb-4">
         <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6"><Crown className="text-slate-900" /></div>
            <div className="flex flex-col">
               <h1 className="text-3xl font-playfair font-black text-white tracking-tighter leading-none">Palace Rulers</h1>
               <span className="text-[8px] text-amber-500 font-black uppercase tracking-[0.5em] mt-1">Sovereign Edition</span>
            </div>
         </div>
         <div className="flex gap-16">
            {['lobby', 'rules', 'arbiter'].map((tab) => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all relative py-2 ${activeTab === tab ? 'text-amber-500' : 'text-slate-600 hover:text-slate-300'}`}
               >
                  {tab}
                  {activeTab === tab && (
                     <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-amber-500 animate-in fade-in slide-in-from-left-2"></div>
                  )}
               </button>
            ))}
         </div>
      </header>
    </div>
  );
}
