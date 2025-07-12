#!/bin/bash

# 优衣库价格监控系统 Docker 构建脚本

set -e

echo "🚀 Building Uniqlo Tracker Docker Image..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# 读取端口配置
PORT=${PORT:-$(node -e "
try {
  const config = require('./config/default.json');
  console.log(config.api?.port || 3001);
} catch (e) {
  console.log(3001);
}
" 2>/dev/null || echo "3001")}

echo "🔧 Using port: $PORT"

# 创建统一的数据目录
echo "📁 Creating unified data directory..."
mkdir -p u-tracker-data/data u-tracker-data/logs u-tracker-data/reports

# 清理旧的镜像和容器
echo "🧹 Cleaning up old containers and images..."
docker-compose down 2>/dev/null || true
docker rmi uniqlo-tracker 2>/dev/null || true

# 构建新镜像
echo "🔨 Building Docker image..."
docker-compose build --no-cache

# 启动服务
echo "🚀 Starting services..."
docker-compose up -d

# 等待服务启动
echo "⏳ Waiting for services to start..."
sleep 10

# 检查服务状态
echo "🔍 Checking service health..."
if curl -f http://localhost:$PORT/api/health > /dev/null 2>&1; then
    echo "✅ Unified server (API + Frontend) is healthy"
else
    echo "❌ Unified server is not responding"
fi

if curl -f http://localhost:$PORT > /dev/null 2>&1; then
    echo "✅ Frontend interface is accessible"
else
    echo "❌ Frontend interface is not responding"
fi

echo ""
echo "🎉 Uniqlo Tracker is now running!"
echo "📱 Web Interface: http://localhost:$PORT"
echo "🔗 API Endpoint: http://localhost:$PORT/api"
echo ""
echo "📁 Data Directory: ./u-tracker-data (contains data, logs, reports)"
echo "📊 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
