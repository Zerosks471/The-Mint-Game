import { useState } from 'react';

interface PlayerAvatarProps {
  avatarId?: string | null;
  frameId?: string | null;
  previewUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Frame colors for the border
const FRAME_STYLES: Record<string, string> = {
  frame_none: 'border-transparent',
  frame_bronze: 'border-amber-600 ring-2 ring-amber-600/30',
  frame_silver: 'border-zinc-400 ring-2 ring-zinc-400/30',
  frame_gold: 'border-yellow-400 ring-2 ring-yellow-400/30',
  frame_diamond: 'border-cyan-400 ring-2 ring-cyan-400/30 animate-pulse',
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-10 h-10 text-xl',
  lg: 'w-14 h-14 text-3xl',
  xl: 'w-20 h-20 text-4xl',
};

export function PlayerAvatar({
  frameId,
  previewUrl,
  size = 'md',
  className = '',
}: PlayerAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const frameStyle = frameId ? FRAME_STYLES[frameId] || '' : '';

  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        rounded-full
        bg-dark-elevated
        flex items-center justify-center
        border-2
        overflow-hidden
        ${frameStyle || 'border-dark-border'}
        ${className}
      `}
    >
      {previewUrl && !imageError ? (
        <img
          src={previewUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl'}>
          👤
        </span>
      )}
    </div>
  );
}
