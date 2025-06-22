// Products Page

class ProductsPage {
  constructor() {
    this.products = [];
    this.pagination = {};

    // 从localStorage恢复筛选器状态
    this.filters = this.loadFiltersFromStorage();

    this.viewMode = utils.storage.get('products_view_mode', 'grid');
    this.loading = false;
    this.advancedFilters = null;

    // Debounced search function
    this.debouncedSearch = utils.debounce(() => {
      this.filters.page = 1;
      this.saveFiltersToStorage();
      this.loadProducts();
    }, 500);
  }

  // 从localStorage加载筛选器状态
  loadFiltersFromStorage() {
    const defaultFilters = {
      page: 1,
      limit: 20,
      sortBy: 'updated_at',
      sortOrder: 'desc',
      search: '',
      stockStatus: '',
      priceRange: '',
      priceLevel: '',
      colors: [],
      sizes: [],
      gender: '',
      season: []
    };

    const savedFilters = utils.storage.get('products_filters', defaultFilters);

    // 确保页码重置为1（避免刷新后显示空页面）
    return {
      ...savedFilters,
      page: 1
    };
  }

  // 保存筛选器状态到localStorage
  saveFiltersToStorage() {
    utils.storage.set('products_filters', this.filters);
  }

  // 恢复筛选器UI状态
  restoreFilterUI() {
    // 恢复搜索框
    const searchInput = utils.$('#search-input');
    if (searchInput) {
      searchInput.value = this.filters.search || '';
    }

    // 恢复排序选择
    const sortSelect = utils.$('#sort-select');
    if (sortSelect) {
      sortSelect.value = `${this.filters.sortBy}:${this.filters.sortOrder}`;
    }

    // 恢复库存筛选
    const stockSelect = utils.$('#stock-select');
    if (stockSelect) {
      stockSelect.value = this.filters.stockStatus || '';
    }

    // 恢复价格筛选
    utils.$$('input[name="price"]').forEach(input => {
      input.checked = input.value === this.filters.priceRange;
    });

    // 恢复降价档数筛选
    utils.$$('input[name="price-level"]').forEach(input => {
      input.checked = input.value === this.filters.priceLevel;
    });

    // 恢复性别筛选
    utils.$$('input[name="gender"]').forEach(input => {
      input.checked = input.value === this.filters.gender;
    });

    // 恢复颜色筛选
    utils.$$('#color-content input[type="checkbox"]').forEach(input => {
      input.checked = this.filters.colors.includes(input.value);
    });

    // 恢复尺码筛选
    utils.$$('#size-content input[type="checkbox"]').forEach(input => {
      input.checked = this.filters.sizes.includes(input.value);
    });

    // 更新筛选器标签
    this.updateFilterLabels();
  }

  async initializeAdvancedFilters() {
    // No longer needed - using inline filters
  }



  bindFilterDropdowns() {
    // 绑定下拉菜单切换事件
    const dropdowns = ['gender', 'price', 'price-level', 'color', 'size'];

    dropdowns.forEach(type => {
      const btn = utils.$(`#${type}-btn`);
      const content = utils.$(`#${type}-content`);

      if (btn && content) {
        utils.on(btn, 'click', (e) => {
          e.stopPropagation();

          // 关闭其他下拉菜单
          dropdowns.forEach(otherType => {
            if (otherType !== type) {
              const otherContent = utils.$(`#${otherType}-content`);
              const otherBtn = utils.$(`#${otherType}-btn`);
              if (otherContent && otherBtn) {
                otherContent.style.display = 'none';
                otherBtn.classList.remove('active');
              }
            }
          });

          // 切换当前下拉菜单
          const isVisible = content.style.display === 'block';
          content.style.display = isVisible ? 'none' : 'block';
          btn.classList.toggle('active', !isVisible);
        });
      }
    });

    // 点击页面其他地方关闭下拉菜单
    utils.on(document, 'click', () => {
      dropdowns.forEach(type => {
        const content = utils.$(`#${type}-content`);
        const btn = utils.$(`#${type}-btn`);
        if (content && btn) {
          content.style.display = 'none';
          btn.classList.remove('active');
        }
      });
    });
  }

  bindFilterOptions() {
    // 价格筛选
    utils.delegate(document, 'input[name="price"]', 'change', (e) => {
      this.filters.priceRange = e.target.value;
      this.filters.page = 1;
      this.saveFiltersToStorage();
      this.updateFilterLabels();
      this.loadProducts();
    });

    // 降价档数筛选
    utils.delegate(document, 'input[name="price-level"]', 'change', (e) => {
      this.filters.priceLevel = e.target.value;
      this.filters.page = 1;
      this.saveFiltersToStorage();
      this.updateFilterLabels();
      this.loadProducts();
    });

    // 性别筛选（改为单选）
    utils.delegate(document, 'input[name="gender"]', 'change', (e) => {
      this.filters.gender = e.target.value;
      this.filters.page = 1;
      this.saveFiltersToStorage();
      this.updateFilterLabels();
      this.loadProducts();
    });

    // 颜色筛选
    utils.delegate(document, '#color-content input[type="checkbox"]', 'change', () => {
      const colorCheckboxes = utils.$$('#color-content input[type="checkbox"]:checked');
      this.filters.colors = Array.from(colorCheckboxes).map(cb => cb.value).join(',').split(',').filter(Boolean);
      this.filters.page = 1;
      this.saveFiltersToStorage();
      this.updateFilterLabels();
      this.loadProducts();
    });

    // 尺码筛选
    utils.delegate(document, '#size-content input[type="checkbox"]', 'change', () => {
      const sizeCheckboxes = utils.$$('#size-content input[type="checkbox"]:checked');
      this.filters.sizes = Array.from(sizeCheckboxes).map(cb => cb.value).join(',').split(',').filter(Boolean);
      this.filters.page = 1;
      this.saveFiltersToStorage();
      this.updateFilterLabels();
      this.loadProducts();
    });
  }

  updateFilterLabels() {
    // 更新性别标签
    const genderBtn = utils.$('#gender-btn .filter-label');
    if (genderBtn) {
      genderBtn.textContent = this.filters.gender ? '性别 (1)' : '性别';
    }

    // 更新价格标签
    const priceBtn = utils.$('#price-btn .filter-label');
    if (priceBtn) {
      priceBtn.textContent = this.filters.priceRange ? '价格 (1)' : '价格';
    }

    // 更新降价档数标签
    const priceLevelBtn = utils.$('#price-level-btn .filter-label');
    if (priceLevelBtn) {
      priceLevelBtn.textContent = this.filters.priceLevel ? '降价档数 (1)' : '降价档数';
    }

    // 更新颜色标签
    const colorBtn = utils.$('#color-btn .filter-label');
    const colorCheckboxes = utils.$$('#color-content input[type="checkbox"]:checked');
    const colorCount = colorCheckboxes.length;
    if (colorBtn) {
      colorBtn.textContent = colorCount > 0 ? `颜色 (${colorCount})` : '颜色';
    }

    // 更新尺码标签
    const sizeBtn = utils.$('#size-btn .filter-label');
    const sizeCheckboxes = utils.$$('#size-content input[type="checkbox"]:checked');
    const sizeCount = sizeCheckboxes.length;
    if (sizeBtn) {
      sizeBtn.textContent = sizeCount > 0 ? `尺码 (${sizeCount})` : '尺码';
    }
  }

  async render() {
    router.setTitle('商品列表');
    
    const html = `
      <div class="page-header">
        <h1 class="page-title">商品列表</h1>
        <p class="page-subtitle">浏览所有追踪的优衣库商品</p>
      </div>

      <!-- Search and Filters -->
      <div class="products-header">
        <div class="search-bar">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="search-input" 
            placeholder="搜索商品名称或编号..."
            value="${this.filters.search}"
            id="search-input"
          >
        </div>
        
        <div class="filters">
          <div class="filter-row">
            <!-- 排序方式 -->
            <div class="filter-group">
              <label for="sort-select">排序方式</label>
              <select id="sort-select">
                <option value="updated_at:desc" ${this.filters.sortBy === 'updated_at' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>最近更新</option>
                <option value="current_price:asc" ${this.filters.sortBy === 'current_price' && this.filters.sortOrder === 'asc' ? 'selected' : ''}>价格从低到高</option>
                <option value="current_price:desc" ${this.filters.sortBy === 'current_price' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>价格从高到低</option>
                <option value="last_price_change:desc" ${this.filters.sortBy === 'last_price_change' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>价格更新时间</option>
                <option value="discount_percentage:desc" ${this.filters.sortBy === 'discount_percentage' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>折扣力度</option>
                <option value="name_zh:asc" ${this.filters.sortBy === 'name_zh' && this.filters.sortOrder === 'asc' ? 'selected' : ''}>名称A-Z</option>
                <option value="sales_count:desc" ${this.filters.sortBy === 'sales_count' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>销量最高</option>
                <option value="created_at:desc" ${this.filters.sortBy === 'created_at' && this.filters.sortOrder === 'desc' ? 'selected' : ''}>最新上架</option>
              </select>
            </div>

            <!-- 商品状态筛选 -->
            <div class="filter-group">
              <label for="stock-select">库存状态</label>
              <select id="stock-select">
                <option value="" ${this.filters.stockStatus === '' ? 'selected' : ''}>仅有库存</option>
                <option value="out_of_stock" ${this.filters.stockStatus === 'out_of_stock' ? 'selected' : ''}>仅无库存</option>
                <option value="all" ${this.filters.stockStatus === 'all' ? 'selected' : ''}>显示全部</option>
                <option value="inactive" ${this.filters.stockStatus === 'inactive' ? 'selected' : ''}>仅非活跃</option>
              </select>
            </div>

            <!-- 性别筛选 -->
            <div class="filter-dropdown" id="gender-dropdown">
              <button class="filter-dropdown-btn" id="gender-btn">
                <span class="filter-label">性别</span>
                <i class="fas fa-chevron-down"></i>
              </button>
              <div class="filter-dropdown-content" id="gender-content">
                <div class="filter-options">
                  <label class="filter-option">
                    <input type="radio" name="gender" value="" ${this.filters.gender === '' ? 'checked' : ''}>
                    <span>全部</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="gender" value="男装" ${this.filters.gender === '男装' ? 'checked' : ''}>
                    <span>男装</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="gender" value="女装" ${this.filters.gender === '女装' ? 'checked' : ''}>
                    <span>女装</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="gender" value="童装" ${this.filters.gender === '童装' ? 'checked' : ''}>
                    <span>童装</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="gender" value="男女同款" ${this.filters.gender === '男女同款' ? 'checked' : ''}>
                    <span>男女同款</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 价格筛选 -->
            <div class="filter-dropdown" id="price-dropdown">
              <button class="filter-dropdown-btn" id="price-btn">
                <span class="filter-label">价格</span>
                <i class="fas fa-chevron-down"></i>
              </button>
              <div class="filter-dropdown-content" id="price-content">
                <div class="filter-options">
                  <label class="filter-option">
                    <input type="radio" name="price" value="" ${this.filters.priceRange === '' ? 'checked' : ''}>
                    <span>全部</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price" value="0-50" ${this.filters.priceRange === '0-50' ? 'checked' : ''}>
                    <span>¥0 - ¥50</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price" value="50-100" ${this.filters.priceRange === '50-100' ? 'checked' : ''}>
                    <span>¥50 - ¥100</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price" value="100-200" ${this.filters.priceRange === '100-200' ? 'checked' : ''}>
                    <span>¥100 - ¥200</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price" value="200-300" ${this.filters.priceRange === '200-300' ? 'checked' : ''}>
                    <span>¥200 - ¥300</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price" value="300-500" ${this.filters.priceRange === '300-500' ? 'checked' : ''}>
                    <span>¥300 - ¥500</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price" value="500+" ${this.filters.priceRange === '500+' ? 'checked' : ''}>
                    <span>¥500以上</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 降价档数筛选 -->
            <div class="filter-dropdown" id="price-level-dropdown">
              <button class="filter-dropdown-btn" id="price-level-btn">
                <span class="filter-label">降价档数</span>
                <i class="fas fa-chevron-down"></i>
              </button>
              <div class="filter-dropdown-content" id="price-level-content">
                <div class="filter-options">
                  <label class="filter-option">
                    <input type="radio" name="price-level" value="" ${this.filters.priceLevel === '' ? 'checked' : ''}>
                    <span>全部</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price-level" value="0" ${this.filters.priceLevel === '0' ? 'checked' : ''}>
                    <span>未降价</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price-level" value="1" ${this.filters.priceLevel === '1' ? 'checked' : ''}>
                    <span>第一档 (20-29%)</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price-level" value="2" ${this.filters.priceLevel === '2' ? 'checked' : ''}>
                    <span>第二档 (30-34%)</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price-level" value="3" ${this.filters.priceLevel === '3' ? 'checked' : ''}>
                    <span>第三档 (35-39%)</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price-level" value="4" ${this.filters.priceLevel === '4' ? 'checked' : ''}>
                    <span>第四档 (40-44%)</span>
                  </label>
                  <label class="filter-option">
                    <input type="radio" name="price-level" value="5" ${this.filters.priceLevel === '5' ? 'checked' : ''}>
                    <span>第五档 (45%+)</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 颜色筛选 -->
            <div class="filter-dropdown" id="color-dropdown">
              <button class="filter-dropdown-btn" id="color-btn">
                <span class="filter-label">颜色</span>
                <i class="fas fa-chevron-down"></i>
              </button>
              <div class="filter-dropdown-content" id="color-content">
                <div class="filter-options color-grid">
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL00,COL01,COL02,COL03,COL04" ${this.filters.colors.some(c => 'COL00,COL01,COL02,COL03,COL04'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #FFFFFF; border: 2px solid #999; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);"></span>
                    <span class="color-name">白色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL07,COL08" ${this.filters.colors.some(c => 'COL07,COL08'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #808080;"></span>
                    <span class="color-name">灰色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL09" ${this.filters.colors.includes('COL09') ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #000000;"></span>
                    <span class="color-name">黑色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL10,COL11,COL12" ${this.filters.colors.some(c => 'COL10,COL11,COL12'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #FFB6C1;"></span>
                    <span class="color-name">粉色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL13,COL14,COL15,COL16" ${this.filters.colors.some(c => 'COL13,COL14,COL15,COL16'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #FF0000;"></span>
                    <span class="color-name">红色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL18,COL19,COL20,COL25,COL26,COL27" ${this.filters.colors.some(c => 'COL18,COL19,COL20,COL25,COL26,COL27'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #FFA500;"></span>
                    <span class="color-name">橙色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL33,COL34,COL35,COL36,COL37" ${this.filters.colors.some(c => 'COL33,COL34,COL35,COL36,COL37'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #0000FF;"></span>
                    <span class="color-name">蓝色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL21,COL22,COL23,COL24" ${this.filters.colors.some(c => 'COL21,COL22,COL23,COL24'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #FFD700; border: 2px solid #999;"></span>
                    <span class="color-name">黄色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL28,COL29,COL30,COL31,COL32" ${this.filters.colors.some(c => 'COL28,COL29,COL30,COL31,COL32'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #008000;"></span>
                    <span class="color-name">绿色系</span>
                  </label>
                  <label class="color-filter-option">
                    <input type="checkbox" value="COL38,COL39,COL40,COL41" ${this.filters.colors.some(c => 'COL38,COL39,COL40,COL41'.includes(c)) ? 'checked' : ''}>
                    <span class="color-swatch" style="background-color: #800080;"></span>
                    <span class="color-name">紫色系</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 尺码筛选 -->
            <div class="filter-dropdown" id="size-dropdown">
              <button class="filter-dropdown-btn" id="size-btn">
                <span class="filter-label">尺码</span>
                <i class="fas fa-chevron-down"></i>
              </button>
              <div class="filter-dropdown-content" id="size-content">
                <div class="filter-options size-grid">
                  <label class="filter-option">
                    <input type="checkbox" value="SIZ999,MSC025" ${this.filters.sizes.some(s => 'SIZ999,MSC025'.includes(s)) ? 'checked' : ''}>
                    <span>均码</span>
                  </label>
                  <label class="filter-option">
                    <input type="checkbox" value="SMA002" ${this.filters.sizes.includes('SMA002') ? 'checked' : ''}>
                    <span>XS</span>
                  </label>
                  <label class="filter-option">
                    <input type="checkbox" value="SMA003" ${this.filters.sizes.includes('SMA003') ? 'checked' : ''}>
                    <span>S</span>
                  </label>
                  <label class="filter-option">
                    <input type="checkbox" value="SMA004" ${this.filters.sizes.includes('SMA004') ? 'checked' : ''}>
                    <span>M</span>
                  </label>
                  <label class="filter-option">
                    <input type="checkbox" value="SMA005" ${this.filters.sizes.includes('SMA005') ? 'checked' : ''}>
                    <span>L</span>
                  </label>
                  <label class="filter-option">
                    <input type="checkbox" value="SMA006" ${this.filters.sizes.includes('SMA006') ? 'checked' : ''}>
                    <span>XL</span>
                  </label>
                  <label class="filter-option">
                    <input type="checkbox" value="SMA007" ${this.filters.sizes.includes('SMA007') ? 'checked' : ''}>
                    <span>XXL</span>
                  </label>
                  <label class="filter-option">
                    <input type="checkbox" value="SMA008" ${this.filters.sizes.includes('SMA008') ? 'checked' : ''}>
                    <span>3XL</span>
                  </label>
                </div>
              </div>
            </div>

            <button class="btn btn-secondary" id="reset-filters">
              <i class="fas fa-undo"></i>
              重置筛选
            </button>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="products-controls">
        <div class="results-count" id="results-count">
          正在加载...
        </div>
        
        <div class="view-controls">
          <span class="text-sm text-secondary">视图:</span>
          <div class="view-toggle">
            <button class="view-btn ${this.viewMode === 'grid' ? 'active' : ''}" data-view="grid">
              <i class="fas fa-th"></i>
            </button>
            <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">
              <i class="fas fa-list"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Products Container -->
      <div id="products-container">
        ${this.createLoadingState()}
      </div>

      <!-- Pagination -->
      <div id="pagination-container"></div>
    `;

    router.setContent(html);
    await this.initializeAdvancedFilters();
    this.bindEvents();

    // 恢复筛选器UI状态（在DOM渲染完成后）
    setTimeout(() => {
      this.restoreFilterUI();
    }, 0);

    await this.loadProducts();
  }

  bindEvents() {
    // Search input
    const searchInput = utils.$('#search-input');
    if (searchInput) {
      utils.on(searchInput, 'input', (e) => {
        this.filters.search = e.target.value;
        this.debouncedSearch();
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
        this.saveFiltersToStorage();
        this.loadProducts();
      });
    }

    // Stock filter
    const stockSelect = utils.$('#stock-select');
    if (stockSelect) {
      utils.on(stockSelect, 'change', (e) => {
        this.filters.stockStatus = e.target.value;
        this.filters.page = 1;
        this.saveFiltersToStorage();
        this.loadProducts();
      });
    }

    // Price filter
    const priceSelect = utils.$('#price-select');
    if (priceSelect) {
      utils.on(priceSelect, 'change', (e) => {
        this.filters.priceRange = e.target.value;
        this.filters.page = 1;
        this.saveFiltersToStorage();
        this.loadProducts();
      });
    }

    // Reset filters
    const resetBtn = utils.$('#reset-filters');
    if (resetBtn) {
      utils.on(resetBtn, 'click', () => {
        this.resetFilters();
      });
    }

    // Filter dropdown toggles
    this.bindFilterDropdowns();

    // Filter option changes
    this.bindFilterOptions();

    // View toggle
    utils.delegate(document, '.view-btn', 'click', (e) => {
      const view = e.target.closest('.view-btn').dataset.view;
      this.setViewMode(view);
    });

    // Product clicks
    utils.delegate(document, '[data-product-code]', 'click', (e) => {
      const productCode = e.target.closest('[data-product-code]').dataset.productCode;
      router.navigate(`/products/${productCode}`);
    });
  }

  async loadProducts() {
    if (this.loading) return;
    
    try {
      this.loading = true;
      this.showLoadingState();

      const params = { ...this.filters };

      // Handle price range
      if (params.priceRange) {
        if (params.priceRange === '1000+' || params.priceRange === '900+') {
          params.minPrice = params.priceRange === '1000+' ? 1000 : 900;
        } else {
          const [min, max] = params.priceRange.split('-').map(Number);
          params.minPrice = min;
          if (max) params.maxPrice = max;
        }
        delete params.priceRange;
      }

      // Handle color filters
      if (params.colors && params.colors.length > 0) {
        params.colors = params.colors.join(',');
      } else {
        delete params.colors;
      }

      // Handle size filters
      if (params.sizes && params.sizes.length > 0) {
        params.sizes = params.sizes.join(',');
      } else {
        delete params.sizes;
      }

      // Handle gender filters
      if (!params.gender) {
        delete params.gender;
      }

      // Handle price level filters
      if (!params.priceLevel) {
        delete params.priceLevel;
      }

      // Handle season filters
      if (params.season && params.season.length > 0) {
        params.season = params.season.join(',');
      } else {
        delete params.season;
      }

      // Handle stock status
      if (params.stockStatus) {
        params.inStock = params.stockStatus;
      }
      delete params.stockStatus;

      const data = await api.getProducts(params);
      
      this.products = data.products || [];
      this.pagination = data.pagination || {};
      
      this.renderProducts();
      this.renderPagination();
      this.updateResultsCount();

    } catch (error) {
      utils.handleError(error, 'loading products');
      this.showErrorState();
    } finally {
      this.loading = false;
    }
  }

  renderProducts() {
    const container = utils.$('#products-container');
    if (!container) return;

    if (this.products.length === 0) {
      container.innerHTML = this.createEmptyState();
      return;
    }

    if (this.viewMode === 'grid') {
      container.innerHTML = `
        <div class="product-grid">
          ${this.products.map(product => components.createProductCard(product, 'grid')).join('')}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="product-list">
          ${this.products.map(product => components.createProductCard(product, 'list')).join('')}
        </div>
      `;
    }
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
          this.saveFiltersToStorage();
          this.loadProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      );
    } else {
      container.innerHTML = '';
    }
  }

  updateResultsCount() {
    const countElement = utils.$('#results-count');
    if (countElement && this.pagination.total !== undefined) {
      countElement.textContent = `共找到 ${utils.formatNumber(this.pagination.total)} 个商品`;
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    utils.storage.set('products_view_mode', mode);
    
    // Update button states
    utils.$$('.view-btn').forEach(btn => btn.classList.remove('active'));
    utils.$(`.view-btn[data-view="${mode}"]`).classList.add('active');
    
    // Re-render products
    this.renderProducts();
  }

  resetFilters() {
    this.filters = {
      page: 1,
      limit: 20,
      sortBy: 'updated_at',
      sortOrder: 'desc',
      search: '',
      stockStatus: '',
      priceRange: '',
      priceLevel: '',
      colors: [],
      sizes: [],
      gender: '',
      season: []
    };

    // 清除保存的筛选器状态
    this.saveFiltersToStorage();

    // Update form elements
    const searchInput = utils.$('#search-input');
    if (searchInput) searchInput.value = '';

    const sortSelect = utils.$('#sort-select');
    if (sortSelect) sortSelect.value = 'updated_at:desc';

    const stockSelect = utils.$('#stock-select');
    if (stockSelect) stockSelect.value = '';

    // Reset filter dropdowns
    utils.$$('input[name="price"]').forEach(input => {
      input.checked = input.value === '';
    });

    utils.$$('input[name="price-level"]').forEach(input => {
      input.checked = input.value === '';
    });

    utils.$$('input[name="gender"]').forEach(input => {
      input.checked = input.value === '';
    });

    utils.$$('#color-content input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });

    utils.$$('#size-content input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });

    this.updateFilterLabels();
    this.loadProducts();
  }

  createLoadingState() {
    const skeletons = Array(8).fill(0).map(() => 
      components.createSkeleton(this.viewMode === 'grid' ? 'card' : 'list')
    ).join('');

    return this.viewMode === 'grid' 
      ? `<div class="product-grid">${skeletons}</div>`
      : `<div class="product-list">${skeletons}</div>`;
  }

  showLoadingState() {
    const container = utils.$('#products-container');
    if (container) {
      container.innerHTML = this.createLoadingState();
    }
  }

  createEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-search"></i>
        </div>
        <h2 class="empty-state-title">没有找到商品</h2>
        <p class="empty-state-description">
          ${this.filters.search ? '尝试调整搜索关键词或筛选条件' : '暂时没有商品数据'}
        </p>
        ${this.filters.search || this.filters.stockStatus || this.filters.priceRange ? `
          <button class="btn btn-primary" onclick="productsPage.resetFilters()">
            <i class="fas fa-undo"></i>
            清除筛选条件
          </button>
        ` : ''}
      </div>
    `;
  }

  showErrorState() {
    const container = utils.$('#products-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 class="empty-state-title">加载失败</h2>
          <p class="empty-state-description">无法加载商品列表，请检查网络连接</p>
          <button class="btn btn-primary" onclick="productsPage.loadProducts()">
            <i class="fas fa-refresh"></i>
            重新加载
          </button>
        </div>
      `;
    }
  }
}

// Create global instance
window.productsPage = new ProductsPage();

// Register route
router.route('/products', () => productsPage.render());
