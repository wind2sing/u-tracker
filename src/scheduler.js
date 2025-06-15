const cron = require('node-cron');
const Database = require('./database');
const UniqloScraper = require('./scraper');
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
            dataRetentionDays: config.dataRetentionDays || 90
        };

        this.db = new Database();
        this.scraper = new UniqloScraper(defaultConfig.scraper);
        this.priceTracker = new PriceTracker(this.db, defaultConfig.alerts);
        this.isRunning = false;
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
            this.logger.info('TaskScheduler initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize TaskScheduler:', error);
            throw error;
        }
    }

    async startScrapingTask() {
        if (this.isRunning) {
            this.logger.warn('Scraping task is already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();
        const startTimeMs = Date.now();
        let scrapingStatusId = null;

        try {
            this.logger.info('Starting scheduled scraping task...');

            // 记录抓取开始状态
            const statusResult = await this.db.insertScrapingStatus({
                task_type: 'scraping',
                status: 'running',
                start_time: startTime.toISOString(),
                products_processed: 0,
                new_products: 0,
                price_changes: 0,
                alerts_generated: 0
            });
            scrapingStatusId = statusResult.id;

            // 抓取商品数据
            const products = await this.scraper.fetchAllProducts(this.config.maxPages);

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
                return;
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

            this.logger.info('Scraping task completed', {
                duration: `${duration}ms`,
                totalProducts: summary.totalProcessed,
                newProducts: summary.newProducts,
                priceChanges: summary.priceChanges,
                alerts: summary.alerts.length
            });

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

        } catch (error) {
            this.logger.error('Scraping task failed:', error);

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
        } finally {
            this.isRunning = false;
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
        await this.startScrapingTask();
    }

    async getStatus() {
        const latestScrapingStatus = await this.db.getLatestScrapingStatus('scraping');
        const runningTasks = await this.db.getRunningScrapingTasks();

        return {
            isRunning: this.isRunning,
            activeTasks: this.tasks.length,
            tasks: this.tasks.map(({ name, schedule }) => ({ name, schedule })),
            config: this.config,
            latestScraping: latestScrapingStatus,
            runningTasks: runningTasks.length,
            hasRunningTasks: runningTasks.length > 0
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
