import React from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  Typography, 
  Chip 
} from '@mui/material';

// 测试数据
const testProducts = [
  {
    product_code: 'TEST001',
    name_zh: '短标题商品',
    current_price: 39,
    stock_status: 'Y',
    main_pic: 'https://via.placeholder.com/300x300/ff6b6b/ffffff?text=Product1'
  },
  {
    product_code: 'TEST002', 
    name_zh: '这是一个非常非常长的商品标题，用来测试文本溢出处理和卡片高度一致性',
    current_price: 199,
    original_price: 299,
    stock_status: 'N',
    main_pic: 'https://via.placeholder.com/300x300/4ecdc4/ffffff?text=Product2'
  },
  {
    product_code: 'TEST003',
    name_zh: '中等长度的商品标题测试',
    current_price: 89,
    stock_status: 'Y',
    sales_count: 1234,
    main_pic: 'https://via.placeholder.com/300x300/45b7d1/ffffff?text=Product3'
  },
  {
    product_code: 'TEST004',
    name_zh: '短名',
    current_price: 15,
    stock_status: 'Y',
    main_pic: 'https://via.placeholder.com/300x300/f9ca24/ffffff?text=Product4'
  }
];

const formatPrice = (price) => `¥${price}`;

const TestCard = ({ product }) => {
  return (
    <Card
      sx={{
        width: '100%',
        aspectRatio: '1', // 正方形卡片，像优衣库一样
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        border: '2px solid #e0e0e0', // 添加边框便于观察
        backgroundColor: 'white',
        '&:hover': {
          '& .product-image': {
            transform: 'scale(1.02)'
          }
        }
      }}
    >
      {/* 图片区域 - 占据卡片的75%高度 */}
      <Box sx={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '75%',
        backgroundColor: '#f8f8f8',
        border: '1px solid #ddd' // 图片区域边框
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
          image={product.main_pic}
          alt={product.name_zh}
        />
      </Box>

      {/* 文本信息区域 - 占据卡片的25%高度 */}
      <Box sx={{
        height: '25%',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        border: '1px solid #ddd', // 内容区域边框
        backgroundColor: '#f9f9f9'
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
            color: '#333',
            backgroundColor: '#fff3cd', // 标题背景色
            padding: '2px'
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
            lineHeight: 1,
            backgroundColor: '#d1ecf1',
            padding: '2px'
          }}
        >
          {product.product_code}
        </Typography>

        {/* 价格信息 */}
        <Box sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 0.5,
          backgroundColor: '#d4edda',
          padding: '2px'
        }}>
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

          {/* 库存状态 */}
          {product.stock_status !== 'Y' && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: '#f44336',
                ml: 'auto'
              }}
            >
              缺货
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

const TestCards = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        优衣库风格卡片测试页面
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        所有卡片都是正方形（1:1比例），图片占75%高度，文本信息占25%高度，不管商品标题长短都保持相同尺寸
      </Typography>
      
      <Grid container spacing={2}>
        {testProducts.map((product) => (
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
            <TestCard product={product} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TestCards;
