#!/usr/bin/env node

const TaskScheduler = require('./src/scheduler');
const ApiServer = require('./src/api');
const { logger, errorHandler } = require('./src/logger');
const config = require('./config/default.json');

class UniqloTracker {
    constructor() {
        this.scheduler = null;
        this.apiServer = null;
        this.isShuttingDown = false;
    }

    async start() {
        try {
            logger.info('Starting Uniqlo Price Tracker...');

            // 创建调度器实例
            this.scheduler = new TaskScheduler(config.scheduler);

            // 初始化调度器
            await this.scheduler.initialize();

            // 启动API服务器，传入调度器实例
            const port = process.env.PORT || config.api?.port || 3001;
            this.apiServer = new ApiServer(port, this.scheduler);
            await this.apiServer.start();
            logger.info('API Server started successfully');

            // 设置优雅关闭
            this.setupGracefulShutdown();
            
            // 检查命令行参数
            const args = process.argv.slice(2);
            
            if (args.includes('--run-once')) {
                // 只运行一次
                logger.info('Running scraping task once...');
                await this.scheduler.runOnce();
                logger.info('Single run completed, exiting...');
                process.exit(0);
            } else if (args.includes('--report')) {
                // 生成报告
                logger.info('Generating daily report...');
                await this.scheduler.generateDailyReport();
                logger.info('Report generated, exiting...');
                process.exit(0);
            } else {
                // 启动定时任务
                this.scheduler.start();
                logger.info('Uniqlo Price Tracker started successfully');
                logger.info('Scheduler status:', this.scheduler.getStatus());
                
                // 可选：启动时运行一次
                if (args.includes('--initial-run')) {
                    logger.info('Running initial scraping task...');
                    setTimeout(async () => {
                        await this.scheduler.runOnce();
                    }, 5000); // 5秒后运行
                }
            }
            
        } catch (error) {
            logger.error('Failed to start Uniqlo Price Tracker:', error);
            process.exit(1);
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) {
                logger.warn('Force shutdown...');
                process.exit(1);
            }
            
            this.isShuttingDown = true;
            logger.info(`Received ${signal}, shutting down gracefully...`);
            
            try {
                if (this.scheduler) {
                    await this.scheduler.shutdown();
                }
                if (this.apiServer) {
                    // API服务器没有shutdown方法，但会在进程退出时自动关闭
                    logger.info('API Server will be closed with process exit');
                }
                logger.info('Shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }

    async status() {
        if (this.scheduler) {
            return this.scheduler.getStatus();
        }
        return { status: 'not_running' };
    }
}

// 显示帮助信息
function showHelp() {
    console.log(`
Uniqlo Price Tracker - 优衣库商品价格监控系统

用法:
  node index.js [选项]

选项:
  --run-once      只运行一次数据抓取，不启动定时任务
  --report        生成日报并退出
  --initial-run   启动时立即运行一次数据抓取
  --help          显示此帮助信息

示例:
  node index.js                    # 启动定时任务
  node index.js --run-once         # 只运行一次
  node index.js --initial-run      # 启动定时任务并立即运行一次
  node index.js --report           # 生成报告

配置文件: config/default.json
日志目录: ./logs/
数据目录: ./data/
报告目录: ./reports/
`);
}

// 主程序入口
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const tracker = new UniqloTracker();
    await tracker.start();
}

// 只有在直接运行此文件时才执行main函数
if (require.main === module) {
    main().catch(error => {
        logger.error('Unhandled error in main:', error);
        process.exit(1);
    });
}

module.exports = UniqloTracker;
