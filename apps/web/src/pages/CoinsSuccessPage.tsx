import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CoinsSuccessPage() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-4">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: ['#FFD700', '#FFA500', '#FFDD57', '#F59E0B'][
                  Math.floor(Math.random() * 4)
                ],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-dark-card border border-dark-border rounded-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-yellow-400 px-8 py-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
            <span className="text-5xl">🪙</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Purchase Complete!</h1>
          <p className="text-white/90">Your coins have been added to your account</p>
        </div>

        {/* Success message */}
        <div className="px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-900/30 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Thank You!
          </h2>
          <p className="text-zinc-400 mb-6">
            Your Mint Coins are ready to spend in the Cosmetics Shop.
          </p>

          {/* What you can do */}
          <div className="bg-amber-900/20 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-amber-300 mb-2">
              What can you buy?
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-2xl">🎨</span>
                <p className="text-sm text-amber-400">Avatars</p>
              </div>
              <div>
                <span className="text-2xl">🖼️</span>
                <p className="text-sm text-amber-400">Frames</p>
              </div>
              <div>
                <span className="text-2xl">🏆</span>
                <p className="text-sm text-amber-400">Badges</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="px-8 pb-8 space-y-3">
          <button
            onClick={() => navigate('/shop')}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 to-yellow-400 text-white font-bold text-lg rounded-2xl hover:from-amber-500 hover:to-yellow-500 transition-all"
          >
            Go to Shop
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-6 bg-dark-card border border-dark-border text-zinc-100 font-medium rounded-2xl hover:bg-zinc-800 transition-colors"
          >
            Back to Game
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
