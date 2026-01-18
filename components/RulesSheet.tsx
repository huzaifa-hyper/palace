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
  CircleCheck,
  Sword,
  Eye
} from 'lucide-react';

export const RulesSheet: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 md:pb-12 max-w-4xl mx-auto px-4">
      {/* Hero Header */}
      <div className="text-center space-y-4 py-8 border-b border-white/5">
        <h2 className="text-5xl md:text-6xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-100 via-amber-400 to-amber-700 drop-shadow-sm">
          Royal Protocols
        </h2>
        <p className="text-slate-500 font-black tracking-[0.3em] uppercase text-[10px] md:text-xs">
          The Official Decree on Sovereign Strategy
        </p>
      </div>

      {/* The Sovereign's Goal */}
      <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy className="w-24 h-24 text-amber-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-lg">
             <Trophy size={40} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-2xl font-playfair font-black text-amber-200 mb-2">The Sovereign's Goal</h3>
            <p className="text-slate-400 leading-relaxed font-light text-lg">
              Be the first ruler to empty your entire treasury of cards. You must battle through your <strong>Hand</strong>, liberate your <strong>Stronghold</strong>, and survive the <strong>Blind Siege</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* PHASE 1: The Setup */}
      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-12 rounded-[2.5rem] border border-blue-500/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none"></div>
        
        <div className="flex items-center gap-4 mb-8">
           <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Phase I</div>
           <h3 className="text-3xl font-playfair font-black text-blue-100">The Fortification</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
           <div className="space-y-6">
              <p className="text-slate-400 leading-relaxed">Before the war begins, you are dealt a complex treasury consisting of three distinct layers of defense:</p>
              <ul className="space-y-4">
                 {[
                   { label: "Hand Cards", count: "7 Cards", desc: "Your primary reserve for early skirmishes." },
                   { label: "The Stronghold", count: "3 Face-Up", desc: "Cards you choose to protect your hidden layer." },
                   { label: "The Blind Siege", count: "3 Hidden", desc: "Your final cards, played without knowing their rank." }
                 ].map((item, i) => (
                   <li key={i} className="flex gap-4 items-start bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">{i+1}</div>
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-white text-xs uppercase tracking-widest">{item.label}</span>
                            <span className="text-blue-400 font-black text-[10px]">{item.count}</span>
                         </div>
                         <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                   </li>
                 ))}
              </ul>
           </div>
           
           <div className="bg-blue-900/10 border border-blue-500/20 p-8 rounded-3xl relative">
              <Shield className="absolute top-4 right-4 text-blue-500/20 w-12 h-12" />
              <h4 className="text-blue-300 font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Shield size={14} /> Strategic Mandate
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "From your initial Hand of 7, you must select your <strong>3 strongest cards</strong> to place on your hidden cards. These will be your face-up Stronghold. The choice determines your endgame survivability."
              </p>
           </div>
        </div>
      </section>

      {/* PHASE 2: The Skirmish */}
      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-12 rounded-[2.5rem] border border-emerald-500/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8">
           <div className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Phase II</div>
           <h3 className="text-3xl font-playfair font-black text-emerald-100">The Skirmish</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
           <div className="col-span-2 space-y-6">
              <p className="text-slate-400 leading-relaxed text-lg">The core protocol of battle is simple yet unforgiving: You must play a card that matches or exceeds the rank of the card atop the pile.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-slate-950/60 p-6 rounded-2xl border border-emerald-500/20 flex flex-col items-center gap-4 group hover:border-emerald-500/40 transition-all">
                    <div className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">If Top is</div>
                    <div className="text-4xl font-playfair font-black text-white">Jack</div>
                    <ChevronRight className="text-emerald-500/40 rotate-90 sm:rotate-0" />
                    <div className="text-center">
                       <div className="text-emerald-400 font-black text-lg">J, Q, K, or A</div>
                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Legitimate Maneuver</div>
                    </div>
                 </div>
                 <div className="bg-slate-950/60 p-6 rounded-2xl border border-red-500/10 flex flex-col items-center gap-4 group opacity-70">
                    <div className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">If Top is</div>
                    <div className="text-4xl font-playfair font-black text-white">9</div>
                    <ChevronRight className="text-red-500/40 rotate-90 sm:rotate-0" />
                    <div className="text-center">
                       <div className="text-red-400 font-black text-lg">8 or Lower</div>
                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Illegal Maneuver</div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 space-y-6">
              <h4 className="font-black text-[10px] text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
                <AlertCircle size={14} /> Universal Edicts
              </h4>
              <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20 shadow-lg"><RotateCcw className="w-5 h-5 text-red-400" /></div>
                    <div>
                       <span className="block text-white font-black text-[10px] uppercase tracking-widest mb-1">Failed Strike</span>
                       <p className="text-[11px] text-slate-500 leading-relaxed">If you cannot play a legal card, you must <strong>pick up the entire pile</strong> into your hand.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-lg"><Layers className="w-5 h-5 text-blue-400" /></div>
                    <div>
                       <span className="block text-white font-black text-[10px] uppercase tracking-widest mb-1">Reinforcements</span>
                       <p className="text-[11px] text-slate-500 leading-relaxed">Draw cards until you have <strong>at least 3</strong> in hand as long as the deck remains.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* High Arcana Section */}
        <div className="space-y-8">
           <h4 className="text-center font-playfair text-xl font-black text-amber-100/50 uppercase tracking-[0.5em]">The High Arcana</h4>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { rank: "2", title: "The Reset", icon: RotateCcw, color: "blue", desc: "Resets the pile to zero. Playable on anything. You take another turn immediately." },
                { rank: "7", title: "The Lowering", icon: ArrowDown, color: "emerald", desc: "The next ruler must play a card LOWER than or EQUAL to 7." },
                { rank: "10", title: "The Burn", icon: Flame, color: "orange", desc: "Vaporizes the pile entirely. Removed from game. You play again on an empty field." }
              ].map((card, i) => (
                <div key={i} className={`bg-slate-950/60 p-6 rounded-3xl border border-${card.color}-500/20 hover:border-${card.color}-500/50 transition-all group relative overflow-hidden`}>
                   <div className={`absolute -bottom-4 -right-4 text-${card.color}-500/5 font-playfair text-8xl font-black`}>{card.rank}</div>
                   <div className={`w-12 h-12 rounded-2xl bg-${card.color}-500/20 flex items-center justify-center text-${card.color}-400 mb-6 group-hover:scale-110 transition-transform shadow-lg border border-${card.color}-500/20`}>
                      <card.icon className="w-6 h-6" />
                   </div>
                   <h5 className={`font-black text-${card.color}-100 mb-2 uppercase tracking-widest text-xs`}>Rank {card.rank}: {card.title}</h5>
                   <p className="text-[11px] text-slate-500 leading-relaxed relative z-10">{card.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* PHASE 3: The Path to Victory */}
      <section className="bg-gradient-to-br from-amber-900/20 to-slate-900/60 p-8 md:p-12 rounded-[2.5rem] border border-amber-500/20 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[120px] pointer-events-none"></div>
         
         <div className="flex items-center gap-4 mb-10">
            <div className="bg-amber-600 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Phase III</div>
            <h3 className="text-3xl font-playfair font-black text-amber-100">The Path to Victory</h3>
         </div>

         <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-stretch gap-2 w-full">
               {[
                 { title: "Hand Cards", subtitle: "Active Deck", icon: Sword },
                 { title: "Stronghold", subtitle: "Visible Defense", icon: Shield },
                 { title: "Blind Siege", subtitle: "Final Gamble", icon: Eye }
               ].map((step, i) => (
                 <React.Fragment key={i}>
                    <div className="flex-1 bg-slate-950/80 p-8 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center gap-4 group hover:border-amber-500/30 transition-all shadow-lg">
                       <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/10 text-slate-500 group-hover:text-amber-500 transition-colors">
                          <step.icon size={24} />
                       </div>
                       <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{step.subtitle}</div>
                          <div className="font-playfair font-black text-white text-xl">{step.title}</div>
                       </div>
                    </div>
                    {i < 2 && (
                      <div className="flex items-center justify-center text-amber-500/30 rotate-90 md:rotate-0">
                         <ChevronRight size={32} />
                      </div>
                    )}
                 </React.Fragment>
               ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
               <div className="bg-slate-950/60 p-8 rounded-3xl border border-white/5 space-y-4">
                  <h5 className="text-amber-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} /> Critical Wisdom: Hand to Stronghold
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">
                    "When your hand is reduced to exactly 1 card, you must immediately seize your <strong>Stronghold</strong> face-up cards. They join your hand to prolong your defensive capabilities."
                  </p>
               </div>
               <div className="bg-slate-950/60 p-8 rounded-3xl border border-white/5 space-y-4">
                  <h5 className="text-amber-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} /> Critical Wisdom: The Blind Siege
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">
                    "Once your Hand and Stronghold are liberated, you must play your final 3 hidden cards <strong>blindly</strong>. If the revealed card is illegal, you inherit the entire pile, delaying your coronation."
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* Footer Coronation */}
      <div className="text-center pt-8">
         <div className="inline-flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 px-8 py-4 rounded-2xl text-amber-200 font-playfair font-black text-xl italic shadow-xl">
            <Crown size={24} className="text-amber-500" /> Empty Your Treasury, Rule the Palace.
         </div>
      </div>
    </div>
  );
};