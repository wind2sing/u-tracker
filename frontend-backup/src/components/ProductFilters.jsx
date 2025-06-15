import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Button,
  Collapse,
  IconButton,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

const ProductFilters = ({ onFilterChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    gender: '',
    season: '',
    minPrice: 0,
    maxPrice: 1000,
    sortBy: 'updated_at',
    sortOrder: 'desc',
    inStock: '',
  });
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    genders: [],
    seasons: [],
  });
  const [priceRange, setPriceRange] = useState([0, 1000]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [filtersData, statsData] = await Promise.all([
          apiService.getFilters(),
          apiService.getStats(),
        ]);
        
        setFilterOptions(filtersData);
        
        if (statsData.priceRange) {
          const maxPrice = Math.ceil(statsData.priceRange.max_price || 1000);
          setPriceRange([0, maxPrice]);
          setFilters(prev => ({ ...prev, maxPrice }));
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePriceChange = (event, newValue) => {
    setPriceRange(newValue);
    const newFilters = { 
      ...filters, 
      minPrice: newValue[0], 
      maxPrice: newValue[1] 
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      category: '',
      gender: '',
      season: '',
      minPrice: 0,
      maxPrice: priceRange[1],
      sortBy: 'updated_at',
      sortOrder: 'desc',
      inStock: '',
    };
    setFilters(clearedFilters);
    setPriceRange([0, priceRange[1]]);
    onFilterChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.gender) count++;
    if (filters.season) count++;
    if (filters.inStock) count++;
    if (filters.minPrice > 0 || filters.maxPrice < priceRange[1]) count++;
    return count;
  };

  const sortOptions = [
    { value: 'updated_at', label: '更新时间' },
    { value: 'price', label: '价格' },
    { value: 'sales', label: '销量' },
    { value: 'evaluation', label: '评价数' },
    { value: 'name', label: '名称' },
  ];

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon />
          <Typography variant="h6">
            筛选条件
          </Typography>
          {getActiveFiltersCount() > 0 && (
            <Chip 
              label={`${getActiveFiltersCount()} 个筛选条件`} 
              size="small" 
              color="primary" 
            />
          )}
        </Box>
        <Box>
          <Button
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            size="small"
            disabled={getActiveFiltersCount() === 0}
          >
            清除筛选
          </Button>
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {/* 排序 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>排序方式</InputLabel>
                <Select
                  value={filters.sortBy}
                  label="排序方式"
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 排序顺序 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>排序顺序</InputLabel>
                <Select
                  value={filters.sortOrder}
                  label="排序顺序"
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                >
                  <MenuItem value="desc">降序</MenuItem>
                  <MenuItem value="asc">升序</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 性别 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>性别</InputLabel>
                <Select
                  value={filters.gender}
                  label="性别"
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  {filterOptions.genders.map((gender) => (
                    <MenuItem key={gender} value={gender}>
                      {gender}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 季节 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>季节</InputLabel>
                <Select
                  value={filters.season}
                  label="季节"
                  onChange={(e) => handleFilterChange('season', e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  {filterOptions.seasons.map((season) => (
                    <MenuItem key={season} value={season}>
                      {season}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 库存状态 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>库存状态</InputLabel>
                <Select
                  value={filters.inStock}
                  label="库存状态"
                  onChange={(e) => handleFilterChange('inStock', e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="true">有库存</MenuItem>
                  <MenuItem value="false">缺货</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 价格范围 */}
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                价格范围: ¥{priceRange[0]} - ¥{priceRange[1]}
              </Typography>
              <Slider
                value={priceRange}
                onChange={handlePriceChange}
                valueLabelDisplay="auto"
                min={0}
                max={Math.max(1000, priceRange[1])}
                step={10}
                valueLabelFormat={(value) => `¥${value}`}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ProductFilters;
