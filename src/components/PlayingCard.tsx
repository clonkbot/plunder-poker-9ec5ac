interface PlayingCardProps {
  card: string;
  size?: "sm" | "md" | "lg";
  hidden?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_COLORS: Record<string, string> = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-slate-900",
  spades: "text-slate-900",
};

export function PlayingCard({ card, size = "md", hidden = false }: PlayingCardProps) {
  const sizeClasses = {
    sm: "w-8 h-11 sm:w-10 sm:h-14 text-xs sm:text-sm",
    md: "w-12 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24 text-sm sm:text-base md:text-lg",
    lg: "w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 text-lg sm:text-xl md:text-2xl",
  };

  if (hidden) {
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-amber-700 to-amber-900 rounded-md sm:rounded-lg border-2 border-amber-600 flex items-center justify-center shadow-md`}>
        <div className="text-amber-400 opacity-60">
          <span className="text-base sm:text-lg md:text-2xl">☠️</span>
        </div>
      </div>
    );
  }

  const [rank, suit] = card.split("_");
  const symbol = SUIT_SYMBOLS[suit] || "?";
  const colorClass = SUIT_COLORS[suit] || "text-slate-900";

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-amber-50 to-amber-100 rounded-md sm:rounded-lg border-2 border-amber-300 flex flex-col items-center justify-center shadow-md hover:shadow-lg transition-shadow`}>
      <div className={`font-bold ${colorClass}`}>{rank}</div>
      <div className={`${colorClass} text-base sm:text-lg md:text-2xl leading-none`}>{symbol}</div>
    </div>
  );
}
