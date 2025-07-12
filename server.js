#!/usr/bin/env node

const ApiServer = require('./src/api');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // 读取配置文件
        let configPort = 3001;
        try {
            const configPath = path.join(__dirname, 'config', 'default.json');
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            configPort = configData.api?.port || 3001;
        } catch (error) {
            console.warn('Warning: Could not read config file, using default port 3001');
        }

        const port = process.env.PORT || configPort;
        const server = new ApiServer(port);
        await server.start();

        console.log('🚀 Uniqlo Tracker Server started successfully!');
        console.log('📊 API Documentation:');
        console.log('  GET  /api/health                    - Health check');
        console.log('  GET  /api/products                  - Get products list');
        console.log('  GET  /api/products/:code            - Get product detail');
        console.log('  GET  /api/products/:code/price-history - Get price history');
        console.log('  GET  /api/alerts                    - Get price alerts');
        console.log('  GET  /api/stats                     - Get statistics');
        console.log('  GET  /api/filters                   - Get filter options');
        console.log('  GET  /api/products/trending         - Get trending products');
        console.log('');
        console.log(`🌐 Web界面: http://localhost:${port}`);
        console.log(`🔗 API接口: http://localhost:${port}/api`);
        console.log(`🏥 健康检查: http://localhost:${port}/api/health`);
        console.log(`📡 统一服务器运行在: http://localhost:${port}`);

        // 保持服务器运行
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down server...');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = main;
