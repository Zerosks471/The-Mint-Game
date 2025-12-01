import { useEffect, useRef, useState, useId } from 'react';
import gsap from 'gsap';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
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
  showPercentage = false,
  showWave = true,
  color = '#4ade80', // green-400
  trackColor = 'rgba(255, 255, 255, 0.1)',
  className = '',
  isComplete = false,
}: CircularProgressProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<SVGSVGElement>(null);
  const waveRef = useRef<SVGPathElement>(null);
  const [displayPercent, setDisplayPercent] = useState(0);
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

    // Animate the percentage counter (for internal tracking)
    gsap.to(
      { value: displayPercent },
      {
        value: progress,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: function () {
          setDisplayPercent(Math.round(this.targets()[0].value));
        },
      }
    );

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

  // Continuous wave animation
  useEffect(() => {
    if (!waveRef.current || !showWave) return;

    const tl = gsap.timeline({ repeat: -1 });
    tl.to(waveRef.current, {
      x: -size,
      duration: 2,
      ease: 'linear',
    });

    return () => {
      tl.kill();
    };
  }, [size, showWave]);

  // Glow effect color based on progress
  const glowColor = isComplete ? '#4ade80' : color;
  const currentColor = isComplete ? '#4ade80' : color;

  // Calculate wave fill level (inverted because SVG y-axis is flipped)
  const fillLevel = size - (progress / 100) * size;

  // Generate wave path
  const waveHeight = 4;
  const waveWidth = size;
  const generateWavePath = () => {
    // Create a wave that spans 2x the width so we can animate it
    const points: string[] = [];
    const totalWidth = size * 2;

    for (let x = 0; x <= totalWidth; x += 2) {
      const y = Math.sin((x / waveWidth) * Math.PI * 2) * waveHeight;
      points.push(`${x},${fillLevel + y}`);
    }

    // Close the path at the bottom
    return `M0,${fillLevel} ` +
           points.map((p, i) => (i === 0 ? `L${p}` : `L${p}`)).join(' ') +
           ` L${totalWidth},${size + 10} L0,${size + 10} Z`;
  };

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
        <defs>
          {/* Circular clip path for the wave */}
          <clipPath id={`wave-clip-${clipId}`}>
            <circle cx={center} cy={center} r={innerRadius} />
          </clipPath>
        </defs>

        {/* Background fill */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="rgba(0, 0, 0, 0.3)"
        />

        {/* Animated wave fill */}
        {showWave && (
          <g clipPath={`url(#wave-clip-${clipId})`}>
            <path
              ref={waveRef}
              d={generateWavePath()}
              fill={currentColor}
              opacity={0.6}
            />
            {/* Second wave layer for depth */}
            <path
              d={generateWavePath()}
              fill={currentColor}
              opacity={0.3}
              transform={`translate(${size / 4}, 2)`}
            />
          </g>
        )}

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

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span
            className="text-sm font-bold font-mono"
            style={{ color: currentColor }}
          >
            {displayPercent}%
          </span>
        )}
        {isComplete && (
          <span className="text-[10px] text-green-400 font-medium">Ready!</span>
        )}
      </div>
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
