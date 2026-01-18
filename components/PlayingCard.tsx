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

  /**
   * FIX: STRICT DIMENSIONS
   * Using rem for widths and aspect-ratio for height ensures cards NEVER stretch.
   * flex-shrink-0 prevents containers from squashing them.
   */
  const baseClasses = `
    relative 
    w-[3.2rem] sm:w-[4rem] md:w-[4.5rem] lg:w-[5.5rem]
    aspect-[2.5/3.5]
    rounded-md md:rounded-lg 
    transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
    select-none cursor-pointer will-change-transform
    flex-shrink-0
    ${dimmed ? 'brightness-50 grayscale-[50%]' : ''}
    ${className}
  `;

  const content = faceDown ? (
    <div 
      className={`
        w-full h-full
        bg-slate-900 border border-slate-200/30 rounded-[inherit]
        overflow-hidden shadow-lg flex items-center justify-center
        ${highlight ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 z-10 scale-105 shadow-amber-500/20 shadow-2xl' : 'shadow-black/50'}
      `}
    >
      <div className="absolute inset-0 bg-[#0f172a]" style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, #1e293b 0px, #1e293b 1px, transparent 1px, transparent 4px),
            repeating-linear-gradient(-45deg, #1e293b 0px, #1e293b 1px, transparent 1px, transparent 4px)
          `
      }}></div>
      <div className="relative z-10 opacity-30">
         <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-amber-500" />
      </div>
    </div>
  ) : (
    <div 
      className={`
        w-full h-full
        bg-white border border-slate-300 rounded-[inherit]
        ${highlight ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 z-20 scale-110 shadow-2xl shadow-amber-500/20' : ''}
        ${selected 
            ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-slate-900 z-40 shadow-2xl brightness-105' 
            : 'hover:shadow-xl'
        }
        ${isRed ? 'text-rose-600' : 'text-slate-900'}
        shadow-lg flex flex-col relative
      `}
    >
      {/* Corner Rank/Suit Top */}
      <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
        <span className="font-playfair text-[11px] sm:text-base md:text-xl font-black tracking-tight">{rank}</span>
        <span className="text-[7px] sm:text-[10px] md:text-xs -mt-0.5 font-bold">{suit}</span>
      </div>

      {/* Corner Rank/Suit Bottom */}
      <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none transform rotate-180">
        <span className="font-playfair text-[11px] sm:text-base md:text-xl font-black tracking-tight">{rank}</span>
        <span className="text-[7px] sm:text-[10px] md:text-xs -mt-0.5 font-bold">{suit}</span>
      </div>

      {/* Center Detail */}
      <div className="flex-1 flex flex-col items-center justify-center pointer-events-none p-2">
        {PowerIcon ? (
          <div className={`flex flex-col items-center justify-center ${powerColor} opacity-90 scale-90 md:scale-100`}>
            <PowerIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mb-1" strokeWidth={2.5} />
            <span className="text-[4px] md:text-[8px] font-black tracking-widest uppercase border-[0.5px] border-current px-1.5 py-0.5 rounded-full bg-white/70">
              {powerLabel}
            </span>
          </div>
        ) : (
          <div className="text-xl sm:text-3xl md:text-5xl opacity-80 font-serif transform scale-y-90 font-bold">
            {suit}
          </div>
        )}
      </div>

      {/* Subtle Texture/Gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/5 via-white/5 to-white/5 opacity-30 pointer-events-none rounded-[inherit]"></div>
    </div>
  );

  return (
    <div 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      className={baseClasses}
    >
      {content}
    </div>
  );
};