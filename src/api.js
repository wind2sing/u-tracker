const express = require('express');
const cors = require('cors');
const Database = require('./database');
const PriceTracker = require('./priceTracker');

class ApiServer {
    constructor(port = 3001) {
        this.app = express();
        this.port = port;
        this.db = new Database();
        this.priceTracker = new PriceTracker(this.db);
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // 静态文件服务 - 为商品图片提供代理
        this.app.use('/images', async (req, res, next) => {
            try {
                const imageUrl = req.path;
                const fullUrl = `https://www.uniqlo.cn${imageUrl}`;

                // 使用fetch获取图片
                const response = await fetch(fullUrl);

                if (!response.ok) {
                    return res.status(404).send('Image not found');
                }

                // 设置正确的Content-Type
                const contentType = response.headers.get('content-type');
                if (contentType) {
                    res.set('Content-Type', contentType);
                }

                // 设置缓存头
                res.set('Cache-Control', 'public, max-age=86400'); // 缓存1天

                // 将图片数据流式传输到响应
                const buffer = await response.arrayBuffer();
                res.send(Buffer.from(buffer));

            } catch (error) {
                console.error('Image proxy error:', error);
                res.status(500).send('Image proxy error');
            }
        });
    }

    setupRoutes() {
        // 健康检查
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // 获取商品列表
        this.app.get('/api/products', async (req, res) => {
            try {
                const {
                    page = 1,
                    limit = 20,
                    search = '',
                    category = '',
                    gender = '',
                    season = '',
                    minPrice = 0,
                    maxPrice = 10000,
                    sortBy = 'updated_at',
                    sortOrder = 'desc',
                    inStock = '',
                    colors = '',
                    sizes = ''
                } = req.query;

                const products = await this.getProducts({
                    page: parseInt(page),
                    limit: parseInt(limit),
                    search,
                    category,
                    gender,
                    season,
                    minPrice: parseFloat(minPrice),
                    maxPrice: parseFloat(maxPrice),
                    sortBy,
                    sortOrder,
                    inStock,
                    colors,
                    sizes
                });

                res.json(products);
            } catch (error) {
                console.error('Error fetching products:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取热门商品 (必须在 :code 路由之前)
        this.app.get('/api/products/trending', async (req, res) => {
            try {
                const { limit = 10 } = req.query;
                const trending = await this.priceTracker.getTopSellingProducts(parseInt(limit));
                res.json(trending);
            } catch (error) {
                console.error('Error fetching trending products:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取商品详情
        this.app.get('/api/products/:code', async (req, res) => {
            try {
                const { code } = req.params;
                const product = await this.getProductDetail(code);

                if (!product) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                res.json(product);
            } catch (error) {
                console.error('Error fetching product detail:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取商品价格历史
        this.app.get('/api/products/:code/price-history', async (req, res) => {
            try {
                const { code } = req.params;
                const { days = 30 } = req.query;

                const history = await this.priceTracker.getPriceHistory(code, parseInt(days));
                res.json(history);
            } catch (error) {
                console.error('Error fetching price history:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取价格警报
        this.app.get('/api/alerts', async (req, res) => {
            try {
                const { hours = 24, type = '' } = req.query;

                let alerts;
                if (type === 'price_drop') {
                    alerts = await this.priceTracker.getBiggestPriceDrops(1, 50);
                } else if (type === 'back_in_stock') {
                    alerts = await this.priceTracker.getProductsBackInStock(7);
                } else {
                    alerts = await this.priceTracker.getRecentAlerts(parseInt(hours));
                }

                // Format alerts to include proper image URLs and local timezone
                const formattedAlerts = alerts.map(alert => ({
                    ...alert,
                    main_pic: alert.main_pic ? `https://www.uniqlo.cn${alert.main_pic}` : null,
                    // 将UTC时间转换为本地时区时间
                    created_at: this.convertToLocalTime(alert.created_at)
                }));

                res.json(formattedAlerts);
            } catch (error) {
                console.error('Error fetching alerts:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取统计数据
        this.app.get('/api/stats', async (req, res) => {
            try {
                const stats = await this.getStats();
                res.json(stats);
            } catch (error) {
                console.error('Error fetching stats:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取筛选选项
        this.app.get('/api/filters', async (req, res) => {
            try {
                const filters = await this.getFilterOptions();
                res.json(filters);
            } catch (error) {
                console.error('Error fetching filters:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取抓取状态
        this.app.get('/api/scraping-status', async (req, res) => {
            try {
                const { limit = 10 } = req.query;
                const scrapingStatus = await this.getScrapingStatus(parseInt(limit));
                res.json(scrapingStatus);
            } catch (error) {
                console.error('Error fetching scraping status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 获取最新抓取状态
        this.app.get('/api/scraping-status/latest', async (req, res) => {
            try {
                const latestStatus = await this.db.getLatestScrapingStatus('scraping');
                const runningTasks = await this.db.getRunningScrapingTasks();

                res.json({
                    latest: latestStatus,
                    isRunning: runningTasks.length > 0,
                    runningTasks: runningTasks
                });
            } catch (error) {
                console.error('Error fetching latest scraping status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    async getProducts(options) {
        const {
            page,
            limit,
            search,
            category,
            gender,
            season,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder,
            inStock,
            colors,
            sizes
        } = options;

        const offset = (page - 1) * limit;

        let whereConditions = [];
        let params = [];

        // 搜索条件
        if (search) {
            whereConditions.push('(p.name_zh LIKE ? OR p.name LIKE ? OR p.product_code LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // 分类筛选
        if (category) {
            whereConditions.push('p.category_code LIKE ?');
            params.push(`%${category}%`);
        }

        // 性别筛选（支持复杂的性别字段匹配）
        if (gender) {
            if (gender === '男装') {
                // 男装：包括 "男装"、"男装/男女同款"、"男款/男女同款" 等
                whereConditions.push('(p.gender LIKE ? OR p.gender LIKE ? OR p.gender LIKE ?)');
                params.push('%男装%', '%男款%', '%男女同款%');
            } else if (gender === '女装') {
                // 女装：包括 "女装"、"女装/男女同款"、"男女同款" 等
                whereConditions.push('(p.gender LIKE ? OR p.gender LIKE ?)');
                params.push('%女装%', '%男女同款%');
            } else if (gender === '童装') {
                // 童装：包括所有包含"童"的性别
                whereConditions.push('p.gender LIKE ?');
                params.push('%童%');
            } else if (gender === '男女同款') {
                // 男女同款：包括所有包含"男女同款"的性别
                whereConditions.push('p.gender LIKE ?');
                params.push('%男女同款%');
            } else {
                // 其他情况直接匹配
                whereConditions.push('p.gender = ?');
                params.push(gender);
            }
        }

        // 季节筛选
        if (season) {
            whereConditions.push('p.season = ?');
            params.push(season);
        }

        // 库存筛选
        if (inStock === 'true') {
            whereConditions.push('ph.stock_status = "Y"');
        } else if (inStock === 'false') {
            whereConditions.push('ph.stock_status = "N"');
        }

        // 价格范围筛选
        if (minPrice !== undefined && maxPrice !== undefined) {
            whereConditions.push('ph.current_price BETWEEN ? AND ?');
            params.push(minPrice, maxPrice);
        }

        // 颜色筛选
        if (colors) {
            const colorList = colors.split(',').map(c => c.trim()).filter(Boolean);
            if (colorList.length > 0) {
                const colorConditions = colorList.map(() => 'ph.available_colors LIKE ?').join(' OR ');
                whereConditions.push(`(${colorConditions})`);
                colorList.forEach(color => {
                    params.push(`%${color}%`);
                });
            }
        }

        // 尺码筛选
        if (sizes) {
            const sizeList = sizes.split(',').map(s => s.trim()).filter(Boolean);
            if (sizeList.length > 0) {
                const sizeConditions = sizeList.map(() => 'ph.available_sizes LIKE ?').join(' OR ');
                whereConditions.push(`(${sizeConditions})`);
                sizeList.forEach(size => {
                    params.push(`%${size}%`);
                });
            }
        }

        // 排序字段映射
        const sortFields = {
            'name': 'p.name_zh',
            'name_zh': 'p.name_zh',
            'price': 'ph.current_price',
            'current_price': 'ph.current_price',
            'sales': 'ph.sales_count',
            'sales_count': 'ph.sales_count',
            'evaluation': 'ph.evaluation_count',
            'evaluation_count': 'ph.evaluation_count',
            'updated_at': 'p.updated_at',
            'created_at': 'p.created_at',
            'last_price_change': 'last_price_change',
            'discount_percentage': 'discount_percentage'
        };

        const orderField = sortFields[sortBy] || 'p.updated_at';
        const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT
                p.*,
                ph.current_price,
                ph.original_price,
                ph.min_price,
                ph.max_price,
                ph.stock_status,
                ph.available_sizes,
                ph.available_colors,
                ph.sales_count,
                ph.evaluation_count,
                ph.score,
                ph.recorded_at as last_updated,
                (
                    SELECT pa.created_at
                    FROM price_alerts pa
                    WHERE pa.product_code = p.product_code
                    ORDER BY pa.created_at DESC
                    LIMIT 1
                ) as last_price_change,
                (
                    SELECT pa.change_percentage
                    FROM price_alerts pa
                    WHERE pa.product_code = p.product_code
                    ORDER BY pa.created_at DESC
                    LIMIT 1
                ) as last_change_percentage,
                CASE
                    WHEN ph.original_price > ph.current_price AND ph.original_price > 0
                    THEN ROUND(((ph.original_price - ph.current_price) * 100.0 / ph.original_price), 2)
                    ELSE 0
                END as discount_percentage
            FROM products p
            LEFT JOIN price_history ph ON p.product_code = ph.product_code
            WHERE ph.id IN (
                SELECT MAX(id) FROM price_history
                GROUP BY product_code
            )
            ${whereClause}
            ORDER BY ${orderField} ${orderDirection}
            LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);

        const products = await this.db.all(sql, params);

        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total
            FROM products p
            LEFT JOIN price_history ph ON p.product_code = ph.product_code
            WHERE ph.id IN (
                SELECT MAX(id) FROM price_history
                GROUP BY product_code
            )
            ${whereClause}
        `;

        const countParams = params.slice(0, -2);
        const countResult = await this.db.get(countSql, countParams);

        return {
            products: products.map(product => this.formatProduct(product)),
            pagination: {
                page,
                limit,
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            }
        };
    }

    async getProductDetail(code) {
        const sql = `
            SELECT
                p.*,
                ph.current_price,
                ph.original_price,
                ph.min_price,
                ph.max_price,
                ph.stock_status,
                ph.available_sizes,
                ph.available_colors,
                ph.sales_count,
                ph.evaluation_count,
                ph.score,
                ph.recorded_at as last_updated,
                (
                    SELECT pa.created_at
                    FROM price_alerts pa
                    WHERE pa.product_code = p.product_code
                    ORDER BY pa.created_at DESC
                    LIMIT 1
                ) as last_price_change,
                (
                    SELECT pa.change_percentage
                    FROM price_alerts pa
                    WHERE pa.product_code = p.product_code
                    ORDER BY pa.created_at DESC
                    LIMIT 1
                ) as last_change_percentage,
                CASE
                    WHEN ph.original_price > ph.current_price AND ph.original_price > 0
                    THEN ROUND(((ph.original_price - ph.current_price) * 100.0 / ph.original_price), 2)
                    ELSE 0
                END as discount_percentage
            FROM products p
            LEFT JOIN price_history ph ON p.product_code = ph.product_code
            WHERE p.product_code = ?
            AND ph.id = (
                SELECT MAX(id) FROM price_history
                WHERE product_code = p.product_code
            )
        `;

        const product = await this.db.get(sql, [code]);
        return product ? this.formatProduct(product) : null;
    }

    formatProduct(product) {
        return {
            ...product,
            main_pic: product.main_pic ? `https://www.uniqlo.cn${product.main_pic}` : null,
            available_sizes: product.available_sizes ? product.available_sizes.split(',') : [],
            available_colors: product.available_colors ? product.available_colors.split(',') : [],
            category_codes: product.category_code ? product.category_code.split(',') : []
        };
    }

    async getStats() {
        const basicStats = await this.db.getProductStats();
        
        // 获取价格范围
        const priceRange = await this.db.get(`
            SELECT 
                MIN(current_price) as min_price,
                MAX(current_price) as max_price,
                AVG(current_price) as avg_price
            FROM price_history ph
            WHERE ph.id IN (
                SELECT MAX(id) FROM price_history GROUP BY product_code
            )
        `);

        // 获取最近24小时的警报统计
        const recentAlerts = await this.priceTracker.getRecentAlerts(24);
        
        return {
            ...basicStats,
            priceRange,
            recentAlerts: {
                total: recentAlerts.length,
                priceDrops: recentAlerts.filter(a => a.alert_type === 'price_drop').length,
                priceIncreases: recentAlerts.filter(a => a.alert_type === 'price_increase').length,
                stockChanges: recentAlerts.filter(a => a.alert_type === 'back_in_stock').length
            }
        };
    }

    async getFilterOptions() {
        // 获取所有可用的筛选选项
        const categories = await this.db.all(`
            SELECT DISTINCT category_code
            FROM products
            WHERE category_code IS NOT NULL AND category_code != ''
        `);

        const genders = await this.db.all(`
            SELECT DISTINCT gender
            FROM products
            WHERE gender IS NOT NULL AND gender != ''
        `);

        const seasons = await this.db.all(`
            SELECT DISTINCT season
            FROM products
            WHERE season IS NOT NULL AND season != ''
        `);

        return {
            categories: categories.map(c => c.category_code),
            genders: genders.map(g => g.gender),
            seasons: seasons.map(s => s.season)
        };
    }

    async getScrapingStatus(limit = 10) {
        const history = await this.db.getScrapingStatusHistory('scraping', limit);
        const latest = await this.db.getLatestScrapingStatus('scraping');
        const runningTasks = await this.db.getRunningScrapingTasks();

        // 计算下次抓取时间（基于cron表达式）
        const nextScrapingTime = this.calculateNextScrapingTime();

        return {
            latest: latest,
            history: history,
            isRunning: runningTasks.length > 0,
            runningTasks: runningTasks,
            nextScrapingTime: nextScrapingTime,
            statistics: {
                totalRuns: history.length,
                successfulRuns: history.filter(h => h.status === 'completed').length,
                failedRuns: history.filter(h => h.status === 'failed').length,
                averageDuration: this.calculateAverageDuration(history)
            }
        };
    }

    calculateNextScrapingTime() {
        // 使用node-cron库正确计算下次执行时间
        const cron = require('node-cron');
        const cronExpression = '0 */2 * * *'; // 每2小时

        try {
            // 创建一个临时任务来获取下次执行时间
            const task = cron.schedule(cronExpression, () => {}, {
                scheduled: false,
                timezone: 'Asia/Shanghai'
            });

            // 获取下次执行时间
            const nextRun = task.getNextRun();
            return nextRun ? nextRun.toISOString() : new Date().toISOString();
        } catch (error) {
            console.error('Error calculating next scraping time:', error);
            // 降级到简单计算
            const now = new Date();
            const nextHour = Math.ceil(now.getHours() / 2) * 2;
            const nextTime = new Date(now);

            if (nextHour >= 24) {
                nextTime.setDate(nextTime.getDate() + 1);
                nextTime.setHours(0, 0, 0, 0);
            } else {
                nextTime.setHours(nextHour, 0, 0, 0);
            }

            return nextTime.toISOString();
        }
    }

    convertToLocalTime(utcTimeString) {
        if (!utcTimeString) return utcTimeString;

        try {
            // 创建UTC时间对象
            const utcDate = new Date(utcTimeString + (utcTimeString.includes('Z') ? '' : 'Z'));

            // 转换为中国时区 (UTC+8)
            const localDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));

            // 返回ISO格式但不带Z后缀，表示本地时间
            return localDate.toISOString().replace('Z', '');
        } catch (error) {
            console.error('Error converting time to local:', error);
            return utcTimeString;
        }
    }

    calculateAverageDuration(history) {
        const completedTasks = history.filter(h => h.status === 'completed' && h.duration_ms);
        if (completedTasks.length === 0) return 0;

        const totalDuration = completedTasks.reduce((sum, task) => sum + task.duration_ms, 0);
        return Math.round(totalDuration / completedTasks.length);
    }

    async start() {
        try {
            await this.db.connect();
            await this.db.initTables();
            
            this.app.listen(this.port, () => {
                console.log(`API Server running on http://localhost:${this.port}`);
            });
        } catch (error) {
            console.error('Failed to start API server:', error);
            throw error;
        }
    }
}

module.exports = ApiServer;
