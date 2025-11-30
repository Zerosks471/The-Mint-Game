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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
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
                <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="px-6 pb-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Monthly</span>
              <span className="text-xl font-bold text-gray-900">$4.99/mo</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Annual</span>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Save 33%
                </span>
                <span className="text-xl font-bold text-gray-900">$39.99/yr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            disabled
            className="w-full py-3 px-4 bg-gradient-to-r from-gold-400 to-amber-400 text-white font-semibold rounded-xl opacity-60 cursor-not-allowed"
          >
            Coming Soon
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
