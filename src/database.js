const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/default.json');

class Database {
    constructor(dbPath = null) {
        this.dbPath = dbPath || config.database?.path || './data/uniqlo_tracker.db';
        this.db = null;

        // 确保数据目录存在
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async initTables() {
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                name_zh TEXT NOT NULL,
                category_code TEXT,
                gender TEXT,
                season TEXT,
                material TEXT,
                main_pic TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createPriceHistoryTable = `
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT NOT NULL,
                original_price REAL,
                current_price REAL,
                min_price REAL,
                max_price REAL,
                stock_status TEXT,
                available_sizes TEXT,
                available_colors TEXT,
                stores TEXT,
                sales_count INTEGER,
                evaluation_count INTEGER,
                score REAL,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_code) REFERENCES products (product_code)
            )
        `;

        const createPriceAlertsTable = `
            CREATE TABLE IF NOT EXISTS price_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT NOT NULL,
                previous_price REAL,
                current_price REAL,
                price_change REAL,
                change_percentage REAL,
                alert_type TEXT, -- 'price_drop', 'price_increase', 'back_in_stock'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_code) REFERENCES products (product_code)
            )
        `;

        const createScrapingStatusTable = `
            CREATE TABLE IF NOT EXISTS scraping_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_type TEXT NOT NULL DEFAULT 'scraping',
                status TEXT NOT NULL, -- 'running', 'completed', 'failed'
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                duration_ms INTEGER,
                products_processed INTEGER DEFAULT 0,
                new_products INTEGER DEFAULT 0,
                price_changes INTEGER DEFAULT 0,
                alerts_generated INTEGER DEFAULT 0,
                error_message TEXT,
                error_details TEXT,
                last_heartbeat DATETIME, -- 心跳时间戳
                current_page INTEGER DEFAULT 0, -- 当前抓取页数
                total_pages INTEGER DEFAULT 0, -- 总页数
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = [
            'CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code)',
            'CREATE INDEX IF NOT EXISTS idx_price_history_code ON price_history(product_code)',
            'CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(recorded_at)',
            'CREATE INDEX IF NOT EXISTS idx_price_alerts_code ON price_alerts(product_code)',
            'CREATE INDEX IF NOT EXISTS idx_price_alerts_date ON price_alerts(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_scraping_status_start_time ON scraping_status(start_time)',
            'CREATE INDEX IF NOT EXISTS idx_scraping_status_task_type ON scraping_status(task_type)',
            'CREATE INDEX IF NOT EXISTS idx_scraping_status_status ON scraping_status(status)'
        ];

        try {
            await this.run(createProductsTable);
            await this.run(createPriceHistoryTable);
            await this.run(createPriceAlertsTable);
            await this.run(createScrapingStatusTable);

            for (const indexQuery of createIndexes) {
                await this.run(indexQuery);
            }

            // 执行数据库迁移（添加新列）
            await this.migrateDatabase();

            console.log('Database tables initialized successfully');
        } catch (error) {
            console.error('Error initializing database tables:', error);
            throw error;
        }
    }

    // 数据库迁移：添加心跳相关列和商品活跃度跟踪
    async migrateDatabase() {
        try {
            // 检查是否需要添加心跳相关列
            const scrapingTableInfo = await this.all("PRAGMA table_info(scraping_status)");
            const scrapingColumnNames = scrapingTableInfo.map(col => col.name);

            if (!scrapingColumnNames.includes('last_heartbeat')) {
                console.log('添加 last_heartbeat 列...');
                await this.run('ALTER TABLE scraping_status ADD COLUMN last_heartbeat DATETIME');
            }

            if (!scrapingColumnNames.includes('current_page')) {
                console.log('添加 current_page 列...');
                await this.run('ALTER TABLE scraping_status ADD COLUMN current_page INTEGER DEFAULT 0');
            }

            if (!scrapingColumnNames.includes('total_pages')) {
                console.log('添加 total_pages 列...');
                await this.run('ALTER TABLE scraping_status ADD COLUMN total_pages INTEGER DEFAULT 0');
            }

            // 检查是否需要添加商品活跃度跟踪列
            const productsTableInfo = await this.all("PRAGMA table_info(products)");
            const productsColumnNames = productsTableInfo.map(col => col.name);

            if (!productsColumnNames.includes('last_seen_at')) {
                console.log('添加 last_seen_at 列...');
                await this.run('ALTER TABLE products ADD COLUMN last_seen_at DATETIME');
                // 为现有记录设置默认值
                await this.run('UPDATE products SET last_seen_at = CURRENT_TIMESTAMP WHERE last_seen_at IS NULL');
            }

            if (!productsColumnNames.includes('is_active')) {
                console.log('添加 is_active 列...');
                await this.run('ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT 1');
            }

            console.log('数据库迁移完成');
        } catch (error) {
            console.error('数据库迁移失败:', error);
            // 不抛出错误，允许系统继续运行
        }
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async insertProduct(productData) {
        // 使用 INSERT ... ON CONFLICT 来保持 created_at 不变，只更新其他字段
        const sql = `
            INSERT INTO products
            (product_code, name, name_zh, category_code, gender, season, material, main_pic, last_seen_at, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(product_code) DO UPDATE SET
                name = excluded.name,
                name_zh = excluded.name_zh,
                category_code = excluded.category_code,
                gender = excluded.gender,
                season = excluded.season,
                material = excluded.material,
                main_pic = excluded.main_pic,
                last_seen_at = CURRENT_TIMESTAMP,
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
        `;

        const params = [
            productData.code,
            productData.name,
            productData.name4zhCN,
            productData.categoryCode ? productData.categoryCode.join(',') : '',
            productData.sex4zhCN,
            productData.season4zhCN,
            productData.material4zhCN,
            productData.mainPic
        ];

        return await this.run(sql, params);
    }

    async insertPriceHistory(priceData) {
        const sql = `
            INSERT INTO price_history
            (product_code, original_price, current_price, min_price, max_price,
             stock_status, available_sizes, available_colors, stores,
             sales_count, evaluation_count, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            priceData.code,
            priceData.originPrice,
            priceData.minPrice,
            priceData.minVaryPrice,
            priceData.maxVaryPrice,
            priceData.stock,
            priceData.size ? priceData.size.join(',') : '',
            priceData.colorNums ? priceData.colorNums.join(',') : '',
            priceData.stores ? priceData.stores.join(',') : '',
            priceData.sales,
            priceData.evaluationCount,
            priceData.score || 0
        ];

        return await this.run(sql, params);
    }

    async getLatestPrice(productCode) {
        const sql = `
            SELECT * FROM price_history 
            WHERE product_code = ? 
            ORDER BY recorded_at DESC 
            LIMIT 1
        `;
        return await this.get(sql, [productCode]);
    }

    async insertPriceAlert(alertData) {
        const sql = `
            INSERT INTO price_alerts 
            (product_code, previous_price, current_price, price_change, change_percentage, alert_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        return await this.run(sql, Object.values(alertData));
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async getProductStats() {
        const totalProducts = await this.get('SELECT COUNT(*) as count FROM products');
        const totalPriceRecords = await this.get('SELECT COUNT(*) as count FROM price_history');
        const totalAlerts = await this.get('SELECT COUNT(*) as count FROM price_alerts');

        return {
            totalProducts: totalProducts.count,
            totalPriceRecords: totalPriceRecords.count,
            totalAlerts: totalAlerts.count
        };
    }

    // 抓取状态相关方法
    async insertScrapingStatus(statusData) {
        const sql = `
            INSERT INTO scraping_status
            (task_type, status, start_time, products_processed, new_products, price_changes, alerts_generated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            statusData.task_type || 'scraping',
            statusData.status,
            statusData.start_time,
            statusData.products_processed || 0,
            statusData.new_products || 0,
            statusData.price_changes || 0,
            statusData.alerts_generated || 0
        ];

        return await this.run(sql, params);
    }

    async updateScrapingStatus(id, updateData) {
        const fields = [];
        const params = [];

        if (updateData.status !== undefined) {
            fields.push('status = ?');
            params.push(updateData.status);
        }

        if (updateData.end_time !== undefined) {
            fields.push('end_time = ?');
            params.push(updateData.end_time);
        }

        if (updateData.duration_ms !== undefined) {
            fields.push('duration_ms = ?');
            params.push(updateData.duration_ms);
        }

        if (updateData.products_processed !== undefined) {
            fields.push('products_processed = ?');
            params.push(updateData.products_processed);
        }

        if (updateData.new_products !== undefined) {
            fields.push('new_products = ?');
            params.push(updateData.new_products);
        }

        if (updateData.price_changes !== undefined) {
            fields.push('price_changes = ?');
            params.push(updateData.price_changes);
        }

        if (updateData.alerts_generated !== undefined) {
            fields.push('alerts_generated = ?');
            params.push(updateData.alerts_generated);
        }

        if (updateData.error_message !== undefined) {
            fields.push('error_message = ?');
            params.push(updateData.error_message);
        }

        if (updateData.error_details !== undefined) {
            fields.push('error_details = ?');
            params.push(updateData.error_details);
        }

        if (fields.length === 0) {
            return { changes: 0 };
        }

        params.push(id);
        const sql = `UPDATE scraping_status SET ${fields.join(', ')} WHERE id = ?`;

        return await this.run(sql, params);
    }

    async getLatestScrapingStatus(taskType = 'scraping') {
        const sql = `
            SELECT * FROM scraping_status
            WHERE task_type = ?
            ORDER BY start_time DESC
            LIMIT 1
        `;
        return await this.get(sql, [taskType]);
    }

    async getScrapingStatusHistory(taskType = 'scraping', limit = 10) {
        const sql = `
            SELECT * FROM scraping_status
            WHERE task_type = ?
            ORDER BY start_time DESC
            LIMIT ?
        `;
        return await this.all(sql, [taskType, limit]);
    }

    async getRunningScrapingTasks() {
        const sql = `
            SELECT * FROM scraping_status
            WHERE status = 'running'
            ORDER BY start_time DESC
        `;
        return await this.all(sql);
    }

    // 清理僵尸抓取任务（超过一定时间仍为running状态的任务）
    async cleanupStaleScrapingTasks(timeoutMinutes = 30) {
        const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

        const sql = `
            UPDATE scraping_status
            SET status = 'failed',
                end_time = CURRENT_TIMESTAMP,
                error_message = 'Task timeout - cleaned up on restart'
            WHERE status = 'running'
            AND start_time < ?
        `;

        const result = await this.run(sql, [cutoffTime]);
        return result.changes;
    }

    // 更新抓取任务心跳
    async updateScrapingHeartbeat(id, currentPage = 0, totalPages = 0) {
        const sql = `
            UPDATE scraping_status
            SET last_heartbeat = CURRENT_TIMESTAMP,
                current_page = ?,
                total_pages = ?
            WHERE id = ? AND status = 'running'
        `;

        return await this.run(sql, [currentPage, totalPages, id]);
    }

    // 检查是否有活跃的抓取任务（基于心跳）
    async getActiveScrapingTasks(heartbeatTimeoutSeconds = 60) {
        const cutoffTime = new Date(Date.now() - heartbeatTimeoutSeconds * 1000).toISOString();

        const sql = `
            SELECT * FROM scraping_status
            WHERE status = 'running'
            AND last_heartbeat IS NOT NULL
            AND last_heartbeat > ?
            ORDER BY start_time DESC
        `;

        return await this.all(sql, [cutoffTime]);
    }

    // 获取真实运行中的任务（基于心跳检查）
    async getRealRunningTasks(heartbeatTimeoutSeconds = 60) {
        const activeTasks = await this.getActiveScrapingTasks(heartbeatTimeoutSeconds);
        const staleTasks = await this.getStaleRunningTasks(heartbeatTimeoutSeconds);

        return {
            active: activeTasks,
            stale: staleTasks,
            isReallyRunning: activeTasks.length > 0
        };
    }

    // 获取失去心跳的运行任务
    async getStaleRunningTasks(heartbeatTimeoutSeconds = 60) {
        const cutoffTime = new Date(Date.now() - heartbeatTimeoutSeconds * 1000).toISOString();

        const sql = `
            SELECT * FROM scraping_status
            WHERE status = 'running'
            AND (
                last_heartbeat IS NULL
                OR last_heartbeat <= ?
            )
            ORDER BY start_time DESC
        `;

        return await this.all(sql, [cutoffTime]);
    }

    // 商品活跃度管理方法
    async markInactiveProducts(hoursThreshold = 48) {
        const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

        const sql = `
            UPDATE products
            SET is_active = 0
            WHERE last_seen_at < ?
            AND is_active = 1
        `;

        const result = await this.run(sql, [cutoffTime]);
        console.log(`标记了 ${result.changes} 个商品为非活跃状态（超过${hoursThreshold}小时未出现）`);
        return result.changes;
    }

    // 获取非活跃商品列表
    async getInactiveProducts(limit = 100) {
        const sql = `
            SELECT p.*, ph.stock_status, ph.current_price, ph.recorded_at as last_price_update
            FROM products p
            LEFT JOIN price_history ph ON p.product_code = ph.product_code
            WHERE p.is_active = 0
            AND ph.id IN (
                SELECT MAX(id) FROM price_history
                GROUP BY product_code
            )
            ORDER BY p.last_seen_at DESC
            LIMIT ?
        `;

        return await this.all(sql, [limit]);
    }

    // 获取活跃商品统计
    async getProductActivityStats() {
        const activeCount = await this.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
        const inactiveCount = await this.get('SELECT COUNT(*) as count FROM products WHERE is_active = 0');
        const totalCount = await this.get('SELECT COUNT(*) as count FROM products');

        return {
            active: activeCount.count,
            inactive: inactiveCount.count,
            total: totalCount.count,
            activePercentage: totalCount.count > 0 ? (activeCount.count / totalCount.count * 100).toFixed(1) : 0
        };
    }
}

module.exports = Database;
