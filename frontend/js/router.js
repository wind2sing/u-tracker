// Simple Router Implementation

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.defaultRoute = '/';
    this.scrollPositions = {}; // 存储各页面的滚动位置

    // Initialize router
    this.init();
  }

  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
    
    // Handle navigation clicks
    utils.delegate(document, 'a[href^="#"]', 'click', (e) => {
      e.preventDefault();
      const href = e.target.closest('a').getAttribute('href');
      if (href) {
        this.navigate(href.substring(1)); // Remove #
      }
    });
  }

  // Register a route
  route(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  // Navigate to a route
  navigate(path) {
    if (path !== this.currentRoute) {
      window.location.hash = path;
    }
  }

  // Handle route changes
  async handleRouteChange() {
    const hash = (window.location.hash || '').substring(1) || this.defaultRoute;
    const [path, ...params] = hash.split('/');

    // Save current scroll position before changing route
    if (this.currentRoute) {
      this.scrollPositions[this.currentRoute] = window.pageYOffset || document.documentElement.scrollTop;
    }

    // Update current route
    this.currentRoute = hash;
    
    // Update active navigation
    this.updateActiveNav(path);
    
    // Find matching route
    let handler = this.routes[hash];
    
    // Try to find route with parameters
    if (!handler) {
      const routeKey = Object.keys(this.routes).find(route => {
        const routeParts = route.split('/');
        const hashParts = hash.split('/');
        
        if (routeParts.length !== hashParts.length) return false;
        
        return routeParts.every((part, index) => {
          return part.startsWith(':') || part === hashParts[index];
        });
      });
      
      if (routeKey) {
        handler = this.routes[routeKey];
        
        // Extract parameters
        const routeParts = routeKey.split('/');
        const hashParts = hash.split('/');
        const routeParams = {};
        
        routeParts.forEach((part, index) => {
          if (part.startsWith(':')) {
            const paramName = part.substring(1);
            routeParams[paramName] = hashParts[index];
          }
        });
        
        // Call handler with parameters
        if (handler) {
          await this.executeHandler(handler, routeParams);
          return;
        }
      }
    }
    
    // Execute handler
    if (handler) {
      await this.executeHandler(handler);
    } else {
      // 404 - Route not found
      this.handle404();
    }
  }

  async executeHandler(handler, params = {}) {
    try {
      // Show loading state
      this.showPageLoading();

      // Execute route handler
      await handler(params);

      // Handle scroll position after page content is loaded
      this.handleScrollPosition();

    } catch (error) {
      console.error('Route handler error:', error);
      this.showError('页面加载失败', error.message);
    } finally {
      // Hide loading state
      this.hidePageLoading();
    }
  }

  updateActiveNav(currentPath) {
    // Remove active class from all nav links
    utils.$$('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Add active class to current nav link
    const activeLink = utils.$(`[data-route="${currentPath}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  handleScrollPosition() {
    const currentRoute = this.currentRoute;
    const savedPosition = this.scrollPositions[currentRoute];

    // 如果是商品列表页面且有保存的滚动位置，恢复位置
    if (currentRoute === '/products' && savedPosition !== undefined) {
      // 使用 setTimeout 确保页面内容已完全渲染
      setTimeout(() => {
        window.scrollTo({ top: savedPosition, behavior: 'smooth' });
      }, 100);
    } else {
      // 其他页面直接跳转到顶部（无动画）
      window.scrollTo(0, 0);
    }
  }

  showPageLoading() {
    const content = utils.$('#page-content');
    if (content) {
      content.innerHTML = `
        <div class="page-loading">
          <div class="spinner"></div>
          <p>正在加载页面...</p>
        </div>
      `;
    }
  }

  hidePageLoading() {
    // Loading is hidden when content is replaced
  }

  showError(title, message) {
    const content = utils.$('#page-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 class="empty-state-title">${title}</h2>
          <p class="empty-state-description">${message}</p>
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="fas fa-refresh"></i>
            重新加载
          </button>
        </div>
      `;
    }
  }

  handle404() {
    const content = utils.$('#page-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-search"></i>
          </div>
          <h2 class="empty-state-title">页面未找到</h2>
          <p class="empty-state-description">您访问的页面不存在或已被移除</p>
          <button class="btn btn-primary" onclick="router.navigate('/')">
            <i class="fas fa-home"></i>
            返回首页
          </button>
        </div>
      `;
    }
  }

  // Get current route parameters
  getParams() {
    const hash = (window.location.hash || '').substring(1);
    const parts = hash.split('/');

    // Find matching route pattern
    const routeKey = Object.keys(this.routes).find(route => {
      const routeParts = route.split('/');
      const hashParts = parts;

      if (routeParts.length !== hashParts.length) return false;

      return routeParts.every((part, index) => {
        return part.startsWith(':') || part === hashParts[index];
      });
    });

    if (routeKey) {
      const routeParts = routeKey.split('/');
      const params = {};

      routeParts.forEach((part, index) => {
        if (part.startsWith(':')) {
          const paramName = part.substring(1);
          params[paramName] = parts[index];
        }
      });

      return params;
    }

    return {};
  }

  // Set page title
  setTitle(title) {
    document.title = title ? `${title} - 优衣库价格追踪器` : '优衣库价格追踪器';
  }

  // Set page content
  setContent(html) {
    const content = utils.$('#page-content');
    if (content) {
      content.innerHTML = html;
    }
  }

  // Back navigation
  back() {
    window.history.back();
  }
}

// Create global router instance
window.router = new Router();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Router;
}
