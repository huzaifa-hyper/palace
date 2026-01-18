"use client";

import React, { useState, useEffect } from 'react';
import { Layers, Zap, Trophy, HelpCircle, BookOpen, Crown, Users, Smartphone, Globe, Check, Wallet, AlertTriangle, X, Bot, Lock, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import { 
  useAddress, 
  useDisconnect, 
  useNetworkMismatch, 
  useSwitchChain,
  useConnectionStatus,
  ConnectWallet
} from "@thirdweb-dev/react";
import sdk from '@farcaster/frame-sdk';
import { Arbiter } from './components/Arbiter';
import { Game } from './components/Game';
import { RulesSheet } from './components/RulesSheet';
import { UserProfile, GameMode } from './types';
import { SOMNIA_CHAIN_ID, web3Service } from './services/web3Service';
import { p2pService } from './services/p2pService';
import { useMinimumBalance, MIN_STT_REQUIRED } from './hooks/useMinimumBalance';

export default function App() {
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'lobby' | 'rules' | 'arbiter'>('lobby');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gameConfig, setGameConfig] = useState<{ mode: GameMode; playerCount: number } | null>(null);
  const [tempName, setTempName] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(true);
  const [offlineSetupMode, setOfflineSetupMode] = useState<GameMode | null>(null);
  const [protocolError, setProtocolError] = useState<string | null>(null);

  // Thirdweb Hooks
  const address = useAddress();
  const disconnect = useDisconnect();
  const isMismatched = useNetworkMismatch();
  const switchChain = useSwitchChain();
  const connectionStatus = useConnectionStatus();

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

    // Protocol check for production
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setProtocolError("Wallet connection requires HTTPS or localhost.");
    }
  }, []);

  useEffect(() => {
    const savedProfile = localStorage.getItem('palace_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setIsProfileModalOpen(false);
    }
  }, []);

  // Auto-switch network if mismatched and connected
  useEffect(() => {
    if (address && isMismatched && switchChain) {
      switchChain(SOMNIA_CHAIN_ID).catch(console.error);
    }
  }, [address, isMismatched, switchChain]);

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
    // Enforcement: Must be connected, on correct chain, and have minimum balance
    if (!address || isMismatched || !isEligible) return;
    
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
          <h2 className="text-2xl font-bold text-white mb-2">Security Warning</h2>
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
           <p className="text-slate-400 mb-8 font-light">Enter your name to enter the Palace records.</p>
           <form onSubmit={handleCreateProfile} className="space-y-6">
             <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your Name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-lg text-amber-100 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all" maxLength={12} />
             <button type="submit" disabled={!tempName.trim()} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50">Claim Throne</button>
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
             {/* Wallet & Balance Status Bar */}
             <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/30">
                      <Wallet className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-200 text-sm">Somnia Testnet Guard</h3>
                       <div className="text-xs text-slate-400">Authorized Access Required</div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-4">
                    {connectionStatus === "connecting" || connectionStatus === "unknown" ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         Syncing...
                      </div>
                    ) : address ? (
                       <div className="flex items-center gap-4 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-600">
                           <div className="text-right">
                              <div className="text-xs font-bold text-slate-400">{web3Service.shortenAddress(address)}</div>
                              <div className={`text-sm font-mono font-bold flex items-center gap-2 justify-end ${isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
                                 {isBalanceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${parseFloat(balance).toFixed(2)} STT`}
                                 {isEligible ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </div>
                           </div>
                           <ConnectWallet 
                             theme="dark" 
                             btnTitle="Wallet"
                             className="!bg-transparent !border-0 !p-0 !min-w-0 !h-auto !text-slate-500 hover:!text-white"
                           />
                       </div>
                    ) : (
                       <ConnectWallet 
                         theme="dark" 
                         btnTitle="Connect Wallet" 
                         className="!bg-purple-600 hover:!bg-purple-500 !text-white !px-6 !py-2 !rounded-lg !font-bold !text-sm !transition-colors !shadow-lg"
                       />
                    )}
                 </div>
             </div>

             {/* Network Mismatch Warning */}
             {address && isMismatched && (
               <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                     <AlertTriangle className="w-5 h-5 text-amber-500" />
                     <span className="text-sm text-amber-200 font-bold">Wrong Network: The Palace resides on Somnia Testnet</span>
                  </div>
                  <button onClick={() => switchChain?.(SOMNIA_CHAIN_ID)} className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg">Switch Network</button>
               </div>
             )}

             {/* Insufficient Balance Message */}
             {address && !isEligible && !isBalanceLoading && !isMismatched && (
                <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
                   <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"><Lock size={32} className="text-red-500" /></div>
                   <div>
                      <h3 className="text-xl font-bold text-white mb-1">Minimum 1 STT required to play</h3>
                      <p className="text-slate-400 max-w-sm text-sm">Your balance: <span className="text-red-400 font-bold">{parseFloat(balance).toFixed(4)} STT</span>. Please visit the faucet to replenish your treasury.</p>
                   </div>
                   <a href="https://faucet.somnia.network" target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center gap-2">
                     Visit Faucet <Globe className="w-4 h-4" />
                   </a>
                </div>
             )}

             {/* Game Modes Grid */}
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-xs font-bold"><Smartphone className="w-4 h-4" /> Practice Grounds</div>
                   <div className="relative">
                     {offlineSetupMode === 'VS_BOT' ? (
                       <div className="bg-slate-800/90 border border-emerald-500/50 p-6 rounded-3xl animate-in fade-in zoom-in-95">
                          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-emerald-400 flex items-center gap-2"><Bot size={18}/> Bot Count</h3><button onClick={() => setOfflineSetupMode(null)} className="p-1 hover:bg-slate-700 rounded-full"><X size={16}/></button></div>
                          <div className="grid grid-cols-3 gap-3">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('VS_BOT', num)} className="bg-slate-700 hover:bg-emerald-600 py-3 rounded-xl font-bold transition-colors">{num} Players</button>))}</div>
                       </div>
                     ) : (
                       <button 
                        disabled={!address || !isEligible || isMismatched}
                        onClick={() => setOfflineSetupMode('VS_BOT')} 
                        className="w-full group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 p-6 rounded-3xl text-left transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden disabled:opacity-50"
                       >
                          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Bot className="w-24 h-24 text-white" /></div>
                          {(!address || !isEligible || isMismatched) && <div className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-full z-20"><Lock size={20} className="text-slate-500" /></div>}
                          <div className="relative z-10">
                             <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4"><Bot className="w-6 h-6 text-emerald-400" /></div>
                             <h3 className="text-xl font-bold text-white mb-2">VS Palace Bots</h3>
                             <p className="text-slate-400 text-sm leading-relaxed max-w-[80%]">Hone your strategy against AI opponents in the training pits.</p>
                          </div>
                       </button>
                     )}
                   </div>

                   <div className="relative">
                     {offlineSetupMode === 'PASS_AND_PLAY' ? (
                       <div className="bg-slate-800/90 border border-purple-500/50 p-6 rounded-3xl animate-in fade-in zoom-in-95">
                          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-purple-400 flex items-center gap-2"><Smartphone size={18}/> Player Count</h3><button onClick={() => setOfflineSetupMode(null)} className="p-1 hover:bg-slate-700 rounded-full"><X size={16}/></button></div>
                          <div className="grid grid-cols-3 gap-3">{[2, 3, 4].map(num => (<button key={num} onClick={() => startLocalGame('PASS_AND_PLAY', num)} className="bg-slate-700 hover:bg-purple-600 py-3 rounded-xl font-bold transition-colors">{num} Players</button>))}</div>
                       </div>
                     ) : (
                       <button 
                        disabled={!address || !isEligible || isMismatched}
                        onClick={() => setOfflineSetupMode('PASS_AND_PLAY')} 
                        className="w-full group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 p-6 rounded-3xl text-left transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden disabled:opacity-50"
                       >
                          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-24 h-24 text-white" /></div>
                          {(!address || !isEligible || isMismatched) && <div className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-full z-20"><Lock size={20} className="text-slate-500" /></div>}
                          <div className="relative z-10">
                             <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4"><Smartphone className="w-6 h-6 text-purple-400" /></div>
                             <h3 className="text-xl font-bold text-white mb-2">Local Duel</h3>
                             <p className="text-slate-400 text-sm leading-relaxed max-w-[80%]">Pass & Play with friends on a single device at the tavern.</p>
                          </div>
                       </button>
                     )}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-xs font-bold"><Globe className="w-4 h-4" /> Global Conquest</div>
                   <div className="bg-slate-900/40 p-6 rounded-3xl border border-blue-500/20 relative overflow-hidden opacity-75">
                      <div className="absolute inset-0 bg-slate-950/60 z-20 flex items-center justify-center"><span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg uppercase">Coming Soon</span></div>
                      <div className="relative z-10">
                         <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><Zap className="w-5 h-5 text-blue-400" /></div><h3 className="text-lg font-bold text-white">Ranked Match</h3></div>
                         <p className="text-xs text-slate-400">Competitive on-chain matchmaking for glory and STT rewards.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
        {activeTab === 'rules' && <RulesSheet />}
        {activeTab === 'arbiter' && (<div className="max-w-2xl mx-auto pt-8"><Arbiter /></div>)}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-white/5 px-6 py-4 z-50 md:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setActiveTab('lobby')} className={`flex flex-col items-center gap-1 ${activeTab === 'lobby' ? 'text-amber-500' : 'text-slate-500'}`}><Layers size={20} /><span className="text-[10px] font-bold uppercase tracking-wider">Lobby</span></button>
          <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center gap-1 ${activeTab === 'rules' ? 'text-amber-500' : 'text-slate-500'}`}><BookOpen size={20} /><span className="text-[10px] font-bold uppercase tracking-wider">Rules</span></button>
          <button onClick={() => setActiveTab('arbiter')} className={`flex flex-col items-center gap-1 ${activeTab === 'arbiter' ? 'text-amber-500' : 'text-slate-500'}`}><HelpCircle size={20} /><span className="text-[10px] font-bold uppercase tracking-wider">Arbiter</span></button>
        </div>
      </nav>

      {/* Desktop Header */}
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
