import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export function AuthScreen() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      await signIn("password", formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to continue as guest");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4">
      {/* Animated wave background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-64 opacity-20">
          <svg viewBox="0 0 1440 320" className="w-full h-full animate-pulse">
            <path fill="#d97706" fillOpacity="0.3" d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,197.3C672,213,768,203,864,176C960,149,1056,107,1152,101.3C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
          </svg>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-7xl md:text-8xl animate-bounce">☠️</div>
          </div>
          <h1 className="font-pirata text-5xl md:text-6xl text-amber-400 drop-shadow-lg tracking-wider">
            Plunder Poker
          </h1>
          <p className="text-amber-200/60 mt-2 text-lg font-light italic">
            Fortune favors the bold, matey!
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/80 backdrop-blur-sm border-2 border-amber-600/50 rounded-2xl p-6 md:p-8 shadow-2xl shadow-amber-900/20">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-amber-100">
              {flow === "signIn" ? "Welcome Back, Captain!" : "Join the Crew!"}
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-amber-600 to-amber-400 mx-auto mt-3 rounded-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-amber-200/80 text-sm font-medium mb-2">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="captain@plunder.sea"
                className="w-full px-4 py-3 bg-slate-700/50 border border-amber-600/30 rounded-lg text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-amber-200/80 text-sm font-medium mb-2">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-700/50 border border-amber-600/30 rounded-lg text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <input name="flow" type="hidden" value={flow} />

            {error && (
              <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold rounded-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-600/30"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Setting Sail...
                </span>
              ) : (
                flow === "signIn" ? "Board the Ship! ⚓" : "Hoist the Colors! 🏴‍☠️"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
            >
              {flow === "signIn"
                ? "New to the crew? Sign up!"
                : "Already a pirate? Sign in!"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-amber-600/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-800 text-amber-200/50">or</span>
            </div>
          </div>

          <button
            onClick={handleAnonymous}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 border border-amber-600/30 text-amber-200 font-medium rounded-lg transition-all disabled:opacity-50"
          >
            🏴‍☠️ Continue as Guest Pirate
          </button>
        </div>

        <p className="text-center text-amber-200/40 text-sm mt-6">
          By joining, ye agree to the Pirate's Code
        </p>
      </div>
    </div>
  );
}
