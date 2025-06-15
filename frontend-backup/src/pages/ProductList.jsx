import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  CircularProgress,
  Alert,
  Pagination,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  InputBase,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as InStockIcon,
  Cancel as OutOfStockIcon,
} from '@mui/icons-material';
import apiService from '../services/api';
import ProductFilters from '../components/ProductFilters';

const ProductCard = ({ product, viewMode, onClick }) => {
  // 默认占位图片 - 灰色背景
  const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOWbvueJhzwvdGV4dD48L3N2Zz4=';

  // 获取实际的图片URL，如果是代理URL则转换为原始URL
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return defaultImage;

    // 如果是我们的代理URL，转换为原始URL
    if (imageUrl.startsWith('http://localhost:3001/images')) {
      return imageUrl.replace('http://localhost:3001/images', 'https://www.uniqlo.cn');
    }

    // 如果URL中包含im.uniqlo.cn，替换为www.uniqlo.cn
    if (imageUrl.includes('im.uniqlo.cn')) {
      return imageUrl.replace('im.uniqlo.cn', 'www.uniqlo.cn');
    }

    return imageUrl;
  };

  const formatPrice = (price) => `¥${price?.toFixed(0) || 0}`;

  const getPriceChangeColor = (original, current) => {
    if (!original || !current) return 'default';
    return current < original ? 'success' : current > original ? 'error' : 'default';
  };

  const getPriceChangeIcon = (original, current) => {
    if (!original || !current) return null;
    return current < original ? <TrendingDownIcon /> : current > original ? <TrendingUpIcon /> : null;
  };

  if (viewMode === 'list') {
    return (
      <Card
        sx={{
          mb: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: 4,
            transform: 'translateX(4px)'
          }
        }}
        onClick={onClick}
      >
        <Box sx={{ display: 'flex', p: 2, alignItems: 'center' }}>
          <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 1 }}>
            <CardMedia
              component="img"
              sx={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
              image={getImageUrl(product.main_pic)}
              alt={product.name_zh}
              onError={(e) => {
                if (e.target.src !== defaultImage) {
                  e.target.src = defaultImage;
                }
              }}
            />
          </Box>
          <Box sx={{ flex: 1, ml: 2, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 500,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {product.name_zh}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              商品编号: {product.product_code}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                {formatPrice(product.current_price)}
              </Typography>
              {product.original_price && product.original_price !== product.current_price && (
                <>
                  <Typography
                    variant="body2"
                    sx={{ textDecoration: 'line-through' }}
                    color="text.secondary"
                  >
                    {formatPrice(product.original_price)}
                  </Typography>
                  <Chip
                    icon={getPriceChangeIcon(product.original_price, product.current_price)}
                    label={`${(((product.current_price - product.original_price) / product.original_price) * 100).toFixed(1)}%`}
                    size="small"
                    color={getPriceChangeColor(product.original_price, product.current_price)}
                  />
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={product.stock_status === 'Y' ? <InStockIcon /> : <OutOfStockIcon />}
                label={product.stock_status === 'Y' ? '有库存' : '缺货'}
                size="small"
                color={product.stock_status === 'Y' ? 'success' : 'error'}
                variant="outlined"
              />
              {product.sales_count && (
                <Typography variant="caption" color="text.secondary">
                  销量: {product.sales_count}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        width: '100%',
        aspectRatio: '1',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        border: 'none',
        boxShadow: 'none',
        backgroundColor: 'white',
        '&:hover': {
          '& .product-image': {
            transform: 'scale(1.02)'
          }
        }
      }}
      onClick={onClick}
    >
      {/* 图片区域 - 占据卡片的大部分空间 */}
      <Box sx={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '75%',
        backgroundColor: '#f8f8f8',
        borderRadius: 0
      }}>
        <CardMedia
          component="img"
          className="product-image"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transition: 'transform 0.3s ease-in-out'
          }}
          image={getImageUrl(product.main_pic)}
          alt={product.name_zh}
          onError={(e) => {
            if (e.target.src !== defaultImage) {
              e.target.src = defaultImage;
            }
          }}
        />
      </Box>

      {/* 文本信息区域 - 紧凑排列在底部 */}
      <Box sx={{
        height: '25%',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start'
      }}>
        {/* 商品名称 - 最多显示2行 */}
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.8rem',
            lineHeight: 1.2,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            height: '1.9em',
            color: '#333'
          }}
          title={product.name_zh}
        >
          {product.name_zh}
        </Typography>

        {/* 商品编号 */}
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.7rem',
            color: '#666',
            mb: 0.5,
            lineHeight: 1
          }}
        >
          {product.product_code}
        </Typography>

        {/* 价格信息 */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#d32f2f'
            }}
          >
            {formatPrice(product.current_price)}
          </Typography>
          {product.original_price && product.original_price !== product.current_price && (
            <Typography
              variant="caption"
              sx={{
                textDecoration: 'line-through',
                fontSize: '0.7rem',
                color: '#999'
              }}
            >
              {formatPrice(product.original_price)}
            </Typography>
          )}
        </Box>

        {/* 库存状态 - 简化显示 */}
        {product.stock_status !== 'Y' && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: '#f44336',
              mt: 0.5
            }}
          >
            缺货
          </Typography>
        )}
      </Box>
    </Card>
  );
};

const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    sortBy: 'updated_at',
    sortOrder: 'desc',
  });

  const fetchProducts = async (newFilters = {}) => {
    try {
      setLoading(true);
      const params = { ...filters, ...newFilters };
      const data = await apiService.getProducts(params);
      setProducts(data.products || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError('获取商品列表失败');
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = () => {
    const newFilters = { ...filters, search: searchTerm, page: 1 };
    setFilters(newFilters);
    fetchProducts(newFilters);
  };

  const handleFilterChange = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    fetchProducts(updatedFilters);
  };

  const handlePageChange = (event, page) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    fetchProducts(newFilters);
  };

  const handleProductClick = (product) => {
    navigate(`/products/${product.product_code}`);
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        商品列表
      </Typography>

      {/* 搜索栏 */}
      <Paper
        component="form"
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', mb: 3 }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="搜索商品名称或编号..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
        <IconButton type="submit" sx={{ p: '10px' }}>
          <SearchIcon />
        </IconButton>
      </Paper>

      {/* 筛选器 */}
      <ProductFilters onFilterChange={handleFilterChange} />

      {/* 视图切换和结果统计 */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        mt: 2
      }}>
        <Typography variant="body2" color="text.secondary">
          {!loading && products.length > 0 && (
            `共找到 ${pagination.total || products.length} 个商品`
          )}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            视图:
          </Typography>
          <Tooltip title="网格视图">
            <IconButton
              onClick={() => setViewMode('grid')}
              color={viewMode === 'grid' ? 'primary' : 'default'}
              size="small"
            >
              <GridViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="列表视图">
            <IconButton
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
              size="small"
            >
              <ListViewIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 商品列表 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid
                  item
                  xs={6}
                  sm={4}
                  md={3}
                  lg={3}
                  xl={2}
                  key={product.product_code}
                  sx={{ display: 'flex' }}
                >
                  <ProductCard
                    product={product}
                    viewMode={viewMode}
                    onClick={() => handleProductClick(product)}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box>
              {products.map((product) => (
                <ProductCard
                  key={product.product_code}
                  product={product}
                  viewMode={viewMode}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </Box>
          )}

          {/* 分页 */}
          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.pages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}

          {products.length === 0 && !loading && (
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ textAlign: 'center', mt: 4 }}
            >
              没有找到符合条件的商品
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default ProductList;
