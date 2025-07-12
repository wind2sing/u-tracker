#!/bin/bash

# 优衣库价格监控系统统一启动脚本
# Uniqlo Price Tracker Unified Startup Script

set -e  # 遇到错误时退出

# 显示帮助信息
show_help() {
    echo "优衣库价格监控系统启动脚本"
    echo ""
    echo "用法:"
    echo "  ./start.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --api-only          只启动API服务器（不包含爬虫调度器）"
    echo "  --full              启动完整系统（包含爬虫调度器）"
    echo "  --with-scraping     启动时立即运行一次数据抓取"
    echo "  --no-init-scraping  跳过初始数据抓取（即使数据库不存在）"
    echo "  --help, -h          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./start.sh                    # 交互式选择启动模式"
    echo "  ./start.sh --api-only         # 只启动API服务器"
    echo "  ./start.sh --full             # 启动完整系统"
    echo "  ./start.sh --full --with-scraping  # 启动完整系统并立即抓取"
    echo ""
}

# 解析命令行参数
API_ONLY=false
FULL_MODE=false
WITH_SCRAPING=false
NO_INIT_SCRAPING=false
INTERACTIVE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --api-only)
            API_ONLY=true
            INTERACTIVE=false
            shift
            ;;
        --full)
            FULL_MODE=true
            INTERACTIVE=false
            shift
            ;;
        --with-scraping)
            WITH_SCRAPING=true
            shift
            ;;
        --no-init-scraping)
            NO_INIT_SCRAPING=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

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

# 创建必要的目录
mkdir -p data logs reports

# 读取配置文件中的端口，如果读取失败则使用默认端口3001
PORT=$(node -e "
try {
  const config = require('./config/default.json');
  console.log(process.env.PORT || config.api?.port || 3001);
} catch (e) {
  console.log(process.env.PORT || 3001);
}
" 2>/dev/null || echo "3001")

# 交互式选择模式
if [ "$INTERACTIVE" = true ]; then
    echo ""
    echo "请选择启动模式："
    echo "1) API服务器模式 - 只启动Web界面和API（适合查看数据）"
    echo "2) 完整系统模式 - 启动Web界面、API和爬虫调度器（适合生产环境）"
    echo ""
    read -p "请输入选择 (1 或 2): " choice

    case $choice in
        1)
            API_ONLY=true
            ;;
        2)
            FULL_MODE=true
            ;;
        *)
            echo "❌ 无效选择，默认使用API服务器模式"
            API_ONLY=true
            ;;
    esac
fi

# 检查数据库是否存在，询问是否需要初始抓取
if [ ! -f "data/uniqlo_tracker.db" ] && [ "$NO_INIT_SCRAPING" = false ]; then
    echo ""
    echo "⚠️  检测到数据库不存在"
    if [ "$INTERACTIVE" = true ]; then
        read -p "是否需要运行一次初始数据抓取？(y/N): " init_scrape
        case $init_scrape in
            [Yy]*)
                echo "🗄️ 初始化数据库并抓取初始数据..."
                node index.js --run-once
                ;;
            *)
                echo "⏭️ 跳过初始数据抓取"
                ;;
        esac
    else
        echo "🗄️ 初始化数据库并抓取初始数据..."
        node index.js --run-once
    fi
fi

# 根据选择的模式启动服务
if [ "$API_ONLY" = true ]; then
    echo ""
    echo "🌐 启动API服务器模式..."
    echo "📊 Web界面: http://localhost:$PORT"
    echo "🔗 API接口: http://localhost:$PORT/api"
    echo "🏥 健康检查: http://localhost:$PORT/api/health"
    echo "ℹ️  注意: 此模式不包含爬虫调度器，不会自动抓取新数据"
    echo ""
    echo "按 Ctrl+C 停止服务"

    # 设置信号处理，优雅关闭
    trap 'echo ""; echo "🛑 正在关闭API服务器..."; kill 0; exit 0' INT TERM

    echo "🚀 启动API服务器..."
    node server.js

elif [ "$FULL_MODE" = true ]; then
    echo ""
    echo "🌐 启动完整系统模式..."
    echo "📊 Web界面: http://localhost:$PORT"
    echo "🔗 API接口: http://localhost:$PORT/api"
    echo "🏥 健康检查: http://localhost:$PORT/api/health"
    echo "🕷️ 爬虫调度器: 自动运行（每2小时抓取一次）"
    echo ""
    echo "按 Ctrl+C 停止服务"

    # 设置信号处理，优雅关闭
    trap 'echo ""; echo "🛑 正在关闭完整系统..."; kill 0; exit 0' INT TERM

    echo "🚀 启动完整系统..."
    if [ "$WITH_SCRAPING" = true ]; then
        node index.js --initial-run
    else
        node index.js
    fi
fi
