# Docker 部署指南

## 概述

本项目提供了完整的 Docker 化解决方案，将优衣库价格监控系统打包到单个容器中，包含：

- **API 服务器** (端口 3001) - 提供 REST API 接口
- **前端服务器** (端口 8080) - 提供 Web 界面
- **爬虫调度器** - 定时抓取商品数据

## 快速开始

### 方法 1: 使用构建脚本（推荐）

```bash
# 一键构建和启动
./build-docker.sh
```

这个脚本会自动：
1. 创建统一的数据目录 `u-tracker-data`
2. 构建 Docker 镜像
3. 启动容器
4. 检查服务健康状态
5. 显示访问地址

### 方法 2: 使用 Docker Compose

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方法 3: 使用 Docker 命令

```bash
# 创建数据目录
mkdir -p u-tracker-data

# 构建镜像
docker build -t uniqlo-tracker .

# 运行容器（只需要挂载一个volume）
docker run -d \
  --name uniqlo-tracker \
  -p 3001:3001 \
  -p 8080:8080 \
  -v $(pwd)/u-tracker-data:/app/u-tracker-data \
  uniqlo-tracker

# 查看日志
docker logs -f uniqlo-tracker

# 停止容器
docker stop uniqlo-tracker
docker rm uniqlo-tracker
```

## 访问应用

启动成功后，可以通过以下地址访问：

- **Web 界面**: http://localhost:8080
- **API 接口**: http://localhost:3001/api
- **健康检查**: http://localhost:3001/api/health

## 📁 数据持久化

从v2.1版本开始，Docker部署使用统一的数据目录结构，简化了volume挂载：

```
u-tracker-data/          # 统一的数据目录（只需挂载这一个）
├── data/               # 数据库文件
│   └── uniqlo_tracker.db
├── logs/               # 日志文件
│   ├── error.log
│   ├── combined.log
│   └── daily-*.log
└── reports/            # 报告文件
    └── daily-report-*.json
```

### 🔄 从旧版本迁移

如果你之前使用的是多个volume挂载，可以这样迁移：

```bash
# 停止旧容器
docker-compose down

# 创建新的统一数据目录
mkdir -p u-tracker-data

# 迁移现有数据
mv data u-tracker-data/
mv logs u-tracker-data/
mv reports u-tracker-data/

# 使用新配置启动
./build-docker.sh
```

### 优势

- **简化部署**: 只需要挂载一个volume
- **统一管理**: 所有数据集中在一个目录
- **易于备份**: 备份整个 `u-tracker-data` 目录即可

## 环境变量

可以通过环境变量配置应用：

```bash
# 在 docker-compose.yml 中设置
environment:
  - NODE_ENV=production
  - TZ=Asia/Shanghai
  - PORT=3001
  - FRONTEND_PORT=8080
```

## 进程管理

容器内使用 PM2 进程管理器来管理多个服务：

- `api-server` - API 服务
- `frontend-server` - 前端服务
- `scraper-scheduler` - 爬虫调度器

可以通过以下命令查看进程状态：

```bash
# 进入容器
docker exec -it uniqlo-tracker sh

# 查看 PM2 进程状态
pm2 status

# 查看特定进程日志
pm2 logs api-server
pm2 logs frontend-server
pm2 logs scraper-scheduler
```

## 健康检查

容器包含健康检查机制：

- 检查间隔：30秒
- 超时时间：10秒
- 重试次数：3次
- 启动等待：40秒

健康检查通过访问 `/api/health` 端点来验证服务状态。

## 故障排除

### 查看容器日志

```bash
# 查看所有日志
docker-compose logs

# 查看特定服务日志
docker-compose logs uniqlo-tracker

# 实时查看日志
docker-compose logs -f
```

### 进入容器调试

```bash
# 进入运行中的容器
docker exec -it uniqlo-tracker sh

# 查看文件系统
ls -la /app

# 查看进程状态
pm2 status
```

### 重启服务

```bash
# 重启整个容器
docker-compose restart

# 重启特定进程（在容器内）
pm2 restart api-server
pm2 restart frontend-server
pm2 restart scraper-scheduler
```

## 生产环境建议

1. **资源限制**: 在生产环境中设置适当的内存和 CPU 限制
2. **日志轮转**: 配置日志轮转以防止日志文件过大
3. **监控**: 设置容器和应用监控
4. **备份**: 定期备份数据目录
5. **安全**: 使用非 root 用户运行容器

### 生产环境 docker-compose.yml 示例

```yaml
version: '3.8'

services:
  uniqlo-tracker:
    build: .
    container_name: uniqlo-tracker
    restart: unless-stopped
    ports:
      - "3001:3001"
      - "8080:8080"
    volumes:
      # 统一挂载数据目录（包含data、logs、reports子目录）
      - ./u-tracker-data:/app/u-tracker-data
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 更新应用

```bash
# 停止当前容器
docker-compose down

# 重新构建镜像
docker-compose build --no-cache

# 启动新容器
docker-compose up -d
```
