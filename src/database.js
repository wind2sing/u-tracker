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

            console.log('Database tables initialized successfully');
        } catch (error) {
            console.error('Error initializing database tables:', error);
            throw error;
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
            (product_code, name, name_zh, category_code, gender, season, material, main_pic, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(product_code) DO UPDATE SET
                name = excluded.name,
                name_zh = excluded.name_zh,
                category_code = excluded.category_code,
                gender = excluded.gender,
                season = excluded.season,
                material = excluded.material,
                main_pic = excluded.main_pic,
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
}

module.exports = Database;
