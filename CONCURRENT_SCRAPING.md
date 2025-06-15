# 并发抓取和手动触发功能

## 🚀 新功能概述

本次更新为优衣库价格监控系统添加了以下重要功能：

### 1. 并发抓取器 (ConcurrentUniqloScraper)
- **并发处理**: 支持多页面同时抓取，显著提升抓取速度
- **批次处理**: 将页面分批处理，避免服务器过载
- **智能重试**: 指数退避重试机制，提高成功率
- **实时统计**: 提供详细的抓取统计信息

### 2. 手动触发抓取
- **前端控制**: 在仪表板页面直接触发数据抓取
- **灵活配置**: 可自定义抓取页数和抓取器类型
- **实时反馈**: 显示抓取进度和结果
- **状态监控**: 实时更新抓取状态

## 📊 配置说明

### 配置文件更新 (config/default.json)

```json
{
  "scraper": {
    "requestDelay": 500,
    "maxPages": 50,
    "timeout": 10000,
    "retryAttempts": 3,
    "retryDelay": 2000,
    "concurrency": 3,              // 新增：并发数
    "batchSize": 5,                // 新增：批次大小
    "enableManualTrigger": true,   // 新增：启用手动触发
    "maxConcurrentScraping": 1     // 新增：最大并发抓取任务数
  }
}
```

### 配置参数说明

- **concurrency**: 同时处理的页面数量（建议3-5）
- **batchSize**: 每批处理的页面数量（建议5-10）
- **enableManualTrigger**: 是否启用前端手动触发功能
- **maxConcurrentScraping**: 同时运行的抓取任务最大数量

## 🔧 使用方法

### 1. 自动选择抓取器

系统默认使用并发抓取器，可在配置中关闭：

```javascript
// 在调度器配置中
{
  useConcurrentScraper: true  // true=并发抓取器, false=传统抓取器
}
```

### 2. 手动触发抓取

#### 前端操作
1. 访问仪表板页面 (`/`)
2. 在"抓取状态"区域点击"手动抓取"按钮
3. 配置抓取参数：
   - 最大抓取页数
   - 是否使用并发抓取器
4. 点击"开始抓取"

#### API调用
```bash
# 触发手动抓取
curl -X POST http://localhost:3001/api/scraping/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "maxPages": 10,
    "useConcurrentScraper": true
  }'

# 获取调度器状态
curl http://localhost:3001/api/scheduler/status
```

### 3. 监控抓取状态

#### 前端监控
- 仪表板实时显示抓取状态
- 自动轮询更新进度
- 完成后显示通知

#### API监控
```bash
# 获取最新抓取状态
curl http://localhost:3001/api/scraping-status/latest

# 获取抓取历史
curl http://localhost:3001/api/scraping-status?limit=10
```

## 📈 性能对比

### 传统抓取器 vs 并发抓取器

| 指标 | 传统抓取器 | 并发抓取器 | 提升 |
|------|------------|------------|------|
| 抓取速度 | 串行处理 | 并发处理 | 3-5倍 |
| 资源利用 | 低 | 中等 | 更高效 |
| 错误处理 | 基础重试 | 智能重试 | 更可靠 |
| 监控信息 | 基础 | 详细统计 | 更全面 |

### 性能建议

- **小规模抓取** (≤10页): 使用传统抓取器
- **中等规模抓取** (10-50页): 使用并发抓取器，并发数3
- **大规模抓取** (>50页): 使用并发抓取器，并发数5，分批处理

## 🛡️ 安全和限制

### 并发控制
- 最大并发抓取任务数限制
- 请求间延迟控制
- 服务器负载监控

### 错误处理
- 网络错误自动重试
- 指数退避策略
- 详细错误日志

### 资源保护
- 内存使用监控
- 请求队列管理
- 超时保护机制

## 🔍 故障排除

### 常见问题

1. **并发抓取失败**
   - 检查网络连接
   - 降低并发数
   - 增加请求延迟

2. **手动触发无响应**
   - 确认调度器正在运行
   - 检查是否有其他抓取任务
   - 查看API错误日志

3. **抓取速度慢**
   - 增加并发数（不超过5）
   - 减少请求延迟
   - 检查服务器性能

### 日志查看

```bash
# 查看抓取日志
docker compose logs -f uniqlo-tracker

# 查看错误日志
tail -f logs/error.log

# 查看完整日志
tail -f logs/combined.log
```

## 🚀 部署说明

### Docker部署

1. **更新代码**:
```bash
git pull origin main
```

2. **重新构建**:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

3. **验证功能**:
```bash
# 检查API健康状态
curl http://localhost:3001/api/health

# 检查调度器状态
curl http://localhost:3001/api/scheduler/status
```

### 配置调优

根据服务器性能调整配置：

```json
{
  "scraper": {
    "concurrency": 3,        // VPS: 2-3, 高性能服务器: 5-8
    "batchSize": 5,          // VPS: 3-5, 高性能服务器: 8-10
    "requestDelay": 500      // VPS: 500-1000ms, 高性能服务器: 200-500ms
  }
}
```

## 📝 更新日志

### v2.1.0 - 并发抓取和手动触发

**新增功能**:
- ✅ 并发抓取器实现
- ✅ 手动触发抓取API
- ✅ 前端手动触发界面
- ✅ 实时状态监控
- ✅ 抓取进度通知

**改进**:
- 🔧 抓取性能提升3-5倍
- 🔧 更详细的错误处理
- 🔧 更好的用户体验
- 🔧 更全面的监控信息

**配置变更**:
- 📝 新增并发相关配置项
- 📝 调度器支持手动触发
- 📝 API服务器集成调度器

---

## 🤝 贡献

如有问题或建议，请提交Issue或Pull Request。

## 📄 许可证

MIT License
