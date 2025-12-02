import { useEffect, useRef, useState, useMemo } from 'react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  // Track the current visual position so interrupted animations continue smoothly
  const currentVisualValue = useRef(value);
  const animationRef = useRef<number>();

  // Tick up/down like a gas station counter
  useEffect(() => {
    // Start from wherever we currently are visually, not from an old reference
    const startValue = currentVisualValue.current;
    const endValue = value;
    const diff = endValue - startValue;

    // Skip if difference is negligible (less than 1 cent)
    if (Math.abs(diff) < 0.01) {
      setDisplayValue(endValue);
      currentVisualValue.current = endValue;
      return;
    }

    const startTime = performance.now();
    // Duration scales with the size of the change, min 200ms, max 800ms
    // Reduced max duration so animations complete before next sync
    const duration = Math.min(800, Math.max(200, Math.abs(diff) * 0.3));

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear progression for gas station feel
      const animatedValue = startValue + diff * progress;

      // Round to 2 decimal places for cents
      const roundedValue = Math.round(animatedValue * 100) / 100;
      setDisplayValue(roundedValue);
      // Update current visual position so interrupted animations start from here
      currentVisualValue.current = roundedValue;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        currentVisualValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  // Format as currency
  const formattedValue = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(displayValue);
  }, [displayValue]);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}
