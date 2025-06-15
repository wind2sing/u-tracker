// Dashboard Page

class DashboardPage {
  constructor() {
    this.stats = null;
    this.alerts = [];
    this.trending = [];
    this.scrapingStatus = null;
    this.loading = false;
    this.refreshInterval = null;
  }

  async render() {
    router.setTitle('数据仪表板');
    
    const html = `
      <div class="page-header">
        <h1 class="page-title">数据仪表板</h1>
        <p class="page-subtitle">实时监控优衣库商品价格变化</p>
      </div>

      <!-- Statistics Cards -->
      <div class="dashboard-stats" id="stats-container">
        ${this.createStatsLoadingState()}
      </div>

      <!-- Scraping Status -->
      <div class="card mb-4">
        <div class="card-header">
          <h3>
            <i class="fas fa-sync-alt"></i>
            数据抓取状态
          </h3>
        </div>
        <div class="card-body">
          <div id="scraping-status-container">
            ${this.createScrapingStatusLoadingState()}
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="dashboard-content">
        <!-- Recent Alerts -->
        <div class="dashboard-section">
          <h3>
            <i class="fas fa-bell"></i>
            最新价格警报
          </h3>
          <div id="alerts-container">
            ${this.createAlertsLoadingState()}
          </div>
        </div>

        <!-- Trending Products -->
        <div class="dashboard-section">
          <h3>
            <i class="fas fa-fire"></i>
            热门商品
          </h3>
          <div id="trending-container">
            ${this.createTrendingLoadingState()}
          </div>
        </div>
      </div>

      <!-- Today's Summary -->
      <div class="card mt-4">
        <div class="card-header">
          <h3>今日统计</h3>
        </div>
        <div class="card-body">
          <div id="daily-stats" class="grid grid-cols-4">
            ${this.createDailyStatsLoadingState()}
          </div>
        </div>
      </div>
    `;

    router.setContent(html);
    await this.loadData();
    this.startAutoRefresh();
  }

  async loadData() {
    if (this.loading) return;

    try {
      this.loading = true;

      const [statsData, alertsData, trendingData, scrapingStatusData, schedulerStatusData] = await Promise.all([
        api.getStats(),
        api.getAlerts({ hours: 24 }),
        api.getTrendingProducts(5),
        api.getLatestScrapingStatus(),
        api.getSchedulerStatus()
      ]);

      this.stats = statsData;
      this.alerts = alertsData.slice(0, 5); // Show only first 5 alerts
      this.trending = trendingData.slice(0, 5); // Show only first 5 trending
      this.scrapingStatus = scrapingStatusData;
      this.schedulerStatus = schedulerStatusData;

      this.renderStats();
      this.renderScrapingStatus();
      this.renderAlerts();
      this.renderTrending();
      this.renderDailyStats();

    } catch (error) {
      utils.handleError(error, 'loading dashboard data');
      this.showErrorState();
    } finally {
      this.loading = false;
    }
  }

  renderStats() {
    const container = utils.$('#stats-container');
    if (!container || !this.stats) return;

    // 确保 components 对象已加载
    if (!window.components || !window.components.createStatCard) {
      console.error('Components not loaded yet');
      return;
    }

    const avgPrice = this.stats.priceRange?.avg_price || 0;
    const minPrice = this.stats.priceRange?.min_price || 0;
    const maxPrice = this.stats.priceRange?.max_price || 0;
    const priceRangeText = `${utils.formatPrice(minPrice)} - ${utils.formatPrice(maxPrice)}`;

    container.innerHTML = `
      ${window.components.createStatCard(
        '商品总数',
        utils.formatNumber(this.stats.totalProducts || 0),
        'box',
        'primary'
      )}
      ${window.components.createStatCard(
        '价格记录',
        utils.formatNumber(this.stats.totalPriceRecords || 0),
        'chart-line',
        'success'
      )}
      ${window.components.createStatCard(
        '价格警报',
        utils.formatNumber(this.stats.totalAlerts || 0),
        'bell',
        'warning'
      )}
      ${window.components.createStatCard(
        '平均价格',
        utils.formatPrice(avgPrice),
        'tag',
        'info',
        priceRangeText
      )}
    `;
  }

  renderScrapingStatus() {
    const container = utils.$('#scraping-status-container');
    if (!container) return;

    if (!this.scrapingStatus) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-question-circle"></i>
          </div>
          <p class="empty-state-description">无法获取抓取状态信息</p>
        </div>
      `;
      return;
    }

    const { latest, isRunning, runningTasks } = this.scrapingStatus;

    // 状态显示
    let statusBadge = '';
    let statusText = '';
    let statusIcon = '';

    if (isRunning) {
      statusBadge = 'bg-warning';
      statusText = '正在运行';
      statusIcon = 'fa-spin fa-sync-alt';
    } else if (latest) {
      if (latest.status === 'completed') {
        statusBadge = 'bg-success';
        statusText = '已完成';
        statusIcon = 'fa-check-circle';
      } else if (latest.status === 'failed') {
        statusBadge = 'bg-error';
        statusText = '失败';
        statusIcon = 'fa-exclamation-circle';
      } else {
        statusBadge = 'bg-info';
        statusText = '未知状态';
        statusIcon = 'fa-question-circle';
      }
    } else {
      statusBadge = 'bg-secondary';
      statusText = '暂无记录';
      statusIcon = 'fa-minus-circle';
    }

    // 计算下次抓取时间
    const nextScrapingTime = this.calculateNextScrapingTime();
    const nextScrapingText = utils.formatDateTime(nextScrapingTime);

    // 检查是否可以手动触发
    const canTriggerManual = this.schedulerStatus?.canTriggerManual && !isRunning;
    const scraperType = this.schedulerStatus?.scraperType || 'traditional';
    const scraperTypeText = scraperType === 'concurrent' ? '并发抓取器' : '传统抓取器';

    container.innerHTML = `
      <div class="scraping-status-grid">
        <div class="scraping-status-item">
          <div class="scraping-status-header">
            <span class="badge ${statusBadge}">
              <i class="fas ${statusIcon}"></i>
              ${statusText}
            </span>
            ${canTriggerManual ? `
              <button class="btn btn-sm btn-primary" onclick="dashboardPage.showManualScrapingModal()" title="手动触发抓取">
                <i class="fas fa-play"></i>
                手动抓取
              </button>
            ` : ''}
          </div>
          <div class="scraping-status-content">
            <div class="scraping-status-label">当前状态</div>
            ${isRunning ? '<div class="text-warning">数据抓取正在进行中...</div>' : ''}
            <div class="text-xs text-secondary mt-1">抓取器类型: ${scraperTypeText}</div>
          </div>
        </div>

        <div class="scraping-status-item">
          <div class="scraping-status-content">
            <div class="scraping-status-label">上次抓取</div>
            <div class="scraping-status-value">
              ${latest ? utils.formatDateTime(latest.start_time) : '暂无记录'}
            </div>
            ${latest && latest.duration_ms ? `
              <div class="text-sm text-secondary">
                耗时: ${utils.formatDuration(latest.duration_ms)}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="scraping-status-item">
          <div class="scraping-status-content">
            <div class="scraping-status-label">下次抓取</div>
            <div class="scraping-status-value">
              ${nextScrapingText}
            </div>
            <div class="text-sm text-secondary">
              ${this.getTimeUntilNext(nextScrapingTime)}
            </div>
          </div>
        </div>

        <div class="scraping-status-item">
          <div class="scraping-status-content">
            <div class="scraping-status-label">抓取结果</div>
            ${latest ? `
              <div class="scraping-results">
                <div class="result-item">
                  <span class="result-label">处理商品:</span>
                  <span class="result-value">${latest.products_processed || 0}</span>
                </div>
                <div class="result-item">
                  <span class="result-label">新增商品:</span>
                  <span class="result-value">${latest.new_products || 0}</span>
                </div>
                <div class="result-item">
                  <span class="result-label">价格变化:</span>
                  <span class="result-value">${latest.price_changes || 0}</span>
                </div>
                <div class="result-item">
                  <span class="result-label">生成警报:</span>
                  <span class="result-value">${latest.alerts_generated || 0}</span>
                </div>
              </div>
            ` : '<div class="text-secondary">暂无数据</div>'}
          </div>
        </div>
      </div>

      ${latest && latest.error_message ? `
        <div class="alert alert-error mt-3">
          <i class="fas fa-exclamation-triangle"></i>
          <div>
            <strong>错误信息:</strong> ${latest.error_message}
          </div>
        </div>
      ` : ''}
    `;
  }

  calculateNextScrapingTime() {
    // 基于cron表达式 "0 */2 * * *" (每2小时) 计算下次执行时间
    // 使用更精确的计算方法
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();

    // 如果当前时间不是整点，先计算到下一个整点
    let nextTime = new Date(now);
    if (currentMinutes > 0 || currentSeconds > 0) {
      nextTime.setHours(nextTime.getHours() + 1, 0, 0, 0);
    } else {
      nextTime.setMinutes(0, 0, 0);
    }

    // 然后找到下一个偶数小时
    const nextHour = nextTime.getHours();
    if (nextHour % 2 !== 0) {
      nextTime.setHours(nextHour + 1, 0, 0, 0);
    }

    // 如果超过24小时，调整到第二天
    if (nextTime.getHours() >= 24) {
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(0, 0, 0, 0);
    }

    return nextTime;
  }

  getTimeUntilNext(nextTime) {
    const now = new Date();
    const diff = nextTime.getTime() - now.getTime();

    if (diff <= 0) return '即将开始';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}小时${minutes}分钟后`;
    } else {
      return `${minutes}分钟后`;
    }
  }

  renderAlerts() {
    const container = utils.$('#alerts-container');
    if (!container) return;

    if (this.alerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-bell-slash"></i>
          </div>
          <p class="empty-state-description">暂无价格警报</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.alerts.map(alert => {
      const imageUrl = utils.getImageUrl(alert.main_pic);
      const timestamp = utils.formatDateTime(alert.created_at);
      const oldPrice = utils.formatPrice(alert.previous_price);
      const newPrice = utils.formatPrice(alert.current_price);
      const percentage = Math.abs(alert.change_percentage || 0).toFixed(1);
      
      const isDecrease = alert.alert_type === 'price_drop';
      const iconColor = isDecrease ? 'success' : 'error';
      const icon = isDecrease ? 'arrow-down' : 'arrow-up';

      return `
        <div class="alert-item" onclick="router.navigate('/products/${alert.product_code}')">
          <div class="alert-icon bg-${iconColor}">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">${utils.truncateText(alert.name_zh || alert.product_code, 50)}</div>
            <div class="alert-subtitle">
              ${oldPrice} → ${newPrice} (${percentage}%)
            </div>
            <div class="alert-subtitle text-xs">${timestamp}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTrending() {
    const container = utils.$('#trending-container');
    if (!container) return;

    if (this.trending.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <p class="empty-state-description">暂无热门商品数据</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.trending.map(product => {
      const imageUrl = utils.getImageUrl(product.main_pic);
      const price = utils.formatPrice(product.current_price);
      const salesCount = product.sales_count ? utils.formatNumber(product.sales_count) : 0;

      return `
        <div class="trending-item" onclick="router.navigate('/products/${product.product_code}')">
          <img class="trending-image" src="${imageUrl}" alt="${product.name_zh}" 
               onerror="this.src='${utils.getImageUrl()}'">
          <div class="trending-content">
            <div class="trending-name">${utils.truncateText(product.name_zh, 60)}</div>
            <div class="trending-price">${price}</div>
            <div class="text-xs text-secondary">销量: ${salesCount}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderDailyStats() {
    const container = utils.$('#daily-stats');
    if (!container || !this.stats?.recentAlerts) return;

    const recentAlerts = this.stats.recentAlerts;

    container.innerHTML = `
      <div class="text-center">
        <div class="text-2xl font-bold text-success">${recentAlerts.priceDrops || 0}</div>
        <div class="text-sm text-secondary">降价商品</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-error">${recentAlerts.priceIncreases || 0}</div>
        <div class="text-sm text-secondary">涨价商品</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-info">${recentAlerts.stockChanges || 0}</div>
        <div class="text-sm text-secondary">库存变化</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-primary">${recentAlerts.total || 0}</div>
        <div class="text-sm text-secondary">总警报数</div>
      </div>
    `;
  }

  startAutoRefresh() {
    // Refresh data every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadData();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  createStatsLoadingState() {
    return Array(4).fill(0).map(() => `
      <div class="stat-card">
        <div class="skeleton" style="width: 48px; height: 48px; border-radius: 12px;"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>
    `).join('');
  }

  createAlertsLoadingState() {
    return Array(3).fill(0).map(() => `
      <div class="alert-item">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 50%;"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>
      </div>
    `).join('');
  }

  createTrendingLoadingState() {
    return Array(3).fill(0).map(() => `
      <div class="trending-item">
        <div class="skeleton" style="width: 60px; height: 60px; border-radius: 8px;"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 40%;"></div>
        </div>
      </div>
    `).join('');
  }

  createDailyStatsLoadingState() {
    return Array(4).fill(0).map(() => `
      <div class="text-center">
        <div class="skeleton" style="height: 2rem; width: 3rem; margin: 0 auto 0.5rem;"></div>
        <div class="skeleton skeleton-text"></div>
      </div>
    `).join('');
  }

  createScrapingStatusLoadingState() {
    return `
      <div class="scraping-status-grid">
        ${Array(4).fill(0).map(() => `
          <div class="scraping-status-item">
            <div class="scraping-status-content">
              <div class="skeleton skeleton-text" style="width: 60%;"></div>
              <div class="skeleton skeleton-text" style="width: 80%;"></div>
              <div class="skeleton skeleton-text" style="width: 40%;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  showErrorState() {
    const container = utils.$('#stats-container');
    if (container) {
      container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-body">
            <div class="empty-state">
              <div class="empty-state-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <h2 class="empty-state-title">加载失败</h2>
              <p class="empty-state-description">无法加载仪表板数据，请检查API服务是否正常运行</p>
              <button class="btn btn-primary" onclick="dashboardPage.loadData()">
                <i class="fas fa-refresh"></i>
                重新加载
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 显示手动抓取模态框
  showManualScrapingModal() {
    const modal = utils.createElement('div', 'modal-overlay', `
      <div class="modal">
        <div class="modal-header">
          <h3>手动触发数据抓取</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <div>
              <strong>全量数据抓取说明：</strong>
              <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
                <li>将抓取所有可用的商品数据，直到没有更多页面</li>
                <li>使用并发抓取模式，速度更快（3-5倍）</li>
                <li>抓取过程可能需要几分钟时间，请耐心等待</li>
                <li>抓取过程中请勿重复触发或关闭页面</li>
                <li>建议在非高峰时段进行数据抓取</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            取消
          </button>
          <button type="button" class="btn btn-primary" onclick="dashboardPage.triggerManualScraping()">
            <i class="fas fa-play"></i>
            开始全量抓取
          </button>
        </div>
      </div>
    `);

    document.body.appendChild(modal);
  }

  // 触发手动抓取
  async triggerManualScraping() {
    // 不需要表单数据，直接使用配置文件中的设置
    const options = {};

    // 关闭模态框
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
    }

    // 显示加载状态
    if (window.app) {
      window.app.showLoading('正在启动全量数据抓取...');
    }

    try {
      console.log('🚀 触发手动抓取', options);
      const result = await api.triggerScraping(options);

      if (window.app) {
        window.app.hideLoading();
      }

      if (result.success) {
        // 显示成功消息
        this.showScrapingResult(result, '全量数据抓取已启动');

        // 立即刷新状态
        setTimeout(() => {
          this.loadData();
        }, 1000);

        // 开始轮询抓取状态
        this.startScrapingStatusPolling();
      } else {
        throw new Error(result.message || '启动抓取失败');
      }
    } catch (error) {
      if (window.app) {
        window.app.hideLoading();
      }
      console.error('手动抓取失败:', error);

      // 显示错误消息
      const errorModal = utils.createElement('div', 'modal-overlay', `
        <div class="modal">
          <div class="modal-header">
            <h3>抓取启动失败</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="alert alert-error">
              <i class="fas fa-exclamation-triangle"></i>
              <div>
                <strong>错误信息：</strong>
                <p>${error.message}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
              确定
            </button>
          </div>
        </div>
      `);

      document.body.appendChild(errorModal);
    }
  }

  // 显示抓取结果
  showScrapingResult(result, title) {
    const modal = utils.createElement('div', 'modal-overlay', `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            <div>
              <strong>全量数据抓取任务已成功启动！</strong>
              <p>系统将抓取所有可用的商品数据。您可以在抓取状态区域查看进度，页面会自动更新状态信息。</p>
            </div>
          </div>

          <div class="scraping-summary">
            <h4>抓取配置：</h4>
            <ul>
              <li>抓取范围: 全量数据（所有可用页面）</li>
              <li>抓取模式: 并发抓取（配置文件控制并发数）</li>
              <li>预计时间: 根据数据量而定，通常需要几分钟</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
            确定
          </button>
        </div>
      </div>
    `);

    document.body.appendChild(modal);
  }

  // 开始轮询抓取状态
  startScrapingStatusPolling() {
    // 如果已经在轮询，先停止
    if (this.scrapingPollingInterval) {
      clearInterval(this.scrapingPollingInterval);
    }

    // 每5秒检查一次抓取状态
    this.scrapingPollingInterval = setInterval(async () => {
      try {
        const statusData = await api.getLatestScrapingStatus();
        const schedulerData = await api.getSchedulerStatus();

        this.scrapingStatus = statusData;
        this.schedulerStatus = schedulerData;

        this.renderScrapingStatus();

        // 如果抓取完成，停止轮询
        if (!statusData.isRunning && !schedulerData.manualScrapingInProgress) {
          clearInterval(this.scrapingPollingInterval);
          this.scrapingPollingInterval = null;

          // 显示完成通知
          if (statusData.latest && statusData.latest.status === 'completed') {
            this.showScrapingCompleteNotification(statusData.latest);
          }
        }
      } catch (error) {
        console.error('轮询抓取状态失败:', error);
      }
    }, 5000);
  }

  // 显示抓取完成通知
  showScrapingCompleteNotification(scrapingResult) {
    const notification = utils.createElement('div', 'notification notification-success', `
      <div class="notification-content">
        <i class="fas fa-check-circle"></i>
        <div>
          <strong>数据抓取完成！</strong>
          <p>处理了 ${scrapingResult.products_processed || 0} 个商品，发现 ${scrapingResult.price_changes || 0} 个价格变化</p>
        </div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `);

    document.body.appendChild(notification);

    // 5秒后自动移除通知
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Cleanup when leaving the page
  destroy() {
    this.stopAutoRefresh();
    if (this.scrapingPollingInterval) {
      clearInterval(this.scrapingPollingInterval);
      this.scrapingPollingInterval = null;
    }
  }
}

// Create global instance
window.dashboardPage = new DashboardPage();

// Register routes
router.route('/', () => dashboardPage.render());
router.route('/dashboard', () => dashboardPage.render());
