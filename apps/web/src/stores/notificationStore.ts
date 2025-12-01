import { create } from 'zustand';
import { notificationsApi, Notification } from '../api/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationsApi.getNotifications(30);
      if (response.success && response.data) {
        set({
          notifications: response.data.notifications,
          unreadCount: response.data.unreadCount,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, error: response.error?.message || 'Failed to fetch notifications' });
      }
    } catch {
      set({ isLoading: false, error: 'Failed to fetch notifications' });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.success && response.data) {
        set({ unreadCount: response.data.unreadCount });
      }
    } catch {
      // Silently fail for count polling
    }
  },

  markAsRead: async (id: string) => {
    try {
      const response = await notificationsApi.markAsRead(id);
      if (response.success) {
        const { notifications, unreadCount } = get();
        set({
          notifications: notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, unreadCount - 1),
        });
      }
    } catch {
      // Silently fail
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      if (response.success) {
        const { notifications } = get();
        set({
          notifications: notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        });
      }
    } catch {
      // Silently fail
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const response = await notificationsApi.deleteNotification(id);
      if (response.success) {
        const { notifications, unreadCount } = get();
        const notification = notifications.find((n) => n.id === id);
        set({
          notifications: notifications.filter((n) => n.id !== id),
          unreadCount: notification && !notification.isRead ? unreadCount - 1 : unreadCount,
        });
      }
    } catch {
      // Silently fail
    }
  },

  clearAll: async () => {
    try {
      const response = await notificationsApi.clearAll();
      if (response.success) {
        set({ notifications: [], unreadCount: 0 });
      }
    } catch {
      // Silently fail
    }
  },

  setOpen: (open: boolean) => {
    set({ isOpen: open });
    if (open) {
      // Fetch fresh notifications when opening
      get().fetchNotifications();
    }
  },

  toggleOpen: () => {
    const { isOpen } = get();
    get().setOpen(!isOpen);
  },
}));
