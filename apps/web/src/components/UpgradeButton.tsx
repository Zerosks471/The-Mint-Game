import { useState } from 'react';
import { UpgradeModal } from './UpgradeModal';

interface UpgradeButtonProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function UpgradeButton({ size = 'sm', className = '' }: UpgradeButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          inline-flex items-center gap-1.5
          bg-gradient-to-r from-gold-400 to-amber-400 hover:from-gold-500 hover:to-amber-500
          text-white font-semibold rounded-lg
          shadow-sm hover:shadow-md
          transition-all duration-200
          ${sizeClasses[size]}
          ${className}
        `}
      >
        <svg
          className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Upgrade
      </button>
      <UpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
