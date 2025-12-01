import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PremiumBadge } from '../components/PremiumBadge';

const benefits = [
  { icon: '💰', text: '+10% income bonus activated' },
  { icon: '🌙', text: '24-hour offline earnings unlocked' },
  { icon: '🪙', text: '500 Mint Coins added to your account' },
  { icon: '⭐', text: 'Premium badge now visible' },
];

export function SubscriptionSuccessPage() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-4">
      {/* Simple confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: ['#FFD700', '#10B981', '#3B82F6', '#F59E0B'][
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
        <div className="bg-gradient-to-r from-gold-400 to-amber-400 px-8 py-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
            <svg
              className="w-10 h-10 text-white"
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
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Premium!</h1>
          <div className="flex items-center justify-center gap-2">
            <PremiumBadge size="md" />
          </div>
        </div>

        {/* Benefits activated */}
        <div className="px-8 py-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Your benefits are now active:
          </h2>
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-green-900/20 rounded-lg"
              >
                <span className="text-xl">{benefit.icon}</span>
                <span className="text-green-300 font-medium">
                  {benefit.text}
                </span>
                <svg
                  className="w-5 h-5 text-green-400 ml-auto"
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
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 px-6 bg-gradient-to-r from-mint-500 to-emerald-500 text-white font-bold text-lg rounded-2xl hover:from-mint-600 hover:to-emerald-600 transition-all"
          >
            Start Playing
          </button>
          <p className="text-center text-sm text-zinc-400 mt-4">
            Thank you for supporting The Mint!
          </p>
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
