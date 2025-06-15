#!/usr/bin/env node

const ApiServer = require('./src/api');

async function main() {
    try {
        const server = new ApiServer(3001);
        await server.start();

        console.log('🚀 Uniqlo Tracker API Server started successfully!');
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
        console.log('🌐 Frontend will be available at: http://localhost:8080');
        console.log('🔗 API Base URL: http://localhost:3001/api');
        console.log(`API Server running on http://localhost:3001`);

        // 保持服务器运行
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down API server...');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start API server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = main;
