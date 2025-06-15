import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Tabs,
  Tab,
  Button,
  CardMedia,
  CardActions,
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

const AlertCard = ({ alert, onClick }) => {
  const formatPrice = (price) => `¥${price?.toFixed(0) || 0}`;
  
  const getAlertIcon = (type) => {
    switch (type) {
      case 'price_drop':
        return <TrendingDownIcon />;
      case 'price_increase':
        return <TrendingUpIcon />;
      case 'back_in_stock':
        return <InventoryIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'price_drop':
        return 'success';
      case 'price_increase':
        return 'error';
      case 'back_in_stock':
        return 'info';
      default:
        return 'default';
    }
  };

  const getAlertLabel = (type) => {
    switch (type) {
      case 'price_drop':
        return '降价';
      case 'price_increase':
        return '涨价';
      case 'back_in_stock':
        return '补货';
      default:
        return '变化';
    }
  };

  return (
    <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={onClick}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar sx={{ bgcolor: `${getAlertColor(alert.alert_type)}.main` }}>
            {getAlertIcon(alert.alert_type)}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" noWrap>
              {alert.name_zh || alert.product_code}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip
                label={getAlertLabel(alert.alert_type)}
                color={getAlertColor(alert.alert_type)}
                size="small"
              />
              {alert.change_percentage && (
                <Chip
                  label={`${alert.change_percentage.toFixed(1)}%`}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
            
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {formatPrice(alert.previous_price)} → {formatPrice(alert.current_price)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(alert.created_at).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const ProductCard = ({ product, onClick }) => {
  const formatPrice = (price) => `¥${price?.toFixed(0) || 0}`;

  // 默认占位图片 - 灰色背景
  const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOWbvueJhzwvdGV4dD48L3N2Zz4=';

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

  return (
    <Card
      sx={{
        width: '100%',
        aspectRatio: '1', // 正方形卡片
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        border: 'none',
        boxShadow: 'none',
        backgroundColor: 'transparent',
        '&:hover': {
          '& .product-image': {
            transform: 'scale(1.02)'
          }
        }
      }}
      onClick={onClick}
    >
      {/* 图片区域 */}
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

      {/* 文本信息区域 */}
      <Box sx={{
        height: '25%',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start'
      }}>
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

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
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
          {product.change_percentage && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: '#4caf50',
                fontWeight: 500
              }}
            >
              ↓{product.change_percentage.toFixed(1)}%
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

const Alerts = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [priceDrops, setPriceDrops] = useState([]);
  const [backInStock, setBackInStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const [recentData, dropsData, stockData] = await Promise.all([
          apiService.getAlerts({ hours: 24 }),
          apiService.getAlerts({ type: 'price_drop' }),
          apiService.getAlerts({ type: 'back_in_stock' }),
        ]);

        setRecentAlerts(recentData);
        setPriceDrops(dropsData);
        setBackInStock(stockData);
      } catch (err) {
        setError('获取警报数据失败');
        console.error('Alerts fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    
    // 每分钟刷新一次数据
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleProductClick = (productCode) => {
    navigate(`/products/${productCode}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const tabPanels = [
    {
      label: '最新警报',
      icon: <TimeIcon />,
      data: recentAlerts,
      emptyMessage: '暂无最新警报'
    },
    {
      label: '降价商品',
      icon: <TrendingDownIcon />,
      data: priceDrops,
      emptyMessage: '暂无降价商品'
    },
    {
      label: '补货提醒',
      icon: <InventoryIcon />,
      data: backInStock,
      emptyMessage: '暂无补货商品'
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        价格警报
      </Typography>

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                <NotificationsIcon />
              </Avatar>
              <Typography variant="h4">{recentAlerts.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                今日警报
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                <TrendingDownIcon />
              </Avatar>
              <Typography variant="h4">{priceDrops.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                降价商品
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                <InventoryIcon />
              </Avatar>
              <Typography variant="h4">{backInStock.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                补货商品
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 标签页 */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          {tabPanels.map((panel, index) => (
            <Tab
              key={index}
              icon={panel.icon}
              label={panel.label}
              iconPosition="start"
            />
          ))}
        </Tabs>

        <CardContent>
          {tabPanels[tabValue].data.length > 0 ? (
            <Grid container spacing={2}>
              {tabValue === 0 ? (
                // 最新警报 - 列表视图
                <Grid item xs={12}>
                  {recentAlerts.map((alert) => (
                    <Box key={alert.id} sx={{ mb: 2 }}>
                      <AlertCard
                        alert={alert}
                        onClick={() => handleProductClick(alert.product_code)}
                      />
                    </Box>
                  ))}
                </Grid>
              ) : (
                // 降价商品和补货商品 - 网格视图
                tabPanels[tabValue].data.map((item) => (
                  <Grid
                    item
                    xs={6}
                    sm={4}
                    md={3}
                    lg={3}
                    xl={2}
                    key={item.id || item.product_code}
                    sx={{ display: 'flex' }}
                  >
                    <ProductCard
                      product={item}
                      onClick={() => handleProductClick(item.product_code)}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          ) : (
            <Typography 
              color="text.secondary" 
              sx={{ textAlign: 'center', py: 4 }}
            >
              {tabPanels[tabValue].emptyMessage}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Alerts;
