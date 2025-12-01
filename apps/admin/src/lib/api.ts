const API_BASE = '/api/admin';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class AdminApi {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('admin_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle auth errors
        if (response.status === 401 || response.status === 403) {
          this.clearToken();
          window.location.href = '/login';
        }
        return data;
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network request failed',
        },
      };
    }
  }

  // Auth
  async login(username: string, password: string) {
    const result = await this.request<{
      token: string;
      user: { id: string; username: string; email: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.success && result.data) {
      this.setToken(result.data.token);
    }

    return result;
  }

  async getMe() {
    return this.request<{ id: string; username: string; email: string }>('/me');
  }

  // Users
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    return this.request(`/users?${query}`);
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async updateUserStatus(id: string, status: string, reason?: string) {
    return this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  async updateUserAdmin(id: string, isAdmin: boolean) {
    return this.request(`/users/${id}/admin`, {
      method: 'PATCH',
      body: JSON.stringify({ isAdmin }),
    });
  }

  // Economy
  async getEconomyOverview() {
    return this.request('/economy/overview');
  }

  async getTopPlayers(metric?: string, limit?: number) {
    const query = new URLSearchParams();
    if (metric) query.set('metric', metric);
    if (limit) query.set('limit', limit.toString());
    return this.request(`/economy/top-players?${query}`);
  }

  async getRecentPurchases(limit?: number) {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return this.request(`/economy/recent-purchases?${query}`);
  }

  // Logs
  async getAuditLogs(params: {
    limit?: number;
    offset?: number;
    adminId?: string;
  }) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.offset) query.set('offset', params.offset.toString());
    if (params.adminId) query.set('adminId', params.adminId);
    return this.request(`/logs/audit?${query}`);
  }

  async getServerLogs(type?: string, lines?: number) {
    const query = new URLSearchParams();
    if (type) query.set('type', type);
    if (lines) query.set('lines', lines.toString());
    return this.request(`/logs/server?${query}`);
  }

  async getActivityLogs(limit?: number) {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return this.request(`/logs/activity?${query}`);
  }

  async getStockTrades(limit?: number) {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return this.request(`/logs/stock-trades?${query}`);
  }

  // Health
  async getHealth() {
    return this.request('/health');
  }

  async getDatabaseStats() {
    return this.request('/health/database');
  }

  async getMetrics() {
    return this.request('/health/metrics');
  }

  // User Management (extended)
  async giveCash(userId: string, amount: number, reason?: string) {
    return this.request(`/users/${userId}/give-cash`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  async removeCash(userId: string, amount: number, reason?: string) {
    return this.request(`/users/${userId}/remove-cash`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  async setCash(userId: string, amount: number, reason?: string) {
    return this.request(`/users/${userId}/set-cash`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  async updateUserPremium(userId: string, isPremium: boolean, expiresAt?: string) {
    return this.request(`/users/${userId}/premium`, {
      method: 'PATCH',
      body: JSON.stringify({ isPremium, expiresAt }),
    });
  }

  async getUserInventory(userId: string) {
    return this.request(`/users/${userId}/inventory`);
  }

  async resetUserProgress(userId: string, reason?: string) {
    return this.request(`/users/${userId}/reset-progress`, {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET', reason }),
    });
  }

  async forceLogoutUser(userId: string, reason?: string) {
    return this.request(`/users/${userId}/force-logout`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getUserActivity(userId: string, limit?: number) {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return this.request(`/users/${userId}/activity?${query}`);
  }

  // System
  async getSystemStatus() {
    return this.request('/system/status');
  }

  async setMaintenanceMode(enabled: boolean, message?: string, endTime?: string) {
    return this.request('/system/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enabled, message, endTime }),
    });
  }

  async sendAnnouncement(title: string, message: string, type?: string) {
    return this.request('/system/announcement', {
      method: 'POST',
      body: JSON.stringify({ title, message, type }),
    });
  }

  async sendNotification(userIds: string[], title: string, message: string, type?: string) {
    return this.request('/system/notification', {
      method: 'POST',
      body: JSON.stringify({ userIds, title, message, type }),
    });
  }

  async forceLogoutAll(reason?: string) {
    return this.request('/system/force-logout-all', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'LOGOUT_ALL', reason }),
    });
  }

  async getOnlineUsers(limit?: number) {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return this.request(`/system/online-users?${query}`);
  }

  // Game Config
  async getPropertyTypes() {
    return this.request('/gameconfig/properties');
  }

  async updatePropertyType(id: number, data: Record<string, unknown>) {
    return this.request(`/gameconfig/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getBusinessTypes() {
    return this.request('/gameconfig/businesses');
  }

  async updateBusinessType(id: number, data: Record<string, unknown>) {
    return this.request(`/gameconfig/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getUpgrades() {
    return this.request('/gameconfig/upgrades');
  }

  async updateUpgrade(id: string, data: Record<string, unknown>) {
    return this.request(`/gameconfig/upgrades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getProjects() {
    return this.request('/gameconfig/projects');
  }

  async updateProject(id: string, data: Record<string, unknown>) {
    return this.request(`/gameconfig/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getAchievements() {
    return this.request('/gameconfig/achievements');
  }

  // Stocks
  async getStockStatus() {
    return this.request('/stocks/status');
  }

  async haltTrading(halt: boolean, reason?: string) {
    return this.request('/stocks/halt-trading', {
      method: 'POST',
      body: JSON.stringify({ halt, reason }),
    });
  }

  async getBotStocks() {
    return this.request('/stocks/bot');
  }

  async updateBotStock(id: string, data: Record<string, unknown>) {
    return this.request(`/stocks/bot/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async resetBotStockPrice(id: string) {
    return this.request(`/stocks/bot/${id}/reset-price`, {
      method: 'POST',
    });
  }

  async getPlayerStocks() {
    return this.request('/stocks/player');
  }

  async updatePlayerStock(id: string, data: Record<string, unknown>) {
    return this.request(`/stocks/player/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delistPlayerStock(id: string, reason?: string) {
    return this.request(`/stocks/player/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async getSuspiciousTrading() {
    return this.request('/stocks/suspicious');
  }

  // Analytics
  async getAnalyticsOverview() {
    return this.request('/analytics/overview');
  }

  async getRegistrationStats(days?: number) {
    const query = new URLSearchParams();
    if (days) query.set('days', days.toString());
    return this.request(`/analytics/registrations?${query}`);
  }

  async getRetentionStats() {
    return this.request('/analytics/retention');
  }

  async getActivityStats() {
    return this.request('/analytics/activity');
  }

  async getEconomyStats() {
    return this.request('/analytics/economy');
  }

  async getLeaderboard(limit?: number) {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return this.request(`/analytics/leaderboard?${query}`);
  }

  async getTransactionStats(days?: number) {
    const query = new URLSearchParams();
    if (days) query.set('days', days.toString());
    return this.request(`/analytics/transactions?${query}`);
  }

  // Security
  async getFailedLogins(hours?: number, limit?: number) {
    const query = new URLSearchParams();
    if (hours) query.set('hours', hours.toString());
    if (limit) query.set('limit', limit.toString());
    return this.request(`/security/failed-logins?${query}`);
  }

  async getFailedLoginsByIP(hours?: number) {
    const query = new URLSearchParams();
    if (hours) query.set('hours', hours.toString());
    return this.request(`/security/failed-logins/by-ip?${query}`);
  }

  async getFailedLoginsByUser(hours?: number) {
    const query = new URLSearchParams();
    if (hours) query.set('hours', hours.toString());
    return this.request(`/security/failed-logins/by-user?${query}`);
  }

  async getBlockedIPs() {
    return this.request('/security/blocked-ips');
  }

  async blockIP(ipAddress: string, reason?: string, persistent?: boolean) {
    return this.request('/security/block-ip', {
      method: 'POST',
      body: JSON.stringify({ ipAddress, reason, persistent }),
    });
  }

  async unblockIP(ipAddress: string) {
    return this.request(`/security/block-ip/${encodeURIComponent(ipAddress)}`, {
      method: 'DELETE',
    });
  }

  async getUserSessions(userId: string) {
    return this.request(`/security/sessions/${userId}`);
  }

  async revokeSession(sessionId: string, reason?: string) {
    return this.request(`/security/sessions/${sessionId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async getSecurityAuditLog(page?: number, limit?: number) {
    const query = new URLSearchParams();
    if (page) query.set('page', page.toString());
    if (limit) query.set('limit', limit.toString());
    return this.request(`/security/audit-log?${query}`);
  }

  async getSuspiciousActivity() {
    return this.request('/security/suspicious');
  }

  // Coupons
  async getCoupons(page?: number, limit?: number, activeOnly?: boolean) {
    const query = new URLSearchParams();
    if (page) query.set('page', page.toString());
    if (limit) query.set('limit', limit.toString());
    if (activeOnly) query.set('active', 'true');
    return this.request(`/coupons?${query}`);
  }

  async getCoupon(id: string) {
    return this.request(`/coupons/${id}`);
  }

  async createCoupon(data: {
    code?: string;
    description?: string;
    rewardType: string;
    rewardAmount?: number;
    rewardData?: unknown;
    maxRedemptions?: number;
    maxPerUser?: number;
    expiresAt?: string;
    requiresPremium?: boolean;
    minLevel?: number;
  }) {
    return this.request('/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBulkCoupons(data: {
    count: number;
    prefix?: string;
    rewardType: string;
    rewardAmount?: number;
    rewardData?: unknown;
    maxRedemptions?: number;
    maxPerUser?: number;
    expiresAt?: string;
    description?: string;
  }) {
    return this.request('/coupons/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCoupon(id: string, data: Record<string, unknown>) {
    return this.request(`/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deactivateCoupon(id: string) {
    return this.request(`/coupons/${id}`, {
      method: 'DELETE',
    });
  }

  async getCouponRedemptions(id: string, page?: number, limit?: number) {
    const query = new URLSearchParams();
    if (page) query.set('page', page.toString());
    if (limit) query.set('limit', limit.toString());
    return this.request(`/coupons/${id}/redemptions?${query}`);
  }

  async getCouponStats() {
    return this.request('/coupons/stats/summary');
  }
}

export const api = new AdminApi();
