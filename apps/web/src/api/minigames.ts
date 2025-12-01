import { apiClient } from './client';
import type { ApiResponse } from '@mint/types';

export interface TaskDifficulty {
  itemCount: number;
  timeLimit: number;
  level: number;
}

export interface StartTaskResponse {
  sessionId: string;
  taskType: string;
  difficulty: TaskDifficulty;
  attemptsUsed: number;
}

export interface TaskResult {
  success: boolean;
  revenueMultiplier: number;
  canRetry: boolean;
  attemptsRemaining: number;
  isPremium: boolean;
}

export interface PropertyTaskResult {
  bonusMultiplier: number;
  newStreak: number;
}

export interface TaskStats {
  totalAttempts: number;
  successRate: number;
  streaks: {
    property: number;
    business: number;
  };
}

export const minigameApi = {
  // Start a business task session
  startBusinessTask: async (businessId: string): Promise<ApiResponse<StartTaskResponse>> => {
    return apiClient.post<StartTaskResponse>('/minigames/business/start', { businessId });
  },

  // Submit business task result
  completeBusinessTask: async (
    sessionId: string,
    success: boolean,
    score?: number
  ): Promise<ApiResponse<TaskResult>> => {
    return apiClient.post<TaskResult>('/minigames/business/complete', { sessionId, success, score });
  },

  // Submit property task result
  completePropertyTask: async (
    propertyId: string,
    success: boolean,
    score?: number
  ): Promise<ApiResponse<PropertyTaskResult>> => {
    return apiClient.post<PropertyTaskResult>('/minigames/property/complete', { propertyId, success, score });
  },

  // Get task statistics
  getStats: async (): Promise<ApiResponse<TaskStats>> => {
    return apiClient.get<TaskStats>('/minigames/stats');
  },
};
