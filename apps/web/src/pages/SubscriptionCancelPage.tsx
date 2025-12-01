import { useNavigate } from 'react-router-dom';

const benefits = [
  { icon: '💰', title: '+10% Income', description: 'Boost all earnings' },
  { icon: '🌙', title: '24hr Offline', description: 'Triple the cap' },
  { icon: '🪙', title: '500 Coins/mo', description: 'Premium currency' },
  { icon: '⭐', title: 'Premium Badge', description: 'Show your status' },
];

export function SubscriptionCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-8 py-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-dark-base rounded-full mb-4">
            <svg
              className="w-8 h-8 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            No Problem!
          </h1>
          <p className="text-zinc-400">
            You can upgrade anytime when you're ready.
          </p>
        </div>

        {/* Benefits reminder */}
        <div className="px-8 pb-6">
          <p className="text-sm text-zinc-400 mb-4 text-center">
            Premium benefits you're missing:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="p-3 bg-dark-base rounded-lg text-center"
              >
                <span className="text-xl block mb-1">{benefit.icon}</span>
                <span className="text-sm font-medium text-zinc-100 block">
                  {benefit.title}
                </span>
                <span className="text-xs text-zinc-400">
                  {benefit.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-6 bg-mint-500 text-white font-semibold rounded-2xl hover:bg-mint-600 transition-colors"
          >
            Back to Game
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="w-full py-3 px-6 bg-dark-base text-zinc-100 font-medium rounded-2xl hover:bg-zinc-800 transition-colors"
          >
            View My Stats
          </button>
        </div>
      </div>
    </div>
  );
}
