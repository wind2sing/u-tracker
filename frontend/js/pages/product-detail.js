// Product Detail Page

class ProductDetailPage {
  constructor() {
    this.product = null;
    this.priceHistory = [];
    this.chart = null;
    this.loading = false;
    this.officialData = null;
    this.selectedColor = null;
    this.selectedSize = null;
  }

  async render(params) {
    const { code } = params;
    
    if (!code) {
      router.navigate('/products');
      return;
    }

    router.setTitle('商品详情');
    
    const html = `
      <div class="page-header">
        <button class="btn btn-secondary" onclick="router.back()">
          <i class="fas fa-arrow-left"></i>
          返回
        </button>
      </div>

      <div id="product-detail-container">
        ${this.createLoadingState()}
      </div>
    `;

    router.setContent(html);
    await this.loadProduct(code);
  }

  async loadProduct(code) {
    if (this.loading) return;

    try {
      this.loading = true;

      console.log('Loading product:', code);

      // Load product data and price history
      const productData = await api.getProduct(code);
      console.log('Product data loaded:', productData);

      let historyData = [];
      try {
        historyData = await api.getPriceHistory(code, 30);
        console.log('Price history loaded:', historyData);
      } catch (historyError) {
        console.warn('Failed to load price history:', historyError);
        // Continue without price history
      }

      // Try to load official product data for enhanced details
      let officialData = null;
      try {
        officialData = await this.loadOfficialProductData(code);
        console.log('Official data loaded:', officialData);
      } catch (officialError) {
        console.warn('Failed to load official data:', officialError);
        // Continue without official data
      }

      this.product = productData;
      this.priceHistory = historyData || [];
      this.officialData = officialData;

      router.setTitle(this.product.name_zh || '商品详情');
      this.renderProduct();

      // Render chart after a short delay to ensure DOM is ready
      setTimeout(() => {
        this.renderPriceChart();
      }, 100);

    } catch (error) {
      console.error('Error loading product:', error);
      utils.handleError(error, 'loading product detail');
      this.showErrorState();
    } finally {
      this.loading = false;
    }
  }

  async loadOfficialProductData(code) {
    // For now, we'll skip loading official data due to CORS restrictions
    // In a production environment, this would be handled by a backend proxy
    console.log('Official data loading skipped due to CORS restrictions');
    return null;

    /*
    // This code would work if we had a backend proxy
    const officialCode = this.convertToOfficialCode(code);

    try {
      // Try to load official SPU data through backend proxy
      const spuResponse = await fetch(`/api/proxy/uniqlo/spu/${officialCode}`);
      if (!spuResponse.ok) throw new Error('SPU data not available');
      const spuData = await spuResponse.json();

      // Try to load official product images data through backend proxy
      const imagesResponse = await fetch(`/api/proxy/uniqlo/images/${officialCode}`);
      if (!imagesResponse.ok) throw new Error('Images data not available');
      const imagesData = await imagesResponse.json();

      return {
        spu: spuData,
        images: imagesData
      };
    } catch (error) {
      console.warn('Could not load official data:', error);
      return null;
    }
    */
  }

  convertToOfficialCode(code) {
    // Convert product code to official format (e.g., "479308" -> "u0000000060451")
    // This is a placeholder - we'd need to implement proper mapping
    if (code.startsWith('u')) {
      return code;
    }
    // For now, return as-is and let the API call fail gracefully
    return `u${code.padStart(12, '0')}`;
  }

  renderProduct() {
    const container = utils.$('#product-detail-container');
    if (!container || !this.product) return;

    const imageUrl = utils.getImageUrl(this.product.main_pic);
    const currentPrice = utils.formatPrice(this.product.current_price);
    const originalPrice = this.product.original_price && this.product.original_price !== this.product.current_price
      ? utils.formatPrice(this.product.original_price)
      : null;

    const priceChange = originalPrice
      ? utils.calculatePercentage(this.product.current_price, this.product.original_price)
      : 0;

    const discountPercentage = this.product.discount_percentage || 0;

    container.innerHTML = `
      <div class="product-detail-layout">
        <!-- Left Column: Images -->
        <div class="product-detail-images">
          ${this.renderProductImages()}
        </div>

        <!-- Right Column: Product Info -->
        <div class="product-detail-info">
          <!-- Product Title -->
          <div class="product-header">
            <h1 class="product-title">${this.product.name_zh}</h1>
            <p class="product-code">商品编号: ${this.product.product_code}</p>
            ${this.product.name ? `<p class="product-subtitle">${this.product.name}</p>` : ''}
          </div>

          <!-- Color Selection -->
          ${this.renderColorSelection()}

          <!-- Size Selection -->
          ${this.renderSizeSelection()}

          <!-- Price Section -->
          <div class="product-price-section">
            <div class="price-display">
              <span class="current-price">${currentPrice}</span>
              ${originalPrice ? `
                <span class="original-price">${originalPrice}</span>
                ${discountPercentage > 0 ? `<span class="discount-badge">-${discountPercentage.toFixed(0)}%</span>` : ''}
              ` : ''}
            </div>
            ${this.product.last_price_change ? `
              <div class="price-change-info">
                <small class="text-secondary">
                  <i class="fas fa-clock"></i>
                  价格变动: ${utils.formatRelativeTime(this.product.last_price_change)}
                  ${this.product.last_change_percentage ? `(${this.product.last_change_percentage > 0 ? '+' : ''}${this.product.last_change_percentage.toFixed(1)}%)` : ''}
                </small>
              </div>
            ` : ''}
          </div>

          <!-- Stock Status -->
          <div class="stock-status">
            <span class="stock-indicator ${this.product.stock_status === 'Y' ? 'in-stock' : 'out-of-stock'}">
              <i class="fas fa-${this.product.stock_status === 'Y' ? 'check-circle' : 'times-circle'}"></i>
              ${this.product.stock_status === 'Y' ? '有库存' : '缺货'}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="product-actions">
            <a href="${utils.getUniqloProductUrl(this.product.product_code, this.product.main_pic)}"
               target="_blank"
               class="btn btn-primary btn-large">
              <i class="fas fa-external-link-alt"></i>
              前往官网购买
            </a>
          </div>

          <!-- Product Details -->
          <div class="product-details">
            ${this.renderProductDetails()}
          </div>
        </div>
      </div>

      <!-- Additional Information Tabs -->
      <div class="product-tabs">
        <div class="tab-headers">
          <button class="tab-header active" data-tab="price-history">价格历史</button>
          <button class="tab-header" data-tab="product-info">商品信息</button>
          <button class="tab-header" data-tab="size-guide">尺寸指南</button>
        </div>

        <div class="tab-content">
          <div class="tab-pane active" id="price-history">
            ${this.renderPriceHistorySection()}
          </div>

          <div class="tab-pane" id="product-info">
            ${this.renderProductInfoSection()}
          </div>

          <div class="tab-pane" id="size-guide">
            ${this.renderSizeGuideSection()}
          </div>
        </div>
      </div>
    `;

    // Initialize tab functionality
    this.initializeTabs();

    // Initialize selection states
    this.initializeSelections();

    // Initialize color and size selection event listeners
    this.initializeSelectionEvents();
  }

  renderProductImages() {
    let images = [];
    let mainImage = utils.getImageUrl(this.product.main_pic);

    // Try to use official images if available
    if (this.officialData && this.officialData.images) {
      const officialImages = this.officialData.images;

      // Use high-quality main images (561px or 1000px)
      if (officialImages.main561 && officialImages.main561.length > 0) {
        images = officialImages.main561.map(img => `https://www.uniqlo.cn${img}`);
        mainImage = images[0];
      } else if (officialImages.main1000 && officialImages.main1000.length > 0) {
        images = officialImages.main1000.map(img => `https://www.uniqlo.cn${img}`);
        mainImage = images[0];
      }
    }

    // Fallback to our stored image
    if (images.length === 0) {
      images = [mainImage];
    }

    return `
      <div class="product-image-gallery">
        <div class="main-image">
          <img id="main-product-image" src="${mainImage}" alt="${this.product.name_zh}"
               onerror="this.src='${utils.getImageUrl()}'">
        </div>

        ${images.length > 1 ? `
          <div class="image-thumbnails">
            ${images.map((img, index) => `
              <div class="thumbnail ${index === 0 ? 'active' : ''}"
                   data-image-url="${img}"
                   data-index="${index}">
                <img src="${img}" alt="${this.product.name_zh}"
                     onerror="this.src='${utils.getImageUrl()}'">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  switchMainImage(imageUrl, index) {
    const mainImg = utils.$('#main-product-image');
    const thumbnails = utils.$$('.thumbnail');

    if (mainImg) {
      mainImg.src = imageUrl;
    }

    // Update active thumbnail
    thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }

  renderColorSelection() {
    let colors = [];

    // Use our stored colors data
    if (this.product.available_colors && this.product.available_colors.length > 0) {
      colors = this.product.available_colors.map(color => ({
        styleText: utils.translateColor(color),
        colorNo: color,
        chipPic: null
      }));
      if (!this.selectedColor && colors.length > 0) {
        this.selectedColor = colors[0].colorNo;
      }
    }

    if (colors.length === 0) {
      return '';
    }

    const selectedColorInfo = colors.find(c => c.colorNo === this.selectedColor) || colors[0];

    return `
      <div class="color-selection">
        <h4>颜色: <span class="selected-color">${selectedColorInfo ? selectedColorInfo.styleText : '未选择'}</span></h4>
        <div class="color-options">
          ${colors.map((color, index) => `
            <div class="color-option ${color.colorNo === this.selectedColor ? 'selected' : ''}"
                 data-color="${color.colorNo}"
                 data-color-text="${color.styleText}"
                 data-index="${index}">
              <div class="color-swatch" style="background-color: ${this.getColorCode(color.styleText)};"></div>
              <span>${color.styleText}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  selectColor(colorNo, colorText, index) {
    // Update selected color
    this.selectedColor = colorNo;

    // Update selected color display
    const selectedColorSpan = utils.$('.selected-color');
    if (selectedColorSpan) {
      selectedColorSpan.textContent = colorText;
    }

    // Update active color option
    const colorOptions = utils.$$('.color-option');
    colorOptions.forEach((option) => {
      option.classList.toggle('selected', option.dataset.color === colorNo);
    });

    console.log('Color selected:', colorNo, colorText);
  }

  getColorCode(colorNo) {
    // Enhanced color mapping based on common Uniqlo color names
    const colorMap = {
      // Basic colors
      '白色': '#ffffff',
      '黑色': '#000000',
      '灰色': '#808080',
      '深灰色': '#404040',
      '浅灰色': '#d3d3d3',

      // Blues
      '蓝色': '#1976d2',
      '深蓝色': '#0d47a1',
      '浅蓝色': '#64b5f6',
      '海军蓝': '#1a237e',
      '天蓝色': '#87ceeb',

      // Reds
      '红色': '#d32f2f',
      '深红色': '#b71c1c',
      '粉红色': '#e91e63',
      '玫红色': '#c2185b',

      // Greens
      '绿色': '#388e3c',
      '深绿色': '#1b5e20',
      '浅绿色': '#81c784',
      '橄榄绿': '#689f38',

      // Browns
      '棕色': '#795548',
      '深棕色': '#3e2723',
      '浅棕色': '#a1887f',
      '咖啡色': '#5d4037',

      // Others
      '黄色': '#fbc02d',
      '橙色': '#ff9800',
      '紫色': '#7b1fa2',
      '米色': '#f5f5dc',
      '卡其色': '#f0e68c',
      '酒红色': '#880e4f'
    };

    // Try to match by color name
    if (colorMap[colorNo]) {
      return colorMap[colorNo];
    }

    // Fallback: generate a color based on the string hash
    let hash = 0;
    for (let i = 0; i < colorNo.length; i++) {
      hash = colorNo.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 50%)`;
  }

  renderSizeSelection() {
    let sizes = [];
    let selectedSize = null;

    // Use our stored sizes data
    if (this.product.available_sizes && this.product.available_sizes.length > 0) {
      sizes = this.product.available_sizes;
    }

    if (sizes.length === 0) {
      return '';
    }

    return `
      <div class="size-selection">
        <h4>尺码: <span class="selected-size">${selectedSize || '请选择'}</span></h4>
        <div class="size-options">
          ${sizes.map((size, index) => {
            const translatedSize = utils.translateSize(size);
            return `
              <button class="size-option"
                      data-size="${size}"
                      data-index="${index}">
                ${translatedSize}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  selectSize(size, index) {
    // Update selected size
    this.selectedSize = size;

    // Update selected size display
    const selectedSizeSpan = utils.$('.selected-size');
    if (selectedSizeSpan) {
      selectedSizeSpan.textContent = utils.translateSize(size);
    }

    // Update active size option
    const sizeOptions = utils.$$('.size-option');
    sizeOptions.forEach((option) => {
      option.classList.toggle('selected', option.dataset.size === size);
    });

    console.log('Size selected:', size, '(' + utils.translateSize(size) + ')');
  }

  // For now, we'll assume all sizes are available since we don't have detailed SKU data
  // In a production environment, this would check against actual inventory data
  isSizeAvailable(size, colorNo = null) {
    return true;
  }

  renderProductDetails() {
    const attributes = [
      { label: '性别', value: this.product.gender },
      { label: '季节', value: this.product.season },
      { label: '材质', value: this.product.material },
      { label: '销量', value: this.product.sales_count ? utils.formatNumber(this.product.sales_count) : null },
      { label: '评价数', value: this.product.evaluation_count ? utils.formatNumber(this.product.evaluation_count) : null },
      { label: '最后更新', value: this.product.updated_at ? utils.formatDateTime(this.product.updated_at) : null }
    ];

    return `
      <div class="product-attributes">
        ${attributes
          .filter(attr => attr.value)
          .map(attr => `
            <div class="product-attribute">
              <span class="attribute-label">${attr.label}:</span>
              <span class="attribute-value">${attr.value}</span>
            </div>
          `).join('')}
      </div>
    `;
  }

  renderPriceHistorySection() {
    return `
      <div class="price-history-section">
        <div class="chart-container">
          <canvas id="price-chart"></canvas>
        </div>
        ${this.renderPriceHistoryTable()}
      </div>
    `;
  }

  renderProductInfoSection() {
    const officialInfo = this.getOfficialProductInfo();

    return `
      <div class="product-info-section">
        <div class="info-grid">
          <div class="info-item">
            <h4>基本信息</h4>
            ${this.renderProductDetails()}
          </div>

          ${this.product.last_price_change ? `
            <div class="info-item">
              <h4>价格变动信息</h4>
              <div class="price-change-details">
                <div class="product-attribute">
                  <span class="attribute-label">变动时间:</span>
                  <span class="attribute-value">${utils.formatDateTimeWithSeconds(this.product.last_price_change)}</span>
                </div>
                ${this.product.last_change_percentage ? `
                  <div class="product-attribute">
                    <span class="attribute-label">变动幅度:</span>
                    <span class="attribute-value ${this.product.last_change_percentage < 0 ? 'text-success' : 'text-error'}">
                      ${this.product.last_change_percentage > 0 ? '+' : ''}${this.product.last_change_percentage.toFixed(1)}%
                    </span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${officialInfo.description ? `
            <div class="info-item">
              <h4>商品描述</h4>
              <div class="product-description">
                ${officialInfo.description}
              </div>
            </div>
          ` : ''}

          ${officialInfo.material ? `
            <div class="info-item">
              <h4>材质说明</h4>
              <div class="material-description">
                ${officialInfo.material}
              </div>
            </div>
          ` : ''}

          ${officialInfo.features && officialInfo.features.length > 0 ? `
            <div class="info-item">
              <h4>商品特色</h4>
              <div class="product-features">
                <ul>
                  ${officialInfo.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  getOfficialProductInfo() {
    const info = {
      description: null,
      material: null,
      features: []
    };

    if (this.officialData && this.officialData.spu) {
      const spu = this.officialData.spu;

      // Get description
      if (spu.desc && spu.desc.instruction) {
        info.description = this.cleanHtmlContent(spu.desc.instruction);
      }

      // Get material description
      if (spu.desc && spu.desc.materialDescription) {
        info.material = this.cleanHtmlContent(spu.desc.materialDescription);
      }

      // Get product features from summary
      if (spu.summary) {
        if (spu.summary.subtitle) {
          info.features.push(spu.summary.subtitle);
        }
        if (spu.summary.introduce) {
          info.features.push(spu.summary.introduce);
        }
      }
    }

    return info;
  }

  cleanHtmlContent(htmlContent) {
    if (!htmlContent) return '';

    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Remove script tags and other potentially harmful content
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Convert to plain text or keep basic formatting
    return tempDiv.innerHTML;
  }

  renderSizeGuideSection() {
    const officialSizeChart = this.getOfficialSizeChart();

    return `
      <div class="size-guide-section">
        <h4>尺寸指南</h4>
        <p class="text-secondary mb-3">请参考以下尺寸表选择合适的尺码</p>

        ${officialSizeChart ? `
          <div class="official-size-chart">
            <h5>官方尺寸表</h5>
            ${officialSizeChart}
          </div>
        ` : ''}

        ${this.product.available_sizes && this.product.available_sizes.length > 0 ? `
          <div class="size-chart">
            <h5>可选尺码</h5>
            <div class="size-list">
              ${this.product.available_sizes.map(size => `
                <div class="size-item">
                  <span class="size-code">${size}</span>
                  <span class="size-name">${utils.translateSize ? utils.translateSize(size) : size}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="size-tips">
          <h5>选择建议</h5>
          <ul>
            <li>建议根据个人身材和穿着习惯选择合适尺码</li>
            <li>如有疑问，建议选择稍大一号的尺码</li>
            <li>具体尺寸信息请参考官网详细尺寸表</li>
          </ul>
        </div>
      </div>
    `;
  }

  getOfficialSizeChart() {
    if (this.officialData && this.officialData.spu && this.officialData.spu.desc) {
      const desc = this.officialData.spu.desc;

      // Try to get size chart from different fields
      if (desc.sizeChart) {
        return this.cleanHtmlContent(desc.sizeChart);
      }

      if (desc.sizeAndTryOn) {
        return this.cleanHtmlContent(desc.sizeAndTryOn);
      }
    }

    return null;
  }

  initializeTabs() {
    const tabHeaders = utils.$$('.tab-header');
    const tabPanes = utils.$$('.tab-pane');

    tabHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const targetTab = header.dataset.tab;

        // Remove active class from all headers and panes
        tabHeaders.forEach(h => h.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        // Add active class to clicked header and corresponding pane
        header.classList.add('active');
        const targetPane = utils.$(`#${targetTab}`);
        if (targetPane) {
          targetPane.classList.add('active');

          // Re-render chart if price history tab is selected
          if (targetTab === 'price-history') {
            setTimeout(() => this.renderPriceChart(), 100);
          }
        }
      });
    });
  }

  initializeSelections() {
    // Initialize color selection if not already set
    if (!this.selectedColor && this.product.available_colors && this.product.available_colors.length > 0) {
      this.selectedColor = this.product.available_colors[0];
    }
  }

  initializeSelectionEvents() {
    // Add event listeners for color selection
    const colorOptions = utils.$$('.color-option');
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        const colorNo = option.dataset.color;
        const colorText = option.dataset.colorText;
        const index = parseInt(option.dataset.index);
        this.selectColor(colorNo, colorText, index);
      });
    });

    // Add event listeners for size selection
    const sizeOptions = utils.$$('.size-option');
    sizeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const size = option.dataset.size;
        const index = parseInt(option.dataset.index);
        this.selectSize(size, index);
      });
    });

    // Add event listeners for image thumbnails
    const thumbnails = utils.$$('.thumbnail');
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        const imageUrl = thumbnail.dataset.imageUrl;
        const index = parseInt(thumbnail.dataset.index);
        this.switchMainImage(imageUrl, index);
      });
    });
  }

  renderPriceHistoryTable() {
    if (!this.priceHistory || this.priceHistory.length === 0) {
      return '';
    }

    const recentHistory = this.priceHistory.slice(0, 10);

    return `
      <div class="card mt-4">
        <div class="card-header">
          <h3>详细价格记录</h3>
        </div>
        <div class="card-body">
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--divider);">
                  <th style="padding: 12px; text-align: left;">日期</th>
                  <th style="padding: 12px; text-align: right;">当前价格</th>
                  <th style="padding: 12px; text-align: right;">原价</th>
                  <th style="padding: 12px; text-align: right;">变化</th>
                </tr>
              </thead>
              <tbody>
                ${recentHistory.map(item => {
                  const change = item.current_price - item.original_price;
                  const percentage = item.original_price ? (change / item.original_price) * 100 : 0;
                  
                  return `
                    <tr style="border-bottom: 1px solid var(--divider);">
                      <td style="padding: 12px;">${utils.formatDate(item.recorded_at)}</td>
                      <td style="padding: 12px; text-align: right;">${utils.formatPrice(item.current_price)}</td>
                      <td style="padding: 12px; text-align: right;">${utils.formatPrice(item.original_price)}</td>
                      <td style="padding: 12px; text-align: right;">
                        ${change !== 0 ? `
                          <span class="chip ${change < 0 ? 'chip-success' : 'chip-error'}">
                            ${percentage.toFixed(1)}%
                          </span>
                        ` : '-'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderPriceChart() {
    const canvas = utils.$('#price-chart');
    if (!canvas || !this.priceHistory || this.priceHistory.length === 0) {
      if (canvas) {
        canvas.parentElement.innerHTML = `
          <div class="empty-state">
            <p class="text-secondary">暂无价格历史数据</p>
          </div>
        `;
      }
      return;
    }

    // Prepare chart data - use simple labels instead of time scale
    const sortedHistory = [...this.priceHistory].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    const labels = sortedHistory.map(item => utils.formatDate(item.recorded_at));
    const currentPrices = sortedHistory.map(item => item.current_price);
    const originalPrices = sortedHistory.map(item => item.original_price);

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    // Create new chart with simpler configuration
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '当前价格',
            data: currentPrices,
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointBackgroundColor: '#1976d2',
            pointBorderColor: '#1976d2',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: '原价',
            data: originalPrices,
            borderColor: '#dc004e',
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
            pointBackgroundColor: '#dc004e',
            pointBorderColor: '#dc004e',
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '日期'
            },
            ticks: {
              maxTicksLimit: 8
            }
          },
          y: {
            title: {
              display: true,
              text: '价格 (¥)'
            },
            ticks: {
              callback: function(value) {
                return '¥' + Math.round(value);
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ¥' + Math.round(context.parsed.y);
              }
            }
          },
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  }

  createLoadingState() {
    return `
      <div class="product-detail">
        <div class="skeleton skeleton-image" style="height: 400px;"></div>
        <div style="padding: 2rem;">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
          <div class="skeleton skeleton-text" style="width: 40%;"></div>
        </div>
      </div>
    `;
  }

  showErrorState() {
    const container = utils.$('#product-detail-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 class="empty-state-title">加载失败</h2>
          <p class="empty-state-description">无法加载商品详情，请检查网络连接</p>
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="fas fa-refresh"></i>
            重新加载
          </button>
        </div>
      `;
    }
  }
}

// Create global instance
window.productDetailPage = new ProductDetailPage();

// Register route
router.route('/products/:code', (params) => productDetailPage.render(params));
