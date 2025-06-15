#!/bin/sh

echo "🚀 Starting Uniqlo Tracker in Docker container..."

# 确保数据目录结构存在
echo "📁 Ensuring data directory structure..."
mkdir -p /app/u-tracker-data/data /app/u-tracker-data/logs /app/u-tracker-data/reports

# 确保符号链接存在
if [ ! -L /app/data ]; then
    ln -sf /app/u-tracker-data/data /app/data
fi
if [ ! -L /app/logs ]; then
    ln -sf /app/u-tracker-data/logs /app/logs
fi
if [ ! -L /app/reports ]; then
    ln -sf /app/u-tracker-data/reports /app/reports
fi

# 启动 PM2 进程管理器
echo "📡 Starting all services with PM2..."
pm2-runtime start /app/ecosystem.config.js
