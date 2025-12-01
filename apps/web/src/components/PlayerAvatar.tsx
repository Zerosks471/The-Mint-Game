interface PlayerAvatarProps {
  avatarId?: string | null;
  frameId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Emoji placeholders for avatars
const AVATAR_EMOJIS: Record<string, string> = {
  avatar_default: '👤',
  avatar_investor: '💼',
  avatar_tycoon: '🎩',
  avatar_mogul: '👔',
  avatar_legend: '👑',
};

// Frame colors for the border
const FRAME_STYLES: Record<string, string> = {
  frame_none: 'border-transparent',
  frame_bronze: 'border-amber-600 ring-2 ring-amber-600/30',
  frame_silver: 'border-gray-400 ring-2 ring-gray-400/30',
  frame_gold: 'border-yellow-400 ring-2 ring-yellow-400/30',
  frame_diamond: 'border-cyan-400 ring-2 ring-cyan-400/30 animate-pulse',
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-10 h-10 text-xl',
  lg: 'w-14 h-14 text-3xl',
};

export function PlayerAvatar({
  avatarId,
  frameId,
  size = 'md',
  className = '',
}: PlayerAvatarProps) {
  const avatar = avatarId || 'avatar_default';
  const emoji = AVATAR_EMOJIS[avatar] || '👤';
  const frameStyle = frameId ? FRAME_STYLES[frameId] || '' : '';

  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        rounded-full
        bg-gray-100 dark:bg-gray-700
        flex items-center justify-center
        border-2
        ${frameStyle || 'border-gray-200 dark:border-gray-600'}
        ${className}
      `}
    >
      {emoji}
    </div>
  );
}
