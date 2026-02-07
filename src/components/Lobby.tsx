import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface LobbyProps {
  onJoinGame: (gameId: Id<"games">) => void;
}

export function Lobby({ onJoinGame }: LobbyProps) {
  const player = useQuery(api.players.getCurrent);
  const games = useQuery(api.games.list);
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.games.join);
  const getOrCreatePlayer = useMutation(api.players.getOrCreate);
  const addDoubloons = useMutation(api.players.addDoubloons);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameName, setGameName] = useState("");
  const [minBet, setMinBet] = useState(50);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreating, setIsCreating] = useState(false);

  // Create player profile if needed
  if (player === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-400 text-xl animate-pulse">Loading yer profile...</div>
      </div>
    );
  }

  if (player === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-amber-200 text-lg">Create yer pirate identity to begin!</p>
        <button
          onClick={() => getOrCreatePlayer()}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 font-bold rounded-lg hover:from-amber-500 hover:to-amber-400 transition-all"
        >
          🏴‍☠️ Become a Pirate!
        </button>
      </div>
    );
  }

  const handleCreateGame = async () => {
    if (!gameName.trim()) return;
    setIsCreating(true);
    try {
      const gameId = await createGame({
        name: gameName.trim(),
        minBet,
        maxPlayers,
      });
      setShowCreateModal(false);
      setGameName("");
      onJoinGame(gameId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async (gameId: Id<"games">) => {
    try {
      await joinGame({ gameId });
      onJoinGame(gameId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to join game");
    }
  };

  const waitingGames = games?.filter((g: { status: string }) => g.status === "waiting") || [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Player Card */}
      <div className="bg-slate-800/60 backdrop-blur border border-amber-600/30 rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-amber-400 text-sm uppercase tracking-wider mb-1">Captain</div>
            <h2 className="text-2xl md:text-3xl font-bold text-amber-100">{player.pirateAlias}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-amber-200/70">
              <span>🎮 {player.gamesPlayed} games</span>
              <span>🏆 {player.gamesWon} wins</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-amber-400 text-sm uppercase tracking-wider mb-1">Treasury</div>
            <div className="text-3xl md:text-4xl font-bold text-amber-300 flex items-center gap-2">
              <span>🪙</span>
              <span>{player.doubloons.toLocaleString()}</span>
            </div>
            {player.doubloons < 100 && (
              <button
                onClick={() => addDoubloons({ amount: 500 })}
                className="mt-2 px-3 py-1 bg-amber-600/20 border border-amber-600/50 rounded text-amber-400 text-sm hover:bg-amber-600/30 transition-colors"
              >
                + Claim Daily Bonus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 md:mb-8">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex-1 py-3 md:py-4 px-6 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 font-bold text-lg rounded-xl hover:from-amber-500 hover:to-amber-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-amber-600/30"
        >
          ⚔️ Create New Table
        </button>
      </div>

      {/* Available Games */}
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-amber-100 mb-4 flex items-center gap-2">
          <span>🏴‍☠️</span> Available Tables
        </h3>

        {waitingGames.length === 0 ? (
          <div className="bg-slate-800/40 border border-amber-600/20 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">🌊</div>
            <p className="text-amber-200/60 text-lg">No ships on the horizon...</p>
            <p className="text-amber-200/40 text-sm mt-2">Be the first to create a table!</p>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4">
            {waitingGames.map((game: { _id: Id<"games">; name: string; minBet: number; maxPlayers: number }) => (
              <div
                key={game._id}
                className="bg-slate-800/60 border border-amber-600/30 rounded-xl p-4 md:p-5 hover:border-amber-500/50 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-lg md:text-xl font-bold text-amber-100 group-hover:text-amber-50 transition-colors">
                      {game.name}
                    </h4>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-amber-200/70">
                      <span className="flex items-center gap-1">
                        <span>🪙</span> Min: {game.minBet}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>👥</span> Max: {game.maxPlayers}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinGame(game._id)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-amber-600/20 border border-amber-500/50 text-amber-300 font-bold rounded-lg hover:bg-amber-600/30 hover:border-amber-400 transition-all"
                  >
                    Join Table
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border-2 border-amber-600/50 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold text-amber-100 mb-6 flex items-center gap-2">
              <span>⚔️</span> Create New Table
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-amber-200/80 text-sm font-medium mb-2">
                  Table Name
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="The Black Pearl"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-amber-600/30 rounded-lg text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-amber-200/80 text-sm font-medium mb-2">
                  Minimum Bet: 🪙 {minBet}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={minBet}
                  onChange={(e) => setMinBet(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-amber-200/80 text-sm font-medium mb-2">
                  Max Players: {maxPlayers}
                </label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 px-4 bg-slate-700 text-amber-200 rounded-lg hover:bg-slate-600 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                disabled={!gameName.trim() || isCreating}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 font-bold rounded-lg hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all order-1 sm:order-2"
              >
                {isCreating ? "Creating..." : "Create Table"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
