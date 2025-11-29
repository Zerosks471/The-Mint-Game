import type { ApiResponse, LoginRequest, RegisterRequest } from '@mint/types';
import { apiClient } from './client';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    isPremium: boolean;
    createdAt: string;
  };
  accessToken: string;
  expiresAt: string;
}

export const authApi = {
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/auth/register', data, { skipAuth: true });
  },

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/auth/login', data, { skipAuth: true });
  },

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/logout');
  },

  async refresh(): Promise<ApiResponse<{ accessToken: string; expiresAt: string }>> {
    return apiClient.post<{ accessToken: string; expiresAt: string }>(
      '/auth/refresh',
      undefined,
      { skipAuth: true }
    );
  },

  async getMe(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/user/me');
  },
};
