const winston = require('winston');
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.options = {
            logLevel: options.logLevel || 'info',
            logDir: options.logDir || './logs',
            maxFiles: options.maxFiles || 14,
            maxSize: options.maxSize || '20m',
            ...options
        };

        this.ensureLogDirectory();
        this.createLogger();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.options.logDir)) {
            fs.mkdirSync(this.options.logDir, { recursive: true });
        }
    }

    createLogger() {
        const logFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
                
                if (Object.keys(meta).length > 0) {
                    log += ` ${JSON.stringify(meta)}`;
                }
                
                if (stack) {
                    log += `\n${stack}`;
                }
                
                return log;
            })
        );

        this.logger = winston.createLogger({
            level: this.options.logLevel,
            format: logFormat,
            defaultMeta: { service: 'uniqlo-tracker' },
            transports: [
                // 错误日志文件
                new winston.transports.File({
                    filename: path.join(this.options.logDir, 'error.log'),
                    level: 'error',
                    maxsize: this.options.maxSize,
                    maxFiles: this.options.maxFiles,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                }),
                
                // 综合日志文件
                new winston.transports.File({
                    filename: path.join(this.options.logDir, 'combined.log'),
                    maxsize: this.options.maxSize,
                    maxFiles: this.options.maxFiles,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                }),
                
                // 控制台输出
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });

        // 添加每日轮转日志
        this.logger.add(new winston.transports.File({
            filename: path.join(this.options.logDir, 'daily-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }));
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    error(message, error = null, meta = {}) {
        if (error instanceof Error) {
            this.logger.error(message, { 
                error: error.message, 
                stack: error.stack,
                ...meta 
            });
        } else {
            this.logger.error(message, { error, ...meta });
        }
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    // 记录API请求
    logApiRequest(url, method, status, duration, meta = {}) {
        this.info('API Request', {
            url,
            method,
            status,
            duration: `${duration}ms`,
            ...meta
        });
    }

    // 记录数据库操作
    logDatabaseOperation(operation, table, affected, duration, meta = {}) {
        this.info('Database Operation', {
            operation,
            table,
            affected,
            duration: `${duration}ms`,
            ...meta
        });
    }

    // 记录价格变化
    logPriceChange(productCode, productName, oldPrice, newPrice, changePercent) {
        const changeType = newPrice > oldPrice ? 'increase' : 'decrease';
        this.info('Price Change Detected', {
            productCode,
            productName,
            oldPrice,
            newPrice,
            changePercent: `${changePercent.toFixed(2)}%`,
            changeType
        });
    }

    // 记录系统性能
    logPerformance(operation, duration, meta = {}) {
        const level = duration > 10000 ? 'warn' : 'info';
        this.logger.log(level, 'Performance Metric', {
            operation,
            duration: `${duration}ms`,
            ...meta
        });
    }
}

// 错误处理中间件
class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // 捕获未处理的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection', reason, {
                promise: promise.toString()
            });
        });

        // 捕获未捕获的异常
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception', error);
            // 给应用一些时间来记录错误，然后退出
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // 捕获SIGINT信号（Ctrl+C）
        process.on('SIGINT', () => {
            this.logger.info('Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });

        // 捕获SIGTERM信号
        process.on('SIGTERM', () => {
            this.logger.info('Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });
    }

    // 包装异步函数以捕获错误
    wrapAsync(fn) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.logger.error(`Error in ${fn.name}:`, error);
                throw error;
            }
        };
    }

    // 重试机制
    async retry(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                this.logger.warn(`Attempt ${i + 1} failed:`, error.message);
                
                if (i < maxRetries - 1) {
                    this.logger.info(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // 指数退避
                }
            }
        }
        
        this.logger.error(`All ${maxRetries} attempts failed`, lastError);
        throw lastError;
    }

    // 创建带错误处理的函数装饰器
    withErrorHandling(fn, context = '') {
        return async (...args) => {
            const startTime = Date.now();
            try {
                const result = await fn(...args);
                const duration = Date.now() - startTime;
                this.logger.logPerformance(`${context || fn.name}`, duration);
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`Error in ${context || fn.name} after ${duration}ms:`, error);
                throw error;
            }
        };
    }
}

// 创建单例实例，使用配置文件
const config = require('../config/default.json');
const logger = new Logger(config.logging);
const errorHandler = new ErrorHandler(logger);

module.exports = {
    Logger,
    ErrorHandler,
    logger,
    errorHandler
};
