import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

interface ApiStatus {
  status: string;
  database: boolean;
  timestamp: string;
}

function HomePage() {
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const checkApiHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ready');
      const data = await response.json();
      setApiStatus({
        status: data.status,
        database: data.checks?.database ?? false,
        timestamp: data.timestamp,
      });
    } catch (error) {
      setApiStatus({
        status: 'error',
        database: false,
        timestamp: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-mint-50 to-white">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-display font-bold text-mint-600 mb-4">
          🌿 The Mint
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Build Your Financial Empire. One Click at a Time.
        </p>

        <div className="space-x-4 mb-8">
          <button
            onClick={() => navigate('/game')}
            className="px-6 py-3 bg-mint-500 text-white font-semibold rounded-lg hover:bg-mint-600 transition-colors shadow-lg hover:shadow-xl"
          >
            Start Playing
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="px-6 py-3 border-2 border-mint-500 text-mint-600 font-semibold rounded-lg hover:bg-mint-50 transition-colors"
          >
            {showInfo ? 'Hide Info' : 'Learn More'}
          </button>
        </div>

        {showInfo && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-left">
            <h2 className="text-xl font-bold text-gray-800 mb-4">About The Mint</h2>
            <ul className="space-y-2 text-gray-600">
              <li>📈 Buy properties and collect passive income</li>
              <li>🏢 Build and manage businesses</li>
              <li>💰 Earn money even while offline</li>
              <li>🏆 Compete on leaderboards</li>
              <li>🎨 Unlock cosmetics and achievements</li>
            </ul>
          </div>
        )}

        {/* API Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 inline-block">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">System Status</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${apiStatus?.status === 'ready' ? 'bg-green-500' : apiStatus?.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
              <span className="text-sm text-gray-600">
                API: {loading ? 'Checking...' : apiStatus?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${apiStatus?.database ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">
                Database: {apiStatus?.database ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={checkApiHealth}
              disabled={loading}
              className="text-sm text-mint-600 hover:text-mint-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Phase 0 Complete - Ready for Phase 1 Development
        </p>
      </div>
    </div>
  );
}

function GamePage() {
  const navigate = useNavigate();
  const [cash, setCash] = useState(1000);
  const [clicks, setClicks] = useState(0);
  const [incomePerClick, setIncomePerClick] = useState(1);

  const handleClick = () => {
    setCash(prev => prev + incomePerClick);
    setClicks(prev => prev + 1);
  };

  const buyUpgrade = () => {
    if (cash >= 100) {
      setCash(prev => prev - 100);
      setIncomePerClick(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display font-bold text-mint-600">🌿 The Mint</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back Home
          </button>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Cash</p>
              <p className="text-3xl font-bold text-mint-600">${cash.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Per Click</p>
              <p className="text-3xl font-bold text-gold-500">${incomePerClick}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Clicks</p>
              <p className="text-3xl font-bold text-gray-700">{clicks}</p>
            </div>
          </div>
        </div>

        {/* Main Click Area */}
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Earn Money</h2>
            <button
              onClick={handleClick}
              className="w-48 h-48 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 text-white text-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
            >
              💰 Click!
            </button>
            <p className="mt-4 text-gray-500">+${incomePerClick} per click</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Upgrades</h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">Better Printer</p>
                  <p className="text-sm text-gray-500">+$1 per click</p>
                </div>
                <button
                  onClick={buyUpgrade}
                  disabled={cash < 100}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    cash >= 100
                      ? 'bg-mint-500 text-white hover:bg-mint-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  $100
                </button>
              </div>
              <p className="text-sm text-gray-400 text-center mt-4">
                More upgrades coming in Phase 1!
              </p>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-gray-400">
          This is a demo clicker. Full game with properties, businesses, and persistence coming in Phase 1!
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game" element={<GamePage />} />
    </Routes>
  );
}

export default App;
