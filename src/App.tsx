import { useState, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { AuthScreen } from "./components/AuthScreen";
import { Lobby } from "./components/Lobby";
import { GameTable } from "./components/GameTable";

function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [currentGameId, setCurrentGameId] = useState<Id<"games"> | null>(null);

  const getOrCreatePlayer = useMutation(api.players.getOrCreate);
  const myCurrentGame = useQuery(api.games.getMyCurrentGame);

  // Auto-create player profile when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getOrCreatePlayer().catch(console.error);
    }
  }, [isAuthenticated, getOrCreatePlayer]);

  // Check if user is already in a game
  useEffect(() => {
    if (myCurrentGame && !currentGameId) {
      setCurrentGameId(myCurrentGame._id);
    }
  }, [myCurrentGame, currentGameId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl md:text-8xl animate-bounce mb-4">☠️</div>
          <div className="text-amber-400 text-xl animate-pulse">Loading the ship...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-amber-600/30 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-2xl md:text-3xl">☠️</span>
            <h1 className="font-pirata text-xl md:text-3xl text-amber-400">Plunder Poker</h1>
          </div>
          <button
            onClick={() => signOut()}
            className="px-3 md:px-4 py-1.5 md:py-2 text-amber-200/70 hover:text-amber-200 hover:bg-slate-800 rounded-lg transition-all text-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 md:py-8">
        {currentGameId ? (
          <GameTable
            gameId={currentGameId}
            onLeave={() => setCurrentGameId(null)}
          />
        ) : (
          <Lobby onJoinGame={setCurrentGameId} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-amber-600/20 py-4 mt-auto">
        <div className="text-center text-amber-200/40 text-xs">
          Requested by @xWin555 · Built by @clonkbot
        </div>
      </footer>
    </div>
  );
}

export default App;
