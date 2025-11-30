import { useState, ReactNode } from 'react';

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  isReady?: boolean;
  variant?: 'primary' | 'success' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isLoading?: boolean;
}

const variantStyles = {
  primary: {
    base: 'bg-mint-500 hover:bg-mint-600 text-white',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:shadow-[0_0_25px_rgba(16,185,129,0.7)]',
    pulse: 'animate-glow-pulse',
  },
  success: {
    base: 'bg-green-500 hover:bg-green-600 text-white',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:shadow-[0_0_25px_rgba(34,197,94,0.7)]',
    pulse: 'animate-glow-pulse',
  },
  gold: {
    base: 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white',
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:shadow-[0_0_25px_rgba(251,191,36,0.7)]',
    pulse: 'animate-[glowPulse_1.5s_ease-in-out_infinite]',
  },
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function GlowButton({
  children,
  onClick,
  disabled = false,
  isReady = false,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
}: GlowButtonProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (disabled || isLoading) return;

    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  const styles = variantStyles[variant];

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`
        ${styles.base}
        ${sizeStyles[size]}
        ${isReady && !disabled ? styles.glow : ''}
        ${isReady && !disabled ? styles.pulse : ''}
        ${isClicked ? 'animate-bounce-sm' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded-lg font-semibold transition-all duration-200
        active:scale-95
        ${className}
      `}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
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
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
