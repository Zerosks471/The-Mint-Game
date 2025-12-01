import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setValidationError('');
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const validateForm = (): boolean => {
    setValidationError('');

    if (!email || !password) {
      setValidationError('Please fill in all required fields');
      return false;
    }

    if (!email.includes('@')) {
      setValidationError('Please enter a valid email');
      return false;
    }

    if (mode === 'register') {
      if (!username) {
        setValidationError('Username is required');
        return false;
      }

      if (username.length < 3 || username.length > 20) {
        setValidationError('Username must be 3-20 characters');
        return false;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setValidationError('Username can only contain letters, numbers, and underscores');
        return false;
      }

      if (password.length < 8) {
        setValidationError('Password must be at least 8 characters');
        return false;
      }

      if (!/[A-Z]/.test(password)) {
        setValidationError('Password must contain an uppercase letter');
        return false;
      }

      if (!/[a-z]/.test(password)) {
        setValidationError('Password must contain a lowercase letter');
        return false;
      }

      if (!/[0-9]/.test(password)) {
        setValidationError('Password must contain a number');
        return false;
      }

      if (password !== confirmPassword) {
        setValidationError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    let success = false;

    if (mode === 'login') {
      success = await login(email, password);
    } else {
      success = await register(email, username, password);
    }

    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mint mb-2">The Mint</h1>
          <p className="text-zinc-400">Build your financial empire</p>
        </div>

        {/* Auth Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8">
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-dark-elevated rounded-xl p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-dark-input text-mint'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-dark-input text-mint'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Display */}
          {(error || validationError) && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-xl text-red-400 text-sm">
              {validationError || error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-100 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-dark-border rounded-xl bg-dark-input text-zinc-100 focus:ring-2 focus:ring-mint/50 focus:border-mint outline-none transition-shadow"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-zinc-100 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-dark-border rounded-xl bg-dark-input text-zinc-100 focus:ring-2 focus:ring-mint/50 focus:border-mint outline-none transition-shadow"
                  placeholder="coolplayer123"
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-100 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-dark-border rounded-xl bg-dark-input text-zinc-100 focus:ring-2 focus:ring-mint/50 focus:border-mint outline-none transition-shadow"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-zinc-100 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-dark-border rounded-xl bg-dark-input text-zinc-100 focus:ring-2 focus:ring-mint/50 focus:border-mint outline-none transition-shadow"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-mint hover:bg-mint/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-4 text-xs text-zinc-500 text-center">
              Password must be 8+ characters with uppercase, lowercase, and number
            </p>
          )}
        </div>

        {/* Back to Home */}
        <p className="mt-6 text-center text-zinc-400">
          <button
            onClick={() => navigate('/')}
            className="text-mint hover:text-mint/80 font-medium"
          >
            &larr; Back to Home
          </button>
        </p>
      </div>
    </div>
  );
}
