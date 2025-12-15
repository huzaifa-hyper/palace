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

  // Base Dimensions & Animation Config
  // cubic-bezier(0.34, 1.56, 0.64, 1) creates a "spring/snap" effect
  const baseClasses = `
    relative 
    w-[3.8rem] h-[5.4rem] sm:w-20 sm:h-28 md:w-24 md:h-36 lg:w-28 lg:h-40
    rounded-[0.4rem] md:rounded-xl 
    transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
    select-none cursor-pointer will-change-transform
    ${dimmed ? 'brightness-50 grayscale-[50%]' : ''}
    ${className}
  `;

  // --- Face Down Design (Premium Back) ---
  if (faceDown) {
    return (
      <div 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={style}
        className={`
          ${baseClasses}
          bg-slate-900 border-[3px] border-slate-200
          overflow-hidden shadow-lg
          ${highlight ? 'ring-2 md:ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-10 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.5)]' : 'shadow-black/50'}
        `}
      >
        {/* Geometric Pattern Background */}
        <div className="absolute inset-0 bg-[#0f172a]" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 8px),
              repeating-linear-gradient(-45deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 8px)
            `
        }}></div>
        
        {/* Inner Border */}
        <div className="absolute inset-1.5 border border-amber-500/30 rounded-sm md:rounded-md"></div>
        
        {/* Center Emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 md:w-14 md:h-14 bg-slate-900 border-2 border-amber-500/50 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent"></div>
             <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
          </div>
        </div>
      </div>
    );
  }

  // --- Face Up Design ---
  return (
    <div 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      className={`
        ${baseClasses}
        bg-white border border-slate-300
        ${highlight ? 'ring-2 md:ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-20 scale-110 shadow-[0_10px_30px_rgba(0,0,0,0.5)]' : ''}
        ${selected 
            ? 'ring-2 md:ring-4 ring-amber-500 ring-offset-2 ring-offset-slate-900 z-50 shadow-[0_25px_50px_rgba(245,158,11,0.6)] brightness-105' 
            : 'hover:shadow-2xl'
        }
        ${isRed ? 'text-rose-600' : 'text-slate-900'}
        shadow-[0_4px_6px_rgba(0,0,0,0.3)]
      `}
    >
      {/* Corner Value (Top Left) */}
      <div className="absolute top-0.5 left-0.5 md:top-1 md:left-1 flex flex-col items-center leading-none p-0.5">
        <span className="font-playfair text-base sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tight">{rank}</span>
        <span className="text-[10px] sm:text-sm md:text-lg -mt-0.5 md:-mt-1">{suit}</span>
      </div>

      {/* Corner Value (Bottom Right - Inverted) */}
      <div className="absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1 flex flex-col items-center leading-none transform rotate-180 p-0.5">
        <span className="font-playfair text-base sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tight">{rank}</span>
        <span className="text-[10px] sm:text-sm md:text-lg -mt-0.5 md:-mt-1">{suit}</span>
      </div>

      {/* Center Art */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {PowerIcon ? (
          <div className={`flex flex-col items-center justify-center ${powerColor} opacity-90`}>
            <PowerIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 mb-0.5 md:mb-2 drop-shadow-sm" strokeWidth={2} />
            <span className="text-[5px] sm:text-[8px] md:text-[9px] font-black tracking-widest uppercase border border-current px-1 md:px-1.5 rounded-full bg-white/50 backdrop-blur-sm">
              {powerLabel}
            </span>
          </div>
        ) : (
          <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl opacity-90 font-serif drop-shadow-sm transform scale-y-90">
            {suit}
          </div>
        )}
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/20 via-white/40 to-white/10 opacity-30 pointer-events-none rounded-[inherit]"></div>
      
      {/* Texture for realism */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] pointer-events-none rounded-[inherit]"></div>
    </div>
  );
};