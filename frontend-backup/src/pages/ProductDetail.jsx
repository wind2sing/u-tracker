import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as InStockIcon,
  Cancel as OutOfStockIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../services/api';

const ProductDetail = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 默认占位图片 - 灰色背景
  const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOWbvueJhzwvdGV4dD48L3N2Zz4=';

  // 获取实际的图片URL
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

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        const [productData, historyData] = await Promise.all([
          apiService.getProduct(code),
          apiService.getPriceHistory(code, 30),
        ]);

        setProduct(productData);
        
        // 处理价格历史数据用于图表
        const chartData = historyData.map(item => ({
          date: new Date(item.recorded_at).toLocaleDateString(),
          price: item.current_price,
          originalPrice: item.original_price,
        }));
        setPriceHistory(chartData);
        
      } catch (err) {
        setError('获取商品详情失败');
        console.error('Product detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchProductData();
    }
  }, [code]);

  const formatPrice = (price) => `¥${price?.toFixed(0) || 0}`;

  const getPriceChangeInfo = () => {
    if (!product?.original_price || !product?.current_price) return null;
    
    const change = product.current_price - product.original_price;
    const percentage = (change / product.original_price) * 100;
    
    return {
      change,
      percentage,
      isDecrease: change < 0,
      isIncrease: change > 0,
    };
  };

  const priceChangeInfo = getPriceChangeInfo();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || '商品不存在'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* 返回按钮 */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/products')}
        sx={{ mb: 2 }}
      >
        返回商品列表
      </Button>

      <Grid container spacing={3}>
        {/* 商品基本信息 */}
        <Grid item xs={12} md={6}>
          <Card>
            <Box sx={{ position: 'relative', overflow: 'hidden' }}>
              <CardMedia
                component="img"
                sx={{
                  height: 400,
                  width: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center'
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
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {product.name_zh}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                商品编号: {product.product_code}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                英文名称: {product.name}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {/* 价格信息 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatPrice(product.current_price)}
                </Typography>
                
                {product.original_price && product.original_price !== product.current_price && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ textDecoration: 'line-through' }}
                      color="text.secondary"
                    >
                      {formatPrice(product.original_price)}
                    </Typography>
                    {priceChangeInfo && (
                      <Chip
                        icon={priceChangeInfo.isDecrease ? <TrendingDownIcon /> : <TrendingUpIcon />}
                        label={`${priceChangeInfo.percentage.toFixed(1)}%`}
                        color={priceChangeInfo.isDecrease ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                  </Box>
                )}
              </Box>

              {/* 库存状态 */}
              <Box sx={{ mb: 2 }}>
                <Chip
                  icon={product.stock_status === 'Y' ? <InStockIcon /> : <OutOfStockIcon />}
                  label={product.stock_status === 'Y' ? '有库存' : '缺货'}
                  color={product.stock_status === 'Y' ? 'success' : 'error'}
                  size="medium"
                />
              </Box>

              {/* 商品属性 */}
              <List dense>
                {product.gender && (
                  <ListItem>
                    <ListItemText primary="性别" secondary={product.gender} />
                  </ListItem>
                )}
                {product.season && (
                  <ListItem>
                    <ListItemText primary="季节" secondary={product.season} />
                  </ListItem>
                )}
                {product.material && (
                  <ListItem>
                    <ListItemText primary="材质" secondary={product.material} />
                  </ListItem>
                )}
                {product.sales_count && (
                  <ListItem>
                    <ListItemText primary="销量" secondary={product.sales_count} />
                  </ListItem>
                )}
                {product.evaluation_count && (
                  <ListItem>
                    <ListItemText primary="评价数" secondary={product.evaluation_count} />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 价格历史图表 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  价格历史趋势 (最近30天)
                </Typography>
              </Box>
              
              {priceHistory.length > 0 ? (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [formatPrice(value), name === 'price' ? '当前价格' : '原价']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#1976d2" 
                        strokeWidth={2}
                        dot={{ fill: '#1976d2' }}
                      />
                      {priceHistory.some(item => item.originalPrice !== item.price) && (
                        <Line 
                          type="monotone" 
                          dataKey="originalPrice" 
                          stroke="#dc004e" 
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={{ fill: '#dc004e' }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  暂无价格历史数据
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* 可用尺码和颜色 */}
          {(product.available_sizes?.length > 0 || product.available_colors?.length > 0) && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  商品规格
                </Typography>
                
                {product.available_sizes?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      可用尺码:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {product.available_sizes.map((size, index) => (
                        <Chip key={index} label={size} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
                
                {product.available_colors?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      可用颜色:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {product.available_colors.map((color, index) => (
                        <Chip key={index} label={color} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* 价格历史表格 */}
        {priceHistory.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  详细价格记录
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>日期</TableCell>
                        <TableCell align="right">当前价格</TableCell>
                        <TableCell align="right">原价</TableCell>
                        <TableCell align="right">变化</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {priceHistory.slice(0, 10).map((item, index) => {
                        const change = item.price - item.originalPrice;
                        const percentage = item.originalPrice ? (change / item.originalPrice) * 100 : 0;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell align="right">{formatPrice(item.price)}</TableCell>
                            <TableCell align="right">{formatPrice(item.originalPrice)}</TableCell>
                            <TableCell align="right">
                              {change !== 0 && (
                                <Chip
                                  label={`${percentage.toFixed(1)}%`}
                                  size="small"
                                  color={change < 0 ? 'success' : 'error'}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ProductDetail;
