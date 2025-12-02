import { useEffect, useRef, useId } from 'react';
import gsap from 'gsap';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showWave?: boolean;
  color?: string;
  trackColor?: string;
  className?: string;
  isComplete?: boolean;
  onComplete?: () => void;
}

export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 4,
  showWave = true,
  color = '#4ade80', // green-400
  trackColor = 'rgba(255, 255, 255, 0.1)',
  className = '',
  isComplete = false,
}: CircularProgressProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<SVGSVGElement>(null);
  const clipId = useId();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const innerRadius = radius - strokeWidth;

  useEffect(() => {
    if (!circleRef.current) return;

    const offset = circumference - (progress / 100) * circumference;

    // Animate the circle stroke
    gsap.to(circleRef.current, {
      strokeDashoffset: offset,
      duration: 0.8,
      ease: 'power2.out',
    });

    // Pulse animation when complete
    if (isComplete && containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1.05,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });
    }
  }, [progress, circumference, isComplete]);

  // Glow effect color based on progress
  const glowColor = isComplete ? '#4ade80' : color;
  const currentColor = isComplete ? '#4ade80' : color;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        ref={containerRef}
        width={size}
        height={size}
        style={{
          filter: isComplete ? `drop-shadow(0 0 10px ${glowColor})` : 'none',
        }}
      >
        {/* Background fill */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="rgba(0, 0, 0, 0.3)"
        />

        {/* Background track (outer ring) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle (outer ring) */}
        <circle
          ref={circleRef}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: 'stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Center content - thin wave bar */}
      {showWave && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width={size * 0.5}
            height={size * 0.15}
            viewBox="0 0 50 15"
            className="overflow-visible"
          >
            <defs>
              <linearGradient id={`wave-bar-grad-${clipId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={currentColor} stopOpacity={0.3} />
                <stop offset="50%" stopColor={currentColor} stopOpacity={1} />
                <stop offset="100%" stopColor={currentColor} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            {/* Animated wave bars */}
            {[0, 1, 2, 3, 4].map((i) => (
              <rect
                key={i}
                x={8 + i * 8}
                y={7.5}
                width={3}
                height={1}
                rx={0.5}
                fill={`url(#wave-bar-grad-${clipId})`}
                style={{
                  transformOrigin: `${9.5 + i * 8}px 7.5px`,
                  animation: `waveBar 0.8s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
            <style>{`
              @keyframes waveBar {
                0%, 100% { transform: scaleY(1); }
                50% { transform: scaleY(${isComplete ? 4 : 2 + (progress / 100) * 3}); }
              }
            `}</style>
          </svg>
        </div>
      )}
    </div>
  );
}

// Animated Download/Collect Button with circular progress
interface CircularButtonProps {
  progress: number;
  isComplete: boolean;
  onClick: () => void;
  onInstantClick?: () => void;
  size?: number;
  label?: string;
  completeLabel?: string;
  revenueAmount?: string;
  instantAmount?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export function CircularCollectButton({
  progress,
  isComplete,
  onClick,
  onInstantClick,
  size = 100,
  label = 'Collecting...',
  revenueAmount,
  instantAmount,
  isLoading = false,
  disabled = false,
}: CircularButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  const handleClick = () => {
    if (!isComplete || disabled || isLoading) return;

    // Animate button press
    if (buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });
    }

    // Animate icon
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        y: 5,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });
    }

    onClick();
  };

  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main circular button */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={!isComplete || disabled || isLoading}
        className={`
          relative group
          transition-all duration-300
          ${isComplete ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
          ${disabled || isLoading ? 'opacity-50' : ''}
        `}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{
            filter: isComplete ? 'drop-shadow(0 0 15px rgba(74, 222, 128, 0.5))' : 'none',
          }}
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="rgba(0, 0, 0, 0.3)"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isComplete ? '#4ade80' : '#a855f7'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center icon/content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
          ) : isComplete ? (
            <>
              {/* Download/Collect icon */}
              <svg
                ref={iconRef}
                className="w-8 h-8 text-green-400 mb-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v12m0 0l-4-4m4 4l4-4"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                />
              </svg>
              {revenueAmount && (
                <span className="text-xs font-bold text-green-400">{revenueAmount}</span>
              )}
            </>
          ) : (
            <>
              {/* Progress percentage */}
              <span className="text-lg font-bold text-purple-400 font-mono">
                {Math.round(progress)}%
              </span>
              <span className="text-[10px] text-zinc-500">{label}</span>
            </>
          )}
        </div>
      </button>

      {/* Action buttons when complete */}
      {isComplete && (
        <div className="flex flex-col gap-2 w-full max-w-[200px]">
          <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className="flex items-center justify-between w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <span>🎮</span>
              <span>Play</span>
            </span>
            <span className="font-bold">{revenueAmount}</span>
          </button>

          {onInstantClick && (
            <button
              onClick={onInstantClick}
              disabled={disabled || isLoading}
              className="flex items-center justify-between w-full py-1.5 px-4 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <span>⚡</span>
                <span>Quick (25%)</span>
              </span>
              <span className="text-amber-200">{instantAmount}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
