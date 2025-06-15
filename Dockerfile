# 使用官方 Node.js 18 LTS 镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖（SQLite 需要）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装 PM2 全局包用于进程管理
RUN npm install -g pm2

# 安装 Node.js 依赖
RUN npm ci --only=production

# 复制应用源代码
COPY . .

# 创建统一的数据目录结构
RUN mkdir -p u-tracker-data/data u-tracker-data/logs u-tracker-data/reports

# 创建符号链接指向统一数据目录
RUN ln -sf /app/u-tracker-data/data /app/data && \
    ln -sf /app/u-tracker-data/logs /app/logs && \
    ln -sf /app/u-tracker-data/reports /app/reports

# 设置权限
RUN chmod +x start.sh || true

# 暴露端口
# 3001: API 服务端口
# 8080: 前端服务端口
EXPOSE 3001 8080

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001
ENV FRONTEND_PORT=8080

# 创建 PM2 配置文件
RUN cat > /app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'server.js',
      cwd: '/app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'frontend-server',
      script: 'server.js',
      cwd: '/app/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    },
    {
      name: 'scraper-scheduler',
      script: 'index.js',
      args: '--initial-run',
      cwd: '/app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# 创建启动脚本
RUN cat > /app/docker-start.sh << 'EOF'
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
EOF

# 设置启动脚本权限
RUN chmod +x /app/docker-start.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["/app/docker-start.sh"]
