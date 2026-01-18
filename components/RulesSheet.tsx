import React from 'react';
import { 
  Trophy, 
  Layers, 
  Shield, 
  Zap, 
  RotateCcw, 
  ArrowDown, 
  Flame, 
  ChevronRight, 
  Crown,
  Info,
  Sword,
  Eye,
  ArrowRight,
  Sparkles,
  MousePointer2
} from 'lucide-react';
import { Rank } from '../types';

export const RulesSheet: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 space-y-20 py-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Hero Section */}
      <div className="text-center space-y-6 relative">
        <div className="absolute inset-0 -top-20 flex justify-center opacity-5 pointer-events-none">
          <Crown size={300} className="text-amber-500" />
        </div>
        <h2 className="text-6xl md:text-8xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 drop-shadow-2xl relative z-10">
          The Royal Code
        </h2>
        <div className="flex items-center justify-center gap-4 relative z-10">
          <div className="h-px w-16 bg-amber-500/30"></div>
          <p className="text-amber-500 font-black tracking-[0.5em] uppercase text-xs">Tactical Strategy Guide</p>
          <div className="h-px w-16 bg-amber-500/30"></div>
        </div>
      </div>

      {/* Step 1: Setup */}
      <section className="relative">
        <div className="absolute -left-12 top-0 text-[12rem] font-black text-white/5 pointer-events-none">01</div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-amber-500/10 p-10 md:p-16 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="space-y-6 flex-1">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20">
                <Shield size={16} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Initialization</span>
              </div>
              <h3 className="text-4xl font-playfair font-black text-white">Phase I: The Fortification</h3>
              <p className="text-slate-400 text-lg leading-relaxed font-light">
                Every Ruler begins with a treasury of 13 cards. Your first task is to divide them into layers of defense.
              </p>
              <ul className="space-y-4">
                {[
                  { title: "The Hidden Core", desc: "3 cards placed face-down. These are your 'Blind Siege' cards." },
                  { title: "The Stronghold", desc: "Select 3 high-value cards from your hand and place them face-up on the Hidden Core." },
                  { title: "The Active Hand", desc: "The remaining 7 cards are used to start the battle." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:text-amber-400 transition-colors">{i+1}</div>
                    <div>
                      <span className="text-white font-bold block">{item.title}</span>
                      <span className="text-slate-500 text-sm">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full md:w-72 aspect-[3/4] bg-slate-950/80 rounded-3xl border-2 border-dashed border-white/5 flex items-center justify-center p-8 relative group hover:border-amber-500/20 transition-all">
               <Layers size={64} className="text-white/5 absolute group-hover:text-amber-500/10 transition-colors" />
               <div className="relative flex flex-col items-center gap-4">
                  <div className="flex -space-x-8 opacity-40">
                    <div className="w-16 h-24 bg-slate-800 rounded-xl border border-white/10 rotate-[-12deg]"></div>
                    <div className="w-16 h-24 bg-slate-800 rounded-xl border border-white/10"></div>
                    <div className="w-16 h-24 bg-slate-800 rounded-xl border border-white/10 rotate-[12deg]"></div>
                  </div>
                  <div className="h-px w-24 bg-white/10"></div>
                  <div className="flex -space-x-8">
                    <div className="w-16 h-24 bg-white rounded-xl border border-slate-300 rotate-[-12deg] flex items-center justify-center font-bold text-slate-900 shadow-xl">K</div>
                    <div className="w-16 h-24 bg-white rounded-xl border border-slate-300 flex items-center justify-center font-bold text-slate-900 shadow-xl">A</div>
                    <div className="w-16 h-24 bg-white rounded-xl border border-slate-300 rotate-[12deg] flex items-center justify-center font-bold text-slate-900 shadow-xl">Q</div>
                  </div>
                  <span className="text-[9px] font-black text-amber-500/50 uppercase tracking-[0.3em] mt-4">Stronghold Setup</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: The Skirmish */}
      <section className="relative">
        <div className="absolute -right-12 top-0 text-[12rem] font-black text-white/5 pointer-events-none">02</div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-emerald-500/10 p-10 md:p-16 rounded-[3.5rem] shadow-2xl overflow-hidden">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-8">
            <Sword size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Combat</span>
          </div>
          <div className="grid md:grid-cols-2 gap-16">
            <div className="space-y-8">
               <h3 className="text-4xl font-playfair font-black text-white">Phase II: The Skirmish</h3>
               <p className="text-slate-400 text-lg leading-relaxed font-light">
                  Rulers alternate playing cards to the central pile. You must match or exceed the rank of the current top card.
               </p>
               <div className="bg-slate-950/60 p-6 rounded-3xl border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <span className="block text-[10px] text-slate-500 uppercase mb-2">Pile Top</span>
                      <div className="w-16 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-3xl font-black text-slate-900 shadow-inner">8</div>
                    </div>
                    <ArrowRight className="text-emerald-500" />
                    <div className="text-center">
                      <span className="block text-[10px] text-emerald-500/60 uppercase mb-2">Legal Move</span>
                      <div className="w-16 h-20 bg-white rounded-lg border-2 border-emerald-500/40 flex items-center justify-center text-3xl font-black text-emerald-500 shadow-lg">J</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 text-center uppercase tracking-widest font-black">Match or Exceed</p>
               </div>
            </div>
            <div className="space-y-8">
               <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 relative group hover:border-emerald-500/20 transition-colors">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 border border-white/10 group-hover:border-emerald-500/30 transition-all">
                      <RotateCcw size={28} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">Failed Play</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">If you cannot play a legal card, you must <strong>Inherit the Pile</strong>. All cards in the center are added to your hand.</p>
                    </div>
                  </div>
               </div>
               <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 relative group hover:border-emerald-500/20 transition-colors">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 border border-white/10 group-hover:border-emerald-500/30 transition-all">
                      <Layers size={28} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">Auto-Draw</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">As long as the Treasury (Deck) has cards, you must draw until you have at least <strong>3 cards</strong> in your hand at the end of every turn.</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Power Cards */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <h3 className="text-3xl font-playfair font-black text-amber-100 uppercase tracking-widest">The High Arcana</h3>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em]">Overriding the Natural Order</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { rank: "2", title: "The Reset", icon: RotateCcw, color: "blue", desc: "Resets the pile's hierarchy. Playable on anything. You play again immediately." },
            { rank: "7", title: "The Lowering", icon: ArrowDown, color: "emerald", desc: "Forces the next Ruler to play a card equal to or LOWER than 7." },
            { rank: "10", title: "The Burn", icon: Flame, color: "orange", desc: "Vaporizes the pile! It is removed from the game. You start a fresh turn." }
          ].map((card, i) => (
            <div key={i} className={`bg-slate-900/40 border border-${card.color}-500/10 p-10 rounded-[3rem] text-center hover:scale-105 hover:border-${card.color}-500/30 transition-all group relative overflow-hidden`}>
              <div className={`absolute -bottom-4 -right-4 text-9xl font-black text-${card.color}-500/5 group-hover:scale-110 transition-transform`}>{card.rank}</div>
              <div className={`w-16 h-16 rounded-2xl bg-${card.color}-500/20 border border-${card.color}-500/20 flex items-center justify-center text-${card.color}-400 mx-auto mb-6 shadow-lg`}>
                <card.icon size={32} />
              </div>
              <h4 className="text-2xl font-playfair font-black text-white mb-2">{card.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-light px-4">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Step 3: Endgame */}
      <section className="relative">
        <div className="absolute -left-12 top-0 text-[12rem] font-black text-white/5 pointer-events-none">03</div>
        <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 p-10 md:p-16 rounded-[3.5rem] border border-amber-500/20 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none"></div>
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20 mb-10">
            <Trophy size={16} className="text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Victory Condition</span>
          </div>
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="space-y-8 flex-1">
              <h3 className="text-4xl font-playfair font-black text-amber-100">Phase III: Coronation</h3>
              <p className="text-slate-400 text-lg leading-relaxed font-light">
                Once the Treasury is dry and your Hand is empty, you must dismantle your Stronghold.
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                 <div className="bg-slate-950/60 p-6 rounded-3xl border border-white/5 space-y-2">
                    <Zap className="text-amber-500" size={20} />
                    <h5 className="text-white font-bold text-sm">Stronghold Reclaim</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">When your hand is empty, you immediately pick up your 3 face-up cards and use them as your new hand.</p>
                 </div>
                 <div className="bg-slate-950/60 p-6 rounded-3xl border border-white/5 space-y-2">
                    <Eye className="text-amber-500" size={20} />
                    <h5 className="text-white font-bold text-sm">The Blind Siege</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">The final 3 hidden cards must be played blindly. If a flip is illegal, you pick up the entire pile!</p>
                 </div>
              </div>
            </div>
            <div className="w-full md:w-80 flex flex-col items-center justify-center gap-6">
               <div className="relative">
                 <div className="w-48 h-64 bg-slate-950 rounded-[2.5rem] border-4 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center gap-4 animate-pulse">
                    <Trophy size={64} className="text-amber-500" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Empty Hand</span>
                 </div>
                 <div className="absolute -inset-4 bg-amber-500/10 blur-3xl -z-10 rounded-full"></div>
               </div>
               <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">Victory Awaits</p>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center py-12 border-t border-white/5">
        <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] mb-4">May Your Rule Be Long and Prosperous</p>
        <div className="flex justify-center gap-3 text-amber-500/40">
           <Crown size={16} />
           <Crown size={24} className="text-amber-500" />
           <Crown size={16} />
        </div>
      </div>
    </div>
  );
};
