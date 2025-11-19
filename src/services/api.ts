// API配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inventory-api-shenfuxu.onrender.com/api';

// Token管理
const TOKEN_KEY = 'inventory_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// API请求封装
class ApiService {
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '网络错误' }));
      throw new Error(error.error || '请求失败');
    }

    return response.json();
  }

  // 认证相关
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  }

  async register(email: string, password: string, name?: string) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  logout() {
    removeToken();
  }

  // 产品管理
  async getProducts() {
    return this.request('/products');
  }

  async getProduct(id: number) {
    return this.request(`/products/${id}`);
  }

  async createProduct(product: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: number, product: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: number) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async searchProducts(keyword: string) {
    return this.request(`/products/search/${keyword}`);
  }

  // 库存操作
  async getStockMovements(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/stock/movements${query ? `?${query}` : ''}`);
  }

  async stockIn(data: any) {
    return this.request('/stock/in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async stockOut(data: any) {
    return this.request('/stock/out', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adjustStock(data: any) {
    return this.request('/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 预警管理
  async getAlerts(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/alerts${query ? `?${query}` : ''}`);
  }

  async getUnreadAlertCount() {
    return this.request('/alerts/unread-count');
  }

  async markAlertAsRead(id: number) {
    return this.request(`/alerts/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllAlertsAsRead() {
    return this.request('/alerts/mark-all-read', {
      method: 'PUT',
    });
  }

  async deleteAlert(id: number) {
    return this.request(`/alerts/${id}`, {
      method: 'DELETE',
    });
  }

  async clearReadAlerts() {
    return this.request('/alerts/clear-read', {
      method: 'DELETE',
    });
  }

  // 仪表盘
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  async getRecentMovements(limit?: number) {
    return this.request(`/dashboard/recent-movements${limit ? `?limit=${limit}` : ''}`);
  }

  async getLowStockProducts(limit?: number) {
    return this.request(`/dashboard/low-stock-products${limit ? `?limit=${limit}` : ''}`);
  }

  async getStockTrend() {
    return this.request('/dashboard/stock-trend');
  }

  async getCategoryStats() {
    return this.request('/dashboard/category-stats');
  }
}

export const api = new ApiService();
export default api;
