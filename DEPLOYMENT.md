# 部署指南

本文档提供了优衣库价格监控系统的详细部署指南，包括本地开发、生产环境和Docker部署等多种方式。

## 📋 系统要求

### 最低要求
- **Node.js**: 16.x 或更高版本
- **npm**: 8.x 或更高版本
- **内存**: 512MB RAM
- **存储**: 1GB 可用空间
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

### 推荐配置
- **Node.js**: 18.x LTS
- **内存**: 2GB RAM
- **存储**: 5GB 可用空间
- **网络**: 稳定的互联网连接

## 🚀 快速部署

### 方法一：一键启动脚本

```bash
# 克隆项目
git clone <repository-url>
cd u-tracker

# 启动Web界面（推荐用于查看数据）
./start.sh

# 或启动完整系统（包括爬虫）
./start-full.sh
```

### 方法二：Docker部署（推荐生产环境）

```bash
# 使用Docker Compose
docker-compose up -d

# 或使用构建脚本
./build-docker.sh
```

## 📦 详细安装步骤

### 1. 环境准备

#### 安装Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (使用Homebrew)
brew install node

# Windows
# 下载并安装: https://nodejs.org/
```

#### 验证安装
```bash
node --version  # 应显示 v18.x.x
npm --version   # 应显示 8.x.x
```

### 2. 项目安装

```bash
# 克隆项目
git clone <repository-url>
cd u-tracker

# 安装依赖
npm install

# 创建必要目录
mkdir -p data logs reports
```

### 3. 配置设置

#### 编辑配置文件
```bash
cp config/default.json config/production.json
# 根据需要修改配置
```

#### 主要配置项
```json
{
  "scheduler": {
    "scrapingSchedule": "0 */2 * * *",  // 抓取频率
    "dataRetentionDays": 360            // 数据保留天数
  },
  "scraper": {
    "requestDelay": 1000,               // 请求间隔
    "maxPages": 50                      // 最大页数
  }
}
```

## 🌐 部署模式

### 开发模式

适用于本地开发和测试：

```bash
# 启动API服务器
npm run server

# 启动前端服务器（新终端）
cd frontend && node server.js

# 运行一次数据抓取（可选）
npm run run-once
```

访问地址：
- Web界面: http://localhost:8080
- API接口: http://localhost:3001

### 生产模式

适用于生产环境部署：

```bash
# 设置环境变量
export NODE_ENV=production

# 启动完整系统
./start-full.sh

# 或使用PM2进程管理
npm install -g pm2
pm2 start ecosystem.config.js
```

### Docker部署

#### 单容器部署
```bash
# 构建镜像
docker build -t uniqlo-tracker .

# 运行容器
docker run -d \
  --name uniqlo-tracker \
  -p 3001:3001 \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  uniqlo-tracker
```

#### Docker Compose部署
```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 🔧 生产环境优化

### 1. 进程管理

使用PM2管理Node.js进程：

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart all
```

### 2. 反向代理

使用Nginx作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API接口
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 数据库优化

SQLite优化设置：

```bash
# 定期优化数据库
sqlite3 data/uniqlo_tracker.db "VACUUM;"

# 设置WAL模式（提高并发性能）
sqlite3 data/uniqlo_tracker.db "PRAGMA journal_mode=WAL;"
```

### 4. 日志管理

配置日志轮转：

```bash
# 安装logrotate配置
sudo tee /etc/logrotate.d/uniqlo-tracker << EOF
/path/to/u-tracker/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 node node
}
EOF
```

## 🔒 安全配置

### 1. 环境变量

创建 `.env` 文件：

```bash
NODE_ENV=production
API_PORT=3001
FRONTEND_PORT=8080
DB_PATH=./data/uniqlo_tracker.db
LOG_LEVEL=info
```

### 2. 防火墙设置

```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# 如果直接暴露应用端口
sudo ufw allow 3001  # API
sudo ufw allow 8080  # Frontend
```

### 3. SSL证书

使用Let's Encrypt获取免费SSL证书：

```bash
# 安装certbot
sudo apt install certbot

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 配置自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 监控和维护

### 1. 健康检查

```bash
# 检查API状态
curl http://localhost:3001/api/health

# 检查前端状态
curl http://localhost:8080
```

### 2. 性能监控

使用PM2监控：

```bash
# 安装PM2监控
pm2 install pm2-server-monit

# 查看实时监控
pm2 monit
```

### 3. 数据备份

```bash
#!/bin/bash
# backup.sh - 数据备份脚本

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/uniqlo-tracker"

mkdir -p $BACKUP_DIR

# 备份数据库
cp data/uniqlo_tracker.db $BACKUP_DIR/db_$DATE.db

# 备份配置
cp -r config $BACKUP_DIR/config_$DATE

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

## 🐛 故障排除

### 常见问题

1. **端口占用**
   ```bash
   # 查看端口占用
   lsof -i :3001
   lsof -i :8080
   
   # 杀死占用进程
   kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   # 修复文件权限
   chmod +x start.sh start-full.sh
   chown -R node:node /path/to/u-tracker
   ```

3. **内存不足**
   ```bash
   # 增加swap空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### 日志分析

```bash
# 查看错误日志
tail -f logs/error.log

# 查看应用日志
tail -f logs/combined.log

# 搜索特定错误
grep "ERROR" logs/combined.log
```

## 📈 扩展和升级

### 水平扩展

使用负载均衡器分发请求：

```nginx
upstream api_backend {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    location /api {
        proxy_pass http://api_backend;
    }
}
```

### 版本升级

```bash
# 备份当前版本
cp -r /current/u-tracker /backup/u-tracker-$(date +%Y%m%d)

# 拉取新版本
git pull origin main

# 安装新依赖
npm install

# 重启服务
pm2 restart all
```

## 📞 技术支持

如果遇到部署问题，请：

1. 查看日志文件获取错误信息
2. 检查系统要求是否满足
3. 确认网络连接正常
4. 提交Issue并附上详细的错误信息

---

更多详细信息请参考：
- [Docker部署指南](DOCKER.md)
- [API文档](examples/)
- [前端开发指南](frontend/README.md)
