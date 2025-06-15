# 心跳机制：精确的抓取状态检测

## 🎯 问题背景

用户反馈：即使修复了僵尸任务清理机制，前端状态判断仍然不够准确。需要一个更直接、更可靠的方法来判断当前是否真的在抓取。

## 💡 解决思路

实现基于心跳的实时状态检测机制：
- **进程级别的状态跟踪**：抓取过程中定期发送心跳
- **实时状态检查**：通过最近的心跳时间判断是否真的在抓取
- **精确状态判断**：区分真正运行的任务和僵尸任务

## 🔧 技术实现

### 1. 数据库层面

**新增字段**：
```sql
ALTER TABLE scraping_status ADD COLUMN last_heartbeat DATETIME;
ALTER TABLE scraping_status ADD COLUMN current_page INTEGER DEFAULT 0;
ALTER TABLE scraping_status ADD COLUMN total_pages INTEGER DEFAULT 0;
```

**核心方法**：
```javascript
// 更新心跳
async updateScrapingHeartbeat(id, currentPage = 0, totalPages = 0)

// 获取活跃任务（基于心跳）
async getActiveScrapingTasks(heartbeatTimeoutSeconds = 60)

// 获取真实运行状态
async getRealRunningTasks(heartbeatTimeoutSeconds = 60)

// 获取失去心跳的任务
async getStaleRunningTasks(heartbeatTimeoutSeconds = 60)
```

### 2. 抓取器层面

**传统抓取器**：
```javascript
async fetchAllProducts(maxPages = null, heartbeatCallback = null) {
    while (hasMore && currentPage <= maxPagesToFetch) {
        // 发送心跳
        if (heartbeatCallback && typeof heartbeatCallback === 'function') {
            await heartbeatCallback(currentPage, maxPagesToFetch);
        }
        
        // 抓取页面...
    }
}
```

**并发抓取器**：
```javascript
async fetchAllProductsConcurrent(maxPages = null, heartbeatCallback = null) {
    while (hasMore && currentPage <= maxPagesToFetch) {
        // 批次开始前发送心跳
        if (heartbeatCallback && typeof heartbeatCallback === 'function') {
            await heartbeatCallback(batchStart, maxPagesToFetch);
        }
        
        // 并发处理批次...
    }
}
```

### 3. 调度器层面

**心跳回调**：
```javascript
// 创建心跳回调函数
const heartbeatCallback = async (currentPage, totalPages) => {
    try {
        await this.db.updateScrapingHeartbeat(scrapingStatusId, currentPage, totalPages);
        console.log(`📡 心跳更新: 页面 ${currentPage}/${totalPages}`);
    } catch (error) {
        console.error('心跳更新失败:', error);
    }
};

// 传递给抓取器
const products = await this.scraper.fetchAllProducts(this.config.maxPages, heartbeatCallback);
```

**状态检查**：
```javascript
async getStatus() {
    // 获取基于心跳的真实运行状态
    const realRunningStatus = await this.db.getRealRunningTasks(60);
    const isReallyRunning = realRunningStatus.isReallyRunning;
    
    return {
        // 传统状态
        isRunning: this.isRunning,
        manualScrapingInProgress: this.manualScrapingInProgress,
        
        // 新增：基于心跳的真实状态
        reallyRunning: isReallyRunning,
        activeTasksWithHeartbeat: realRunningStatus.active,
        staleTasksWithoutHeartbeat: realRunningStatus.stale,
        
        canTriggerManual: !isReallyRunning && !this.isRunning && !this.manualScrapingInProgress
    };
}
```

### 4. API层面

**状态接口增强**：
```javascript
// /api/scraping-status/latest
{
    "latest": {...},
    "isRunning": false,
    "runningTasks": [...],
    
    // 新增：基于心跳的真实状态
    "reallyRunning": false,
    "activeTasksWithHeartbeat": [],
    "staleTasksWithoutHeartbeat": [...]
}

// /api/scheduler/status
{
    "isRunning": false,
    "manualScrapingInProgress": false,
    
    // 新增：基于心跳的真实状态
    "reallyRunning": false,
    "activeTasksWithHeartbeat": [],
    "staleTasksWithoutHeartbeat": [],
    
    "canTriggerManual": true
}
```

### 5. 前端层面

**精确状态判断**：
```javascript
// 使用基于心跳的真实状态判断（最准确的方法）
const isActuallyRunning = reallyRunning || 
                         (this.schedulerStatus?.reallyRunning) ||
                         (activeTasksWithHeartbeat && activeTasksWithHeartbeat.length > 0);
```

**详细状态显示**：
```javascript
${isActuallyRunning ? `
  <div class="text-warning">数据抓取正在进行中...</div>
  ${activeTasksWithHeartbeat && activeTasksWithHeartbeat.length > 0 ? `
    <div class="text-xs text-success mt-1">
      ❤️ 活跃任务: ${activeTasksWithHeartbeat.length} 个
      (页面 ${activeTasksWithHeartbeat[0].current_page}/${activeTasksWithHeartbeat[0].total_pages || '?'})
    </div>
  ` : ''}
` : ''}
${staleTasksWithoutHeartbeat && staleTasksWithoutHeartbeat.length > 0 ? `
  <div class="text-xs text-warning mt-1">
    ⚠️ 僵尸任务: ${staleTasksWithoutHeartbeat.length} 个（无心跳）
  </div>
` : ''}
```

## 🎯 优势特点

### 1. **实时性**
- 抓取过程中每页/每批次都发送心跳
- 心跳包含当前进度信息（页面数）
- 60秒心跳超时，快速检测异常

### 2. **准确性**
- 直接反映抓取进程的真实状态
- 不依赖内存状态或数据库状态标志
- 能够区分真正运行和僵尸任务

### 3. **可视化**
- 前端显示实时进度（当前页/总页数）
- 区分活跃任务和僵尸任务
- 提供详细的心跳时间信息

### 4. **兼容性**
- 支持传统抓取器和并发抓取器
- 向后兼容现有API
- 渐进式增强，不影响现有功能

## 🧪 测试验证

### 测试脚本
```bash
# 检查当前心跳状态
node test-heartbeat.js

# 创建有心跳的测试任务
node test-heartbeat.js --create-real

# 创建无心跳的测试任务
node test-heartbeat.js --create-fake
```

### 测试结果示例
```
💓 检查基于心跳的真实运行状态...
真实运行中的任务数量: 1
失去心跳的任务数量: 0
是否真的在运行: 是

活跃任务详情（有心跳）:
  1. ID: 20, 进度: 5/20, 最后心跳: 6/15/2025, 2:44:59 PM
```

## 🔄 数据库迁移

系统会自动检测并添加新字段：
```javascript
async migrateDatabase() {
    const tableInfo = await this.all("PRAGMA table_info(scraping_status)");
    const columnNames = tableInfo.map(col => col.name);
    
    if (!columnNames.includes('last_heartbeat')) {
        await this.run('ALTER TABLE scraping_status ADD COLUMN last_heartbeat DATETIME');
    }
    
    if (!columnNames.includes('current_page')) {
        await this.run('ALTER TABLE scraping_status ADD COLUMN current_page INTEGER DEFAULT 0');
    }
    
    if (!columnNames.includes('total_pages')) {
        await this.run('ALTER TABLE scraping_status ADD COLUMN total_pages INTEGER DEFAULT 0');
    }
}
```

## 📊 效果对比

| 检测方法 | 准确性 | 实时性 | 可靠性 | 详细程度 |
|---------|--------|--------|--------|----------|
| 数据库状态 | ⭐⭐ | ⭐ | ⭐⭐ | ⭐ |
| 内存状态 | ⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐ |
| **心跳机制** | **⭐⭐⭐** | **⭐⭐⭐** | **⭐⭐⭐** | **⭐⭐⭐** |

## 🎉 总结

心跳机制提供了最准确、最可靠的抓取状态检测方法：

1. **解决了状态不一致问题**：不再依赖可能过期的数据库状态或内存状态
2. **提供了实时进度信息**：用户可以看到具体的抓取进度
3. **增强了系统可靠性**：能够快速检测和处理异常情况
4. **改善了用户体验**：前端显示更加准确和详细

这个机制彻底解决了"前端显示抓取中但实际没有抓取"的问题，为用户提供了真实可靠的状态信息。
