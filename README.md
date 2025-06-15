# 优衣库商品价格监控系统 (Uniqlo Price Tracker)

一个基于Node.js的优衣库商品价格监控系统，能够定时抓取优衣库超值特惠商品信息，监控价格变化，并存储到SQLite数据库中。

## 🎉 全新原生前端界面

项目已完成前端重构，使用原生HTML、CSS、JavaScript构建了一个美观、现代化的用户界面，提供完整的商品监控和数据分析功能。

### ✨ 前端特性

- **🚀 原生技术栈**: 纯HTML、CSS、JavaScript，无框架依赖，轻量高效
- **🎨 现代化设计**: 自定义设计系统，美观且用户友好的界面
- **📱 响应式布局**: 完美适配桌面、平板和移动设备
- **⚡ 高性能**: 无框架开销，加载速度更快
- **🔄 单页应用**: 客户端路由，流畅的页面切换体验
- **📊 实时数据**: 自动刷新仪表板数据和监控状态
- **🎭 优雅交互**: 平滑动画和过渡效果
- **🔍 智能筛选**: 多维度商品筛选和搜索功能
- **📊 降价档数**: 智能分析优衣库降价规律，按档数筛选商品
- **📈 数据可视化**: 价格趋势图表和统计分析

## 🔄 v2.0 架构更新

从v2.0版本开始，项目架构进行了重要优化：

- **统一入口**: `index.js` 现在同时启动API服务器和爬虫调度器
- **简化部署**: 一个命令即可启动完整的后端系统
- **更好的集成**: API服务器和数据抓取功能紧密集成

## 🚀 快速开始

### 方法一：一键启动 (推荐)

```bash
# 启动Web界面和API服务器（用于查看数据）
./start.sh

# 启动完整系统（包括爬虫调度器）
./start-full.sh
```

### 方法二：使用Docker (生产环境推荐)

```bash
# 使用构建脚本一键部署（推荐）
./build-docker.sh

# 或使用Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

**Docker优化**: 从v2.1版本开始，Docker部署只需要挂载一个volume (`u-tracker-data`)，简化了部署配置。

### 方法三：手动启动

```bash
# 1. 安装依赖
npm install

# 2. 启动完整系统（API服务器 + 爬虫调度器）
npm start
# 或
node index.js

# 3. 启动前端服务器（新终端）
cd frontend && node server.js

# 可选：只启动一次数据抓取
node index.js --run-once
```

### 访问应用

- **Web界面**: http://localhost:8080
- **API接口**: http://localhost:3001/api
- **健康检查**: http://localhost:3001/api/health

## 功能特性

### 后端功能
- 🕒 **定时抓取**: 使用cron定时任务，自动抓取商品数据
- 💰 **价格监控**: 实时监控商品价格变化，记录历史价格
- 📊 **数据存储**: 使用SQLite数据库存储商品信息和价格历史
- 🚨 **价格警报**: 检测价格下降、上涨和库存变化
- 📈 **数据分析**: 生成日报，分析价格趋势
- 🔄 **错误重试**: 内置重试机制和错误处理
- 📝 **详细日志**: 完整的日志记录系统
- 🔌 **RESTful API**: 提供完整的API接口供前端调用

### 前端功能
- 🎨 **现代化界面**: 基于原生Web技术的响应式设计
- 📱 **多视图模式**: 支持网格和列表两种商品展示方式
- 🔍 **智能搜索**: 支持商品名称、编号的实时模糊搜索
- 🎛️ **高级筛选**: 按价格、分类、性别、颜色、尺码、降价档数等多维度筛选
- 📊 **数据可视化**: 实时仪表板、价格历史图表、统计分析
- ⚡ **实时更新**: 自动刷新最新的价格变化和警报
- 📈 **价格趋势**: 详细的价格历史分析和变化趋势
- 🎯 **智能排序**: 支持价格、折扣、更新时间等多种排序方式
- 🔄 **监控状态**: 实时显示爬虫运行状态和最后更新时间

## 项目结构

```
u-tracker/
├── src/                    # 后端源代码
│   ├── database.js         # 数据库操作模块
│   ├── scraper.js          # 数据抓取模块
│   ├── priceTracker.js     # 价格监控模块
│   ├── scheduler.js        # 定时任务调度器
│   ├── logger.js           # 日志和错误处理
│   └── api.js              # RESTful API服务器
├── frontend/               # 前端源代码（原生Web技术）
│   ├── index.html          # 主页面
│   ├── css/                # 样式文件
│   │   ├── main.css        # 主样式
│   │   ├── components.css  # 组件样式
│   │   └── responsive.css  # 响应式样式
│   ├── js/                 # JavaScript文件
│   │   ├── app.js          # 主应用逻辑
│   │   ├── router.js       # 客户端路由
│   │   ├── api.js          # API调用
│   │   ├── utils.js        # 工具函数
│   │   └── components/     # 组件模块
│   ├── components/         # HTML组件模板
│   ├── assets/             # 静态资源
│   └── server.js           # 前端静态服务器
├── config/
│   └── default.json        # 配置文件
├── examples/               # API示例
├── data/                   # 数据库文件目录
├── logs/                   # 日志文件目录
├── reports/                # 报告文件目录
├── index.js                # 主程序（API服务器 + 爬虫调度器）
├── server.js               # 独立API服务器启动脚本（仅API，不含爬虫）
├── start.sh                # Web界面启动脚本
├── start-full.sh           # 完整系统启动脚本
├── Dockerfile              # Docker镜像构建文件
├── docker-compose.yml      # Docker Compose配置
├── build-docker.sh         # Docker构建脚本
├── package.json            # 项目依赖
└── README.md
```

## 详细使用说明

### 启动脚本说明

#### `start.sh` - Web界面启动脚本
启动API服务器和前端服务器，用于查看和分析已有数据：
```bash
./start.sh
```
- API服务器: http://localhost:3001
- Web界面: http://localhost:8080

#### `start-full.sh` - 完整系统启动脚本
启动完整系统，包括爬虫调度器：
```bash
./start-full.sh
```
- 包含所有服务：API、前端、爬虫调度器
- 自动进行数据抓取和监控

**注意**: 从v2.0版本开始，`npm start` 或 `node index.js` 命令会同时启动API服务器和爬虫调度器，无需单独启动API服务器。

**配置优化**: v2.0版本优化了配置系统，所有配置项现在都被正确使用，包括请求延迟、重试机制、日志配置和警报阈值等。

### Docker 部署

#### 快速部署
```bash
# 一键构建和启动
./build-docker.sh

# 或使用Docker Compose
docker-compose up -d
```

#### 手动Docker操作
```bash
# 构建镜像
docker build -t uniqlo-tracker .

# 运行容器
docker run -d \
  --name uniqlo-tracker \
  -p 3001:3001 \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  uniqlo-tracker
```

### 数据抓取命令

**启动完整系统（API服务器 + 定时任务）:**
```bash
npm start
# 或
node index.js
```
这会同时启动：
- API服务器（端口3001）
- 爬虫调度器（定时抓取数据）

**只运行一次数据抓取:**
```bash
npm run run-once
# 或
node index.js --run-once
```

**启动时立即运行一次:**
```bash
npm run start:initial
# 或
node index.js --initial-run
```

**生成日报:**
```bash
npm run report
# 或
node index.js --report
```

**只启动API服务器（不启动爬虫调度器）:**
```bash
node server.js
```
适用于只需要查看现有数据，不需要抓取新数据的场景。

**显示帮助信息:**
```bash
node index.js --help
```

### 配置说明

编辑 `config/default.json` 文件来自定义配置：

```json
{
  "database": {
    "path": "./data/uniqlo_tracker.db"   // 数据库文件路径
  },
  "scheduler": {
    "scrapingSchedule": "0 */2 * * *",    // 每2小时抓取一次
    "reportSchedule": "0 8 * * *",        // 每天8点生成报告
    "cleanupSchedule": "0 2 * * 0",       // 每周日2点清理数据
    "dataRetentionDays": 90               // 数据保留90天
  },
  "scraper": {
    "requestDelay": 500,                  // 请求间隔500ms
    "maxPages": 50,                       // 最大抓取页数
    "timeout": 30000,                     // 请求超时30秒
    "retryAttempts": 3,                   // 重试次数
    "retryDelay": 5000                    // 重试间隔5秒
  },
  "logging": {
    "level": "info",                      // 日志级别
    "logDir": "./logs",                   // 日志目录
    "maxFiles": 14,                       // 最大日志文件数
    "maxSize": "20m"                      // 单个日志文件最大大小
  },
  "alerts": {
    "priceDropThreshold": 5,              // 价格变化警报阈值(%)
    "significantDropThreshold": 10,       // 显著降价阈值(%)
    "enableEmailNotifications": false     // 是否启用邮件通知
  },
  "api": {
    "port": 3001                          // API服务器端口
  }
}
```

## 数据库结构

### products 表 - 商品信息
- `product_code`: 商品代码（主键）
- `name`: 商品名称
- `name_zh`: 中文名称
- `category_code`: 分类代码
- `gender`: 性别分类
- `season`: 季节
- `material`: 材质
- `main_pic`: 主图片URL

### price_history 表 - 价格历史
- `product_code`: 商品代码
- `original_price`: 原价
- `current_price`: 当前价格
- `stock_status`: 库存状态
- `available_sizes`: 可用尺码
- `available_colors`: 可用颜色
- `sales_count`: 销量
- `recorded_at`: 记录时间

### price_alerts 表 - 价格警报
- `product_code`: 商品代码
- `previous_price`: 之前价格
- `current_price`: 当前价格
- `price_change`: 价格变化
- `change_percentage`: 变化百分比
- `alert_type`: 警报类型（price_drop/price_increase/back_in_stock）

## 日志系统

系统会在 `logs/` 目录下生成以下日志文件：
- `error.log`: 错误日志
- `combined.log`: 综合日志
- `daily-YYYY-MM-DD.log`: 按日期分割的日志

## 报告系统

系统会在 `reports/` 目录下生成日报文件：
- `daily-report-YYYY-MM-DD.json`: 包含当日统计信息、价格变化、库存变化等

## API说明

### 数据源API
系统抓取优衣库超值特惠页面的API（固定端点，无需配置）：
```
POST https://d.uniqlo.cn/p/hmall-sc-service/search/searchWithCategoryCodeAndConditions/zh_CN
```

### 本地API服务
系统提供的RESTful API接口：
- **基础URL**: http://localhost:3001/api
- **健康检查**: GET /api/health
- **商品列表**: GET /api/products (支持priceLevel参数按降价档数筛选)
- **商品详情**: GET /api/products/:code
- **价格历史**: GET /api/products/:code/price-history
- **价格警报**: GET /api/alerts
- **统计数据**: GET /api/stats
- **筛选选项**: GET /api/filters
- **抓取状态**: GET /api/scraping-status

## 前端功能详解

### 🏠 仪表板页面
- **实时统计**: 显示商品总数、价格记录、警报统计
- **监控状态**: 显示爬虫运行状态、最后更新时间、运行持续时间
- **最新警报**: 实时显示最新的价格变化和库存变化
- **热门商品**: 按销量和关注度展示热门商品
- **今日统计**: 包括降价、涨价、库存变化等当日数据

### 📦 商品列表页面
- **智能搜索**: 支持商品名称、编号的实时模糊搜索
- **高级筛选**:
  - 性别筛选（男装/女装/男女同款）
  - 价格范围筛选
  - 降价档数筛选（第一档20-29%，第二档30-34%，第三档35-39%，第四档40-44%，第五档45%+）
  - 颜色和尺码筛选（支持多选）
  - 筛选逻辑：尺码/颜色使用OR逻辑，其他使用AND逻辑
- **多种排序**: 价格、折扣百分比、更新时间、价格变化时间
- **商品卡片**: 显示商品图片、价格、折扣、降价档数、更新时间等信息
- **分页浏览**: 支持大量商品的分页展示

### 🔍 商品详情页面
- **商品信息**: 完整的商品详情，包括图片、价格、属性
- **颜色尺码选择**: 交互式颜色和尺码选择，支持库存状态显示
- **价格历史**: 详细的价格变化记录和趋势分析
- **官方链接**: 直接跳转到优衣库官方商品页面
- **本地化信息**: 翻译后的颜色和尺码信息

### 🚨 价格警报页面
- **最新警报**: 显示24小时内的所有价格变化
- **降价商品**: 专门展示降价的商品，按折扣排序
- **补货提醒**: 显示重新有库存的商品
- **警报统计**: 实时统计各类警报数量
- **快速跳转**: 点击商品可直接跳转到详情页

## 技术栈

### 后端
- **Node.js**: 运行环境
- **Express**: Web框架和API服务器
- **SQLite3**: 轻量级数据库
- **Axios**: HTTP客户端
- **node-cron**: 定时任务调度
- **Winston**: 日志管理

### 前端
- **原生HTML/CSS/JavaScript**: 无框架依赖，轻量高效
- **模块化架构**: 组件化开发，易于维护和扩展
- **客户端路由**: 单页应用体验
- **响应式设计**: 适配各种设备尺寸
- **现代CSS**: 使用CSS Grid、Flexbox、CSS变量等现代特性

## 注意事项

1. **架构变更**: v2.0版本将API服务器集成到主程序中，`npm start` 现在同时启动API和爬虫功能
2. **启动选择**:
   - 使用 `node index.js` 启动完整系统（推荐）
   - 使用 `node server.js` 只启动API服务器（查看数据）
3. **请求频率**: 系统默认每次请求间隔500ms，可在配置文件中调整，避免对服务器造成过大压力
4. **数据保留**: 默认保留90天的历史数据，可在配置文件中调整
5. **错误处理**: 系统内置重试机制，网络错误时会自动重试
6. **资源占用**: SQLite数据库文件会随时间增长，建议定期清理
7. **端口占用**: 确保3001端口（API）和8080端口（前端）未被占用
8. **Docker部署**: 生产环境推荐使用Docker部署，便于管理和扩展
9. **数据备份**: 建议定期备份data目录中的数据库文件

## 开发和扩展

### 添加新的监控分类
修改 `src/scraper.js` 中的 `fetchProductsByCategory` 方法，传入不同的分类代码。

### 自定义警报条件
修改 `src/priceTracker.js` 中的 `checkPriceChange` 方法，添加自定义的价格变化检测逻辑。

### 添加通知功能
可以在 `src/priceTracker.js` 中添加邮件、微信或其他通知方式。

## 📚 文档

- **[部署指南](DEPLOYMENT.md)** - 详细的部署和配置说明
- **[Docker部署](DOCKER.md)** - Docker容器化部署指南
- **[API文档](API.md)** - 完整的API接口文档
- **[前端开发](frontend/README.md)** - 前端开发和技术说明

## 📄 许可证

ISC License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

### 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📞 支持

如果你遇到问题或有建议，请：

1. 查看 [常见问题](DEPLOYMENT.md#故障排除)
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 Issue 并提供详细信息

## 🆕 最新功能更新

### v2.2 - 降价档数分析功能 (2025-06-15)

新增智能降价档数分析功能，帮助用户更好地理解优衣库的降价规律：

#### 🎯 降价档数分级
- **第一档 (20-29%)**: 初步降价，适合观望
- **第二档 (30-34%)**: 中等降价，性价比开始显现
- **第三档 (35-39%)**: 较大降价，值得考虑购买
- **第四档 (40-44%)**: 大幅降价，高性价比
- **第五档 (45%+)**: 超大降价，抄底价格

#### ✨ 功能特点
- **智能筛选**: 在商品列表页面可按降价档数筛选商品
- **视觉标识**: 商品卡片显示彩色降价档数标签
- **API支持**: 后端API支持`priceLevel`参数筛选
- **实时计算**: 基于原价和现价实时计算降价档数

#### 🎨 视觉设计
- 不同档数使用不同颜色标识，便于快速识别
- 层级图标表示档数概念
- 与现有折扣信息完美融合

## ⭐ 致谢

感谢所有为这个项目做出贡献的开发者！
