import { useState, useCallback } from 'react';

export interface TaskDifficulty {
  itemCount: number;
  timeLimit: number;
  level: number;
}

export interface MiniGameProps {
  difficulty: TaskDifficulty;
  onComplete: (success: boolean, score: number) => void;
}

interface MiniGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  taskType: string;
  difficulty: TaskDifficulty;
  attemptsUsed: number;
  maxAttempts: number;
  GameComponent: React.ComponentType<MiniGameProps>;
  onTaskComplete: (success: boolean, score: number) => Promise<void>;
}

export function MiniGameModal({
  isOpen,
  onClose,
  title,
  difficulty,
  attemptsUsed,
  maxAttempts,
  GameComponent,
  onTaskComplete,
}: MiniGameModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; score: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = useCallback(() => {
    setIsPlaying(true);
    setResult(null);
  }, []);

  const handleComplete = useCallback(async (success: boolean, score: number) => {
    setIsPlaying(false);
    setResult({ success, score });
    setIsSubmitting(true);

    try {
      await onTaskComplete(success, score);
    } finally {
      setIsSubmitting(false);
    }
  }, [onTaskComplete]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setIsPlaying(true);
  }, []);

  if (!isOpen) return null;

  const attemptsRemaining = maxAttempts - attemptsUsed - (result ? 1 : 0);
  const canRetry = result && !result.success && attemptsRemaining > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-dark-card border border-dark-border rounded-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-white">
          <h2 className="text-xl font-bold">{title}</h2>
          <div className="flex items-center gap-4 mt-1 text-sm opacity-90">
            <span>Level {difficulty.level}</span>
            <span>•</span>
            <span>{difficulty.timeLimit}s time limit</span>
            <span>•</span>
            <span>Attempts: {attemptsUsed}/{maxAttempts}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isPlaying && !result && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-zinc-400 mb-6">
                Complete the task to collect your revenue!
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                {difficulty.itemCount} items • {difficulty.timeLimit} seconds
              </p>
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
              >
                Start Task
              </button>
            </div>
          )}

          {isPlaying && (
            <GameComponent
              difficulty={difficulty}
              onComplete={handleComplete}
            />
          )}

          {result && !isPlaying && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">
                {result.success ? '🎉' : '😔'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {result.success ? 'Task Complete!' : 'Task Failed'}
              </h3>
              <p className="text-zinc-400 mb-2">
                Score: {result.score}
              </p>
              {result.success ? (
                <p className="text-emerald-500 font-semibold mb-6">
                  Revenue collected at {Math.round((1 - attemptsUsed * 0.25) * 100)}%!
                </p>
              ) : (
                <p className="text-amber-500 mb-6">
                  {canRetry
                    ? `${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining`
                    : 'No attempts remaining'}
                </p>
              )}

              <div className="flex gap-4 justify-center">
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Retry ({attemptsRemaining} left)
                  </button>
                )}
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-dark-elevated hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {result.success || !canRetry ? 'Done' : 'Give Up'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
