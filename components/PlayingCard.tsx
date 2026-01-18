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

  // Responsive dimensions: 
  // Mobile: ~60x84px (w-15 h-21 approx)
  // Desktop: ~96x136px (w-24 h-34)
  const baseClasses = `
    relative 
    w-[3.6rem] h-[5rem] sm:w-16 sm:h-22 md:w-20 md:h-28 lg:w-24 lg:h-34
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
          bg-slate-900 border-2 border-slate-200
          overflow-hidden shadow-lg
          ${highlight ? 'ring-2 md:ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-10 scale-105' : 'shadow-black/50'}
        `}
      >
        <div className="absolute inset-0 bg-[#0f172a]" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, #1e293b 0px, #1e293b 1.5px, transparent 1.5px, transparent 6px),
              repeating-linear-gradient(-45deg, #1e293b 0px, #1e293b 1.5px, transparent 1.5px, transparent 6px)
            `
        }}></div>
        <div className="absolute inset-1 border border-amber-500/20 rounded-md"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 md:w-8 md:h-8 bg-slate-900 border border-amber-500/40 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
             <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-amber-400/80" />
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
      <div className="absolute top-0.5 left-0.5 md:top-1 md:left-1 flex flex-col items-center leading-none">
        <span className="font-playfair text-sm sm:text-lg md:text-xl font-black tracking-tight">{rank}</span>
        <span className="text-[8px] sm:text-xs md:text-sm -mt-0.5">{suit}</span>
      </div>

      <div className="absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1 flex flex-col items-center leading-none transform rotate-180">
        <span className="font-playfair text-sm sm:text-lg md:text-xl font-black tracking-tight">{rank}</span>
        <span className="text-[8px] sm:text-xs md:text-sm -mt-0.5">{suit}</span>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-1">
        {PowerIcon ? (
          <div className={`flex flex-col items-center justify-center ${powerColor} opacity-90`}>
            <PowerIcon className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 mb-0.5" strokeWidth={2.5} />
            <span className="text-[5px] md:text-[8px] font-black tracking-widest uppercase border border-current px-1 rounded-full bg-white/70">
              {powerLabel}
            </span>
          </div>
        ) : (
          <div className="text-2xl sm:text-4xl md:text-5xl opacity-90 font-serif drop-shadow-sm transform scale-y-90">
            {suit}
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/5 via-white/10 to-white/5 opacity-30 pointer-events-none rounded-[inherit]"></div>
    </div>
  );
};
