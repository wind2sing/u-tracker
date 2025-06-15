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
# 3001: 统一服务端口（API + 前端）
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 设置启动脚本权限
RUN chmod +x /app/docker-start.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["/app/docker-start.sh"]
