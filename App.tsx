"use client";

import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { Arbiter } from './components/Arbiter';
import { Game } from './components/Game';
import { RulesSheet } from './components/RulesSheet';
import { UserProfile, GameMode } from './types';
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
  const [offlineSetupMode, setOfflineSetupMode] = useState<GameMode | null>(null);
  const [protocolError, setProtocolError] = useState<string | null>(null);

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
      setProtocolError("Wallet connection requires a secure context (HTTPS).");
    }
  }, []);

  useEffect(() => {
    const savedProfile = localStorage.getItem('palace_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setIsProfileModalOpen(false);
    }
  }, []);

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

  const startLocalGame = (mode: GameMode, playerCount: number) => {
    // Strict Guard: Must be connected and eligible
    if (!isConnected || !isEligible) {
      setActiveTab('lobby');
      return;
    }
    p2pService.destroy(); 
    setGameConfig({ mode, playerCount });
    setOfflineSetupMode(null);
  };

  const exitGame = () => {
    setGameConfig(null);
    setActiveTab('lobby');
  };

  if (protocolError) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[200] bg-felt">
        <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-3xl max-w-md text-center backdrop-blur-xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Security Notice</h2>
          <p className="text-red-200">{protocolError}</p>
        </div>
      </div>
    );
  }

  // If game is active, but eligibility is lost, the Game component should handle or this wrapper
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
        {/* Global Access Guard: If not eligible, only show the Lock Screen in Lobby */}
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
               <div className="grid md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
                  <div className="space-y-6">
                     <div className="flex items-center gap-2 text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black"><Smartphone className="w-4 h-4" /> Combat Training</div>
                     <div className="grid gap-6">
                       <div className="relative group">
                         {offlineSetupMode === 'VS_BOT' ? (
                           <div className="bg-slate-900 border-2 border-emerald-500/50 p-8 rounded-[2.5rem] animate-in zoom-in-95 duration-300 backdrop-blur-3xl shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                              <div className="flex justify-between items-center mb-8"><h3 className="font-playfair font-black text-2xl text-emerald-400">Select Opponents</h3><button onClick={() => setOfflineSetupMode(null)} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button></div>
                              <div className="grid grid-cols-3 gap-6">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('VS_BOT', num)} className="bg-slate-800 hover:bg-emerald-600 text-white py-6 rounded-2xl font-black text-lg transition-all shadow-xl hover:scale-105 active:scale-95 border border-white/5">{num}</button>))}</div>
                           </div>
                         ) : (
                           <button 
                            onClick={() => setOfflineSetupMode('VS_BOT')} 
                            className="w-full group bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden"
                           >
                              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><Bot className="w-32 h-32 text-white" /></div>
                              <div className="relative z-10">
                                 <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20"><Bot className="w-7 h-7 text-emerald-400" /></div>
                                 <h3 className="text-3xl font-bold text-white mb-2 font-playfair tracking-tight">VS Palace AI</h3>
                                 <p className="text-slate-500 text-sm leading-relaxed max-w-[85%] font-light">Train your tactical maneuvers against the Kingdom's finest automated strategists.</p>
                              </div>
                           </button>
                         )}
                       </div>

                       <div className="relative group">
                         {offlineSetupMode === 'PASS_AND_PLAY' ? (
                           <div className="bg-slate-900 border-2 border-purple-500/50 p-8 rounded-[2.5rem] animate-in zoom-in-95 duration-300 backdrop-blur-3xl shadow-[0_0_50px_rgba(168,85,247,0.1)]">
                              <div className="flex justify-between items-center mb-8"><h3 className="font-playfair font-black text-2xl text-purple-400">Total Rulers</h3><button onClick={() => setOfflineSetupMode(null)} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button></div>
                              <div className="grid grid-cols-3 gap-6">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('PASS_AND_PLAY', num)} className="bg-slate-800 hover:bg-purple-600 text-white py-6 rounded-2xl font-black text-lg transition-all shadow-xl hover:scale-105 active:scale-95 border border-white/5">{num}</button>))}</div>
                           </div>
                         ) : (
                           <button 
                            onClick={() => setOfflineSetupMode('PASS_AND_PLAY')} 
                            className="w-full group bg-slate-900/60 hover:bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden"
                           >
                              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><Users className="w-32 h-32 text-white" /></div>
                              <div className="relative z-10">
                                 <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20"><Smartphone className="w-7 h-7 text-purple-400" /></div>
                                 <h3 className="text-3xl font-bold text-white mb-2 font-playfair tracking-tight">Local Skirmish</h3>
                                 <p className="text-slate-500 text-sm leading-relaxed max-w-[85%] font-light">Settle royal disputes face-to-face on a single device. Honor is optional.</p>
                              </div>
                           </button>
                         )}
                       </div>
                     </div>
                  </div>

                  <div className="space-y-6 h-full flex flex-col">
                     <div className="flex items-center gap-2 text-slate-600 uppercase tracking-[0.4em] text-[10px] font-black"><Globe className="w-4 h-4" /> Global Sovereignty</div>
                     <div className="flex-1 bg-slate-900/40 p-10 rounded-[2.5rem] border border-blue-500/10 relative overflow-hidden backdrop-blur-sm flex flex-col justify-center text-center">
                        <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center gap-6 p-8">
                           <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 animate-pulse"><Globe size={40} className="text-blue-400" /></div>
                           <div className="space-y-2">
                              <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black tracking-[0.3em] shadow-2xl uppercase border border-blue-400/50">Somnia Mainnet Soon</span>
                              <p className="text-xs text-slate-400 font-light max-w-xs mx-auto">Ranked matches with STT stakes and global leaderboards are being forged by the architects.</p>
                           </div>
                        </div>
                     </div>
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