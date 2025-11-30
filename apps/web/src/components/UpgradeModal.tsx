import { useState } from 'react';
import { createCheckoutSession } from '../api/subscriptions';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const benefits = [
  {
    icon: '💰',
    title: '+10% Income Bonus',
    description: 'Earn 10% more from all your properties and businesses',
  },
  {
    icon: '🌙',
    title: '24hr Offline Earnings',
    description: 'Triple the offline cap - earn while you sleep',
  },
  {
    icon: '🪙',
    title: '500 Mint Coins Monthly',
    description: 'Get premium currency every month',
  },
  {
    icon: '⭐',
    title: 'Exclusive Badge',
    description: 'Show off your premium status on leaderboards',
  },
];

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    setLoading(plan);
    setError(null);

    try {
      const { checkoutUrl } = await createCheckoutSession(plan);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-gold-400 to-amber-400 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Premium</h2>
          <p className="text-white/90">Unlock exclusive benefits and boost your earnings</p>
        </div>

        {/* Benefits */}
        <div className="px-6 py-6 space-y-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-2xl">{benefit.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{benefit.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="px-6 pb-2">
            <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Pricing buttons */}
        <div className="px-6 pb-4 space-y-3">
          <button
            onClick={() => handleSubscribe('monthly')}
            disabled={loading !== null}
            className="w-full py-3 px-4 bg-gradient-to-r from-gold-400 to-amber-400 text-white font-semibold rounded-xl hover:from-gold-500 hover:to-amber-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === 'monthly' ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <span>Subscribe Monthly</span>
                <span className="font-bold">$4.99/mo</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleSubscribe('annual')}
            disabled={loading !== null}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === 'annual' ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <span>Subscribe Yearly</span>
                <span className="font-bold">$39.99/yr</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Save 33%</span>
              </>
            )}
          </button>
        </div>

        {/* Close button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            disabled={loading !== null}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-60"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
