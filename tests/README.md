# 测试文件说明

本目录包含优衣库价格监控系统的各种测试文件和工具。

## 📁 文件说明

### 🧪 功能测试

#### `test-cleanup.js`
- **用途**: 僵尸任务清理测试
- **功能**: 测试系统的任务清理机制
- **运行**: `node tests/test-cleanup.js`

#### `test-heartbeat.js`
- **用途**: 心跳机制测试
- **功能**: 测试系统的健康检查和心跳功能
- **运行**: `node tests/test-heartbeat.js`

### 🔧 配置测试

#### `test-port-config.sh`
- **用途**: 端口配置测试脚本
- **功能**: 验证端口配置的各种方式和优先级
- **运行**: `./tests/test-port-config.sh`
- **测试内容**:
  - 默认端口配置
  - 环境变量端口配置
  - 配置文件端口配置
  - 端口优先级验证
  - 启动脚本集成测试

### 🎨 界面测试

#### `test-theme.html`
- **用途**: 主题切换测试页面
- **功能**: 测试浅色/深色主题的切换效果
- **访问**: 启动系统后访问 `http://localhost:3001/tests/test-theme.html`
- **测试内容**:
  - 颜色系统测试
  - 按钮组件测试
  - 卡片组件测试
  - 表单组件测试
  - 标签组件测试
  - 警告框测试

## 🚀 运行测试

### 前置条件
确保系统已经安装了所有依赖：
```bash
npm install
```

### 运行单个测试
```bash
# 功能测试
node tests/test-cleanup.js
node tests/test-heartbeat.js

# 配置测试
./tests/test-port-config.sh

# 界面测试（需要先启动系统）
./start.sh --api-only
# 然后在浏览器中访问 http://localhost:3001/tests/test-theme.html
```

### 运行所有测试
```bash
# 运行所有自动化测试
./tests/run-all-tests.sh
```

## 📝 测试结果

### 成功标准
- ✅ 所有功能测试通过
- ✅ 端口配置测试全部通过
- ✅ 主题切换正常工作
- ✅ 无错误日志输出

### 常见问题

#### 端口被占用
```bash
# 检查端口占用
lsof -i :3001
# 或使用其他端口
PORT=8080 ./start.sh --api-only
```

#### 权限问题
```bash
# 给测试脚本添加执行权限
chmod +x tests/*.sh
```

#### 依赖缺失
```bash
# 重新安装依赖
npm install
```

## 🔧 添加新测试

### 创建新的测试文件
1. 在 `tests/` 目录下创建测试文件
2. 遵循现有的命名规范：`test-功能名.js` 或 `test-功能名.sh`
3. 添加适当的文档说明
4. 更新本README文件

### 测试文件模板

#### JavaScript测试模板
```javascript
#!/usr/bin/env node

/**
 * 测试名称：功能描述
 * 测试目的：测试目的说明
 */

console.log('🧪 开始测试：功能名称');

async function runTest() {
    try {
        // 测试逻辑
        console.log('✅ 测试通过');
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

runTest();
```

#### Shell测试模板
```bash
#!/bin/bash

# 测试名称：功能描述
# 测试目的：测试目的说明

set -e

echo "🧪 开始测试：功能名称"

# 测试逻辑

echo "✅ 测试通过"
```

## 📚 相关文档

- [部署指南](../DEPLOYMENT.md)
- [端口配置指南](../PORT_CONFIGURATION.md)
- [API文档](../API.md)
- [更新日志](../CHANGELOG.md)

---

如有问题或建议，请提交Issue或Pull Request。
