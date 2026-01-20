"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layers, 
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
  ShieldEllipsis,
  Twitter,
  ExternalLink,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { Game } from './components/Game';
import { RulesSheet } from './components/RulesSheet';
import { UserProfile, GameMode, GameStateSnapshot } from './types';
import { SOMNIA_CHAIN_ID, web3Service } from './services/web3Service';
import { p2pService } from './services/p2pService';
import { useMinimumBalance, MIN_STT_REQUIRED } from './hooks/useMinimumBalance';
import { useWallet } from './hooks/useWallet';

export default function App() {
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'lobby' | 'rules'>('lobby');
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
             <button type="submit" disabled={!tempName.trim()} className="w-full bg-amber-500 text-slate-950 font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 uppercase tracking-widest text-xs">Enter Palace</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-felt text-slate-200 selection:bg-amber-500/30 font-sans pb-safe-area-bottom">
      <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-16">
        
        {/* Wallet & Status Bar */}
        <div className="bg-slate-900/40 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20"><Wallet className="w-5 h-5 text-amber-500" /></div>
               <div>
                  <h3 className="font-playfair font-bold text-slate-100 text-sm">Royal Treasury</h3>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Network: Somnia Dream</div>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               {isConnecting ? (
                 <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
               ) : isConnected && address ? (
                  <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-xl border border-white/5">
                      <div className="text-right">
                         <div className="text-[9px] font-black text-slate-500 uppercase">{web3Service.shortenAddress(address)}</div>
                         <div className={`text-xs font-mono font-black flex items-center gap-1.5 justify-end ${isEligible ? 'text-emerald-400' : 'text-amber-500'}`}>
                            {isBalanceLoading ? '...' : `${parseFloat(balance).toFixed(2)} STT`}
                            {isEligible && <ShieldCheck className="w-3 h-3" />}
                         </div>
                      </div>
                      <button onClick={disconnect} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-600 transition-colors"><Power size={14} /></button>
                  </div>
               ) : (
                  <button onClick={connect} className="bg-amber-500 text-slate-950 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-amber-400 transition-all">Connect Wallet</button>
               )}
            </div>
        </div>

        {activeTab === 'lobby' && (
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {isMismatched && (
               <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-2xl flex items-center justify-between gap-4 max-w-2xl mx-auto">
                  <span className="text-xs text-amber-100 font-black uppercase">Switch to Somnia Testnet</span>
                  <button onClick={switchChain} className="bg-amber-500 text-slate-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Fix Sync</button>
               </div>
             )}

             {isConnected && isEligible ? (
               <div className="space-y-20">
                  
                  {/* --- THE ACADEMY --- */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                      <Smartphone size={18} className="text-slate-600" />
                      <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">The Academy</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      {/* AI Duel Card */}
                      <div className="relative group">
                        <div className={`bg-slate-900/80 border-2 transition-all duration-300 rounded-[3rem] overflow-hidden flex flex-col h-[480px] ${setupStep === 'AI_SELECT' ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'border-white/5 hover:border-white/20'}`}>
                          <div className="p-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                              <Bot className={`w-12 h-12 ${setupStep === 'AI_SELECT' ? 'text-emerald-400' : 'text-slate-500'}`} />
                              {setupStep === 'AI_SELECT' && (
                                <button onClick={() => setSetupStep('IDLE')} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors">
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                            
                            <h3 className="text-4xl font-playfair font-black text-white mb-2">AI Duel</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-auto">Multi-Ruler Neural Combat</p>
                            
                            {setupStep === 'AI_SELECT' ? (
                              <div className="space-y-6 animate-in fade-in zoom-in-95">
                                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest text-center">Select Party Size</p>
                                <div className="grid grid-cols-3 gap-4">
                                  {[2, 3, 4].map(num => (
                                    <button 
                                      key={num} 
                                      onClick={() => startLocalGame('VS_BOT', num)}
                                      className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 py-8 rounded-2xl font-black text-3xl transition-all hover:scale-105 active:scale-95"
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setSetupStep('AI_SELECT')} className="w-full bg-slate-800 hover:bg-slate-700 border border-white/5 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                Enter Simulation <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Local Pass Card */}
                      <div className="relative group">
                        <div className="bg-slate-900/80 border-2 border-white/5 hover:border-purple-500/30 transition-all duration-300 rounded-[3rem] overflow-hidden flex flex-col h-[480px]">
                          <div className="p-10 flex flex-col h-full">
                            <div className="mb-6"><Users className="w-12 h-12 text-slate-500 group-hover:text-purple-400 transition-colors" /></div>
                            <h3 className="text-4xl font-playfair font-black text-white mb-2">Local Pass</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-auto">Shared Device Skirmish</p>
                            
                            <p className="text-xs text-slate-400 font-light leading-relaxed mb-8 max-w-xs">
                              Gather your friends and play locally on a single device. Turn-based strategy in its purest form.
                            </p>

                            <button onClick={() => startLocalGame('PASS_AND_PLAY', 2)} className="w-full bg-slate-800 hover:bg-slate-700 border border-white/5 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                              Start Skirmish <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* --- THE ARENA --- */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                      <Trophy size={18} className="text-amber-500/50" />
                      <h2 className="text-xs font-black text-amber-500/50 uppercase tracking-[0.4em]">The Arena</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-amber-500/10 to-transparent"></div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/20 p-10 md:p-16 rounded-[3.5rem] relative overflow-hidden group shadow-2xl">
                        <div className="absolute -right-20 -bottom-20 text-amber-500/5 rotate-12 group-hover:scale-110 transition-transform pointer-events-none"><Trophy size={400} /></div>
                        
                        <div className="flex flex-col md:flex-row gap-12 items-center opacity-60 grayscale">
                          <div className="flex-1 space-y-8">
                            <div className="flex items-center gap-4">
                               <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg"><Coins className="text-amber-500" /></div>
                               <div className="bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Active Prize Pool</div>
                            </div>

                            <h3 className="text-5xl font-playfair font-black text-white leading-none uppercase tracking-tight">Imperial Tournament</h3>
                            
                            <div className="grid sm:grid-cols-2 gap-8">
                               <div className="flex gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center shrink-0"><Ticket size={18} className="text-amber-400" /></div>
                                  <div>
                                    <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">Buy-In</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed font-light">Deposit <span className="text-white font-bold">5 STT</span> to enter. All funds go directly to the seasonal prize pool.</p>
                                  </div>
                               </div>
                               <div className="flex gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center shrink-0"><Crown size={18} className="text-amber-400" /></div>
                                  <div>
                                    <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">Reward</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed font-light">The top 3 Rulers each week claim the <span className="text-emerald-400 font-bold uppercase tracking-tighter">SOMI Reward Pool</span>.</p>
                                  </div>
                               </div>
                            </div>
                          </div>

                          <div className="w-full md:w-80 shrink-0 text-center space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl py-8 px-4 flex flex-col items-center gap-4">
                                <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
                                <h4 className="text-2xl font-playfair font-black text-amber-100 uppercase">Coming Soon</h4>
                            </div>
                            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Competitive play is in development</p>
                          </div>
                        </div>
                    </div>
                  </section>

                  {/* --- SOVEREIGN ALLIANCES --- */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                      <Share2 size={18} className="text-indigo-400" />
                      <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em]">Sovereign Alliances</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/10 to-transparent"></div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-950/20 via-slate-900 to-slate-900 border border-indigo-500/20 p-10 md:p-16 rounded-[3.5rem] relative overflow-hidden group shadow-2xl">
                        <div className="absolute -left-20 -top-20 text-indigo-500/5 rotate-[-15deg] group-hover:scale-110 transition-transform pointer-events-none"><Users2 size={400} /></div>
                        
                        <div className="flex flex-col md:flex-row gap-12 opacity-60 grayscale">
                          <div className="flex-1 space-y-8">
                             <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg"><Users2 className="text-indigo-400" /></div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Partner Portals</span>
                                  <h3 className="text-4xl font-playfair font-black text-white uppercase tracking-tight">Project Portals</h3>
                                </div>
                             </div>

                             <div className="grid sm:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                   <div className="flex items-center gap-3">
                                      <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-black text-indigo-300 uppercase">Self-Funded</div>
                                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase">Native Rewards</div>
                                   </div>
                                   <p className="text-xs text-slate-400 leading-relaxed font-light">
                                      Projects can launch custom-branded tournaments with their own token rewards or SOMI pools. 100% project-sponsored prize pools for their communities.
                                   </p>
                                </div>
                                <div className="space-y-4">
                                   <div className="flex items-center gap-3">
                                      <Twitter size={14} className="text-blue-400" />
                                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Social Gating</span>
                                   </div>
                                   <p className="text-xs text-slate-400 leading-relaxed font-light">
                                      Gate entries with social tasks: Follow, Like, and Retweet to earn your entry pass. Build community engagement through strategic gameplay.
                                   </p>
                                </div>
                             </div>
                          </div>

                          <div className="w-full md:w-80 shrink-0 flex flex-col justify-center text-center space-y-4">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl py-8 px-4 flex flex-col items-center gap-4">
                                <Clock className="w-10 h-10 text-indigo-400 animate-pulse" />
                                <h4 className="text-2xl font-playfair font-black text-indigo-100 uppercase">Coming Soon</h4>
                            </div>
                            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Portal APIs are in early access</p>
                          </div>
                        </div>
                    </div>
                  </section>

                  {/* --- THE WORLD --- */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                      <Globe size={18} className="text-blue-400/50" />
                      <h2 className="text-xs font-black text-blue-400/50 uppercase tracking-[0.4em]">The World</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-blue-500/10 to-transparent"></div>
                    </div>

                    <div className="bg-slate-900/20 p-12 rounded-[3.5rem] border border-blue-500/10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner min-h-[300px]">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none"></div>
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-6 shadow-xl relative z-10">
                           <Clock className="w-8 h-8 text-blue-400 animate-pulse" />
                        </div>
                        <h3 className="text-3xl font-playfair font-black text-blue-100 mb-2 uppercase tracking-tight relative z-10">Global Sovereignty</h3>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mb-8 relative z-10">Multiplayer & Ranked Ladder • Coming Soon</p>
                        
                        <div className="flex flex-wrap justify-center gap-3 opacity-20 pointer-events-none grayscale relative z-10">
                           <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                              <Zap size={12} className="text-blue-400" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Create</span>
                           </div>
                           <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                              <PlayCircle size={12} className="text-blue-400" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Quick Match</span>
                           </div>
                        </div>
                    </div>
                  </section>

               </div>
             ) : (
               <div className="bg-slate-900/60 p-12 rounded-[3rem] text-center space-y-8 shadow-2xl border border-white/5 relative overflow-hidden max-w-2xl mx-auto">
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
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-t border-white/5 px-8 py-5 z-50 md:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {[
            { id: 'lobby', icon: Layers, label: 'Palace' },
            { id: 'rules', icon: BookOpen, label: 'Codex' }
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
         <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab('lobby')}>
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6"><Crown className="text-slate-900" /></div>
            <div className="flex flex-col">
               <h1 className="text-3xl font-playfair font-black text-white tracking-tighter leading-none">Palace Rulers</h1>
               <span className="text-[8px] text-amber-500 font-black uppercase tracking-[0.5em] mt-1">Sovereign Edition</span>
            </div>
         </div>
         <div className="flex gap-16">
            {['lobby', 'rules'].map((tab) => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all relative py-2 ${activeTab === tab ? 'text-amber-500' : 'text-slate-600 hover:text-slate-300'}`}
               >
                  {tab === 'lobby' ? 'The Palace' : 'The Codex'}
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
