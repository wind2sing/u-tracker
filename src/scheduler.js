const cron = require('node-cron');
const Database = require('./database');
const UniqloScraper = require('./scraper');
const ConcurrentUniqloScraper = require('./concurrentScraper');
const PriceTracker = require('./priceTracker');
const winston = require('winston');
const defaultConfig = require('../config/default.json');

class TaskScheduler {
    constructor(config = {}) {
        this.config = {
            // 默认每2小时执行一次数据抓取
            scrapingSchedule: config.scrapingSchedule || '0 */2 * * *',
            // 每天早上8点生成报告
            reportSchedule: config.reportSchedule || '0 8 * * *',
            // 每周日凌晨2点清理旧数据
            cleanupSchedule: config.cleanupSchedule || '0 2 * * 0',
            maxPages: config.maxPages || 50,
            dataRetentionDays: config.dataRetentionDays || 90,
            // 并发抓取配置
            useConcurrentScraper: config.useConcurrentScraper === true,
            maxConcurrentScraping: config.maxConcurrentScraping || defaultConfig.scraper?.maxConcurrentScraping || 1
        };

        this.db = new Database();
        // 根据配置选择抓取器
        if (this.config.useConcurrentScraper) {
            this.scraper = new ConcurrentUniqloScraper({...defaultConfig.scraper, ...config});
            console.log('🚀 使用并发抓取器');
        } else {
            this.scraper = new UniqloScraper(defaultConfig.scraper);
            console.log('📄 使用传统抓取器');
        }
        this.priceTracker = new PriceTracker(this.db, defaultConfig.alerts);
        this.isRunning = false;
        this.manualScrapingInProgress = false;
        this.tasks = [];

        // 配置日志
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'uniqlo-tracker' },
            transports: [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/combined.log' }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    async initialize() {
        try {
            await this.db.connect();
            await this.db.initTables();

            // 清理超过30分钟仍为running状态的僵尸任务
            const cleanedTasks = await this.db.cleanupStaleScrapingTasks(30);
            if (cleanedTasks > 0) {
                this.logger.info(`🧹 清理了 ${cleanedTasks} 个僵尸抓取任务`);
            }

            // 重置内存中的运行状态，防止因异常关闭导致状态不一致
            this.isRunning = false;
            this.manualScrapingInProgress = false;
            this.logger.info('🔄 重置调度器运行状态');

            this.logger.info('TaskScheduler initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize TaskScheduler:', error);
            throw error;
        }
    }

    async startScrapingTask(isManual = false) {
        // 检查是否有抓取任务正在运行
        if (this.isRunning || this.manualScrapingInProgress) {
            const message = isManual ? 'Manual scraping task is already running' : 'Scraping task is already running, skipping...';
            this.logger.warn(message);
            return { success: false, message };
        }

        // 检查并发限制
        const runningTasks = await this.db.getRunningScrapingTasks();
        if (runningTasks.length >= this.config.maxConcurrentScraping) {
            const message = `Maximum concurrent scraping tasks (${this.config.maxConcurrentScraping}) reached`;
            this.logger.warn(message);
            return { success: false, message };
        }

        if (isManual) {
            this.manualScrapingInProgress = true;
        } else {
            this.isRunning = true;
        }
        const startTime = new Date();
        const startTimeMs = Date.now();
        let scrapingStatusId = null;

        try {
            const taskType = isManual ? 'manual_scraping' : 'scraping';
            this.logger.info(`Starting ${isManual ? 'manual' : 'scheduled'} scraping task...`);

            // 记录抓取开始状态
            const statusResult = await this.db.insertScrapingStatus({
                task_type: taskType,
                status: 'running',
                start_time: startTime.toISOString(),
                products_processed: 0,
                new_products: 0,
                price_changes: 0,
                alerts_generated: 0
            });
            scrapingStatusId = statusResult.id;

            // 立即发送第一次心跳
            await this.db.updateScrapingHeartbeat(scrapingStatusId, 0, 0);

            // 创建心跳回调函数
            const heartbeatCallback = async (currentPage, totalPages) => {
                try {
                    await this.db.updateScrapingHeartbeat(scrapingStatusId, currentPage, totalPages);
                    console.log(`📡 心跳更新: 页面 ${currentPage}/${totalPages}`);
                } catch (error) {
                    console.error('心跳更新失败:', error);
                }
            };

            // 抓取商品数据（传递心跳回调）
            const products = await this.scraper.fetchAllProducts(this.config.maxPages, heartbeatCallback);

            if (products.length === 0) {
                this.logger.warn('No products fetched');

                // 更新状态为完成但无数据
                if (scrapingStatusId) {
                    await this.db.updateScrapingStatus(scrapingStatusId, {
                        status: 'completed',
                        end_time: new Date().toISOString(),
                        duration_ms: Date.now() - startTimeMs,
                        error_message: 'No products fetched'
                    });
                }
                return { success: false, message: 'No products fetched' };
            }

            // 解析商品数据
            const parsedProducts = this.scraper.parseProductsData(products);

            // 处理价格数据和变化检测
            const summary = await this.priceTracker.processProducts(parsedProducts);

            const duration = Date.now() - startTimeMs;
            const endTime = new Date();

            // 更新抓取状态为完成
            if (scrapingStatusId) {
                await this.db.updateScrapingStatus(scrapingStatusId, {
                    status: 'completed',
                    end_time: endTime.toISOString(),
                    duration_ms: duration,
                    products_processed: summary.totalProcessed,
                    new_products: summary.newProducts,
                    price_changes: summary.priceChanges,
                    alerts_generated: summary.alerts.length
                });
            }

            this.logger.info(`${isManual ? 'Manual' : 'Scheduled'} scraping task completed`, {
                duration: `${duration}ms`,
                totalProducts: summary.totalProcessed,
                newProducts: summary.newProducts,
                priceChanges: summary.priceChanges,
                alerts: summary.alerts.length
            });

            // 返回成功结果
            const result = {
                success: true,
                summary: {
                    duration: duration,
                    totalProducts: summary.totalProcessed,
                    newProducts: summary.newProducts,
                    priceChanges: summary.priceChanges,
                    alerts: summary.alerts.length,
                    significantDrops: summary.alerts.filter(alert =>
                        alert.alert_type === 'price_drop' && alert.change_percentage <= -10
                    ).length
                }
            };

            // 如果有重要的价格变化，记录详细信息
            if (summary.alerts.length > 0) {
                const significantAlerts = summary.alerts.filter(alert =>
                    alert.alert_type === 'price_drop' && alert.change_percentage <= -10
                );

                if (significantAlerts.length > 0) {
                    this.logger.info(`Found ${significantAlerts.length} significant price drops (>10%)`, {
                        alerts: significantAlerts
                    });
                }
            }

            return result;

        } catch (error) {
            this.logger.error(`${isManual ? 'Manual' : 'Scheduled'} scraping task failed:`, error);

            // 更新抓取状态为失败
            if (scrapingStatusId) {
                await this.db.updateScrapingStatus(scrapingStatusId, {
                    status: 'failed',
                    end_time: new Date().toISOString(),
                    duration_ms: Date.now() - startTimeMs,
                    error_message: error.message,
                    error_details: error.stack
                });
            }

            return { success: false, message: error.message, error: error.stack };
        } finally {
            if (isManual) {
                this.manualScrapingInProgress = false;
            } else {
                this.isRunning = false;
            }
        }
    }

    async generateDailyReport() {
        try {
            this.logger.info('Generating daily report...');
            
            const report = await this.priceTracker.generateDailyReport();
            
            this.logger.info('Daily report generated', {
                totalProducts: report.statistics.totalProducts,
                totalPriceRecords: report.statistics.totalPriceRecords,
                totalAlerts: report.statistics.totalAlerts,
                recentAlerts: report.recentAlerts,
                biggestDrops: report.biggestPriceDrops.length,
                backInStock: report.productsBackInStock.length
            });

            // 保存报告到文件
            const fs = require('fs');
            const path = require('path');
            
            const reportsDir = './reports';
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }
            
            const reportFile = path.join(reportsDir, `daily-report-${new Date().toISOString().split('T')[0]}.json`);
            fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
            
            this.logger.info(`Daily report saved to ${reportFile}`);
            
        } catch (error) {
            this.logger.error('Failed to generate daily report:', error);
        }
    }

    async cleanupOldData() {
        try {
            this.logger.info(`Cleaning up data older than ${this.config.dataRetentionDays} days...`);
            
            // 清理旧的价格历史记录
            const cleanupPriceHistorySql = `
                DELETE FROM price_history 
                WHERE recorded_at < datetime('now', '-${this.config.dataRetentionDays} days')
            `;
            
            // 清理旧的价格警报
            const cleanupAlertsSql = `
                DELETE FROM price_alerts 
                WHERE created_at < datetime('now', '-${this.config.dataRetentionDays} days')
            `;
            
            const priceHistoryResult = await this.db.run(cleanupPriceHistorySql);
            const alertsResult = await this.db.run(cleanupAlertsSql);
            
            this.logger.info('Data cleanup completed', {
                priceHistoryDeleted: priceHistoryResult.changes,
                alertsDeleted: alertsResult.changes
            });
            
        } catch (error) {
            this.logger.error('Failed to cleanup old data:', error);
        }
    }

    start() {
        this.logger.info('Starting task scheduler...');
        
        // 数据抓取任务
        const scrapingTask = cron.schedule(this.config.scrapingSchedule, async () => {
            await this.startScrapingTask();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        // 日报生成任务
        const reportTask = cron.schedule(this.config.reportSchedule, async () => {
            await this.generateDailyReport();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        // 数据清理任务
        const cleanupTask = cron.schedule(this.config.cleanupSchedule, async () => {
            await this.cleanupOldData();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        this.tasks = [
            { name: 'scraping', task: scrapingTask, schedule: this.config.scrapingSchedule },
            { name: 'report', task: reportTask, schedule: this.config.reportSchedule },
            { name: 'cleanup', task: cleanupTask, schedule: this.config.cleanupSchedule }
        ];

        // 启动所有任务
        this.tasks.forEach(({ name, task, schedule }) => {
            task.start();
            this.logger.info(`Task '${name}' scheduled with cron: ${schedule}`);
        });

        this.logger.info('All scheduled tasks started');
    }

    stop() {
        this.logger.info('Stopping task scheduler...');
        
        this.tasks.forEach(({ name, task }) => {
            task.stop();
            this.logger.info(`Task '${name}' stopped`);
        });

        this.tasks = [];
        this.logger.info('Task scheduler stopped');
    }

    async runOnce() {
        this.logger.info('Running scraping task once...');
        return await this.startScrapingTask();
    }

    async triggerManualScraping() {
        this.logger.info('Manual scraping triggered from API...');
        this.logger.info('🌐 开始全量数据抓取（使用配置文件设置）');

        // 直接使用当前配置的抓取器进行全量抓取
        const result = await this.startScrapingTask(true);
        return result;
    }

    async getStatus() {
        const latestScrapingStatus = await this.db.getLatestScrapingStatus('scraping');
        const latestManualStatus = await this.db.getLatestScrapingStatus('manual_scraping');
        const runningTasks = await this.db.getRunningScrapingTasks();

        // 获取基于心跳的真实运行状态
        const realRunningStatus = await this.db.getRealRunningTasks(60); // 60秒心跳超时
        const isReallyRunning = realRunningStatus.isReallyRunning;

        // 获取抓取器统计信息
        let scraperStats = {};
        if (this.scraper && typeof this.scraper.getStats === 'function') {
            scraperStats = this.scraper.getStats();
        }

        return {
            isRunning: this.isRunning,
            manualScrapingInProgress: this.manualScrapingInProgress,
            activeTasks: this.tasks.length,
            tasks: this.tasks.map(({ name, schedule }) => ({ name, schedule })),
            config: this.config,
            latestScraping: latestScrapingStatus,
            latestManualScraping: latestManualStatus,
            runningTasks: runningTasks.length,
            hasRunningTasks: runningTasks.length > 0,
            // 新增：基于心跳的真实状态
            reallyRunning: isReallyRunning,
            activeTasksWithHeartbeat: realRunningStatus.active,
            staleTasksWithoutHeartbeat: realRunningStatus.stale,
            scraperType: this.config.useConcurrentScraper ? 'concurrent' : 'traditional',
            scraperStats: scraperStats,
            canTriggerManual: !isReallyRunning && !this.isRunning && !this.manualScrapingInProgress && runningTasks.length < this.config.maxConcurrentScraping
        };
    }

    async shutdown() {
        this.logger.info('Shutting down task scheduler...');
        this.stop();
        await this.db.close();
        this.logger.info('Task scheduler shutdown complete');
    }
}

module.exports = TaskScheduler;
