import React from 'react';
import { Trophy, Layers, Play, Zap, RotateCcw, ArrowDown, Flame, Shield, ChevronRight, AlertCircle } from 'lucide-react';

export const RulesSheet: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 md:pb-12 max-w-4xl mx-auto px-4">
      {/* Hero Header */}
      <div className="text-center space-y-4 py-8 border-b border-white/5">
        <h2 className="text-5xl md:text-6xl font-playfair font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 drop-shadow-sm">
          Royal Protocols
        </h2>
        <p className="text-slate-400 font-light tracking-[0.2em] uppercase text-xs md:text-sm">
          The Official Strategy Guide
        </p>
      </div>

      {/* STEP 1: The Setup */}
      <div className="relative pl-8 md:pl-0">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 to-transparent md:hidden"></div>
        <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-blue-500 md:hidden"></div>
        
        <section className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <div className="flex flex-col md:flex-row gap-6 md:items-start">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md">STEP 1</span>
                  <h3 className="text-2xl font-playfair font-bold text-blue-100">Fortify Your Position</h3>
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed">
                  Every ruler begins with a concealed defense. You are dealt:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-white/5">
                     <div className="w-8 h-10 bg-slate-800 rounded border border-white/10 flex items-center justify-center text-xs text-slate-500">?</div>
                     <span className="text-slate-300"><strong>3 Hidden Cards</strong> (Face-down, do not look!)</span>
                  </li>
                  <li className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-white/5">
                     <div className="flex -space-x-4">
                        <div className="w-8 h-10 bg-white rounded border border-slate-300"></div>
                        <div className="w-8 h-10 bg-white rounded border border-slate-300"></div>
                        <div className="w-8 h-10 bg-white rounded border border-slate-300"></div>
                     </div>
                     <span className="text-slate-300"><strong>7 Hand Cards</strong> (For your eyes only)</span>
                  </li>
                </ul>
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex gap-3 text-sm text-blue-200">
                  <Shield className="w-5 h-5 shrink-0 text-blue-400" />
                  <div>
                    <strong>Action Required:</strong> Choose 3 of your BEST cards from your hand to place face-up on your hidden cards. These form your <strong>Stronghold</strong>.
                  </div>
                </div>
             </div>
          </div>
        </section>
      </div>

      {/* STEP 2: The Battle */}
      <div className="relative pl-8 md:pl-0">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 to-transparent md:hidden"></div>
        <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-emerald-500 md:hidden"></div>

        <section className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-3 mb-4">
             <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-md">STEP 2</span>
             <h3 className="text-2xl font-playfair font-bold text-emerald-100">The Rules of Engagement</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
               <p className="text-slate-300 mb-4">
                 On your turn, you must play a card that is <strong>EQUAL TO</strong> or <strong>HIGHER</strong> than the top card on the pile.
               </p>
               <div className="space-y-2">
                 <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-lg border border-emerald-500/10">
                    <span className="text-slate-400 text-sm">Pile is <strong>5</strong></span>
                    <ArrowDown className="w-4 h-4 text-slate-600 rotate-[-90deg]" />
                    <span className="text-emerald-400 text-sm font-bold">You play 5, 6, 7... Ace</span>
                 </div>
                 <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-lg border border-emerald-500/10">
                    <span className="text-slate-400 text-sm">Pile is <strong>King</strong></span>
                    <ArrowDown className="w-4 h-4 text-slate-600 rotate-[-90deg]" />
                    <span className="text-emerald-400 text-sm font-bold">You play King, Ace, or Power Card</span>
                 </div>
               </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-white/5 space-y-4">
               <h4 className="font-bold text-white flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400"/> Critical Rules</h4>
               <ul className="space-y-3 text-sm text-slate-400">
                 <li className="flex gap-2">
                   <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mt-0.5"/>
                   <span><strong>Must Pick Up:</strong> If you cannot play a valid card, you must pick up the entire pile into your hand.</span>
                 </li>
                 <li className="flex gap-2">
                   <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mt-0.5"/>
                   <span><strong>Always Draw:</strong> As long as the Deck has cards, you must draw to keep at least 3 cards in your hand.</span>
                 </li>
               </ul>
            </div>
          </div>
        </section>
      </div>

      {/* STEP 3: Power Cards */}
      <div className="relative pl-8 md:pl-0">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 to-transparent md:hidden"></div>
        <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-purple-500 md:hidden"></div>

        <section className="bg-slate-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <div className="flex items-center gap-3 mb-6">
             <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-md">STEP 3</span>
             <h3 className="text-2xl font-playfair font-bold text-purple-100">Mastering Power Cards</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
             {/* 2 - Reset */}
             <div className="bg-slate-800/40 p-4 rounded-2xl border border-blue-500/20 hover:bg-slate-800/60 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                   <RotateCcw className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-blue-200 mb-1">Rank 2: The Reset</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   Play on ANYTHING. Resets the pile value to 2. It's like a fresh start, and <strong>you play again immediately</strong>.
                </p>
             </div>

             {/* 7 - Lower */}
             <div className="bg-slate-800/40 p-4 rounded-2xl border border-emerald-500/20 hover:bg-slate-800/60 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                   <ArrowDown className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-emerald-200 mb-1">Rank 7: The Lower</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   The next player must play a card <strong>LOWER THAN or EQUAL TO 7</strong>. (5, 6, 7 are valid).
                </p>
             </div>

             {/* 10 - Burn */}
             <div className="bg-slate-800/40 p-4 rounded-2xl border border-orange-500/20 hover:bg-slate-800/60 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 mb-3 group-hover:scale-110 transition-transform">
                   <Flame className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-orange-200 mb-1">Rank 10: The Burn</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   Play on ANYTHING. The entire pile is <strong>removed from the game</strong>. You play again immediately.
                </p>
             </div>
          </div>
        </section>
      </div>

      {/* STEP 4: The Endgame */}
      <div className="relative pl-8 md:pl-0">
         <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-amber-500 md:hidden"></div>
         
         <section className="bg-gradient-to-br from-amber-900/20 to-slate-900/80 p-6 md:p-8 rounded-3xl border border-amber-500/30">
            <div className="flex items-center gap-3 mb-4">
               <Trophy className="w-6 h-6 text-amber-500" />
               <h3 className="text-2xl font-playfair font-bold text-amber-100">Victory Condition</h3>
            </div>
            <p className="text-slate-300 mb-6">
               To win, you must be the first to empty all your cards. The order is strict:
            </p>
            <div className="flex flex-col md:flex-row gap-2 w-full">
               <div className="flex-1 bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center opacity-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Phase 1</div>
                  <div className="font-bold text-white">Hand Cards</div>
               </div>
               <div className="flex items-center justify-center text-slate-600 rotate-90 md:rotate-0">
                  <ChevronRight />
               </div>
               <div className="flex-1 bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Phase 2</div>
                  <div className="font-bold text-amber-200">Stronghold</div>
                  <div className="text-[10px] text-slate-500">(Face-Up Cards)</div>
               </div>
               <div className="flex items-center justify-center text-slate-600 rotate-90 md:rotate-0">
                  <ChevronRight />
               </div>
               <div className="flex-1 bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Phase 3</div>
                  <div className="font-bold text-slate-400">The Blind</div>
                  <div className="text-[10px] text-slate-500">(Hidden Cards)</div>
               </div>
            </div>
            <div className="mt-6 text-center text-sm text-amber-400/80 italic">
               "Only when the blind cards are played perfectly shall the ruler be crowned."
            </div>
         </section>
      </div>

    </div>
  );
};