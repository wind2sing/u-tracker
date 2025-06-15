// Advanced Filters Component

class AdvancedFilters {
  constructor(onFilterChange) {
    this.onFilterChange = onFilterChange;
    this.filters = {
      priceRange: [],
      colors: [],
      sizes: [],
      gender: [],
      season: []
    };
    this.availableOptions = {
      colors: [],
      sizes: [],
      genders: [],
      seasons: []
    };
    this.isVisible = false;
  }

  async initialize() {
    // 获取可用的筛选选项
    try {
      const filterOptions = await api.getFilterOptions();
      this.availableOptions = filterOptions;
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  }

  render() {
    return `
      <div class="advanced-filters-container">
        <button class="advanced-filters-toggle btn btn-outline-primary" id="advanced-filters-toggle">
          <i class="fas fa-filter"></i>
          高级筛选
          <span class="filter-count" id="filter-count" style="display: none;"></span>
        </button>
        
        <div class="advanced-filters-panel" id="advanced-filters-panel" style="display: none;">
          <div class="filters-header">
            <h3>筛选条件</h3>
            <button class="btn btn-sm btn-secondary" id="clear-all-filters">清除全部</button>
          </div>
          
          <div class="filters-content">
            ${this.renderPriceFilter()}
            ${this.renderColorFilter()}
            ${this.renderSizeFilter()}
            ${this.renderGenderFilter()}
            ${this.renderSeasonFilter()}
          </div>
          
          <div class="filters-footer">
            <button class="btn btn-secondary" id="cancel-filters">取消</button>
            <button class="btn btn-primary" id="apply-filters">应用筛选</button>
          </div>
        </div>
      </div>
    `;
  }

  renderPriceFilter() {
    const priceRanges = [
      { value: '0-50', label: '¥0 - ¥50' },
      { value: '50-100', label: '¥50 - ¥100' },
      { value: '100-200', label: '¥100 - ¥200' },
      { value: '200-300', label: '¥200 - ¥300' },
      { value: '300-400', label: '¥300 - ¥400' },
      { value: '400-500', label: '¥400 - ¥500' },
      { value: '500-600', label: '¥500 - ¥600' },
      { value: '600-700', label: '¥600 - ¥700' },
      { value: '700-800', label: '¥700 - ¥800' },
      { value: '800-900', label: '¥800 - ¥900' },
      { value: '900+', label: '¥900 或更多' }
    ];

    return `
      <div class="filter-section">
        <h4 class="filter-title">价格</h4>
        <div class="filter-options price-options">
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="price" value="" ${this.filters.priceRange.length === 0 ? 'checked' : ''}>
              <span class="radio-label">全部</span>
            </label>
            ${priceRanges.map(range => `
              <label class="radio-option">
                <input type="radio" name="price" value="${range.value}" ${this.filters.priceRange.includes(range.value) ? 'checked' : ''}>
                <span class="radio-label">${range.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderColorFilter() {
    const colorGroups = [
      { code: 'COL00,COL01,COL02,COL03,COL04', name: '白色系', color: '#FFFFFF', border: '#DDDDDD' },
      { code: 'COL07,COL08', name: '灰色系', color: '#808080', border: '#808080' },
      { code: 'COL09', name: '黑色系', color: '#000000', border: '#000000' },
      { code: 'COL10,COL11,COL12', name: '粉色系', color: '#FFB6C1', border: '#FFB6C1' },
      { code: 'COL13,COL14,COL15,COL16', name: '红色系', color: '#FF0000', border: '#FF0000' },
      { code: 'COL18,COL19,COL20,COL25,COL26,COL27', name: '橙色系', color: '#FFA500', border: '#FFA500' },
      { code: 'COL02,COL03,COL42,COL43,COL44,COL45,COL46,COL47,COL48', name: '米色系', color: '#F5F5DC', border: '#DDD' },
      { code: 'COL42,COL43,COL44,COL45', name: '棕色系', color: '#8B4513', border: '#8B4513' },
      { code: 'COL21,COL22,COL23,COL24', name: '黄色系', color: '#FFFF00', border: '#FFFF00' },
      { code: 'COL28,COL29,COL30,COL31,COL32,COL52,COL53,COL54,COL55', name: '绿色系', color: '#008000', border: '#008000' },
      { code: 'COL33,COL34,COL35,COL36,COL37', name: '蓝色系', color: '#0000FF', border: '#0000FF' },
      { code: 'COL38,COL39,COL40,COL41', name: '紫色系', color: '#800080', border: '#800080' }
    ];

    return `
      <div class="filter-section">
        <h4 class="filter-title">颜色</h4>
        <div class="filter-options color-options">
          ${colorGroups.map(group => `
            <label class="color-option">
              <input type="checkbox" value="${group.code}" ${this.filters.colors.some(c => group.code.includes(c)) ? 'checked' : ''}>
              <span class="color-swatch" style="background-color: ${group.color}; border-color: ${group.border};"></span>
              <span class="color-name">${group.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderSizeFilter() {
    const sizeGroups = [
      { value: 'SIZ999,MSC025', label: '均码' },
      { value: 'SMA002', label: 'XS' },
      { value: 'SMA003', label: 'S' },
      { value: 'SMA004', label: 'M' },
      { value: 'SMA005', label: 'L' },
      { value: 'SMA006', label: 'XL' },
      { value: 'SMA007', label: 'XXL' },
      { value: 'SMA008', label: '3XL' },
      { value: 'SMA009', label: '4XL' },
      { value: 'CMD073', label: '73cm' },
      { value: 'CMD076', label: '76cm' },
      { value: 'SHO220,SHO225', label: '22码' },
      { value: 'SHO230,SHO235', label: '23码' },
      { value: 'SHO240,SHO245', label: '24码' },
      { value: 'SHO250,SHO255', label: '25码' },
      { value: 'SHO260,SHO265', label: '26码' },
      { value: 'SHO270,SHO275', label: '27码' },
      { value: 'SHO280,SHO285', label: '28码' },
      { value: 'SHO290,SHO295', label: '29码' },
      { value: 'SHO300', label: '30码' },
      { value: 'SHO320', label: '32码' },
      { value: 'SHO340', label: '34码' },
      { value: 'SHO360', label: '36码' }
    ];

    return `
      <div class="filter-section">
        <h4 class="filter-title">尺码</h4>
        <div class="filter-options size-options">
          <div class="checkbox-grid">
            ${sizeGroups.map(size => `
              <label class="checkbox-option">
                <input type="checkbox" value="${size.value}" ${this.filters.sizes.some(s => size.value.includes(s)) ? 'checked' : ''}>
                <span class="checkbox-label">${size.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderGenderFilter() {
    const genders = [
      { value: '男装', label: '男装' },
      { value: '女装', label: '女装' },
      { value: '童装', label: '童装' },
      { value: '男女同款', label: '男女同款' }
    ];

    return `
      <div class="filter-section">
        <h4 class="filter-title">性别</h4>
        <div class="filter-options gender-options">
          <div class="checkbox-grid">
            ${genders.map(gender => `
              <label class="checkbox-option">
                <input type="checkbox" value="${gender.value}" ${this.filters.gender.includes(gender.value) ? 'checked' : ''}>
                <span class="checkbox-label">${gender.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderSeasonFilter() {
    const seasons = [
      { value: '春季', label: '春季' },
      { value: '夏季', label: '夏季' },
      { value: '秋季', label: '秋季' },
      { value: '冬季', label: '冬季' }
    ];

    return `
      <div class="filter-section">
        <h4 class="filter-title">季节</h4>
        <div class="filter-options season-options">
          <div class="checkbox-grid">
            ${seasons.map(season => `
              <label class="checkbox-option">
                <input type="checkbox" value="${season.value}" ${this.filters.season.includes(season.value) ? 'checked' : ''}>
                <span class="checkbox-label">${season.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Toggle panel
    const toggleBtn = document.getElementById('advanced-filters-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.togglePanel());
    }

    // Apply filters
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applyFilters());
    }

    // Cancel filters
    const cancelBtn = document.getElementById('cancel-filters');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hidePanel());
    }

    // Clear all filters
    const clearBtn = document.getElementById('clear-all-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllFilters());
    }
  }

  togglePanel() {
    const panel = document.getElementById('advanced-filters-panel');
    if (panel) {
      this.isVisible = !this.isVisible;
      panel.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  hidePanel() {
    const panel = document.getElementById('advanced-filters-panel');
    if (panel) {
      this.isVisible = false;
      panel.style.display = 'none';
    }
  }

  applyFilters() {
    this.collectFilters();
    this.updateFilterCount();
    this.hidePanel();
    
    if (this.onFilterChange) {
      this.onFilterChange(this.filters);
    }
  }

  collectFilters() {
    // Collect price filters
    const priceRadio = document.querySelector('input[name="price"]:checked');
    this.filters.priceRange = priceRadio && priceRadio.value ? [priceRadio.value] : [];

    // Collect color filters
    const colorCheckboxes = document.querySelectorAll('.color-options input[type="checkbox"]:checked');
    this.filters.colors = Array.from(colorCheckboxes).map(cb => cb.value).join(',').split(',').filter(Boolean);

    // Collect size filters
    const sizeCheckboxes = document.querySelectorAll('.size-options input[type="checkbox"]:checked');
    this.filters.sizes = Array.from(sizeCheckboxes).map(cb => cb.value).join(',').split(',').filter(Boolean);

    // Collect gender filters
    const genderCheckboxes = document.querySelectorAll('.gender-options input[type="checkbox"]:checked');
    this.filters.gender = Array.from(genderCheckboxes).map(cb => cb.value);

    // Collect season filters
    const seasonCheckboxes = document.querySelectorAll('.season-options input[type="checkbox"]:checked');
    this.filters.season = Array.from(seasonCheckboxes).map(cb => cb.value);
  }

  clearAllFilters() {
    this.filters = {
      priceRange: [],
      colors: [],
      sizes: [],
      gender: [],
      season: []
    };

    // Clear all form inputs
    document.querySelectorAll('#advanced-filters-panel input').forEach(input => {
      if (input.type === 'radio') {
        input.checked = input.value === '';
      } else {
        input.checked = false;
      }
    });

    this.updateFilterCount();
  }

  updateFilterCount() {
    const count = this.getActiveFilterCount();
    const countElement = document.getElementById('filter-count');

    if (countElement) {
      if (count > 0) {
        countElement.textContent = count;
        countElement.style.display = 'inline-block';
      } else {
        countElement.style.display = 'none';
      }
    }
  }

  getActiveFilterCount() {
    let count = 0;
    if (this.filters.priceRange.length > 0) count++;
    if (this.filters.colors.length > 0) count++;
    if (this.filters.sizes.length > 0) count++;
    if (this.filters.gender.length > 0) count++;
    if (this.filters.season.length > 0) count++;
    return count;
  }

  getFilters() {
    return this.filters;
  }

  setFilters(filters) {
    this.filters = { ...filters };
    this.updateFilterCount();
  }
}

// Export for use in other modules
window.AdvancedFilters = AdvancedFilters;
