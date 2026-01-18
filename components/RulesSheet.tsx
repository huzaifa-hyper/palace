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
  Info
} from 'lucide-react';

export const RulesSheet: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 md:pb-12 max-w-4xl mx-auto px-4">
      {/* Hero Header */}
      <div className="text-center space-y-4 py-8 border-b border-white/5">
        <h2 className="text-5xl md:text-6xl font-playfair font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 drop-shadow-sm">
          Royal Protocols
        </h2>
        <p className="text-slate-400 font-light tracking-[0.2em] uppercase text-xs md:text-sm">
          The Official Strategy Guide to Palace Rulers
        </p>
      </div>

      {/* Quick Summary / The Goal */}
      <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy className="w-24 h-24 text-amber-500" />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-playfair font-bold text-amber-200 mb-2 flex items-center gap-2">
            <Crown size={20} className="text-amber-500" /> The Sovereign's Goal
          </h3>
          <p className="text-slate-300 leading-relaxed max-w-2xl">
            Be the first ruler to empty your entire treasury of cards. You must battle through your <strong>Hand</strong>, liberate your <strong>Stronghold</strong>, and finally survive the <strong>Blind Siege</strong>.
          </p>
        </div>
      </div>

      {/* STEP 1: The Setup */}
      <div className="relative pl-8 md:pl-0">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 to-transparent md:hidden"></div>
        <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-blue-500 md:hidden"></div>
        
        <section className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <div className="flex flex-col md:flex-row gap-6 md:items-start">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-600 text-white text-xs font-black px-2 py-1 rounded-md tracking-tighter">PHASE I</span>
                  <h3 className="text-2xl font-playfair font-bold text-blue-100">The Fortification</h3>
                </div>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Before the war begins, you must fortify your position. Each ruler is dealt:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                     <div className="w-10 h-12 bg-slate-800 rounded-lg border-2 border-slate-600 flex items-center justify-center text-xs text-slate-500 shadow-lg">?</div>
                     <div className="flex flex-col">
                       <span className="text-slate-200 font-bold">3 Hidden Cards</span>
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest">The Blind Siege</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                     <div className="flex -space-x-4">
                        <div className="w-8 h-12 bg-white rounded-lg border border-slate-300 shadow-md"></div>
                        <div className="w-8 h-12 bg-white rounded-lg border border-slate-300 shadow-md"></div>
                        <div className="w-8 h-12 bg-white rounded-lg border border-slate-300 shadow-md"></div>
                     </div>
                     <div className="flex flex-col">
                       <span className="text-slate-200 font-bold">7 Hand Cards</span>
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest">Initial Reserve</span>
                     </div>
                  </div>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 p-5 rounded-2xl flex gap-4 text-sm text-blue-100 items-center">
                  <Shield className="w-8 h-8 shrink-0 text-blue-400" />
                  <div>
                    <strong className="text-blue-300 block mb-1 uppercase tracking-wider text-xs">Strategic Mandate:</strong> 
                    Select your <strong>3 strongest cards</strong> from your hand and place them face-up on your hidden cards. These form your <strong>Stronghold</strong>. Choose wisely—they are your last line of defense!
                  </div>
                </div>
             </div>
          </div>
        </section>
      </div>

      {/* STEP 2: The Rules of Play */}
      <div className="relative pl-8 md:pl-0">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 to-transparent md:hidden"></div>
        <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-emerald-500 md:hidden"></div>

        <section className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-3 mb-6">
             <span className="bg-emerald-600 text-white text-xs font-black px-2 py-1 rounded-md tracking-tighter">PHASE II</span>
             <h3 className="text-2xl font-playfair font-bold text-emerald-100">The Skirmish</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <p className="text-slate-400 text-sm leading-relaxed">
                 Rulers take turns playing cards to the central pile. You must play a card that is <strong>EQUAL TO</strong> or <strong>HIGHER</strong> than the top card.
               </p>
               <div className="space-y-3">
                 <div className="flex items-center justify-between bg-slate-950/70 p-4 rounded-xl border border-emerald-500/10 group hover:border-emerald-500/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">If Pile is</span>
                      <span className="text-slate-200 font-bold text-lg">5</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-emerald-500 uppercase tracking-widest">You Play</span>
                      <span className="text-emerald-400 font-bold text-lg">5 or Higher</span>
                    </div>
                 </div>
                 <div className="flex items-center justify-between bg-slate-950/70 p-4 rounded-xl border border-emerald-500/10 group hover:border-emerald-500/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">If Pile is</span>
                      <span className="text-slate-200 font-bold text-lg">King</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-emerald-500 uppercase tracking-widest">You Play</span>
                      <span className="text-emerald-400 font-bold text-lg">King or Ace</span>
                    </div>
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 space-y-5">
                  <h4 className="font-black text-[10px] text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Universal Edicts
                  </h4>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                          <RotateCcw className="w-4 h-4 text-red-400" />
                       </div>
                       <p className="text-xs text-slate-400 leading-relaxed">
                          <strong>Failed Maneuver:</strong> If you cannot play a valid card, you must pick up the <strong>entire pile</strong> into your hand.
                       </p>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <Layers className="w-4 h-4 text-blue-400" />
                       </div>
                       <p className="text-xs text-slate-400 leading-relaxed">
                          <strong>Reinforcements:</strong> As long as the Deck remains, you must draw cards to maintain a minimum of <strong>3 hand cards</strong>.
                       </p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </section>
      </div>

      {/* STEP 3: Power Cards */}
      <div className="relative pl-8 md:pl-0">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 to-transparent md:hidden"></div>
        <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-purple-500 md:hidden"></div>

        <section className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <div className="flex items-center gap-3 mb-8">
             <span className="bg-purple-600 text-white text-xs font-black px-2 py-1 rounded-md tracking-tighter">PHASE III</span>
             <h3 className="text-2xl font-playfair font-bold text-purple-100">The High Arcana</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             {/* 2 - Reset */}
             <div className="bg-slate-950/40 p-5 rounded-2xl border border-blue-500/20 hover:border-blue-500/50 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform border border-blue-500/20 shadow-lg shadow-blue-500/10">
                   <RotateCcw className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-blue-100 mb-2">Rank 2: The Reset</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   Playable on <strong>ANYTHING</strong>. Resets the pile value to 2. You immediately <strong>play another turn</strong>.
                </p>
             </div>

             {/* 7 - Lower */}
             <div className="bg-slate-950/40 p-5 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/50 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                   <ArrowDown className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-emerald-100 mb-2">Rank 7: The Lowering</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   The next ruler must play a card <strong>LOWER THAN or EQUAL TO 7</strong>. High cards are useless here.
                </p>
             </div>

             {/* 10 - Burn */}
             <div className="bg-slate-950/40 p-5 rounded-2xl border border-orange-500/20 hover:border-orange-500/50 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform border border-orange-500/20 shadow-lg shadow-orange-500/10">
                   <Flame className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-orange-100 mb-2">Rank 10: The Burn</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   Playable on <strong>ANYTHING</strong>. Vaporizes the entire pile—it is removed from the game. You <strong>play again</strong>.
                </p>
             </div>
          </div>
        </section>
      </div>

      {/* STEP 4: The Path to Victory */}
      <div className="relative pl-8 md:pl-0">
         <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-amber-500 md:hidden"></div>
         
         <section className="bg-gradient-to-br from-amber-900/40 to-slate-900/90 p-6 md:p-8 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px]"></div>
            
            <div className="flex items-center gap-3 mb-6">
               <Trophy className="w-8 h-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
               <h3 className="text-2xl font-playfair font-bold text-amber-100 uppercase tracking-tight">The Rite of Coronation</h3>
            </div>
            
            <p className="text-slate-300 mb-8 leading-relaxed text-sm md:text-base">
               Victory requires a master's discipline. You must deplete your reserves in this <strong>EXACT</strong> order:
            </p>
            
            <div className="flex flex-col md:flex-row items-stretch gap-2 w-full mb-8">
               <div className="flex-1 bg-slate-950/80 p-5 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">RESERVE</div>
                  <div className="font-bold text-white text-lg font-playfair">Hand Cards</div>
               </div>
               <div className="flex items-center justify-center text-amber-500/50 rotate-90 md:rotate-0">
                  <ChevronRight size={28} />
               </div>
               <div className="flex-1 bg-slate-950/80 p-5 rounded-2xl border border-amber-500/20 text-center flex flex-col justify-center shadow-lg shadow-amber-500/5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70 mb-2">THE WALL</div>
                  <div className="font-bold text-amber-200 text-lg font-playfair">The Stronghold</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Face-Up Cards</div>
               </div>
               <div className="flex items-center justify-center text-amber-500/50 rotate-90 md:rotate-0">
                  <ChevronRight size={28} />
               </div>
               <div className="flex-1 bg-slate-950/80 p-5 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">LAST STAND</div>
                  <div className="font-bold text-slate-300 text-lg font-playfair">The Blind Siege</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hidden Cards</div>
               </div>
            </div>

            <div className="bg-amber-950/40 p-5 rounded-2xl border border-amber-500/10">
               <h5 className="text-amber-300 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Info size={14} /> Critical Wisdom
               </h5>
               <ul className="space-y-3 text-xs text-slate-400">
                 <li className="flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                   <span><strong>Stronghold Deployment:</strong> When your hand is reduced to only 1 card, you immediately pick up your Stronghold cards. They join your hand to continue the battle.</span>
                 </li>
                 <li className="flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                   <span><strong>Blind Faith:</strong> Once your Hand and Stronghold are empty, you play your Hidden cards blindly. If a revealed card is illegal, you must <strong>pick up the entire pile</strong>.</span>
                 </li>
               </ul>
            </div>
         </section>
      </div>

    </div>
  );
};
