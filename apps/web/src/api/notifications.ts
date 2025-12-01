import type { ApiResponse } from '@mint/types';
import { apiClient } from './client';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const notificationsApi = {
  async getNotifications(limit?: number, unreadOnly?: boolean): Promise<ApiResponse<NotificationsResponse>> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (unreadOnly) params.set('unread', 'true');
    const query = params.toString();
    return apiClient.get<NotificationsResponse>(`/notifications${query ? `?${query}` : ''}`);
  },

  async getUnreadCount(): Promise<ApiResponse<UnreadCountResponse>> {
    return apiClient.get<UnreadCountResponse>('/notifications/count');
  },

  async markAsRead(id: string): Promise<ApiResponse<{ id: string; isRead: boolean }>> {
    return apiClient.patch<{ id: string; isRead: boolean }>(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<ApiResponse<{ markedRead: number }>> {
    return apiClient.post<{ markedRead: number }>('/notifications/read-all');
  },

  async deleteNotification(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.delete<{ deleted: boolean }>(`/notifications/${id}`);
  },

  async clearAll(): Promise<ApiResponse<{ deleted: number }>> {
    return apiClient.delete<{ deleted: number }>('/notifications');
  },
};
