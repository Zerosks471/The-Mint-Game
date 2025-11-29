import { Routes, Route } from 'react-router-dom';

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-5xl font-display font-bold text-mint-600 mb-4">
          🌿 The Mint
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Build Your Financial Empire. One Click at a Time.
        </p>
        <div className="space-x-4">
          <button className="px-6 py-3 bg-mint-500 text-white font-semibold rounded-lg hover:bg-mint-600 transition-colors">
            Start Playing
          </button>
          <button className="px-6 py-3 border-2 border-mint-500 text-mint-600 font-semibold rounded-lg hover:bg-mint-50 transition-colors">
            Learn More
          </button>
        </div>
        <p className="mt-12 text-sm text-gray-400">
          Phase 0 Complete - Development Environment Ready
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}

export default App;
