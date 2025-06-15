# API 文档

优衣库价格监控系统提供了完整的RESTful API接口，用于获取商品信息、价格历史、警报数据等。

## 📡 基础信息

- **Base URL**: `http://localhost:3001/api`
- **Content-Type**: `application/json`
- **编码**: UTF-8
- **时区**: Asia/Shanghai

## 🔗 API 端点概览

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/stats` | GET | 系统统计信息 |
| `/scraping-status/latest` | GET | 最新爬取状态 |
| `/products` | GET | 商品列表 |
| `/products/trending` | GET | 热门商品 |
| `/products/:code` | GET | 商品详情 |
| `/products/:code/price-history` | GET | 价格历史 |
| `/alerts` | GET | 价格警报 |
| `/filters` | GET | 筛选选项 |

## 📋 详细接口说明

### 1. 健康检查

检查API服务器状态。

```http
GET /api/health
```

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2025-06-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### 2. 系统统计

获取系统整体统计信息。

```http
GET /api/stats
```

**响应示例：**
```json
{
  "totalProducts": 1250,
  "totalPriceRecords": 45000,
  "totalAlerts": 320,
  "todayStats": {
    "priceDrops": 15,
    "priceIncreases": 8,
    "stockChanges": 23,
    "newProducts": 5
  },
  "lastUpdate": "2025-06-15T10:25:00.000Z"
}
```

### 3. 爬取状态

获取最新的数据爬取状态。

```http
GET /api/scraping-status/latest
```

**响应示例：**
```json
{
  "id": 123,
  "status": "completed",
  "startTime": "2025-06-15T10:00:00.000Z",
  "endTime": "2025-06-15T10:25:00.000Z",
  "duration": 1500000,
  "productsProcessed": 1250,
  "newProducts": 5,
  "updatedProducts": 45,
  "errors": 0,
  "errorMessage": null
}
```

### 4. 商品列表

获取商品列表，支持分页、搜索和筛选。

```http
GET /api/products
```

**查询参数：**
- `page` (number): 页码，默认1
- `limit` (number): 每页数量，默认20，最大100
- `search` (string): 搜索关键词
- `gender` (string): 性别筛选 (男装/女装/男女同款)
- `minPrice` (number): 最低价格
- `maxPrice` (number): 最高价格
- `colors` (string): 颜色筛选，多个用逗号分隔
- `sizes` (string): 尺码筛选，多个用逗号分隔
- `sortBy` (string): 排序字段 (price/discount/updated_at/price_change_time)
- `sortOrder` (string): 排序方向 (asc/desc)

**请求示例：**
```http
GET /api/products?page=1&limit=20&search=衬衫&gender=男装&sortBy=price&sortOrder=asc
```

**响应示例：**
```json
{
  "products": [
    {
      "product_code": "477344",
      "name": "优质棉质衬衫",
      "name_zh": "优质棉质衬衫",
      "category_code": "tops",
      "gender": "男装",
      "season": "春夏",
      "material": "100%棉",
      "main_pic": "https://image.uniqlo.com/...",
      "original_price": 199,
      "current_price": 149,
      "discount_percentage": 25.13,
      "stock_status": "有库存",
      "available_sizes": ["S", "M", "L", "XL"],
      "available_colors": ["白色", "蓝色", "黑色"],
      "sales_count": 1250,
      "updated_at": "2025-06-15T10:25:00.000Z",
      "price_change_time": "2025-06-14T15:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 63,
    "totalItems": 1250,
    "itemsPerPage": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 5. 热门商品

获取热门商品列表。

```http
GET /api/products/trending
```

**查询参数：**
- `limit` (number): 返回数量，默认10，最大50

**响应示例：**
```json
{
  "products": [
    {
      "product_code": "477344",
      "name": "优质棉质衬衫",
      "current_price": 149,
      "original_price": 199,
      "discount_percentage": 25.13,
      "sales_count": 1250,
      "main_pic": "https://image.uniqlo.com/..."
    }
  ]
}
```

### 6. 商品详情

获取单个商品的详细信息。

```http
GET /api/products/:code
```

**路径参数：**
- `code` (string): 商品代码

**响应示例：**
```json
{
  "product": {
    "product_code": "477344",
    "name": "优质棉质衬衫",
    "name_zh": "优质棉质衬衫",
    "category_code": "tops",
    "gender": "男装",
    "season": "春夏",
    "material": "100%棉",
    "main_pic": "https://image.uniqlo.com/...",
    "original_price": 199,
    "current_price": 149,
    "stock_status": "有库存",
    "available_sizes": ["S", "M", "L", "XL"],
    "available_colors": ["白色", "蓝色", "黑色"],
    "sales_count": 1250,
    "created_at": "2025-06-01T00:00:00.000Z",
    "updated_at": "2025-06-15T10:25:00.000Z"
  },
  "priceHistory": [
    {
      "recorded_at": "2025-06-15T10:25:00.000Z",
      "original_price": 199,
      "current_price": 149,
      "stock_status": "有库存"
    }
  ],
  "colorSizeMatrix": {
    "白色": {
      "S": true,
      "M": true,
      "L": false,
      "XL": true
    },
    "蓝色": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  }
}
```

### 7. 价格历史

获取商品的价格历史记录。

```http
GET /api/products/:code/price-history
```

**查询参数：**
- `days` (number): 历史天数，默认30
- `limit` (number): 记录数量限制

**响应示例：**
```json
{
  "priceHistory": [
    {
      "recorded_at": "2025-06-15T10:25:00.000Z",
      "original_price": 199,
      "current_price": 149,
      "stock_status": "有库存",
      "available_sizes": ["S", "M", "L", "XL"],
      "available_colors": ["白色", "蓝色", "黑色"]
    }
  ],
  "statistics": {
    "minPrice": 149,
    "maxPrice": 199,
    "avgPrice": 174,
    "priceChanges": 3,
    "lastPriceChange": "2025-06-14T15:30:00.000Z"
  }
}
```

### 8. 价格警报

获取价格变化警报。

```http
GET /api/alerts
```

**查询参数：**
- `page` (number): 页码，默认1
- `limit` (number): 每页数量，默认20
- `hours` (number): 时间范围（小时），默认24
- `type` (string): 警报类型 (price_drop/price_increase/back_in_stock)
- `sortBy` (string): 排序字段 (created_at/price_change)
- `sortOrder` (string): 排序方向 (asc/desc)

**响应示例：**
```json
{
  "alerts": [
    {
      "id": 1,
      "product_code": "477344",
      "product_name": "优质棉质衬衫",
      "previous_price": 199,
      "current_price": 149,
      "price_change": -50,
      "change_percentage": -25.13,
      "alert_type": "price_drop",
      "created_at": "2025-06-14T15:30:00.000Z",
      "main_pic": "https://image.uniqlo.com/..."
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 16,
    "totalItems": 320,
    "itemsPerPage": 20
  },
  "summary": {
    "totalAlerts": 320,
    "priceDrops": 180,
    "priceIncreases": 95,
    "backInStock": 45
  }
}
```

### 9. 筛选选项

获取可用的筛选选项。

```http
GET /api/filters
```

**响应示例：**
```json
{
  "genders": ["男装", "女装", "男女同款"],
  "colors": [
    { "value": "白色", "count": 150 },
    { "value": "黑色", "count": 120 },
    { "value": "蓝色", "count": 95 }
  ],
  "sizes": [
    { "value": "S", "count": 200 },
    { "value": "M", "count": 250 },
    { "value": "L", "count": 220 }
  ],
  "priceRange": {
    "min": 29,
    "max": 999
  },
  "categories": [
    { "code": "tops", "name": "上装", "count": 450 },
    { "code": "bottoms", "name": "下装", "count": 320 }
  ]
}
```

## 🔧 错误处理

API使用标准HTTP状态码：

- `200` - 成功
- `400` - 请求参数错误
- `404` - 资源不存在
- `500` - 服务器内部错误

**错误响应格式：**
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid page parameter",
    "details": "Page must be a positive integer"
  }
}
```

## 📊 速率限制

- 每个IP每分钟最多100个请求
- 超出限制返回429状态码

## 🔒 认证

当前版本不需要认证，但建议在生产环境中添加API密钥或其他认证机制。

## 📝 使用示例

### JavaScript (Fetch)

```javascript
// 获取商品列表
const response = await fetch('/api/products?page=1&limit=20');
const data = await response.json();

// 搜索商品
const searchResponse = await fetch('/api/products?search=衬衫&gender=男装');
const searchData = await searchResponse.json();

// 获取商品详情
const detailResponse = await fetch('/api/products/477344');
const productDetail = await detailResponse.json();
```

### cURL

```bash
# 获取系统统计
curl -X GET "http://localhost:3001/api/stats"

# 搜索商品
curl -X GET "http://localhost:3001/api/products?search=衬衫&limit=10"

# 获取价格警报
curl -X GET "http://localhost:3001/api/alerts?hours=24&type=price_drop"
```

## 📈 性能建议

1. **分页**: 使用分页避免一次性获取大量数据
2. **缓存**: 客户端可以缓存不经常变化的数据
3. **压缩**: 启用gzip压缩减少传输大小
4. **条件请求**: 使用ETag或Last-Modified头部

## 🔄 版本控制

当前API版本：v1.0

未来版本更新将通过URL路径进行版本控制：
- `/api/v1/products`
- `/api/v2/products`

---

更多信息请参考：
- [部署指南](DEPLOYMENT.md)
- [前端开发指南](frontend/README.md)
- [示例代码](examples/)
