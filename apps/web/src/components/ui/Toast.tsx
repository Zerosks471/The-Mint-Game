import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'achievement';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  icon?: string;
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
  achievement: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white',
};

const defaultIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
  achievement: '🏆',
};

function ToastItem({ id, type, title, message, duration = 5000, icon, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`
        ${toastStyles[type]}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md
        transition-all duration-300 ease-out animate-slide-in-right
        ${type === 'achievement' ? 'border-2 border-yellow-300' : ''}
      `}
      role="alert"
    >
      <span className={`text-xl ${type === 'achievement' ? 'animate-bounce' : ''}`}>
        {icon || defaultIcons[type]}
      </span>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        {message && <p className="text-sm opacity-90">{message}</p>}
      </div>
      <button
        onClick={handleClose}
        className="opacity-70 hover:opacity-100 transition-opacity text-lg"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

// Toast Container - manages multiple toasts
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook for managing toasts
let toastIdCounter = 0;
const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let toastQueue: Toast[] = [];

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastQueue);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts);
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const notifyListeners = () => {
    toastListeners.forEach((listener) => listener([...toastQueue]));
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = {
      ...toast,
      id: `toast-${++toastIdCounter}`,
    };
    toastQueue = [...toastQueue, newToast];
    notifyListeners();
    return newToast.id;
  };

  const removeToast = (id: string) => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    notifyListeners();
  };

  const success = (title: string, message?: string) =>
    addToast({ type: 'success', title, message });

  const error = (title: string, message?: string) =>
    addToast({ type: 'error', title, message });

  const warning = (title: string, message?: string) =>
    addToast({ type: 'warning', title, message });

  const info = (title: string, message?: string) =>
    addToast({ type: 'info', title, message });

  const achievement = (title: string, message?: string, icon?: string) =>
    addToast({ type: 'achievement', title, message, icon, duration: 7000 });

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    achievement,
  };
}
