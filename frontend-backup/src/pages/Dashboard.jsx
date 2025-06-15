import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, mr: 2 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, alertsData, trendingData] = await Promise.all([
          apiService.getStats(),
          apiService.getAlerts({ hours: 24 }),
          apiService.getTrendingProducts(5),
        ]);

        setStats(statsData);
        setAlerts(alertsData.slice(0, 5)); // 只显示前5个警报
        setTrending(trendingData.slice(0, 5)); // 只显示前5个热门商品
      } catch (err) {
        setError('获取数据失败，请检查API服务是否正常运行');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // 每30秒刷新一次数据
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const formatPrice = (price) => `¥${price?.toFixed(0) || 0}`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        数据仪表板
      </Typography>
      
      <Grid container spacing={3}>
        {/* 统计卡片 */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="商品总数"
            value={stats?.totalProducts || 0}
            icon={<InventoryIcon />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="价格记录"
            value={stats?.totalPriceRecords || 0}
            icon={<MoneyIcon />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="价格警报"
            value={stats?.totalAlerts || 0}
            icon={<NotificationsIcon />}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="平均价格"
            value={formatPrice(stats?.priceRange?.avg_price)}
            icon={<TrendingUpIcon />}
            color="info"
            subtitle={`${formatPrice(stats?.priceRange?.min_price)} - ${formatPrice(stats?.priceRange?.max_price)}`}
          />
        </Grid>

        {/* 最新价格警报 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                最新价格警报
              </Typography>
              {alerts.length > 0 ? (
                <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                  {alerts.map((alert, index) => (
                    <React.Fragment key={alert.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: alert.alert_type === 'price_drop' ? 'success.main' : 'error.main' 
                          }}>
                            {alert.alert_type === 'price_drop' ? 
                              <TrendingDownIcon /> : <TrendingUpIcon />
                            }
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {alert.name_zh || alert.product_code}
                              </Typography>
                              <Chip
                                label={`${alert.change_percentage?.toFixed(1)}%`}
                                size="small"
                                color={alert.alert_type === 'price_drop' ? 'success' : 'error'}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {formatPrice(alert.previous_price)} → {formatPrice(alert.current_price)}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < alerts.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  暂无价格警报
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 热门商品 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                热门商品
              </Typography>
              {trending.length > 0 ? (
                <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                  {trending.map((product, index) => (
                    <React.Fragment key={product.product_code}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <StarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                              {product.name_zh}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="primary">
                                {formatPrice(product.current_price)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                销量: {product.sales_count || 0}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < trending.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  暂无热门商品数据
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 今日统计 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                今日统计
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main">
                      {stats?.recentAlerts?.priceDrops || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      降价商品
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="error.main">
                      {stats?.recentAlerts?.priceIncreases || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      涨价商品
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="info.main">
                      {stats?.recentAlerts?.stockChanges || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      库存变化
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="primary.main">
                      {stats?.recentAlerts?.total || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      总警报数
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
