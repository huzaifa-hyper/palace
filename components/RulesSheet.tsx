import React from 'react';
import { Trophy, Layers, Play, Zap, RotateCcw, ArrowDown, Flame, Shield } from 'lucide-react';

export const RulesSheet: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 md:pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-4xl md:text-5xl font-playfair font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
          Royal Protocols
        </h2>
        <p className="text-slate-400 font-light tracking-wide uppercase text-sm">The Official Codex of Palace Rulers</p>
      </div>

      {/* 1. Objective */}
      <section className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-colors">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy className="w-32 h-32" />
        </div>
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="bg-amber-500/20 p-3 rounded-2xl text-amber-500">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-playfair font-bold text-amber-100">The Objective</h3>
        </div>
        <p className="text-slate-300 leading-relaxed text-lg relative z-10">
          Be the first ruler to empty your entire dominion of cards. You must play through your cards in a specific order:
        </p>
        <div className="flex flex-col md:flex-row gap-4 mt-6 relative z-10">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/10 flex-1 text-center">
             <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Phase 1</div>
             <div className="font-bold text-white">The Hand</div>
             <div className="text-xs text-slate-400 mt-1">Play these first</div>
          </div>
          <div className="hidden md:flex items-center text-slate-600">→</div>
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/10 flex-1 text-center">
             <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Phase 2</div>
             <div className="font-bold text-amber-200">The Stronghold</div>
             <div className="text-xs text-slate-400 mt-1">Face-Up Cards</div>
          </div>
          <div className="hidden md:flex items-center text-slate-600">→</div>
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/10 flex-1 text-center">
             <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Phase 3</div>
             <div className="font-bold text-slate-400">The Vault</div>
             <div className="text-xs text-slate-500 mt-1">Hidden Face-Down</div>
          </div>
        </div>
      </section>

      {/* 2. Setup */}
      <section className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-500">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-playfair font-bold text-blue-100">The Setup</h3>
        </div>
        <ul className="space-y-4 text-slate-300">
          <li className="flex gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 font-bold text-sm shrink-0 border border-blue-500/20">1</span>
            <p className="mt-1">Each player is dealt <strong>3 Hidden Cards</strong> (face-down) and <strong>6 Hand Cards</strong>.</p>
          </li>
          <li className="flex gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 font-bold text-sm shrink-0 border border-blue-500/20">2</span>
            <p className="mt-1">From your hand, choose <strong>3 cards</strong> to place face-up on top of your hidden cards. These form your <strong>Stronghold</strong>.</p>
          </li>
          <li className="ml-12 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl text-sm text-blue-200 flex gap-3">
             <Shield className="w-5 h-5 shrink-0 text-blue-400" />
             <div>
               <strong>Strategy Tip:</strong> Save your best cards (Aces, 10s, 2s) for your Stronghold. You'll need them when you run out of cards in your hand!
             </div>
          </li>
        </ul>
      </section>

      {/* 3. Gameplay */}
      <section className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-emerald-500/20 p-3 rounded-2xl text-emerald-500">
            <Play className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-playfair font-bold text-emerald-100">Rules of Engagement</h3>
        </div>
        <div className="space-y-4 text-slate-300">
          <p className="text-lg">On your turn, play a card <strong>equal to or higher</strong> than the top card of the pile.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
             <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                <h4 className="font-bold text-white mb-2">Valid Moves</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                   <li>Play a higher card (e.g., 6 on a 5).</li>
                   <li>Play an equal card (e.g., 5 on a 5).</li>
                   <li>Play multiple cards of the same rank (e.g., three 5s).</li>
                   <li>Play a <strong>Power Card</strong> (2, 7, 10).</li>
                </ul>
             </div>
             <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                <h4 className="font-bold text-white mb-2">Consequences</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                   <li>If you cannot play, you must <strong>pick up the pile</strong>.</li>
                   <li>If the deck has cards, you must <strong>draw</strong> to keep at least 3 cards in hand.</li>
                </ul>
             </div>
          </div>
        </div>
      </section>

      {/* 4. Power Cards */}
      <section className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-purple-500/20 p-3 rounded-2xl text-purple-500">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-playfair font-bold text-purple-100">Power Cards</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold">
                  <RotateCcw className="w-5 h-5" /> The Reset (2)
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                  Acts as a wildcard. Can be played on <strong>ANY</strong> card. Resets the pile value to 2. You take another turn immediately.
              </p>
            </div>
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold">
                  <ArrowDown className="w-5 h-5" /> The Lower (7)
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                  Forces the next player to play a card <strong>lower than or equal to 7</strong>. (5, 6, 7 are valid).
              </p>
            </div>
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-orange-400 font-bold">
                  <Flame className="w-5 h-5" /> The Burn (10)
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                  Can be played on <strong>ANY</strong> card. Explodes the pile, removing it from the game permanently. You take another turn.
              </p>
            </div>
        </div>
      </section>

      {/* 5. Endgame */}
      <section className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-red-500/20 p-3 rounded-2xl text-red-500">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-playfair font-bold text-red-100">The Endgame</h3>
        </div>
        <div className="space-y-3 text-slate-300 text-lg">
          <p>
            Once your hand is empty, you play from your <strong>Stronghold</strong> (Face-Up cards).
          </p>
          <p>
            Once your Stronghold is depleted, you must play your <strong>Hidden Cards</strong> blindly. You flip the top one:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-base text-slate-400">
             <li>If valid, the game continues.</li>
             <li>If invalid, you pick up the pile and must clear your hand again before attempting the hidden cards.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};
