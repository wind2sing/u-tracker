// Main Application

class App {
  constructor() {
    this.initialized = false;
    this.currentPage = null;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Show loading overlay
      this.showGlobalLoading();

      // Initialize navigation
      this.initNavigation();

      // Check API health
      await this.checkApiHealth();

      // Hide loading overlay
      this.hideGlobalLoading();

      // Mark as initialized
      this.initialized = true;

      console.log('✅ App initialized successfully');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.showInitializationError(error);
    }
  }

  initNavigation() {
    // Mobile navigation toggle
    const navToggle = utils.$('#nav-toggle');
    const navMenu = utils.$('#nav-menu');

    if (navToggle && navMenu) {
      utils.on(navToggle, 'click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
      });

      // Close mobile menu when clicking outside
      utils.on(document, 'click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
          navToggle.classList.remove('active');
          navMenu.classList.remove('active');
        }
      });

      // Close mobile menu when clicking on nav links
      utils.delegate(navMenu, '.nav-link', 'click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
      });
    }

    // Handle route changes for cleanup
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });
  }

  handleRouteChange() {
    // Cleanup previous page if needed
    if (this.currentPage && typeof this.currentPage.destroy === 'function') {
      this.currentPage.destroy();
    }

    // Update current page reference
    const hash = window.location.hash.substring(1) || '/';
    if (hash.startsWith('/')) {
      this.currentPage = this.getPageInstance(hash);
    }
  }

  getPageInstance(route) {
    if (route === '/' || route === '/dashboard') {
      return window.dashboardPage;
    } else if (route === '/products' || route.startsWith('/products/')) {
      return route === '/products' ? window.productsPage : window.productDetailPage;
    } else if (route === '/alerts') {
      return window.alertsPage;
    }
    return null;
  }

  async checkApiHealth() {
    try {
      await api.health();
      console.log('✅ API connection successful');
    } catch (error) {
      console.warn('⚠️ API health check failed:', error.message);
      // Don't throw error, just warn - the app can still work
      setTimeout(() => {
        if (window.components && window.components.showToast) {
          components.showToast('API服务连接异常，部分功能可能不可用', 'warning', 8000);
        }
      }, 1000);
    }
  }

  showGlobalLoading() {
    const overlay = utils.$('#loading-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  hideGlobalLoading() {
    const overlay = utils.$('#loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  showInitializationError(error) {
    this.hideGlobalLoading();
    
    const content = utils.$('#page-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 class="empty-state-title">应用初始化失败</h2>
          <p class="empty-state-description">
            ${error.message || '发生了未知错误，请刷新页面重试'}
          </p>
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="fas fa-refresh"></i>
            刷新页面
          </button>
        </div>
      `;
    }
  }

  // Global error handler
  handleGlobalError(error, context = '') {
    console.error(`Global error ${context}:`, error);
    
    // Show user-friendly error message
    let message = '发生了未知错误';
    if (error.message) {
      if (error.message.includes('Failed to fetch')) {
        message = '网络连接失败，请检查网络设置';
      } else if (error.message.includes('timeout')) {
        message = '请求超时，请稍后重试';
      } else {
        message = error.message;
      }
    }
    
    components.showToast(message, 'error');
  }

  // Utility methods for global use
  showLoading(message = '加载中...') {
    const overlay = utils.$('#loading-overlay');
    if (overlay) {
      const spinner = overlay.querySelector('.loading-spinner p');
      if (spinner) spinner.textContent = message;
      overlay.classList.remove('hidden');
    }
  }

  hideLoading() {
    const overlay = utils.$('#loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  // Theme management
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    utils.storage.set('theme', theme);
  }

  getTheme() {
    return utils.storage.get('theme', 'light');
  }

  toggleTheme() {
    const currentTheme = this.getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Global JavaScript error:', event.error);
  if (window.app) {
    window.app.handleGlobalError(event.error, 'JavaScript');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (window.app) {
    window.app.handleGlobalError(event.reason, 'Promise');
  }
  event.preventDefault(); // Prevent the default browser error handling
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Starting Uniqlo Tracker App...');
  
  // Create global app instance
  window.app = new App();
  
  // Initialize the application
  await window.app.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
