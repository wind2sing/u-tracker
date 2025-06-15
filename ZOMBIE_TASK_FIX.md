# 僵尸抓取任务问题修复方案

## 🔍 问题描述

用户报告：前端点击抓取后，前端一直显示"抓取中"，但后端日志显示"Maximum concurrent scraping tasks reached"，即使重启系统后前端界面仍然显示"抓取中"状态。

## 🎯 问题根源分析

### 1. 数据库层面
- 系统异常关闭时，数据库中的抓取任务状态仍为 `'running'`
- 重启后系统检查到这些"僵尸任务"，拒绝启动新的抓取

### 2. 内存状态层面
- 调度器内存中的 `isRunning` 和 `manualScrapingInProgress` 状态可能不一致
- 即使清理了数据库，内存状态可能仍然为 `true`

### 3. 前端状态判断
- 前端依赖多个状态源判断是否在抓取
- 状态不同步导致显示错误

## 🛠️ 完整修复方案

### 1. 数据库层面修复

**文件**: `src/database.js`

添加了 `cleanupStaleScrapingTasks()` 方法：
```javascript
async cleanupStaleScrapingTasks(timeoutMinutes = 30) {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    
    const sql = `
        UPDATE scraping_status 
        SET status = 'failed', 
            end_time = CURRENT_TIMESTAMP,
            error_message = 'Task timeout - cleaned up on restart'
        WHERE status = 'running' 
        AND start_time < ?
    `;
    
    const result = await this.run(sql, [cutoffTime]);
    return result.changes;
}
```

### 2. 调度器层面修复

**文件**: `src/scheduler.js`

在 `initialize()` 方法中添加：
```javascript
// 清理超过30分钟仍为running状态的僵尸任务
const cleanedTasks = await this.db.cleanupStaleScrapingTasks(30);
if (cleanedTasks > 0) {
    this.logger.info(`🧹 清理了 ${cleanedTasks} 个僵尸抓取任务`);
}

// 重置内存中的运行状态，防止因异常关闭导致状态不一致
this.isRunning = false;
this.manualScrapingInProgress = false;
this.logger.info('🔄 重置调度器运行状态');
```

### 3. API层面修复

**文件**: `src/api.js`

添加了清理API端点：
```javascript
// 清理僵尸抓取任务
this.app.post('/api/scraping/cleanup', async (req, res) => {
    try {
        const { timeoutMinutes = 30 } = req.body;
        const cleanedTasks = await this.db.cleanupStaleScrapingTasks(timeoutMinutes);
        
        // 同时重置调度器的内存状态
        if (this.scheduler) {
            this.scheduler.isRunning = false;
            this.scheduler.manualScrapingInProgress = false;
            console.log('🔄 重置调度器运行状态');
        }
        
        res.json({
            success: true,
            message: `清理了 ${cleanedTasks} 个僵尸抓取任务`,
            cleanedTasks: cleanedTasks
        });
    } catch (error) {
        // 错误处理...
    }
});
```

### 4. 前端层面修复

**文件**: `frontend/js/pages/dashboard.js`

#### 4.1 增强状态判断逻辑
```javascript
// 综合判断是否真的在运行：需要同时检查数据库状态和调度器状态
const isActuallyRunning = isRunning || 
                         (this.schedulerStatus?.isRunning) || 
                         (this.schedulerStatus?.manualScrapingInProgress) ||
                         (runningTasks && runningTasks > 0);
```

#### 4.2 添加清理按钮
在抓取状态区域添加"清理任务"按钮，当检测到僵尸任务时显示。

#### 4.3 添加强制刷新功能
添加"刷新状态"按钮，允许用户强制刷新前端状态显示。

#### 4.4 增强轮询逻辑
```javascript
// 综合判断是否真的在运行
const isStillRunning = statusData.isRunning || 
                      schedulerData.manualScrapingInProgress || 
                      schedulerData.isRunning ||
                      (statusData.runningTasks && statusData.runningTasks.length > 0);
```

### 5. 工具层面修复

**文件**: `test-cleanup.js`

创建了测试脚本，支持：
- 检查当前僵尸任务状态
- 清理僵尸任务
- 创建测试僵尸任务
- 强制清理模式

## 🎯 使用方法

### 自动修复（推荐）
重启系统，系统会自动清理僵尸任务并重置状态：
```bash
./start.sh --full
```

### 手动修复
1. **前端操作**: 在仪表板页面点击"清理任务"或"刷新状态"按钮
2. **命令行**: 
   ```bash
   # 检查并清理
   node test-cleanup.js
   
   # 强制清理
   node test-cleanup.js --force
   ```
3. **API调用**:
   ```bash
   curl -X POST http://localhost:3001/api/scraping/cleanup
   ```

## 🔄 预防措施

1. **正常关闭**: 使用 `Ctrl+C` 正常关闭程序
2. **避免强杀**: 避免使用 `kill -9` 强制杀死进程
3. **定期检查**: 定期检查抓取状态
4. **监控日志**: 关注系统日志中的异常信息

## ✅ 修复效果

- ✅ 系统启动时自动清理僵尸任务
- ✅ 重置内存状态，确保前后端状态一致
- ✅ 提供多种手动清理方式
- ✅ 增强前端状态判断逻辑
- ✅ 提供测试工具验证修复效果

## 🧪 测试验证

使用测试脚本验证修复效果：
```bash
# 创建僵尸任务并测试清理
node test-cleanup.js --create-zombie

# 验证清理效果
node test-cleanup.js
```

这个修复方案彻底解决了僵尸抓取任务导致的前端显示异常问题，确保系统在任何情况下都能正确恢复正常的抓取功能。
