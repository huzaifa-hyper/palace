import React from 'react';
import { Suit, Rank } from '../types';
import { Sparkles, Flame, ArrowDown, RotateCcw } from 'lucide-react';

interface PlayingCardProps {
  suit?: Suit;
  rank?: Rank | string;
  faceDown?: boolean;
  highlight?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: React.CSSProperties;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({ 
  suit = Suit.Spades, 
  rank = Rank.Ace, 
  faceDown = false, 
  highlight = false,
  selected = false,
  dimmed = false,
  className = "",
  onClick,
  onMouseEnter,
  onMouseLeave,
  style
}) => {
  const isRed = suit === Suit.Hearts || suit === Suit.Diamonds;
  
  // Power Card Logic
  let PowerIcon = null;
  let powerColor = "";
  let powerLabel = "";
  
  if (!faceDown) {
    if (rank === Rank.Two) {
      PowerIcon = RotateCcw;
      powerColor = "text-blue-600";
      powerLabel = "RESET";
    } else if (rank === Rank.Seven) {
      PowerIcon = ArrowDown;
      powerColor = "text-emerald-600";
      powerLabel = "LOWER";
    } else if (rank === Rank.Ten) {
      PowerIcon = Flame;
      powerColor = "text-orange-600";
      powerLabel = "BURN";
    }
  }

  // Adjusted dimensions for better fit on all screens
  const baseClasses = `
    relative 
    w-[4.2rem] h-[6rem] sm:w-20 sm:h-28 md:w-24 md:h-34 lg:w-26 lg:h-36
    rounded-lg 
    transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
    select-none cursor-pointer will-change-transform
    ${dimmed ? 'brightness-50 grayscale-[50%]' : ''}
    ${className}
  `;

  if (faceDown) {
    return (
      <div 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={style}
        className={`
          ${baseClasses}
          bg-slate-900 border-2 md:border-[3px] border-slate-200
          overflow-hidden shadow-lg
          ${highlight ? 'ring-2 md:ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-10 scale-105' : 'shadow-black/50'}
        `}
      >
        <div className="absolute inset-0 bg-[#0f172a]" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 8px),
              repeating-linear-gradient(-45deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 8px)
            `
        }}></div>
        <div className="absolute inset-1.5 border border-amber-500/30 rounded-md"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 md:w-12 md:h-12 bg-slate-900 border border-amber-500/50 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
             <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      className={`
        ${baseClasses}
        bg-white border border-slate-300
        ${highlight ? 'ring-2 md:ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-20 scale-110 shadow-2xl' : ''}
        ${selected 
            ? 'ring-2 md:ring-4 ring-amber-500 ring-offset-2 ring-offset-slate-900 z-50 shadow-2xl brightness-105' 
            : 'hover:shadow-xl'
        }
        ${isRed ? 'text-rose-600' : 'text-slate-900'}
        shadow-lg
      `}
    >
      <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
        <span className="font-playfair text-lg sm:text-xl md:text-2xl font-black tracking-tight">{rank}</span>
        <span className="text-xs sm:text-sm md:text-base -mt-0.5">{suit}</span>
      </div>

      <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none transform rotate-180">
        <span className="font-playfair text-lg sm:text-xl md:text-2xl font-black tracking-tight">{rank}</span>
        <span className="text-xs sm:text-sm md:text-base -mt-0.5">{suit}</span>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {PowerIcon ? (
          <div className={`flex flex-col items-center justify-center ${powerColor} opacity-90`}>
            <PowerIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mb-1" strokeWidth={2.5} />
            <span className="text-[7px] md:text-[8px] font-black tracking-widest uppercase border border-current px-1.5 rounded-full bg-white/70">
              {powerLabel}
            </span>
          </div>
        ) : (
          <div className="text-4xl sm:text-5xl md:text-6xl opacity-90 font-serif drop-shadow-sm transform scale-y-90">
            {suit}
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/10 via-white/20 to-white/10 opacity-30 pointer-events-none rounded-[inherit]"></div>
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] pointer-events-none rounded-[inherit]"></div>
    </div>
  );
};