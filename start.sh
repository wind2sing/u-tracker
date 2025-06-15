#!/bin/bash

# 优衣库价格监控系统启动脚本
# Uniqlo Price Tracker Startup Script

set -e  # 遇到错误时退出

echo "🚀 启动优衣库价格监控系统..."
echo "📅 启动时间: $(date)"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查数据库是否存在，如果不存在则运行一次数据抓取
if [ ! -f "data/uniqlo_tracker.db" ]; then
    echo "🗄️ 初始化数据库并抓取初始数据..."
    node index.js --run-once
fi

echo "🌐 启动API服务器和前端服务器..."
echo "📊 Web界面: http://localhost:8080"
echo "🔗 API接口: http://localhost:3001/api"
echo "🏥 健康检查: http://localhost:3001/api/health"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 检查是否安装了 concurrently
if ! npm list concurrently &> /dev/null; then
    echo "📦 安装 concurrently 用于并发启动服务..."
    npm install concurrently --save-dev
fi

# 创建必要的目录
mkdir -p data logs reports

# 启动API服务器和前端服务器
echo "🚀 启动后端API服务器..."
echo "🌐 启动前端静态服务器..."
echo ""

# 设置信号处理，优雅关闭
trap 'echo ""; echo "🛑 正在关闭服务..."; kill 0; exit 0' INT TERM

# 使用 concurrently 同时启动两个服务器
npx concurrently \
    --names "API,Frontend" \
    --prefix-colors "blue,green" \
    --kill-others \
    --restart-tries 3 \
    "node server.js" \
    "cd frontend && node server.js"
