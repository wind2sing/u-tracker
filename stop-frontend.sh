#!/bin/bash

# 优衣库价格追踪器 - 停止脚本

echo "🛑 停止优衣库价格追踪器..."

# 停止后端服务器
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "🔄 停止后端服务器 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm backend.pid
        echo "✅ 后端服务器已停止"
    else
        echo "⚠️  后端服务器进程不存在"
        rm backend.pid
    fi
else
    echo "⚠️  未找到后端服务器PID文件"
fi

# 停止前端服务器
if [ -f frontend/frontend.pid ]; then
    FRONTEND_PID=$(cat frontend/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "🔄 停止前端服务器 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm frontend/frontend.pid
        echo "✅ 前端服务器已停止"
    else
        echo "⚠️  前端服务器进程不存在"
        rm frontend/frontend.pid
    fi
else
    echo "⚠️  未找到前端服务器PID文件"
fi

# 清理可能残留的进程
echo "🧹 清理残留进程..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node frontend/server.js" 2>/dev/null || true

echo "✅ 所有服务已停止"
