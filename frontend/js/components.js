// UI Components

// Toast Notifications
const showToast = (message, type = 'info', duration = 5000) => {
  const container = utils.$('#toast-container');
  if (!container) return;

  const toast = utils.createElement('div', `toast toast-${type}`);
  toast.innerHTML = `
    <i class="fas fa-${getToastIcon(type)}"></i>
    <span>${message}</span>
    <button class="toast-close" aria-label="关闭">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  // Auto remove
  const autoRemove = setTimeout(() => removeToast(toast), duration);

  // Manual close
  const closeBtn = toast.querySelector('.toast-close');
  utils.on(closeBtn, 'click', () => {
    clearTimeout(autoRemove);
    removeToast(toast);
  });

  return toast;
};

const removeToast = (toast) => {
  toast.style.animation = 'slideOutRight 0.3s ease-in';
  setTimeout(() => utils.removeElement(toast), 300);
};

const getToastIcon = (type) => {
  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  return icons[type] || icons.info;
};

// Modal
const showModal = (title, content, actions = []) => {
  const container = utils.$('#modal-container');
  if (!container) return;

  const modal = utils.createElement('div', 'modal');
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="btn btn-secondary" data-action="close">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      ${content}
    </div>
    ${actions.length > 0 ? `
      <div class="modal-footer">
        ${actions.map(action => `
          <button class="btn ${action.class || 'btn-secondary'}" data-action="${action.action}">
            ${action.icon ? `<i class="fas fa-${action.icon}"></i>` : ''}
            ${action.text}
          </button>
        `).join('')}
      </div>
    ` : ''}
  `;

  container.appendChild(modal);
  container.classList.add('active');

  // Handle actions
  utils.delegate(modal, '[data-action]', 'click', (e) => {
    const action = e.target.closest('[data-action]').dataset.action;
    
    if (action === 'close') {
      hideModal();
    } else {
      const actionHandler = actions.find(a => a.action === action);
      if (actionHandler && actionHandler.handler) {
        actionHandler.handler();
      }
    }
  });

  // Close on backdrop click
  utils.on(container, 'click', (e) => {
    if (e.target === container) {
      hideModal();
    }
  });

  return modal;
};

const hideModal = () => {
  const container = utils.$('#modal-container');
  if (!container) return;

  container.classList.remove('active');
  setTimeout(() => {
    container.innerHTML = '';
  }, 300);
};

// Pagination
const createPagination = (currentPage, totalPages, onPageChange) => {
  if (totalPages <= 1) return '';

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  let html = '<div class="pagination">';

  // Previous button
  html += `
    <button class="pagination-item" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // First page
  if (startPage > 1) {
    html += `<button class="pagination-item" data-page="1">1</button>`;
    if (startPage > 2) {
      html += '<span class="pagination-item">...</span>';
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="pagination-item ${i === currentPage ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }

  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += '<span class="pagination-item">...</span>';
    }
    html += `<button class="pagination-item" data-page="${totalPages}">${totalPages}</button>`;
  }

  // Next button
  html += `
    <button class="pagination-item" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  html += '</div>';

  // Add event listeners
  setTimeout(() => {
    utils.delegate(document, '.pagination-item[data-page]', 'click', (e) => {
      const page = parseInt(e.target.closest('[data-page]').dataset.page);
      if (page && page !== currentPage) {
        onPageChange(page);
      }
    });
  }, 0);

  return html;
};

// Product Card
const createProductCard = (product, viewMode = 'grid') => {
  if (!product) return '';

  const imageUrl = utils.getImageUrl(product.main_pic);
  const currentPrice = utils.formatPrice(product.current_price);
  const originalPrice = product.original_price && product.original_price !== product.current_price
    ? utils.formatPrice(product.original_price)
    : null;

  const priceChange = originalPrice
    ? utils.calculatePercentage(product.current_price, product.original_price)
    : 0;

  if (viewMode === 'list') {
    // 计算折扣力度
    const discount = utils.calculateDiscount(product.original_price, product.current_price);



    // 格式化更新时间
    const lastUpdated = utils.formatRelativeTime(product.last_updated);

    // 格式化价格变动时间
    const lastPriceChange = product.last_price_change ?
      utils.formatRelativeTime(product.last_price_change) : null;

    return `
      <div class="product-list-item" data-product-code="${product.product_code}">
        <img class="product-list-image" src="${imageUrl}" alt="${product.name_zh}"
             onerror="this.src='${utils.getImageUrl()}'">
        <div class="product-list-content">
          <div class="product-list-header">
            <h3 class="product-list-name">${product.name_zh}</h3>
            <p class="product-list-code">商品编号: ${product.product_code}</p>


          </div>

          <div class="product-list-footer">
            <div class="product-list-price">
              <span class="product-list-current-price">${currentPrice}</span>
              ${originalPrice ? `
                <span class="product-list-original-price">${originalPrice}</span>
                <span class="chip ${priceChange < 0 ? 'chip-success' : 'chip-error'}">
                  <i class="fas fa-${priceChange < 0 ? 'arrow-down' : 'arrow-up'}"></i>
                  ${Math.abs(priceChange).toFixed(1)}%
                </span>
              ` : ''}
              ${discount > 0 ? `
                <span class="chip chip-error chip-sm">
                  <i class="fas fa-tag"></i>
                  ${discount}% OFF
                </span>
              ` : ''}
            </div>

            <div class="flex-start">
              <span class="chip ${product.stock_status === 'Y' ? 'chip-success' : 'chip-error'}">
                <i class="fas fa-${product.stock_status === 'Y' ? 'check' : 'times'}"></i>
                ${product.stock_status === 'Y' ? '有库存' : '缺货'}
              </span>
              ${product.sales_count ? `
                <span class="text-sm text-secondary">销量: ${utils.formatNumber(product.sales_count)}</span>
              ` : ''}
            </div>

            <!-- 时间信息 -->
            <div class="time-info-list">
              ${lastUpdated ? `
                <div class="time-item">
                  <i class="fas fa-clock text-secondary"></i>
                  <span class="text-xs text-secondary">更新: ${lastUpdated}</span>
                </div>
              ` : ''}
              ${lastPriceChange ? `
                <div class="time-item">
                  <i class="fas fa-chart-line text-secondary"></i>
                  <span class="text-xs text-secondary">变价: ${lastPriceChange}</span>
                </div>
              ` : ''}
            </div>

            ${(product.available_colors && product.available_colors.length > 0) || (product.available_sizes && product.available_sizes.length > 0) ? `
              <div class="product-specs mt-2">
                ${product.available_colors && product.available_colors.length > 0 ? `
                  <div class="spec-group">
                    <span class="spec-label">颜色:</span>
                    <div class="spec-chips">
                      ${utils.translateColors(product.available_colors).slice(0, 3).map(color => `
                        <span class="chip chip-sm">${color}</span>
                      `).join('')}
                      ${product.available_colors.length > 3 ? `<span class="text-sm text-secondary">+${product.available_colors.length - 3}</span>` : ''}
                    </div>
                  </div>
                ` : ''}
                ${product.available_sizes && product.available_sizes.length > 0 ? `
                  <div class="spec-group">
                    <span class="spec-label">尺码:</span>
                    <div class="spec-chips">
                      ${utils.translateSizes(product.available_sizes).slice(0, 4).map(size => `
                        <span class="chip chip-sm">${size}</span>
                      `).join('')}
                      ${product.available_sizes.length > 4 ? `<span class="text-sm text-secondary">+${product.available_sizes.length - 4}</span>` : ''}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // 计算折扣力度
  const discount = utils.calculateDiscount(product.original_price, product.current_price);



  // 格式化更新时间
  const lastUpdated = utils.formatRelativeTime(product.last_updated);

  // 格式化价格变动时间
  const lastPriceChange = product.last_price_change ?
    utils.formatRelativeTime(product.last_price_change) : null;

  return `
    <div class="product-card" data-product-code="${product.product_code}">
      <img class="product-image" src="${imageUrl}" alt="${product.name_zh}"
           onerror="this.src='${utils.getImageUrl()}'">
      <div class="product-info">
        <h3 class="product-name" title="${product.name_zh}">${product.name_zh}</h3>
        <p class="product-code">${product.product_code}</p>

        <!-- 价格区域 -->
        <div class="price-section">
          <div class="flex-between">
            <span class="product-price">${currentPrice}</span>
            ${originalPrice ? `<span class="product-original-price">${originalPrice}</span>` : ''}
          </div>
          ${discount > 0 ? `
            <div class="discount-badge">
              <span class="chip chip-error chip-sm">
                <i class="fas fa-tag"></i>
                ${discount}% OFF
              </span>
            </div>
          ` : ''}
        </div>



        <!-- 库存状态 -->
        ${product.stock_status !== 'Y' ? '<p class="text-sm text-error">缺货</p>' : ''}

        <!-- 时间信息 -->
        <div class="time-info">
          ${lastUpdated ? `
            <div class="time-item">
              <i class="fas fa-clock text-secondary"></i>
              <span class="text-xs text-secondary">更新: ${lastUpdated}</span>
            </div>
          ` : ''}
          ${lastPriceChange ? `
            <div class="time-item">
              <i class="fas fa-chart-line text-secondary"></i>
              <span class="text-xs text-secondary">变价: ${lastPriceChange}</span>
            </div>
          ` : ''}
        </div>

        <!-- 规格信息 -->
        ${(product.available_colors && product.available_colors.length > 0) || (product.available_sizes && product.available_sizes.length > 0) ? `
          <div class="product-specs-compact mt-2">
            ${product.available_colors && product.available_colors.length > 0 ? `
              <div class="spec-line">
                <span class="spec-label-sm">颜色:</span>
                <span class="spec-value-sm">${utils.translateColors(product.available_colors).slice(0, 2).join(', ')}${product.available_colors.length > 2 ? '...' : ''}</span>
              </div>
            ` : ''}
            ${product.available_sizes && product.available_sizes.length > 0 ? `
              <div class="spec-line">
                <span class="spec-label-sm">尺码:</span>
                <span class="spec-value-sm">${utils.translateSizes(product.available_sizes).slice(0, 3).join(', ')}${product.available_sizes.length > 3 ? '...' : ''}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
};

// Stat Card
const createStatCard = (title, value, icon, color = 'primary', subtitle = '') => {
  return `
    <div class="stat-card">
      <div class="stat-icon bg-${color}">
        <i class="fas fa-${icon}"></i>
      </div>
      <div class="stat-content">
        <h3>${value}</h3>
        <p>${title}</p>
        ${subtitle ? `<small class="text-secondary">${subtitle}</small>` : ''}
      </div>
    </div>
  `;
};

// Alert Item
const createAlertItem = (alert) => {
  if (!alert) return '';

  const imageUrl = utils.getImageUrl(alert.main_pic);
  const timestamp = utils.formatDateTime(alert.created_at);
  const oldPrice = utils.formatPrice(alert.previous_price);
  const newPrice = utils.formatPrice(alert.current_price);
  const percentage = Math.abs(alert.change_percentage || 0).toFixed(1);

  const alertTypes = {
    price_drop: { color: 'success', icon: 'arrow-down', text: '降价' },
    price_increase: { color: 'error', icon: 'arrow-up', text: '涨价' },
    stock_change: { color: 'info', icon: 'box', text: '库存变化' }
  };

  const alertType = alertTypes[alert.alert_type] || alertTypes.price_drop;

  return `
    <div class="alert-card ${alert.alert_type}">
      <div class="alert-header">
        <span class="chip chip-${alertType.color}">
          <i class="fas fa-${alertType.icon}"></i>
          ${alertType.text}
        </span>
        <span class="alert-timestamp">${timestamp}</span>
      </div>
      <div class="alert-body">
        <img class="alert-product-image" src="${imageUrl}" alt="${alert.name_zh}" 
             onerror="this.src='${utils.getImageUrl()}'">
        <div class="alert-details">
          <h4 class="alert-product-name">${alert.name_zh || alert.product_code}</h4>
          <div class="alert-price-change">
            <span class="alert-old-price">${oldPrice}</span>
            <i class="fas fa-arrow-right"></i>
            <span class="alert-new-price">${newPrice}</span>
            <span class="chip chip-${alertType.color}">${percentage}%</span>
          </div>
          <p class="alert-description">${alert.description || `商品${alertType.text}了${percentage}%`}</p>
        </div>
      </div>
    </div>
  `;
};

// Loading Skeleton
const createSkeleton = (type = 'card') => {
  if (type === 'card') {
    return `
      <div class="card">
        <div class="skeleton skeleton-image"></div>
        <div class="card-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>
      </div>
    `;
  }
  
  if (type === 'list') {
    return `
      <div class="card">
        <div class="card-body flex-start">
          <div class="skeleton" style="width: 80px; height: 80px; border-radius: 8px;"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 40%;"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  return '<div class="skeleton skeleton-text"></div>';
};

// Export components
window.components = {
  showToast,
  showModal,
  hideModal,
  createPagination,
  createProductCard,
  createStatCard,
  createAlertItem,
  createSkeleton
};
