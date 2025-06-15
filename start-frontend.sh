#!/bin/bash

# 优衣库价格追踪器 - 前端启动脚本

echo "🚀 启动优衣库价格追踪器..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查后端服务器是否运行
echo "🔍 检查后端服务器..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务器正在运行"
else
    echo "⚠️  后端服务器未运行，正在启动..."
    # 在后台启动后端服务器
    nohup node server.js > backend.log 2>&1 &
    echo $! > backend.pid
    echo "🔄 等待后端服务器启动..."
    sleep 3
    
    # 再次检查
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ 后端服务器启动成功"
    else
        echo "❌ 后端服务器启动失败，请检查 backend.log"
        exit 1
    fi
fi

# 检查是否有测试数据
echo "🔍 检查测试数据..."
PRODUCT_COUNT=$(curl -s http://localhost:3001/api/stats | grep -o '"totalProducts":[0-9]*' | cut -d':' -f2)
if [ "$PRODUCT_COUNT" -eq 0 ] 2>/dev/null; then
    echo "📊 添加测试数据..."
    node add-test-data.js
else
    echo "✅ 测试数据已存在 ($PRODUCT_COUNT 个商品)"
fi

# 启动前端服务器
echo "🌐 启动前端服务器..."
cd frontend

# 检查前端服务器是否已经运行
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "⚠️  前端服务器已在运行"
else
    # 启动前端服务器
    nohup node server.js > frontend.log 2>&1 &
    echo $! > frontend.pid
    echo "🔄 等待前端服务器启动..."
    sleep 2
fi

# 检查前端服务器状态
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ 前端服务器启动成功"
    echo ""
    echo "🎉 优衣库价格追踪器已启动！"
    echo ""
    echo "📱 访问地址:"
    echo "   主应用: http://localhost:8080"
    echo "   测试页面: http://localhost:8080/test.html"
    echo "   API文档: http://localhost:3001/api/health"
    echo ""
    echo "🛑 停止服务:"
    echo "   运行 ./stop-frontend.sh"
    echo ""
    
    # 尝试打开浏览器
    if command -v open &> /dev/null; then
        echo "🌐 正在打开浏览器..."
        open http://localhost:8080
    elif command -v xdg-open &> /dev/null; then
        echo "🌐 正在打开浏览器..."
        xdg-open http://localhost:8080
    else
        echo "💡 请手动打开浏览器访问 http://localhost:8080"
    fi
else
    echo "❌ 前端服务器启动失败，请检查 frontend/frontend.log"
    exit 1
fi
