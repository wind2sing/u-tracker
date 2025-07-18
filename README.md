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
- **🌙 智能主题**: 支持浅色/深色模式切换，自动跟随系统偏好
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
# 交互式启动（推荐新手使用）
./start.sh

# 直接启动API服务器模式（只查看数据）
./start.sh --api-only

# 直接启动完整系统（包括爬虫调度器）
./start.sh --full

# 启动完整系统并立即抓取数据
./start.sh --full --with-scraping

# 查看所有选项
./start.sh --help
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

# 3. 前端已集成到API服务器中，无需单独启动

# 可选：只启动一次数据抓取
node index.js --run-once
```

### 访问应用

- **Web界面**: http://localhost:3001 (默认端口，可配置)
- **API接口**: http://localhost:3001/api
- **健康检查**: http://localhost:3001/api/health

> 💡 **端口配置**: 系统支持通过环境变量 `PORT` 或配置文件自定义端口。详见 [部署指南](DEPLOYMENT.md) 中的端口配置章节

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

#### `start.sh` - 统一启动脚本
智能启动脚本，支持多种模式和选项：

**交互式启动（推荐）:**
```bash
./start.sh
```
- 自动检测环境和依赖
- 交互式选择启动模式
- 智能询问是否需要初始数据抓取

**命令行模式:**
```bash
# API服务器模式（只查看数据）
./start.sh --api-only

# 完整系统模式（包含爬虫调度器）
./start.sh --full

# 启动时立即抓取数据
./start.sh --full --with-scraping

# 跳过初始数据抓取
./start.sh --full --no-init-scraping
```

**两种模式的区别:**
- **API服务器模式**: 只启动Web界面和API，适合查看现有数据
- **完整系统模式**: 包含爬虫调度器，会自动定时抓取新数据

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
  -v $(pwd)/u-tracker-data:/app/u-tracker-data \
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
    "port": 3001                          // API服务器端口（可通过环境变量PORT覆盖）
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
- **商品列表**: GET /api/products (支持priceLevel参数按降价档数筛选，inStock参数按库存状态筛选)
- **商品详情**: GET /api/products/:code
- **官方商品详情**: GET /api/products/:code/official-detail (获取官方API数据)
- **商品库存信息**: GET /api/products/:code/stock (获取真实库存数据)
- **更新库存状态**: POST /api/products/:code/update-stock (同步真实库存状态到数据库)
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
  - 库存状态筛选（仅有库存/仅无库存/显示全部/仅非活跃）
  - 性别筛选（男装/女装/男女同款）
  - 价格范围筛选
  - 降价档数筛选（第一档20-29%，第二档30-34%，第三档35-39%，第四档40-44%，第五档45%+）
  - 颜色和尺码筛选（支持多选）
  - 筛选逻辑：尺码/颜色使用OR逻辑，其他使用AND逻辑
- **智能默认筛选**: 默认只显示有库存的商品，避免用户看到无库存商品
- **多种排序**: 价格、折扣百分比、最近更新、价格更新时间
- **商品卡片**: 显示商品图片、价格、折扣、降价档数、更新时间等信息
- **分页浏览**: 支持大量商品的分页展示

### 🔍 商品详情页面
- **商品信息**: 完整的商品详情，包括图片、价格、属性
- **真实库存验证**: 基于官方库存API显示准确的库存状态
- **智能颜色尺码选择**: 只显示有库存的颜色和尺码组合，自动过滤缺货选项
- **默认选中**: 自动选中第一个可用颜色，提供更好的用户体验
- **缺货提示**: 无库存商品显示友好的缺货提示信息
- **动态筛选**: 选择颜色后动态更新可用尺码，选择尺码后动态更新可用颜色
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
7. **端口占用**: 确保3001端口（统一服务器）未被占用
8. **Docker部署**: 生产环境推荐使用Docker部署，便于管理和扩展
9. **数据备份**: 建议定期备份data目录中的数据库文件

## 故障排除

### 抓取任务卡住问题

如果遇到前端显示"抓取中"但后端日志显示"Maximum concurrent scraping tasks reached"的问题：

**问题原因**: 数据库中存在状态为'running'的僵尸任务记录，通常由于系统异常关闭或重启导致。

**解决方案**:

1. **心跳机制**: 系统现在使用心跳机制实时检测抓取状态，更加准确可靠
2. **自动清理**: 系统启动时会自动清理超过30分钟的僵尸任务并重置内存状态
3. **手动清理**: 在仪表板页面点击"清理任务"按钮（同时重置前后端状态）
4. **强制刷新**: 在仪表板页面点击"刷新状态"按钮强制更新显示
5. **命令行清理**: 运行测试脚本
   ```bash
   # 检查并清理僵尸任务
   node test-cleanup.js

   # 强制清理所有超过5分钟的任务
   node test-cleanup.js --force

   # 创建测试僵尸任务然后清理
   node test-cleanup.js --create-zombie
   ```
6. **心跳状态检查**: 验证心跳机制
   ```bash
   # 检查当前心跳状态
   node test-heartbeat.js

   # 创建测试任务验证心跳
   node test-heartbeat.js --create-real
   ```
7. **API清理**: 调用清理接口
   ```bash
   curl -X POST http://localhost:3001/api/scraping/cleanup
   ```

**预防措施**:
- 使用 `Ctrl+C` 正常关闭程序
- 避免强制杀死进程
- 定期检查抓取状态

## 开发和扩展

### 添加新的监控分类
修改 `src/scraper.js` 中的 `fetchProductsByCategory` 方法，传入不同的分类代码。

### 自定义警报条件
修改 `src/priceTracker.js` 中的 `checkPriceChange` 方法，添加自定义的价格变化检测逻辑。

### 添加通知功能
可以在 `src/priceTracker.js` 中添加邮件、微信或其他通知方式。

## 📚 文档

- **[部署指南](DEPLOYMENT.md)** - 详细的部署和配置说明（包含Docker部署）
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

### 🌟 v2.5 - 智能主题系统与端口配置化 (2025-07-12)
- **🌙 智能主题切换**: 支持浅色/深色模式，自动跟随系统偏好
- **🔧 端口配置化**: 支持环境变量、配置文件等多种端口配置方式
- **🎨 视觉优化**: 完整的深色模式适配和平滑过渡动画

### � v2.4 - 真实库存验证系统 (2025-06-22)
- **✅ 真实库存API**: 集成优衣库官方库存API，确保库存信息准确
- **🎯 智能筛选**: 基于真实库存的商品筛选和显示
- **🔄 动态更新**: 实时同步库存状态到数据库

### � v2.3 - 单端口部署优化 (2025-06-15)
- **🔗 统一端口**: 前后端整合到单一端口，简化部署
- **🐳 Docker优化**: 简化容器配置，更适合生产环境
- **⚡ 启动脚本**: 智能启动脚本，支持多种启动模式

### 📊 v2.2 - 降价档数分析 (2025-06-15)
- **🎯 智能分级**: 按降价幅度分为5个档次，便于筛选
- **🎨 视觉标识**: 彩色标签显示降价档数
- **📈 实时计算**: 基于原价和现价实时计算降价档数

> 📋 **详细的功能更新记录和技术实现细节请查看** [**更新日志 (CHANGELOG.md)**](CHANGELOG.md)

## 📚 相关文档

- **[部署指南](DEPLOYMENT.md)** - 完整的部署说明，包括Docker部署
- **[API文档](API.md)** - API接口文档
- **[更新日志](CHANGELOG.md)** - 版本更新和功能改进记录
- **[测试说明](tests/README.md)** - 测试文件和工具说明

## ⭐ 致谢

感谢所有为这个项目做出贡献的开发者！
