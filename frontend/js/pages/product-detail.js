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
    this.skuData = null; // 存储SKU详细数据
    this.colorSizeMatrix = {}; // 颜色-尺码可用性矩阵
    this.availableImages = {}; // 不同颜色的图片数据
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
    // 加载官方详细数据，包括SKU信息和库存信息
    try {
      console.log('Loading official data for product:', code);

      // 并行获取官方数据和库存数据
      const [officialData, stockData] = await Promise.allSettled([
        api.getProductOfficialDetail(code),
        api.getProductStock(code)
      ]);

      let result = null;

      if (officialData.status === 'fulfilled' && officialData.value && (officialData.value.spu || officialData.value.images)) {
        console.log('Official data loaded successfully');

        result = {
          spu: officialData.value.spu,
          images: officialData.value.images,
          productCode: officialData.value.productCode,
          officialCode: officialData.value.officialCode,
          colorList: officialData.value.images?.colorList || officialData.value.spu?.colorList,
          summary: officialData.value.spu?.summary,
          rows: officialData.value.spu?.rows
        };

        // 处理SKU数据
        if (officialData.value.spu) {
          this.processSkuData(officialData.value.spu);

          // 如果有colorList，也要处理
          if (officialData.value.spu.colorList) {
            this.officialData = {
              ...this.officialData,
              colorList: officialData.value.spu.colorList
            };
          }
        }
      } else {
        console.warn('No official data available, errors:', officialData.reason);
      }

      // 处理库存数据
      if (stockData.status === 'fulfilled' && stockData.value && stockData.value.stock) {
        console.log('Stock data loaded successfully');
        this.processStockData(stockData.value.stock);

        if (result) {
          result.stock = stockData.value.stock;
        }
      } else {
        console.warn('No stock data available, errors:', stockData.reason);
      }

      return result;

    } catch (error) {
      console.error('Could not load official data:', error);
      return null;
    }
  }

  getMockSkuData(code) {
    // 不再使用模拟数据，直接返回null让系统使用存储的数据
    console.log('Mock SKU data disabled, using stored product data');
    return null;
  }

  processSkuData(skuData) {
    if (!skuData) {
      console.warn('No SKU data provided');
      return;
    }

    // 构建SKU映射表（用于后续与库存数据关联）
    this.skuMapping = {};

    // 处理SKU数据 - 检查不同的数据结构
    let rows = [];
    if (skuData.rows) {
      rows = skuData.rows;
    } else if (Array.isArray(skuData)) {
      rows = skuData;
    }

    if (rows.length === 0) {
      console.warn('No SKU rows found');
      return;
    }

    // 构建SKU映射表，包含所有启用的SKU
    rows.forEach(sku => {
      const colorNo = sku.colorNo;
      const size = sku.size ? sku.size.trim() : sku.size; // 去除尺码字段的空格
      const isEnabled = sku.enabledFlag === 'Y';
      const skuCode = sku.productId || sku.skuCode; // 使用productId作为SKU代码

      if (isEnabled && skuCode && size) {
        if (!this.skuMapping[colorNo]) {
          this.skuMapping[colorNo] = {};
        }
        this.skuMapping[colorNo][size] = skuCode;
      }
    });

    // 处理图片数据
    if (skuData.images) {
      this.availableImages = skuData.images;
    }

    console.log('SKU mapping built:', this.skuMapping);
  }

  processStockData(stockData) {
    if (!stockData || !stockData.skuStocks) {
      console.warn('No stock data provided');
      return;
    }

    // 构建颜色-尺码库存矩阵
    this.colorSizeMatrix = {};

    // 遍历SKU映射表，检查每个SKU的库存
    Object.keys(this.skuMapping).forEach(colorNo => {
      Object.keys(this.skuMapping[colorNo]).forEach(size => {
        const skuCode = this.skuMapping[colorNo][size];
        const stockCount = stockData.skuStocks[skuCode] || 0;
        const hasStock = stockCount > 0;

        if (!this.colorSizeMatrix[colorNo]) {
          this.colorSizeMatrix[colorNo] = {};
        }
        this.colorSizeMatrix[colorNo][size] = hasStock;
      });
    });

    console.log('Color-Size Matrix built with stock data:', this.colorSizeMatrix);
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

    // 优先使用SKU数据中的颜色信息
    if (this.officialData && this.officialData.colorList) {
      colors = this.officialData.colorList.map(color => ({
        styleText: this.parseColorText(color.styleText),
        colorNo: color.colorNo,
        chipPic: color.chipPic
      }));
    } else if (this.officialData && this.officialData.images && this.officialData.images.colorList) {
      colors = this.officialData.images.colorList.map(color => ({
        styleText: this.parseColorText(color.styleText),
        colorNo: color.colorNo,
        chipPic: color.chipPic
      }));
    } else if (this.officialData && this.officialData.spu && this.officialData.spu.colorList) {
      colors = this.officialData.spu.colorList.map(color => ({
        styleText: this.parseColorText(color.styleText),
        colorNo: color.colorNo,
        chipPic: color.chipPic
      }));
    } else if (this.colorSizeMatrix && Object.keys(this.colorSizeMatrix).length > 0) {
      // 从colorSizeMatrix中提取颜色信息
      colors = Object.keys(this.colorSizeMatrix).map(colorNo => ({
        styleText: colorNo, // 简单使用colorNo作为显示文本
        colorNo: colorNo,
        chipPic: null
      }));
    } else if (this.product.available_colors && this.product.available_colors.length > 0) {
      // 回退到存储的颜色数据
      colors = this.product.available_colors.map(color => ({
        styleText: utils.translateColor(color),
        colorNo: color,
        chipPic: null
      }));
    }

    // 过滤掉没有库存的颜色
    if (this.colorSizeMatrix && Object.keys(this.colorSizeMatrix).length > 0) {
      colors = colors.filter(color => this.isColorAvailable(color.colorNo));
    }

    if (colors.length === 0) {
      // 如果没有可用颜色，显示缺货提示
      return `
        <div class="color-selection">
          <h4>颜色选择</h4>
          <div class="out-of-stock-notice">
            <p>😔 很抱歉，该商品目前所有颜色和尺码都已售罄</p>
            <p>请关注补货信息或查看其他商品</p>
          </div>
        </div>
      `;
    }

    // 初始化选中的颜色 - 确保总是有默认选中
    if (colors.length > 0) {
      // 如果当前选中的颜色不在可用颜色列表中，选择第一个可用颜色
      const isCurrentColorAvailable = colors.some(c => c.colorNo === this.selectedColor);
      if (!this.selectedColor || !isCurrentColorAvailable) {
        this.selectedColor = colors[0].colorNo;
        console.log('Default color selected:', this.selectedColor);
      }
    }

    const selectedColorInfo = colors.find(c => c.colorNo === this.selectedColor) || colors[0];

    return `
      <div class="color-selection">
        <h4>颜色: <span class="selected-color">${selectedColorInfo ? selectedColorInfo.styleText : '未选择'}</span></h4>
        <div class="color-options">
          ${colors.map((color, index) => {
            const isAvailable = this.isColorAvailable(color.colorNo);
            return `
              <div class="color-option ${color.colorNo === this.selectedColor ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}"
                   data-color="${color.colorNo}"
                   data-color-text="${color.styleText}"
                   data-index="${index}"
                   ${!isAvailable ? 'title="该颜色暂无库存"' : ''}>
                ${color.chipPic ? `
                  <div class="color-chip">
                    <img src="https://www.uniqlo.cn${color.chipPic}" alt="${color.styleText}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="color-swatch" style="background-color: ${this.getColorCode(color.styleText)}; display: none;"></div>
                  </div>
                ` : `
                  <div class="color-swatch" style="background-color: ${this.getColorCode(color.styleText)};"></div>
                `}
                <span class="color-name">${color.styleText}</span>
                ${!isAvailable ? '<span class="unavailable-badge">缺货</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  parseColorText(styleText) {
    // 解析颜色文本，例如 "00 白色" -> "白色"
    if (!styleText) return '';

    const match = styleText.match(/^\d+\s+(.+)$/);
    return match ? match[1] : styleText;
  }

  isColorAvailable(colorNo) {
    // 检查颜色是否有任何可用的尺码
    if (!this.colorSizeMatrix || !this.colorSizeMatrix[colorNo]) {
      return true; // 如果没有SKU数据，默认可用
    }

    const sizes = this.colorSizeMatrix[colorNo];
    return Object.values(sizes).some(available => available);
  }

  selectColor(colorNo, colorText, index) {
    // 检查颜色是否可用
    if (!this.isColorAvailable(colorNo)) {
      console.warn('Color not available:', colorNo);
      return;
    }

    // 更新选中的颜色
    this.selectedColor = colorNo;

    // 更新颜色显示
    const selectedColorSpan = utils.$('.selected-color');
    if (selectedColorSpan) {
      selectedColorSpan.textContent = colorText;
    }

    // 更新颜色选项的选中状态
    const colorOptions = utils.$$('.color-option');
    colorOptions.forEach((option) => {
      option.classList.toggle('selected', option.dataset.color === colorNo);
    });

    // 更新尺码选择的可用性
    this.updateSizeAvailability();

    // 更新商品图片（如果有不同颜色的图片）
    this.updateProductImages(colorNo);

    // 如果当前选中的尺码在新颜色下不可用，清除尺码选择
    if (this.selectedSize && !this.isSizeAvailableForColor(this.selectedSize, colorNo)) {
      this.clearSizeSelection();
    }

    console.log('Color selected:', colorNo, colorText);
  }

  updateProductImages(colorNo) {
    // 根据选中的颜色更新商品图片
    // 这里可以实现根据颜色切换不同的商品图片
    console.log('Updating images for color:', colorNo);
  }

  clearSizeSelection() {
    this.selectedSize = null;

    const selectedSizeSpan = utils.$('.selected-size');
    if (selectedSizeSpan) {
      selectedSizeSpan.textContent = '请选择';
    }

    const sizeOptions = utils.$$('.size-option');
    sizeOptions.forEach(option => {
      option.classList.remove('selected');
    });
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

    // 优先使用SKU数据中的尺码信息
    if (this.officialData && this.officialData.summary && this.officialData.summary.sizeList) {
      sizes = this.officialData.summary.sizeList.map(sizeText => {
        // 尝试从 "165/84A/S" 中提取 "S"，如果没有标准尺码则使用原始文本
        const match = sizeText.match(/\/([^\/]+)$/);
        if (match && match[1] && ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'].includes(match[1])) {
          return match[1]; // 返回标准尺码
        } else {
          return sizeText; // 返回详细尺寸规格，如 "160/70A"
        }
      });
    } else if (this.product.available_sizes && this.product.available_sizes.length > 0) {
      sizes = this.product.available_sizes;
    }

    // 过滤出有库存的尺码
    if (this.colorSizeMatrix && this.selectedColor) {
      const availableSizes = sizes.filter(size =>
        this.isSizeAvailableForColor(size, this.selectedColor)
      );

      if (availableSizes.length === 0) {
        return `
          <div class="size-selection">
            <h4>尺码选择</h4>
            <div class="out-of-stock-notice">
              <p>😔 很抱歉，该颜色下所有尺码都已售罄</p>
              <p>请尝试选择其他颜色</p>
            </div>
          </div>
        `;
      }

      sizes = availableSizes;
    }

    if (sizes.length === 0) {
      return `
        <div class="size-selection">
          <h4>尺码选择</h4>
          <div class="out-of-stock-notice">
            <p>😔 很抱歉，该商品目前所有尺码都已售罄</p>
            <p>请关注补货信息或查看其他商品</p>
          </div>
        </div>
      `;
    }

    // 去重并排序
    sizes = [...new Set(sizes)];
    sizes = this.sortSizes(sizes);

    return `
      <div class="size-selection">
        <h4>尺码: <span class="selected-size">${this.selectedSize ? this.getReadableSizeText(this.selectedSize) : '请选择'}</span></h4>
        <div class="size-options">
          ${sizes.map((size, index) => {
            const isAvailable = this.isSizeAvailableForColor(size, this.selectedColor);
            const readableSize = this.getReadableSizeText(size);
            const detailedSize = this.getDetailedSizeText(size);

            return `
              <button class="size-option ${size === this.selectedSize ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}"
                      data-size="${size}"
                      data-index="${index}"
                      ${!isAvailable ? 'disabled title="该尺码暂无库存"' : ''}
                      ${detailedSize ? `title="${detailedSize}"` : ''}>
                <span class="size-label">${readableSize}</span>
                ${detailedSize && detailedSize !== readableSize ? `<span class="size-detail">${detailedSize}</span>` : ''}
                ${!isAvailable ? '<span class="unavailable-badge">缺货</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>
        ${this.renderSizeGuide()}
      </div>
    `;
  }

  sortSizes(sizes) {
    // 按照常见的尺码顺序排序
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

    return sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) {
        // 两个都是标准尺码
        return indexA - indexB;
      } else if (indexA !== -1) {
        // a是标准尺码，b不是
        return -1;
      } else if (indexB !== -1) {
        // b是标准尺码，a不是
        return 1;
      } else {
        // 两个都不是标准尺码，按照详细尺寸规格排序
        // 尝试提取数字进行排序（如 "160/70A" -> 160）
        const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');

        if (numA !== numB) {
          return numA - numB;
        } else {
          // 如果数字相同，按字符串排序
          return a.localeCompare(b);
        }
      }
    });
  }

  getReadableSizeText(size) {
    // 获取可读的尺码文本
    const translations = utils.getSizeTranslations();
    return translations[size] || size;
  }

  getDetailedSizeText(size) {
    // 从SKU数据中获取详细的尺码信息，如 "165/84A/S"
    if (!this.officialData || !this.officialData.rows) return null;

    const sku = this.officialData.rows.find(row => row.size === size);
    return sku ? sku.sizeText : null;
  }

  isSizeAvailableForColor(size, colorNo) {
    // 检查特定颜色下的尺码是否可用
    if (!colorNo || !this.colorSizeMatrix[colorNo]) {
      return true; // 如果没有颜色选择或SKU数据，默认可用
    }

    return this.colorSizeMatrix[colorNo][size] === true;
  }

  updateSizeAvailability() {
    // 更新尺码选项的可用性状态
    const sizeOptions = utils.$$('.size-option');
    sizeOptions.forEach(option => {
      const size = option.dataset.size;
      const isAvailable = this.isSizeAvailableForColor(size, this.selectedColor);

      option.classList.toggle('disabled', !isAvailable);
      option.disabled = !isAvailable;

      if (!isAvailable) {
        option.title = '该尺码暂无库存';
      } else {
        const detailedSize = this.getDetailedSizeText(size);
        option.title = detailedSize || '';
      }
    });
  }

  renderSizeGuide() {
    return `
      <div class="size-guide-hint">
        <button type="button" class="size-guide-btn" onclick="productDetailPage.showSizeGuide()">
          <i class="fas fa-ruler"></i>
          尺码指南
        </button>
      </div>
    `;
  }

  selectSize(size, index) {
    // 检查尺码是否可用
    if (!this.isSizeAvailableForColor(size, this.selectedColor)) {
      console.warn('Size not available for selected color:', size, this.selectedColor);
      return;
    }

    // 更新选中的尺码
    this.selectedSize = size;

    // 更新尺码显示
    const selectedSizeSpan = utils.$('.selected-size');
    if (selectedSizeSpan) {
      selectedSizeSpan.textContent = this.getReadableSizeText(size);
    }

    // 更新尺码选项的选中状态
    const sizeOptions = utils.$$('.size-option');
    sizeOptions.forEach((option) => {
      option.classList.toggle('selected', option.dataset.size === size);
    });

    // 更新颜色选择的可用性（某些颜色可能在特定尺码下不可用）
    this.updateColorAvailability();

    console.log('Size selected:', size, '(' + this.getReadableSizeText(size) + ')');
  }

  updateColorAvailability() {
    // 更新颜色选项的可用性状态
    const colorOptions = utils.$$('.color-option');
    colorOptions.forEach(option => {
      const colorNo = option.dataset.color;
      const isAvailable = this.selectedSize ?
        this.isSizeAvailableForColor(this.selectedSize, colorNo) :
        this.isColorAvailable(colorNo);

      option.classList.toggle('disabled', !isAvailable);

      if (!isAvailable) {
        option.title = this.selectedSize ?
          `该颜色在尺码${this.getReadableSizeText(this.selectedSize)}下暂无库存` :
          '该颜色暂无库存';
      } else {
        option.title = '';
      }
    });
  }

  showSizeGuide() {
    // 显示尺码指南弹窗
    const modal = document.createElement('div');
    modal.className = 'size-guide-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>尺码指南</h3>
          <button class="modal-close" onclick="this.closest('.size-guide-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          ${this.renderDetailedSizeGuide()}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 添加样式
    if (!document.querySelector('#size-guide-styles')) {
      const styles = document.createElement('style');
      styles.id = 'size-guide-styles';
      styles.textContent = `
        .size-guide-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
          position: relative;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--divider);
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .modal-body {
          padding: 1.5rem;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  renderDetailedSizeGuide() {
    let sizeGuideContent = '';

    // 如果有SKU数据，显示详细的尺码对照表
    if (this.officialData && this.officialData.summary && this.officialData.summary.sizeList) {
      sizeGuideContent += `
        <div class="size-chart-table">
          <h4>尺码对照表</h4>
          <table class="size-table">
            <thead>
              <tr>
                <th>尺码</th>
                <th>详细规格</th>
                <th>适合身高/体重</th>
              </tr>
            </thead>
            <tbody>
              ${this.officialData.summary.sizeList.map(sizeText => {
                const match = sizeText.match(/^(\d+)\/(\d+)([A-C])\/(.+)$/);
                if (match) {
                  const [, height, chest, type, size] = match;
                  return `
                    <tr>
                      <td><strong>${size}</strong></td>
                      <td>${sizeText}</td>
                      <td>身高 ${height}cm / 胸围 ${chest}cm</td>
                    </tr>
                  `;
                } else {
                  return `
                    <tr>
                      <td><strong>${sizeText}</strong></td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  `;
                }
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 添加通用尺码建议
    sizeGuideContent += `
      <div class="size-recommendations">
        <h4>选择建议</h4>
        <div class="recommendation-grid">
          <div class="recommendation-item">
            <h5>🏃‍♂️ 运动休闲</h5>
            <p>建议选择稍大一号，确保活动自如</p>
          </div>
          <div class="recommendation-item">
            <h5>👔 正式场合</h5>
            <p>选择合身尺码，展现良好形象</p>
          </div>
          <div class="recommendation-item">
            <h5>🏠 居家舒适</h5>
            <p>可选择大一号，增加舒适度</p>
          </div>
          <div class="recommendation-item">
            <h5>❓ 不确定时</h5>
            <p>建议选择稍大的尺码，避免过紧</p>
          </div>
        </div>
      </div>

      <div class="size-tips">
        <h4>测量方法</h4>
        <ul>
          <li><strong>胸围：</strong>在胸部最丰满处水平测量一周</li>
          <li><strong>腰围：</strong>在腰部最细处水平测量一周</li>
          <li><strong>臀围：</strong>在臀部最丰满处水平测量一周</li>
          <li><strong>身高：</strong>不穿鞋，背靠墙壁直立测量</li>
        </ul>

        <div class="size-note">
          <p><strong>注意：</strong>不同款式的版型可能有所差异，建议参考具体商品的尺寸表。如有疑问，建议选择稍大一号的尺码。</p>
        </div>
      </div>
    `;

    return sizeGuideContent;
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
    // 颜色选择事件
    const colorOptions = utils.$$('.color-option');
    colorOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        // 防止点击禁用的选项
        if (option.classList.contains('disabled')) {
          e.preventDefault();
          return;
        }

        const colorNo = option.dataset.color;
        const colorText = option.dataset.colorText;
        const index = parseInt(option.dataset.index);
        this.selectColor(colorNo, colorText, index);
      });
    });

    // 尺码选择事件
    const sizeOptions = utils.$$('.size-option');
    sizeOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        // 防止点击禁用的选项
        if (option.disabled || option.classList.contains('disabled')) {
          e.preventDefault();
          return;
        }

        const size = option.dataset.size;
        const index = parseInt(option.dataset.index);
        this.selectSize(size, index);
      });
    });

    // 图片缩略图事件
    const thumbnails = utils.$$('.thumbnail');
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        const imageUrl = thumbnail.dataset.imageUrl;
        const index = parseInt(thumbnail.dataset.index);
        this.switchMainImage(imageUrl, index);
      });
    });

    // 键盘导航支持
    document.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('color-option') || e.target.classList.contains('size-option')) {
        this.handleKeyboardNavigation(e);
      }
    });
  }

  handleKeyboardNavigation(e) {
    const isColorOption = e.target.classList.contains('color-option');
    const isSizeOption = e.target.classList.contains('size-option');

    if (!isColorOption && !isSizeOption) return;

    const options = isColorOption ? utils.$$('.color-option') : utils.$$('.size-option');
    const currentIndex = Array.from(options).indexOf(e.target);

    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.target.click();
        return;
    }

    // 跳过禁用的选项
    while (options[nextIndex] && (options[nextIndex].disabled || options[nextIndex].classList.contains('disabled'))) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = nextIndex > 0 ? nextIndex - 1 : options.length - 1;
      } else {
        nextIndex = nextIndex < options.length - 1 ? nextIndex + 1 : 0;
      }

      // 防止无限循环
      if (nextIndex === currentIndex) break;
    }

    if (options[nextIndex] && !options[nextIndex].disabled && !options[nextIndex].classList.contains('disabled')) {
      options[nextIndex].focus();
    }
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
