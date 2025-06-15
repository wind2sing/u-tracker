import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // 健康检查
  health: () => api.get('/health'),

  // 商品相关
  getProducts: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    return api.get(`/products?${queryParams.toString()}`);
  },

  getProduct: (code) => api.get(`/products/${code}`),

  getPriceHistory: (code, days = 30) => 
    api.get(`/products/${code}/price-history?days=${days}`),

  getTrendingProducts: (limit = 10) => 
    api.get(`/products/trending?limit=${limit}`),

  // 警报相关
  getAlerts: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    return api.get(`/alerts?${queryParams.toString()}`);
  },

  // 统计数据
  getStats: () => api.get('/stats'),

  // 筛选选项
  getFilters: () => api.get('/filters'),
};

export default apiService;
