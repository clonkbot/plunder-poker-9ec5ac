import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PlayingCard } from "./PlayingCard";

interface GameTableProps {
  gameId: Id<"games">;
  onLeave: () => void;
}

export function GameTable({ gameId, onLeave }: GameTableProps) {
  const { isAuthenticated } = useConvexAuth();
  const game = useQuery(api.games.getWithPlayers, { gameId });
  const currentPlayer = useQuery(api.players.getCurrent);

  const startGame = useMutation(api.games.startGame);
  const setReady = useMutation(api.games.setReady);
  const leaveGame = useMutation(api.games.leave);
  const bet = useMutation(api.games.bet);
  const fold = useMutation(api.games.fold);
  const check = useMutation(api.games.check);

  const [betAmount, setBetAmount] = useState(0);
  const [isActing, setIsActing] = useState(false);

  if (!game || !currentPlayer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-400 text-xl animate-pulse">Loading the table...</div>
      </div>
    );
  }

  const myGamePlayer = game.players.find((p: { userId: string }) => p.userId === currentPlayer.userId);
  const isHost = game.hostId === currentPlayer.userId;
  const isMyTurn = game.status === "playing" &&
    game.players[game.currentPlayerIndex]?.userId === currentPlayer.userId;

  const toCall = myGamePlayer
    ? game.currentBet - myGamePlayer.totalBetThisRound
    : 0;

  const handleLeave = async () => {
    try {
      await leaveGame({ gameId });
      onLeave();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = async () => {
    setIsActing(true);
    try {
      await startGame({ gameId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setIsActing(false);
    }
  };

  const handleReady = async () => {
    if (!myGamePlayer) return;
    try {
      await setReady({ gameId, ready: !myGamePlayer.isReady });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBet = async () => {
    setIsActing(true);
    try {
      await bet({ gameId, amount: betAmount });
      setBetAmount(0);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to bet");
    } finally {
      setIsActing(false);
    }
  };

  const handleCall = async () => {
    setIsActing(true);
    try {
      await bet({ gameId, amount: 0 });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to call");
    } finally {
      setIsActing(false);
    }
  };

  const handleCheck = async () => {
    setIsActing(true);
    try {
      await check({ gameId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to check");
    } finally {
      setIsActing(false);
    }
  };

  const handleFold = async () => {
    setIsActing(true);
    try {
      await fold({ gameId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fold");
    } finally {
      setIsActing(false);
    }
  };

  const getRoundName = (round: string) => {
    switch (round) {
      case "preflop": return "Pre-Flop";
      case "flop": return "The Flop";
      case "turn": return "The Turn";
      case "river": return "The River";
      case "showdown": return "Showdown!";
      default: return round;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-amber-100">{game.name}</h2>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              game.status === "waiting"
                ? "bg-blue-500/20 text-blue-300"
                : game.status === "playing"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-gray-500/20 text-gray-300"
            }`}>
              {game.status === "waiting" ? "⏳ Waiting" : game.status === "playing" ? "🎮 In Progress" : "✅ Finished"}
            </span>
            {game.status === "playing" && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300">
                {getRoundName(game.round)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
        >
          {game.status === "playing" ? "Fold & Leave" : "Leave Table"}
        </button>
      </div>

      {/* Game Table */}
      <div className="relative bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl md:rounded-3xl border-8 border-amber-800 shadow-2xl overflow-hidden">
        {/* Decorative border */}
        <div className="absolute inset-2 md:inset-4 border-2 border-amber-600/30 rounded-xl md:rounded-2xl pointer-events-none" />

        {/* Center info */}
        <div className="py-8 md:py-16 px-4">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-block bg-slate-900/80 backdrop-blur rounded-xl px-6 md:px-8 py-3 md:py-4 border border-amber-600/30">
              <div className="text-amber-400 text-sm uppercase tracking-wider">Treasure Pot</div>
              <div className="text-3xl md:text-5xl font-bold text-amber-300 flex items-center justify-center gap-2">
                <span>🪙</span>
                <span>{game.pot}</span>
              </div>
              {game.status === "playing" && game.currentBet > 0 && (
                <div className="text-amber-200/60 text-sm mt-1">
                  Current bet: {game.currentBet}
                </div>
              )}
            </div>
          </div>

          {/* Community Cards */}
          {game.status === "playing" && game.communityCards.length > 0 && (
            <div className="flex justify-center gap-1 sm:gap-2 md:gap-3 mb-6 md:mb-8 flex-wrap">
              {game.communityCards.map((card: string, i: number) => (
                <div
                  key={i}
                  className="transform hover:scale-105 transition-transform"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <PlayingCard card={card} size="md" />
                </div>
              ))}
              {/* Placeholder for unrevealed cards */}
              {Array.from({ length: 5 - game.communityCards.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-12 sm:w-14 md:w-20 h-16 sm:h-20 md:h-28 bg-slate-800/30 rounded-lg border border-dashed border-amber-600/20" />
              ))}
            </div>
          )}

          {/* Players */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
            {game.players.map((player: { _id: string; userId: string; seatIndex: number; status: string; isReady: boolean; totalBetThisRound: number; pirateAlias: string; cards: string[] }, i: number) => {
              const isCurrentTurn = game.status === "playing" && game.currentPlayerIndex === player.seatIndex;
              const isMe = player.userId === currentPlayer.userId;

              return (
                <div
                  key={player._id}
                  className={`p-2 md:p-4 rounded-xl transition-all ${
                    isCurrentTurn
                      ? "bg-amber-500/30 border-2 border-amber-400 shadow-lg shadow-amber-500/30 animate-pulse"
                      : "bg-slate-800/60 border border-amber-600/20"
                  } ${player.status === "folded" ? "opacity-50" : ""}`}
                >
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl mb-1">
                      {isMe ? "🏴‍☠️" : "💀"}
                    </div>
                    <div className={`font-bold text-sm md:text-base truncate ${isMe ? "text-amber-300" : "text-amber-100"}`}>
                      {player.pirateAlias}
                    </div>
                    {game.status === "waiting" ? (
                      <div className={`text-xs mt-1 ${player.isReady ? "text-green-400" : "text-amber-200/50"}`}>
                        {player.isReady ? "Ready!" : "Not ready"}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-200/70 mt-1">
                        Bet: {player.totalBetThisRound}
                      </div>
                    )}
                    {player.status === "folded" && (
                      <div className="text-xs text-red-400 mt-1">Folded</div>
                    )}

                    {/* Cards */}
                    {game.status === "playing" && player.cards.length > 0 && (
                      <div className="flex justify-center gap-1 mt-2">
                        {player.cards.map((card: string, ci: number) => (
                          <PlayingCard
                            key={ci}
                            card={card}
                            size="sm"
                            hidden={card === "hidden"}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty seats */}
            {Array.from({ length: game.maxPlayers - game.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="p-2 md:p-4 rounded-xl bg-slate-800/20 border border-dashed border-amber-600/20 flex items-center justify-center"
              >
                <div className="text-amber-200/30 text-center">
                  <div className="text-2xl md:text-3xl">👤</div>
                  <div className="text-xs mt-1">Empty</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 md:mt-6 bg-slate-800/60 backdrop-blur border border-amber-600/30 rounded-xl p-4 md:p-6">
        {game.status === "waiting" ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            {!isHost && myGamePlayer && (
              <button
                onClick={handleReady}
                className={`w-full sm:w-auto px-6 py-3 font-bold rounded-lg transition-all ${
                  myGamePlayer.isReady
                    ? "bg-gray-600 text-gray-300"
                    : "bg-green-600 hover:bg-green-500 text-white"
                }`}
              >
                {myGamePlayer.isReady ? "❌ Cancel Ready" : "✅ Ready Up!"}
              </button>
            )}
            {isHost && (
              <button
                onClick={handleStart}
                disabled={isActing || game.players.length < 2}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 font-bold rounded-lg hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isActing ? "Starting..." : "⚔️ Start Game!"}
              </button>
            )}
            <div className="text-amber-200/60 text-sm">
              {game.players.length}/{game.maxPlayers} pirates aboard
            </div>
          </div>
        ) : game.status === "playing" && isMyTurn && myGamePlayer?.status === "active" ? (
          <div className="space-y-4">
            <div className="text-center text-amber-300 font-bold text-lg animate-pulse">
              ⚔️ Yer turn, Captain!
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 md:gap-3">
              {toCall > 0 ? (
                <button
                  onClick={handleCall}
                  disabled={isActing}
                  className="px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50 transition-all text-sm md:text-base"
                >
                  📞 Call ({toCall})
                </button>
              ) : (
                <button
                  onClick={handleCheck}
                  disabled={isActing}
                  className="px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50 transition-all text-sm md:text-base"
                >
                  ✅ Check
                </button>
              )}

              <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-20 md:w-32 accent-amber-500"
                />
                <button
                  onClick={handleBet}
                  disabled={isActing || betAmount === 0}
                  className="px-4 md:px-6 py-2 md:py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold rounded-lg disabled:opacity-50 transition-all text-sm md:text-base whitespace-nowrap"
                >
                  💰 Raise +{betAmount}
                </button>
              </div>

              <button
                onClick={handleFold}
                disabled={isActing}
                className="px-4 md:px-6 py-2.5 md:py-3 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-lg disabled:opacity-50 transition-all text-sm md:text-base"
              >
                🏳️ Fold
              </button>
            </div>
          </div>
        ) : game.status === "playing" ? (
          <div className="text-center text-amber-200/60">
            {myGamePlayer?.status === "folded"
              ? "Ye folded this round. Wait for the next hand..."
              : "Waiting for other pirates to act..."}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-2xl md:text-3xl mb-2">🏆</div>
            <div className="text-amber-100 text-lg md:text-xl font-bold">Game Over!</div>
            <button
              onClick={handleLeave}
              className="mt-4 px-6 py-2 bg-amber-600 text-slate-900 font-bold rounded-lg hover:bg-amber-500 transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
