"use client";

import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Trophy, 
  HelpCircle, 
  BookOpen, 
  Crown, 
  Smartphone, 
  Globe, 
  Wallet, 
  AlertTriangle, 
  X, 
  Bot, 
  Lock, 
  Loader2, 
  ShieldCheck,
  Power,
  Users
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

  // Custom Wallet Integration
  const { address, isConnected, chainId, connect, disconnect, switchChain, isConnecting } = useWallet();
  const isMismatched = isConnected && chainId !== SOMNIA_CHAIN_ID;

  // Custom Balance Hook
  const { isEligible, balance, isLoading: isBalanceLoading } = useMinimumBalance();

  useEffect(() => {
    setHasMounted(true);
    const initSdk = async () => {
      try {
        await sdk.actions.ready();
      } catch (err) {
        console.warn("Farcaster SDK ready error:", err);
      }
    };
    initSdk();

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
    if (!isConnected || isMismatched || !isEligible) return;
    p2pService.destroy(); 
    setGameConfig({ mode, playerCount });
    setOfflineSetupMode(null);
  };

  const exitGame = () => {
    p2pService.destroy();
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

  if (gameConfig && userProfile) {
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
             <button type="submit" disabled={!tempName.trim()} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50">Enter Palace</button>
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
             {/* Simple Wallet Integration Header */}
             <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Wallet className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-200 text-sm">Somnia Network Identity</h3>
                       <div className="text-xs text-slate-400">Direct wallet interaction</div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-4">
                    {isConnecting ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                         <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                         Connecting...
                      </div>
                    ) : isConnected && address ? (
                       <div className="flex items-center gap-4 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-600">
                           <div className="text-right">
                              <div className="text-xs font-bold text-slate-300">{web3Service.shortenAddress(address)}</div>
                              <div className={`text-sm font-mono font-bold flex items-center gap-2 justify-end ${isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
                                 {isBalanceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${parseFloat(balance).toFixed(3)} STT`}
                                 {isEligible ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </div>
                           </div>
                           <button 
                            onClick={disconnect}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Disconnect"
                           >
                            <Power size={18} />
                           </button>
                       </div>
                    ) : (
                       <button 
                        onClick={connect}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg border-0"
                       >
                         Connect Wallet
                       </button>
                    )}
                 </div>
             </div>

             {isMismatched && (
               <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-lg">
                  <div className="flex items-center gap-3">
                     <AlertTriangle className="w-5 h-5 text-amber-500" />
                     <span className="text-sm text-amber-100 font-bold">Wrong Network: Switch to Somnia Testnet</span>
                  </div>
                  <button onClick={switchChain} className="bg-amber-600 text-slate-950 px-5 py-2 rounded-lg text-xs font-black shadow-lg hover:bg-amber-500 transition-colors">Switch Chain</button>
               </div>
             )}

             {/* Game Modes Grid */}
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-slate-500 uppercase tracking-widest text-[10px] font-black"><Smartphone className="w-3.5 h-3.5" /> Practice Grounds</div>
                   <div className="relative">
                     {offlineSetupMode === 'VS_BOT' ? (
                       <div className="bg-slate-800/95 border border-emerald-500/50 p-6 rounded-3xl animate-in fade-in zoom-in-95 backdrop-blur-md">
                          <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-emerald-400 flex items-center gap-2"><Bot size={18}/> Opponent Count</h3><button onClick={() => setOfflineSetupMode(null)} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"><X size={18}/></button></div>
                          <div className="grid grid-cols-3 gap-4">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('VS_BOT', num)} className="bg-slate-700 hover:bg-emerald-600 py-4 rounded-2xl font-bold transition-all shadow-md">{num} Players</button>))}</div>
                       </div>
                     ) : (
                       <button 
                        disabled={!isConnected || !isEligible || isMismatched}
                        onClick={() => setOfflineSetupMode('VS_BOT')} 
                        className="w-full group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 p-8 rounded-[2rem] text-left transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Bot className="w-32 h-32 text-white" /></div>
                          {(!isConnected || !isEligible || isMismatched) && <div className="absolute inset-0 bg-slate-950/60 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                              <Lock className="text-slate-400 w-8 h-8" />
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-3 py-1 bg-slate-900/80 rounded-full border border-slate-700">
                                {!isConnected ? "Wallet Required" : !isEligible ? "Min. 0.25 STT Required" : "Wrong Network"}
                              </span>
                          </div>}
                          <div className="relative z-10">
                             <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/20"><Bot className="w-7 h-7 text-emerald-400" /></div>
                             <h3 className="text-2xl font-bold text-white mb-2 font-playfair">VS Palace AI</h3>
                             <p className="text-slate-400 text-sm leading-relaxed max-w-[85%] font-light">Polish your maneuvers against adaptive AI lords in the training pits.</p>
                          </div>
                       </button>
                     )}
                   </div>

                   <div className="relative">
                     {offlineSetupMode === 'PASS_AND_PLAY' ? (
                       <div className="bg-slate-800/95 border border-purple-500/50 p-6 rounded-3xl animate-in fade-in zoom-in-95 backdrop-blur-md">
                          <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-purple-400 flex items-center gap-2"><Smartphone size={18}/> Player Count</h3><button onClick={() => setOfflineSetupMode(null)} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"><X size={18}/></button></div>
                          <div className="grid grid-cols-3 gap-4">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('PASS_AND_PLAY', num)} className="bg-slate-700 hover:bg-purple-600 py-4 rounded-2xl font-bold transition-all shadow-md">{num} Players</button>))}</div>
                       </div>
                     ) : (
                       <button 
                        disabled={!isConnected || !isEligible || isMismatched}
                        onClick={() => setOfflineSetupMode('PASS_AND_PLAY')} 
                        className="w-full group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 p-8 rounded-[2rem] text-left transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Users className="w-32 h-32 text-white" /></div>
                          {(!isConnected || !isEligible || isMismatched) && <div className="absolute inset-0 bg-slate-950/60 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                              <Lock className="text-slate-400 w-8 h-8" />
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-3 py-1 bg-slate-900/80 rounded-full border border-slate-700">
                                {!isConnected ? "Wallet Required" : !isEligible ? "Min. 0.25 STT Required" : "Wrong Network"}
                              </span>
                          </div>}
                          <div className="relative z-10">
                             <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/20"><Smartphone className="w-7 h-7 text-purple-400" /></div>
                             <h3 className="text-2xl font-bold text-white mb-2 font-playfair">Local Duel</h3>
                             <p className="text-slate-400 text-sm leading-relaxed max-w-[85%] font-light">Share your device to settle treasury disputes face-to-face.</p>
                          </div>
                       </button>
                     )}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-slate-500 uppercase tracking-widest text-[10px] font-black"><Globe className="w-3.5 h-3.5" /> Global Conquest</div>
                   <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-blue-500/10 relative overflow-hidden opacity-80 backdrop-blur-sm h-full flex flex-col justify-center">
                      <div className="absolute inset-0 bg-slate-950/70 z-20 flex flex-col items-center justify-center gap-4">
                         <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 animate-pulse"><Globe size={32} className="text-blue-400" /></div>
                         <span className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-black tracking-[0.2em] shadow-2xl uppercase border border-blue-400/50">Somnia Mainnet Soon</span>
                      </div>
                      <div className="relative z-10">
                         <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10"><Globe className="w-7 h-7 text-blue-400" /></div>
                            <h3 className="text-2xl font-bold text-white font-playfair">Ranked Battle</h3>
                         </div>
                         <p className="text-sm text-slate-500 leading-relaxed font-light">Compete for STT rewards and climb the global leaderboard for legendary status.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
        {activeTab === 'rules' && <RulesSheet />}
        {activeTab === 'arbiter' && (<div className="max-w-2xl mx-auto pt-8"><Arbiter /></div>)}
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/5 px-8 py-5 z-50 md:hidden shadow-2xl">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setActiveTab('lobby')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'lobby' ? 'text-amber-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}><Layers size={22} /><span className="text-[10px] font-black uppercase tracking-widest">Lobby</span></button>
          <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'rules' ? 'text-amber-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}><BookOpen size={22} /><span className="text-[10px] font-black uppercase tracking-widest">Rules</span></button>
          <button onClick={() => setActiveTab('arbiter')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'arbiter' ? 'text-amber-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}><HelpCircle size={22} /><span className="text-[10px] font-black uppercase tracking-widest">Arbiter</span></button>
        </div>
      </nav>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-12 py-8 max-w-7xl mx-auto">
         <div className="flex items-center gap-4 group cursor-default">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] rotate-3 group-hover:rotate-6 transition-transform duration-300"><Crown className="text-slate-900 w-7 h-7" /></div>
            <h1 className="text-3xl font-playfair font-black text-white tracking-tighter">Palace Rulers</h1>
         </div>
         <div className="flex gap-12">
            {['lobby', 'rules', 'arbiter'].map((tab) => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`text-xs font-black uppercase tracking-[0.3em] transition-all relative py-2 ${activeTab === tab ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
               >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-px bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>}
               </button>
            ))}
         </div>
      </header>
    </div>
  );
}
