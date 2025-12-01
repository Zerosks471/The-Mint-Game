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
}

export const api = new AdminApi();
