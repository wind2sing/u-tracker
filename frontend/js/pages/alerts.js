// Alerts Page

class AlertsPage {
  constructor() {
    this.alerts = [];
    this.pagination = {};
    this.filters = {
      page: 1,
      limit: 20,
      alertType: '',
      hours: 24,
      sortBy: 'created_at',
      sortOrder: 'desc'
    };
    this.loading = false;
  }

  async render() {
    router.setTitle('价格警报');
    
    const html = `
      <div class="page-header">
        <h1 class="page-title">价格警报</h1>
        <p class="page-subtitle">查看所有价格变动提醒</p>
      </div>

      <!-- Filters -->
      <div class="alerts-filters">
        <div class="filter-row">
          <div class="filter-group">
            <label for="alert-type-select">警报类型</label>
            <select id="alert-type-select">
              <option value="" ${this.filters.alertType === '' ? 'selected' : ''}>全部类型</option>
              <option value="price_drop" ${this.filters.alertType === 'price_drop' ? 'selected' : ''}>降价警报</option>
              <option value="price_increase" ${this.filters.alertType === 'price_increase' ? 'selected' : ''}>涨价警报</option>
              <option value="stock_change" ${this.filters.alertType === 'stock_change' ? 'selected' : ''}>库存变化</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="time-range-select">时间范围</label>
            <select id="time-range-select">
              <option value="24" ${this.filters.hours === 24 ? 'selected' : ''}>最近24小时</option>
              <option value="72" ${this.filters.hours === 72 ? 'selected' : ''}>最近3天</option>
              <option value="168" ${this.filters.hours === 168 ? 'selected' : ''}>最近7天</option>
              <option value="720" ${this.filters.hours === 720 ? 'selected' : ''}>最近30天</option>
              <option value="" ${this.filters.hours === '' ? 'selected' : ''}>全部时间</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="sort-select">排序方式</label>
            <select id="sort-select">
              <option value="created_at:desc" ${this.filters.sortBy === 'created_at' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>最新优先</option>
              <option value="created_at:asc" ${this.filters.sortBy === 'created_at' && this.filters.sortOrder === 'asc' ? 'selected' : ''}>最旧优先</option>
              <option value="change_percentage:desc" ${this.filters.sortBy === 'change_percentage' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>变化幅度最大</option>
              <option value="change_percentage:asc" ${this.filters.sortBy === 'change_percentage' && this.filters.sortOrder === 'asc' ? 'selected' : ''}>变化幅度最小</option>
            </select>
          </div>
          
          <button class="btn btn-secondary" id="reset-filters">
            <i class="fas fa-undo"></i>
            重置筛选
          </button>
        </div>
      </div>

      <!-- Results Count -->
      <div class="flex-between mb-4">
        <div class="results-count" id="results-count">
          正在加载...
        </div>
        <button class="btn btn-primary" onclick="alertsPage.loadAlerts()">
          <i class="fas fa-refresh"></i>
          刷新
        </button>
      </div>

      <!-- Alerts Container -->
      <div id="alerts-container">
        ${this.createLoadingState()}
      </div>

      <!-- Pagination -->
      <div id="pagination-container"></div>
    `;

    router.setContent(html);
    this.bindEvents();
    await this.loadAlerts();
  }

  bindEvents() {
    // Alert type filter
    const alertTypeSelect = utils.$('#alert-type-select');
    if (alertTypeSelect) {
      utils.on(alertTypeSelect, 'change', (e) => {
        this.filters.alertType = e.target.value;
        this.filters.page = 1;
        this.loadAlerts();
      });
    }

    // Time range filter
    const timeRangeSelect = utils.$('#time-range-select');
    if (timeRangeSelect) {
      utils.on(timeRangeSelect, 'change', (e) => {
        this.filters.hours = e.target.value ? parseInt(e.target.value) : '';
        this.filters.page = 1;
        this.loadAlerts();
      });
    }

    // Sort select
    const sortSelect = utils.$('#sort-select');
    if (sortSelect) {
      utils.on(sortSelect, 'change', (e) => {
        const [sortBy, sortOrder] = e.target.value.split(':');
        this.filters.sortBy = sortBy;
        this.filters.sortOrder = sortOrder;
        this.filters.page = 1;
        this.loadAlerts();
      });
    }

    // Reset filters
    const resetBtn = utils.$('#reset-filters');
    if (resetBtn) {
      utils.on(resetBtn, 'click', () => {
        this.resetFilters();
      });
    }

    // Product clicks
    utils.delegate(document, '[data-product-code]', 'click', (e) => {
      const productCode = e.target.closest('[data-product-code]').dataset.productCode;
      router.navigate(`/products/${productCode}`);
    });
  }

  async loadAlerts() {
    if (this.loading) return;
    
    try {
      this.loading = true;
      this.showLoadingState();

      const params = { ...this.filters };
      const data = await api.getAlerts(params);
      
      this.alerts = data.alerts || data || []; // Handle different response formats
      this.pagination = data.pagination || {};
      
      this.renderAlerts();
      this.renderPagination();
      this.updateResultsCount();

    } catch (error) {
      utils.handleError(error, 'loading alerts');
      this.showErrorState();
    } finally {
      this.loading = false;
    }
  }

  renderAlerts() {
    const container = utils.$('#alerts-container');
    if (!container) return;

    if (this.alerts.length === 0) {
      container.innerHTML = this.createEmptyState();
      return;
    }

    container.innerHTML = this.alerts.map(alert => {
      return `
        <div data-product-code="${alert.product_code}">
          ${components.createAlertItem(alert)}
        </div>
      `;
    }).join('');
  }

  renderPagination() {
    const container = utils.$('#pagination-container');
    if (!container) return;

    if (this.pagination.pages > 1) {
      container.innerHTML = components.createPagination(
        this.pagination.page,
        this.pagination.pages,
        (page) => {
          this.filters.page = page;
          this.loadAlerts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      );
    } else {
      container.innerHTML = '';
    }
  }

  updateResultsCount() {
    const countElement = utils.$('#results-count');
    if (countElement) {
      if (this.pagination.total !== undefined) {
        countElement.textContent = `共找到 ${utils.formatNumber(this.pagination.total)} 个警报`;
      } else {
        countElement.textContent = `共找到 ${utils.formatNumber(this.alerts.length)} 个警报`;
      }
    }
  }

  resetFilters() {
    this.filters = {
      page: 1,
      limit: 20,
      alertType: '',
      hours: 24,
      sortBy: 'created_at',
      sortOrder: 'desc'
    };

    // Update form elements
    const alertTypeSelect = utils.$('#alert-type-select');
    if (alertTypeSelect) alertTypeSelect.value = '';
    
    const timeRangeSelect = utils.$('#time-range-select');
    if (timeRangeSelect) timeRangeSelect.value = '24';
    
    const sortSelect = utils.$('#sort-select');
    if (sortSelect) sortSelect.value = 'created_at:desc';

    this.loadAlerts();
  }

  createLoadingState() {
    return Array(5).fill(0).map(() => `
      <div class="alert-card">
        <div class="alert-header">
          <div class="skeleton" style="width: 80px; height: 24px;"></div>
          <div class="skeleton" style="width: 120px; height: 16px;"></div>
        </div>
        <div class="alert-body">
          <div class="skeleton" style="width: 80px; height: 80px; border-radius: 8px;"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 60%;"></div>
            <div class="skeleton skeleton-text" style="width: 40%;"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  showLoadingState() {
    const container = utils.$('#alerts-container');
    if (container) {
      container.innerHTML = this.createLoadingState();
    }
  }

  createEmptyState() {
    const hasFilters = this.filters.alertType || this.filters.hours !== 24;
    
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-bell-slash"></i>
        </div>
        <h2 class="empty-state-title">没有找到警报</h2>
        <p class="empty-state-description">
          ${hasFilters ? '尝试调整筛选条件查看更多警报' : '暂时没有价格变动警报'}
        </p>
        ${hasFilters ? `
          <button class="btn btn-primary" onclick="alertsPage.resetFilters()">
            <i class="fas fa-undo"></i>
            清除筛选条件
          </button>
        ` : ''}
      </div>
    `;
  }

  showErrorState() {
    const container = utils.$('#alerts-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 class="empty-state-title">加载失败</h2>
          <p class="empty-state-description">无法加载警报列表，请检查网络连接</p>
          <button class="btn btn-primary" onclick="alertsPage.loadAlerts()">
            <i class="fas fa-refresh"></i>
            重新加载
          </button>
        </div>
      `;
    }
  }
}

// Create global instance
window.alertsPage = new AlertsPage();

// Register route
router.route('/alerts', () => alertsPage.render());
