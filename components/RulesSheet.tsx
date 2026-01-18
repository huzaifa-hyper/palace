import React from 'react';
import { 
  Trophy, 
  Layers, 
  Play, 
  Zap, 
  RotateCcw, 
  ArrowDown, 
  Flame, 
  Shield, 
  ChevronRight, 
  AlertCircle, 
  Crown,
  BookOpen,
  Info,
  Sword,
  Eye,
  ArrowRight,
  Sparkles,
  Search
} from 'lucide-react';
import { Rank } from '../types';

export const RulesSheet: React.FC = () => {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-32 md:pb-16 max-w-5xl mx-auto px-6">
      {/* Sovereign Header */}
      <div className="relative text-center space-y-6 py-12">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <Crown className="w-64 h-64 text-amber-500 blur-sm" />
        </div>
        <div className="relative z-10">
          <h2 className="text-6xl md:text-7xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 drop-shadow-2xl">
            Royal Protocols
          </h2>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="h-px w-12 bg-amber-500/30"></div>
            <p className="text-amber-500 font-black tracking-[0.4em] uppercase text-[10px] md:text-xs">
              Sovereign's Strategy Codex
            </p>
            <div className="h-px w-12 bg-amber-500/30"></div>
          </div>
        </div>
      </div>

      {/* The Core Directive */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-amber-900 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-amber-500/20 p-8 md:p-12 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Trophy className="w-48 h-48 text-amber-500" />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
               <Trophy size={48} className="text-slate-900" />
            </div>
            <div>
              <h3 className="text-3xl font-playfair font-black text-amber-100 mb-4">The Sovereign's Goal</h3>
              <p className="text-slate-400 leading-relaxed font-light text-xl md:text-2xl">
                Be the first ruler to empty your entire treasury. You must shed your <span className="text-white font-bold">Hand</span>, liberate your <span className="text-amber-400 font-bold">Stronghold</span>, and survive the <span className="text-amber-600 font-bold">Blind Siege</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STEP-BY-STEP FLOW */}
      <div className="grid grid-cols-1 gap-12">
        
        {/* PHASE 1: THE FORTIFICATION */}
        <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-12 rounded-[3rem] border border-blue-500/10 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 opacity-50"></div>
          <div className="flex items-center gap-6 mb-10">
             <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/20">1</div>
             <div>
                <h3 className="text-3xl font-playfair font-black text-blue-100">Phase I: The Fortification</h3>
                <p className="text-blue-500/60 font-black text-[10px] uppercase tracking-widest mt-1">Initial Treasury Setup</p>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 relative">
                 <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> The Initial Deal
                 </h4>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Blind Siege (Hidden)</span>
                      <span className="text-blue-400 font-bold">3 Cards</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 w-[20%]"></div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Tactical Hand (Reserve)</span>
                      <span className="text-blue-400 font-bold">7 Cards</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 w-[80%]"></div>
                    </div>
                 </div>
              </div>
              
              <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-3xl">
                <p className="text-sm text-blue-100 leading-relaxed italic">
                  "Choose your <strong>3 strongest cards</strong> from your hand and place them face-up on your hidden cards. This forms your <strong>Stronghold</strong>—the final defense before the blind end."
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
               <div className="relative w-full max-w-xs aspect-[3/4] bg-slate-950/60 rounded-3xl border-2 border-dashed border-blue-500/20 flex flex-col items-center justify-center p-8 text-center group-hover:border-blue-500/40 transition-all">
                  <Shield size={64} className="text-blue-500/20 mb-4 group-hover:text-blue-500/40 transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Stronghold Structure</span>
                  <div className="mt-6 flex -space-x-8">
                    <div className="w-16 h-24 bg-white/5 border border-white/10 rounded-xl rotate-[-10deg]"></div>
                    <div className="w-16 h-24 bg-white/5 border border-white/10 rounded-xl"></div>
                    <div className="w-16 h-24 bg-white/5 border border-white/10 rounded-xl rotate-[10deg]"></div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* PHASE 2: THE SKIRMISH */}
        <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-12 rounded-[3rem] border border-emerald-500/10 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 opacity-50"></div>
          <div className="flex items-center gap-6 mb-10">
             <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-600/20">2</div>
             <div>
                <h3 className="text-3xl font-playfair font-black text-emerald-100">Phase II: The Skirmish</h3>
                <p className="text-emerald-500/60 font-black text-[10px] uppercase tracking-widest mt-1">Core Combat Mechanics</p>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-slate-400 text-lg leading-relaxed">
                The Battle Protocol is absolute: You must match or exceed the rank of the current top card.
              </p>
              
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-white/5 group-hover:border-emerald-500/20 transition-all">
                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Pile Top</span>
                    <span className="text-white font-bold font-playfair text-xl">8</span>
                    <ArrowRight className="text-emerald-500" size={16} />
                    <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Legal Play</span>
                    <span className="text-white font-bold font-playfair text-xl">8, 9, 10... Ace</span>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-white/5 opacity-50 grayscale">
                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Pile Top</span>
                    <span className="text-white font-bold font-playfair text-xl">King</span>
                    <ArrowRight className="text-rose-500" size={16} />
                    <span className="text-rose-400 font-black text-[10px] uppercase tracking-widest">Illegal</span>
                    <span className="text-white font-bold font-playfair text-xl">Queen or Lower</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <RotateCcw size={20} className="text-red-500" />
                  </div>
                  <h5 className="font-black text-white text-[10px] uppercase tracking-widest">Failed Maneuver</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">If you cannot play, you must inherit the entire pile. A heavy burden for any ruler.</p>
               </div>
               <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Layers size={20} className="text-blue-500" />
                  </div>
                  <h5 className="font-black text-white text-[10px] uppercase tracking-widest">Drawing Rights</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">You must maintain a minimum of 3 hand cards until the deck is depleted.</p>
               </div>
            </div>
          </div>
        </section>

        {/* SPECIAL CARDS: THE HIGH ARCANA */}
        <div className="space-y-8">
           <div className="text-center space-y-2">
              <h3 className="text-2xl font-playfair font-black text-amber-100 uppercase tracking-widest">The High Arcana</h3>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">Special Multiplier Rules</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { rank: Rank.Two, title: "The Reset", icon: RotateCcw, color: "blue", desc: "Playable on any card. Resets pile value to zero. You immediately play again." },
                { rank: Rank.Seven, title: "The Lowering", icon: ArrowDown, color: "emerald", desc: "Forces the next ruler to play a card equal to or LOWER than 7." },
                { rank: Rank.Ten, title: "The Burn", icon: Flame, color: "orange", desc: "Vaporizes the pile entirely. It is removed from play. You start a fresh pile." }
              ].map((card, i) => (
                <div key={i} className={`group bg-slate-900/40 border border-${card.color}-500/10 p-8 rounded-[2rem] hover:border-${card.color}-500/40 transition-all relative overflow-hidden`}>
                  <div className={`absolute -bottom-6 -right-6 text-${card.color}-500/5 font-playfair text-9xl font-black group-hover:scale-110 transition-transform`}>{card.rank}</div>
                  <div className={`w-14 h-14 rounded-2xl bg-${card.color}-500/20 flex items-center justify-center text-${card.color}-400 mb-6 border border-${card.color}-500/20 shadow-lg`}>
                    <card.icon size={28} />
                  </div>
                  <h4 className={`text-xl font-playfair font-black text-${card.color}-100 mb-2 uppercase tracking-tight`}>Rank {card.rank}: {card.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-light relative z-10">{card.desc}</p>
                </div>
              ))}
           </div>
        </div>

        {/* PHASE 3: THE PATH TO VICTORY */}
        <section className="bg-gradient-to-br from-amber-900/30 to-slate-900/80 p-8 md:p-12 rounded-[3rem] border border-amber-500/20 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none"></div>
          <div className="flex items-center gap-6 mb-12">
             <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-slate-900 font-black text-xl shadow-lg shadow-amber-600/20">3</div>
             <div>
                <h3 className="text-3xl font-playfair font-black text-amber-100">Phase III: Coronation</h3>
                <p className="text-amber-500/60 font-black text-[10px] uppercase tracking-widest mt-1">The Final End Game</p>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-stretch gap-4 w-full mb-12">
            {[
              { title: "Active Hand", icon: Sword, desc: "Shed all cards." },
              { title: "Stronghold", icon: Shield, desc: "Liberate the 3 face-up cards." },
              { title: "Blind Siege", icon: Eye, desc: "Play final 3 hidden cards blindly." }
            ].map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex-1 bg-slate-950/80 p-8 rounded-3xl border border-white/5 text-center space-y-4 hover:border-amber-500/30 transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 mx-auto flex items-center justify-center text-slate-500 group-hover:text-amber-500 transition-colors">
                      <step.icon size={24} />
                   </div>
                   <div>
                      <h5 className="font-playfair font-black text-white text-lg">{step.title}</h5>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{step.desc}</p>
                   </div>
                </div>
                {i < 2 && (
                  <div className="flex items-center justify-center text-amber-500/20 rotate-90 md:rotate-0">
                     <ChevronRight size={32} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="bg-amber-950/40 p-8 rounded-3xl border border-amber-500/10 space-y-6">
            <h5 className="text-amber-300 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
              <Info size={14} /> Critical Game Rule
            </h5>
            <div className="grid md:grid-cols-2 gap-8">
               <div className="space-y-2">
                  <p className="text-white font-bold text-sm">Seizing the Stronghold</p>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">"When your hand is reduced to exactly 1 card, you MUST pick up your face-up Stronghold cards. They join your hand to continue the struggle."</p>
               </div>
               <div className="space-y-2">
                  <p className="text-white font-bold text-sm">The Gamble of Blindness</p>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">"Hidden cards are played one-by-one without looking. If the revealed card is illegal, you inherit the pile and return to the Hand Phase."</p>
               </div>
            </div>
          </div>
        </section>
      </div>

      {/* QUICK CHEAT SHEET */}
      <div className="pt-12 border-t border-white/5">
        <div className="bg-slate-900/90 rounded-[3rem] p-10 border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Sparkles className="w-48 h-48 text-white" />
          </div>
          <div className="flex items-center gap-3 mb-10">
            <Search className="text-amber-500" size={24} />
            <h3 className="text-2xl font-playfair font-black text-white uppercase tracking-tight">Rules Cheat Sheet</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
             <div className="space-y-3">
                <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest">Hierarchy</span>
                <p className="text-white text-lg font-playfair font-bold">Ace Beats All</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">A > K > Q > J > 10... down to 3. (2 and 7 are special).</p>
             </div>
             <div className="space-y-3">
                <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest">Multi-Play</span>
                <p className="text-white text-lg font-playfair font-bold">The Set Bonus</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">You may play multiple cards of the same rank (e.g., three 5s) at once.</p>
             </div>
             <div className="space-y-3">
                <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest">Equal Play</span>
                <p className="text-white text-lg font-playfair font-bold">Match Ranks</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">Playing a 6 on a 6 is legal and encourages the pile to grow.</p>
             </div>
             <div className="space-y-3">
                <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest">Empty Deck</span>
                <p className="text-white text-lg font-playfair font-bold">Final Shedding</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">Drawing stops once the deck is empty. The real war begins then.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="text-center py-12">
        <p className="text-slate-600 font-black text-[9px] uppercase tracking-[0.5em] mb-4">May Your Maneuvers Be Legendary</p>
        <div className="inline-flex items-center gap-2 text-amber-500/50">
          <Crown size={16} />
          <Crown size={24} className="text-amber-500" />
          <Crown size={16} />
        </div>
      </div>
    </div>
  );
};
