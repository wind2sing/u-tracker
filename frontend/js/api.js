// API Service

class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.timeout = 10000;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('无法连接到服务器，请检查API服务是否正常运行');
      }
      
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request('/health');
  }

  // Products
  async getProducts(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    
    return this.request(endpoint);
  }

  async getProduct(code) {
    return this.request(`/products/${code}`);
  }

  async getPriceHistory(code, days = 30) {
    return this.request(`/products/${code}/price-history?days=${days}`);
  }

  async getTrendingProducts(limit = 10) {
    return this.request(`/products/trending?limit=${limit}`);
  }

  // Alerts
  async getAlerts(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/alerts?${queryString}` : '/alerts';
    
    return this.request(endpoint);
  }

  // Statistics
  async getStats() {
    return this.request('/stats');
  }

  // Filters
  async getFilters() {
    return this.request('/filters');
  }

  // Scraping Status
  async getScrapingStatus(limit = 10) {
    return this.request(`/scraping-status?limit=${limit}`);
  }

  async getLatestScrapingStatus() {
    return this.request('/scraping-status/latest');
  }
}

// Create global API instance
window.api = new ApiService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
}
