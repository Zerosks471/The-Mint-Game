import { useState, useEffect } from 'react';
import { getPackages, createCoinCheckout, CoinPackage } from '../api/coins';

interface BuyCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function BuyCoinsModal({ isOpen, onClose }: BuyCoinsModalProps) {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPackages();
      setPackages(data.packages);
      setBalance(data.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    setError(null);

    try {
      const { checkoutUrl } = await createCoinCheckout(packageId);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setPurchasing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-yellow-400 px-6 py-6 text-center relative">
          <button
            onClick={onClose}
            disabled={purchasing !== null}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3">
            <span className="text-3xl">🪙</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Get Mint Coins</h2>
          <p className="text-white/90">
            Current Balance: <span className="font-bold">{balance.toLocaleString()}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-amber-500" viewBox="0 0 24 24">
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
            </div>
          ) : error && packages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={loadPackages}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <p className="text-red-600 dark:text-red-400 text-sm text-center mb-4">{error}</p>
              )}

              {/* Packages grid */}
              <div className="grid grid-cols-2 gap-3">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing !== null}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      pkg.label === 'Best Value'
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : pkg.label === 'Popular'
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {/* Label badge */}
                    {pkg.label && (
                      <span
                        className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-bold rounded-full ${
                          pkg.label === 'Best Value'
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {pkg.label}
                      </span>
                    )}

                    {/* Coins amount */}
                    <div className="text-center mb-2 mt-1">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {pkg.coins.toLocaleString()}
                      </span>
                      <span className="text-amber-500 ml-1">🪙</span>
                    </div>

                    {/* Bonus */}
                    {pkg.bonus && (
                      <div className="text-center mb-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                          +{pkg.bonus}% Bonus
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="text-center">
                      {purchasing === pkg.id ? (
                        <svg className="animate-spin h-5 w-5 mx-auto text-amber-500" viewBox="0 0 24 24">
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
                      ) : (
                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                          {formatPrice(pkg.price)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer info */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Secure checkout powered by Stripe
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
