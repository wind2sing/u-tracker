// Utility Functions - Updated 2025-06-14 with translation features

// DOM Utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const createElement = (tag, className = '', content = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content) element.innerHTML = content;
  return element;
};

const removeElement = (element) => {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
};

// Event Utilities
const on = (element, event, handler) => {
  element.addEventListener(event, handler);
};

const off = (element, event, handler) => {
  element.removeEventListener(event, handler);
};

const delegate = (parent, selector, event, handler) => {
  parent.addEventListener(event, (e) => {
    if (e.target.matches(selector) || e.target.closest(selector)) {
      handler(e);
    }
  });
};

// String Utilities
const formatPrice = (price) => {
  if (!price && price !== 0) return '¥0';
  return `¥${Math.round(price)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateString;
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  } catch (error) {
    console.warn('Error formatting datetime:', error);
    return dateString;
  }
};

const formatDateTimeWithSeconds = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  } catch (error) {
    console.warn('Error formatting datetime with seconds:', error);
    return dateString;
  }
};

const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds < 0) return '0秒';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}小时${remainingMinutes}分${remainingSeconds}秒`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    return `${seconds}秒`;
  }
};

const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Number Utilities
const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return num.toLocaleString('zh-CN');
};

const calculatePercentage = (current, original) => {
  if (!original || original === 0) return 0;
  return ((current - original) / original) * 100;
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

// Array Utilities
const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

const unique = (array, key) => {
  if (!key) return [...new Set(array)];
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Object Utilities
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

const isEmpty = (obj) => {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

// URL Utilities
const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (let [key, value] of params) {
    result[key] = value;
  }
  return result;
};

const setQueryParams = (params) => {
  const url = new URL(window.location);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.set(key, params[key]);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.replaceState({}, '', url);
};

// Storage Utilities
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

// Debounce and Throttle
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Loading States
const showLoading = (container = document.body) => {
  const overlay = createElement('div', 'loading-overlay');
  overlay.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  `;
  container.appendChild(overlay);
  return overlay;
};

const hideLoading = (overlay) => {
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => removeElement(overlay), 300);
  }
};

// Image Utilities
const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    // Create a more attractive placeholder image
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWY1ZjUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlZWVlZWUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iODAiIHI9IjMwIiBmaWxsPSIjZGRkIiBvcGFjaXR5PSIwLjciLz48cmVjdCB4PSI2MCIgeT0iMTIwIiB3aWR0aD0iODAiIGhlaWdodD0iNDAiIGZpbGw9IiNkZGQiIG9wYWNpdHk9IjAuNyIgcng9IjQiLz48dGV4dCB4PSI1MCUiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7kuqflk4Hlm77niYc8L3RleHQ+PC9zdmc+';
  }

  // Convert proxy URLs to original URLs
  if (imageUrl.startsWith('http://localhost:3001/images')) {
    return imageUrl.replace('http://localhost:3001/images', 'https://www.uniqlo.cn');
  }

  // Replace im.uniqlo.cn with www.uniqlo.cn
  if (imageUrl.includes('im.uniqlo.cn')) {
    return imageUrl.replace('im.uniqlo.cn', 'www.uniqlo.cn');
  }

  // Handle relative URLs by adding the base domain
  if (imageUrl.startsWith('/hmall/')) {
    return 'https://www.uniqlo.cn' + imageUrl;
  }

  return imageUrl;
};

// Error Handling
const handleError = (error, context = '') => {
  console.error(`Error ${context}:`, error);

  let message = '发生了未知错误';
  if (error.message) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // 使用 components.showToast 如果可用，否则使用 console.error
  if (window.components && window.components.showToast) {
    window.components.showToast(message, 'error');
  } else {
    console.error('Toast error:', message);
  }
};

// 颜色代码翻译映射
const getColorTranslations = () => {
  return {
    'COL00': '白色',
    'COL01': '白色系',
    'COL02': '米色',
    'COL03': '浅米色',
    'COL04': '奶油色',
    'COL05': '浅黄色',
    'COL06': '浅灰色',
    'COL07': '灰色系',
    'COL08': '深灰色',
    'COL09': '黑色系',
    'COL10': '浅粉色',
    'COL11': '粉色',
    'COL12': '粉色系',
    'COL13': '浅红色',
    'COL14': '红色系',
    'COL15': '深红色',
    'COL16': '酒红色',
    'COL17': '橙红色',
    'COL18': '浅橙色',
    'COL19': '橙色',
    'COL20': '深橙色',
    'COL21': '浅黄色',
    'COL22': '黄色',
    'COL23': '深黄色',
    'COL24': '芥末黄',
    'COL25': '浅橙色',
    'COL26': '橙色系',
    'COL27': '深橙色',
    'COL28': '浅绿色',
    'COL29': '绿色',
    'COL30': '深绿色',
    'COL31': '橄榄绿',
    'COL32': '军绿色',
    'COL33': '浅蓝色',
    'COL34': '蓝色',
    'COL35': '深蓝色',
    'COL36': '海军蓝',
    'COL37': '天蓝色',
    'COL38': '浅紫色',
    'COL39': '紫色',
    'COL40': '深紫色',
    'COL41': '薰衣草色',
    'COL42': '浅棕色',
    'COL43': '棕色',
    'COL44': '深棕色',
    'COL45': '咖啡色',
    'COL46': '驼色',
    'COL47': '卡其色',
    'COL48': '土黄色',
    'COL49': '浅青色',
    'COL50': '青色',
    'COL51': '深青色',
    'COL52': '薄荷绿',
    'COL53': '翠绿色',
    'COL54': '森林绿',
    'COL55': '草绿色',
    'COL56': '橄榄色',
    'COL57': '浅蓝绿',
    'COL58': '蓝绿色',
    'COL59': '深蓝绿',
    'COL60': '浅紫蓝',
    'COL61': '紫蓝色',
    'COL62': '深紫蓝',
    'COL63': '浅玫红',
    'COL64': '玫红色',
    'COL65': '深玫红',
    'COL66': '浅珊瑚',
    'COL67': '珊瑚色',
    'COL68': '深珊瑚',
    'COL69': '浅桃色',
    'COL70': '桃色',
    'COL71': '深桃色',
    'COL72': '浅杏色',
    'COL73': '杏色',
    'COL74': '深杏色',
    'COL75': '浅金色',
    'COL76': '金色',
    'COL77': '深金色',
    'COL78': '浅银色',
    'COL79': '银色',
    'COL80': '深银色',
    'COL81': '浅铜色',
    'COL82': '铜色',
    'COL83': '深铜色',
    'COL84': '浅青铜',
    'COL85': '青铜色',
    'COL86': '深青铜',
    'COL87': '浅玫瑰金',
    'COL88': '玫瑰金',
    'COL89': '深玫瑰金',
    'COL90': '浅香槟',
    'COL91': '香槟色',
    'COL92': '深香槟',
    'COL93': '浅象牙',
    'COL94': '象牙色',
    'COL95': '深象牙',
    'COL96': '浅珍珠',
    'COL97': '珍珠色',
    'COL98': '深珍珠',
    'COL99': '多色'
  };
};

// 尺码代码翻译映射
const getSizeTranslations = () => {
  return {
    // 成人尺码
    'SMA002': 'XS',
    'SMA003': 'S',
    'SMA004': 'M',
    'SMA005': 'L',
    'SMA006': 'XL',
    'SMA007': 'XXL',
    'SMA008': '3XL',
    'SMA009': '4XL',
    'SMA010': '5XL',

    // 儿童尺码
    'CMC110': '110cm',
    'CMC120': '120cm',
    'CMC130': '130cm',
    'CMC140': '140cm',
    'CMC150': '150cm',
    'CMC160': '160cm',

    // 婴儿尺码
    'CMD073': '73cm',
    'CMD080': '80cm',
    'CMD090': '90cm',
    'CMD100': '100cm',
    'CMD115': '115cm',
    'CMD120': '120cm',

    // 特殊尺码
    'SIZ999': '均码',
    'MSC025': '均码',
    'ONE': '均码',

    // 鞋子尺码
    'SHO220': '22.0cm',
    'SHO225': '22.5cm',
    'SHO230': '23.0cm',
    'SHO235': '23.5cm',
    'SHO240': '24.0cm',
    'SHO245': '24.5cm',
    'SHO250': '25.0cm',
    'SHO255': '25.5cm',
    'SHO260': '26.0cm',
    'SHO265': '26.5cm',
    'SHO270': '27.0cm',
    'SHO275': '27.5cm',
    'SHO280': '28.0cm',
    'SHO285': '28.5cm',
    'SHO290': '29.0cm',
    'SHO295': '29.5cm',
    'SHO300': '30.0cm'
  };
};

// 翻译颜色代码
const translateColor = (colorCode) => {
  const translations = getColorTranslations();
  return translations[colorCode] || colorCode;
};

// 翻译尺码代码
const translateSize = (sizeCode) => {
  const translations = getSizeTranslations();
  return translations[sizeCode] || sizeCode;
};

// 翻译颜色数组
const translateColors = (colors) => {
  if (!Array.isArray(colors)) return [];
  return colors.map(color => translateColor(color));
};

// 翻译尺码数组
const translateSizes = (sizes) => {
  if (!Array.isArray(sizes)) return [];
  return sizes.map(size => translateSize(size));
};

// 生成优衣库官网商品链接
const getUniqloProductUrl = (productCode, mainPic = null) => {
  // 如果提供了main_pic，尝试从中提取真实的产品ID
  if (mainPic) {
    const match = mainPic.match(/\/u(\d+)\//);
    if (match) {
      const realProductCode = `u${match[1]}`;
      return `https://www.uniqlo.cn/product-detail.html?productCode=${realProductCode}`;
    }
  }

  // 如果无法从main_pic提取，使用原始的product_code作为fallback
  return `https://www.uniqlo.cn/product-detail.html?productCode=${productCode}`;
};

// 计算折扣力度
const calculateDiscount = (originalPrice, currentPrice) => {
  if (!originalPrice || !currentPrice || originalPrice <= currentPrice) {
    return 0;
  }
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
};

// 计算降价档数
const calculatePriceLevel = (originalPrice, currentPrice) => {
  const discount = calculateDiscount(originalPrice, currentPrice);

  if (discount < 20) {
    return 0; // 未降价或降价幅度小于20%
  } else if (discount >= 20 && discount < 30) {
    return 1; // 第一档降价 (20-29%)
  } else if (discount >= 30 && discount < 35) {
    return 2; // 第二档降价 (30-34%)
  } else if (discount >= 35 && discount < 40) {
    return 3; // 第三档降价 (35-39%)
  } else if (discount >= 40 && discount < 45) {
    return 4; // 第四档降价 (40-44%)
  } else {
    return 5; // 第五档降价 (45%+)
  }
};

// 获取降价档数的显示文本
const getPriceLevelText = (level) => {
  const levelTexts = {
    0: '未降价',
    1: '第一档',
    2: '第二档',
    3: '第三档',
    4: '第四档',
    5: '第五档'
  };
  return levelTexts[level] || '未知';
};

// 获取降价档数的颜色类名
const getPriceLevelColor = (level) => {
  const levelColors = {
    0: 'text-muted',
    1: 'text-info',
    2: 'text-primary',
    3: 'text-warning',
    4: 'text-orange',
    5: 'text-danger'
  };
  return levelColors[level] || 'text-muted';
};

// 格式化评分显示
const formatRating = (score, maxScore = 5) => {
  if (!score && score !== 0) return '';
  const rating = Math.min(Math.max(score, 0), maxScore);
  return rating.toFixed(1);
};

// 生成星级评分HTML
const generateStarRating = (score, maxScore = 5) => {
  if (!score && score !== 0) return '';

  const rating = Math.min(Math.max(score, 0), maxScore);
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxScore - fullStars - (hasHalfStar ? 1 : 0);

  let stars = '';

  // 满星
  for (let i = 0; i < fullStars; i++) {
    stars += '<i class="fas fa-star text-warning"></i>';
  }

  // 半星
  if (hasHalfStar) {
    stars += '<i class="fas fa-star-half-alt text-warning"></i>';
  }

  // 空星
  for (let i = 0; i < emptyStars; i++) {
    stars += '<i class="far fa-star text-muted"></i>';
  }

  return stars;
};

// 格式化相对时间
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatDate(dateString);
  }
};

// Export utilities for use in other modules
window.utils = {
  $, $$, createElement, removeElement,
  on, off, delegate,
  formatPrice, formatDate, formatDateTime, formatDateTimeWithSeconds, formatDuration, truncateText, slugify,
  formatNumber, calculatePercentage, clamp,
  groupBy, sortBy, unique,
  deepClone, isEmpty,
  getQueryParams, setQueryParams,
  storage,
  debounce, throttle,
  showLoading, hideLoading,
  getImageUrl,
  handleError,
  translateColor, translateSize, translateColors, translateSizes,
  getUniqloProductUrl, calculateDiscount, calculatePriceLevel, getPriceLevelText, getPriceLevelColor, formatRating, generateStarRating, formatRelativeTime
};
