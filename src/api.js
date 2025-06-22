const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./database');
const PriceTracker = require('./priceTracker');

class ApiServer {
    constructor(port = 3001, scheduler = null) {
        this.app = express();
        this.port = port;
        this.db = new Database();
        this.priceTracker = new PriceTracker(this.db);
        this.scheduler = scheduler; // 调度器实例，用于手动触发抓取

        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());

        // 静态文件服务 - 提供前端文件
        const frontendPath = path.join(__dirname, '../frontend');
        this.app.use(express.static(frontendPath));

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
                    sizes = '',
                    priceLevel = ''
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
                    sizes,
                    priceLevel
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

        // 获取优衣库官方商品详细信息（SPU数据）
        this.app.get('/api/products/:code/official-spu', async (req, res) => {
            try {
                const { code } = req.params;
                const officialCode = await this.convertToOfficialCode(code);

                console.log(`Fetching official SPU data for: ${code} -> ${officialCode}`);

                const spuData = await this.fetchUniqloSPU(officialCode);
                res.json(spuData);
            } catch (error) {
                console.error('Error fetching official SPU data:', error);
                res.status(500).json({ error: 'Failed to fetch official product data' });
            }
        });

        // 获取优衣库官方商品图片信息
        this.app.get('/api/products/:code/official-images', async (req, res) => {
            try {
                const { code } = req.params;
                const officialCode = await this.convertToOfficialCode(code);

                console.log(`Fetching official images data for: ${code} -> ${officialCode}`);

                const imagesData = await this.fetchUniqloImages(officialCode);
                res.json(imagesData);
            } catch (error) {
                console.error('Error fetching official images data:', error);
                res.status(500).json({ error: 'Failed to fetch official images data' });
            }
        });

        // 获取完整的官方商品信息（SPU + 图片）
        this.app.get('/api/products/:code/official-detail', async (req, res) => {
            try {
                const { code } = req.params;
                const officialCode = await this.convertToOfficialCode(code);

                console.log(`Fetching complete official data for: ${code} -> ${officialCode}`);

                // 并行获取SPU和图片数据
                const [spuData, imagesData] = await Promise.allSettled([
                    this.fetchUniqloSPU(officialCode),
                    this.fetchUniqloImages(officialCode)
                ]);

                const result = {
                    productCode: code,
                    officialCode: officialCode,
                    spu: spuData.status === 'fulfilled' ? spuData.value : null,
                    images: imagesData.status === 'fulfilled' ? imagesData.value : null,
                    errors: {
                        spu: spuData.status === 'rejected' ? spuData.reason.message : null,
                        images: imagesData.status === 'rejected' ? imagesData.reason.message : null
                    }
                };

                res.json(result);
            } catch (error) {
                console.error('Error fetching complete official data:', error);
                res.status(500).json({ error: 'Failed to fetch complete official data' });
            }
        });

        // 获取商品库存信息
        this.app.get('/api/products/:code/stock', async (req, res) => {
            try {
                const { code } = req.params;
                const officialCode = await this.convertToOfficialCode(code);

                console.log(`Fetching stock for: ${code} -> ${officialCode}`);

                const stockData = await this.fetchUniqloStock(officialCode);

                res.json({
                    productCode: code,
                    officialCode: officialCode,
                    stock: stockData,
                    success: true
                });
            } catch (error) {
                console.error('Error fetching stock:', error);
                res.status(500).json({
                    error: 'Failed to fetch stock information',
                    productCode: req.params.code
                });
            }
        });

        // 更新商品库存状态
        this.app.post('/api/products/:code/update-stock', async (req, res) => {
            try {
                const { code } = req.params;
                const officialCode = await this.convertToOfficialCode(code);

                console.log(`Updating stock status for: ${code} -> ${officialCode}`);

                // 获取真实库存数据
                const stockData = await this.fetchUniqloStock(officialCode);

                // 判断是否有库存
                const hasStock = stockData.totalStock > 0;
                const newStockStatus = hasStock ? 'Y' : 'N';

                // 更新数据库中的库存状态
                await this.db.run(
                    'UPDATE price_history SET stock_status = ? WHERE product_code = ? AND id = (SELECT MAX(id) FROM price_history WHERE product_code = ?)',
                    [newStockStatus, code, code]
                );

                console.log(`Updated stock status for ${code}: ${newStockStatus} (total stock: ${stockData.totalStock})`);

                res.json({
                    productCode: code,
                    officialCode: officialCode,
                    oldStockStatus: 'unknown',
                    newStockStatus: newStockStatus,
                    totalStock: stockData.totalStock,
                    success: true
                });
            } catch (error) {
                console.error('Error updating stock status:', error);
                res.status(500).json({
                    error: 'Failed to update stock status',
                    productCode: req.params.code
                });
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
                const {
                    hours = 24,
                    type = '',
                    search = '',
                    gender = '',
                    page = 1,
                    limit = 20,
                    sortBy = 'created_at',
                    sortOrder = 'desc'
                } = req.query;



                // 始终使用包含性别信息的查询
                let alerts = await this.getAlertsWithGender(parseInt(hours), type);

                // 应用搜索和筛选
                let filteredAlerts = alerts;

                // 搜索筛选
                if (search) {
                    const searchLower = search.toLowerCase();
                    filteredAlerts = filteredAlerts.filter(alert =>
                        (alert.name_zh && alert.name_zh.toLowerCase().includes(searchLower)) ||
                        (alert.product_code && alert.product_code.toLowerCase().includes(searchLower))
                    );
                }

                // 性别筛选
                if (gender) {
                    filteredAlerts = filteredAlerts.filter(alert => {
                        if (!alert.gender) return false;

                        if (gender === '男装') {
                            return alert.gender.includes('男装') || alert.gender.includes('男款') || alert.gender.includes('男女同款');
                        } else if (gender === '女装') {
                            return alert.gender.includes('女装') || alert.gender.includes('男女同款');
                        } else if (gender === '童装') {
                            return alert.gender.includes('童');
                        } else if (gender === '男女同款') {
                            return alert.gender.includes('男女同款');
                        } else if (gender === '男童') {
                            return alert.gender.includes('男童');
                        } else if (gender === '女童') {
                            return alert.gender.includes('女童');
                        } else if (gender === '婴幼儿') {
                            return alert.gender.includes('婴幼儿') || alert.gender.includes('宝宝');
                        } else {
                            return alert.gender === gender;
                        }
                    });
                }

                // 排序
                filteredAlerts.sort((a, b) => {
                    let aValue = a[sortBy];
                    let bValue = b[sortBy];

                    if (sortBy === 'created_at') {
                        aValue = new Date(aValue);
                        bValue = new Date(bValue);
                    } else if (sortBy === 'change_percentage') {
                        aValue = parseFloat(aValue) || 0;
                        bValue = parseFloat(bValue) || 0;
                    }

                    if (sortOrder === 'desc') {
                        return bValue > aValue ? 1 : -1;
                    } else {
                        return aValue > bValue ? 1 : -1;
                    }
                });

                // 分页
                const pageNum = parseInt(page);
                const limitNum = parseInt(limit);
                const offset = (pageNum - 1) * limitNum;
                const paginatedAlerts = filteredAlerts.slice(offset, offset + limitNum);

                // Format alerts to include proper image URLs and local timezone
                const formattedAlerts = paginatedAlerts.map(alert => ({
                    ...alert,
                    main_pic: alert.main_pic ? `https://www.uniqlo.cn${alert.main_pic}` : null,
                    // 将UTC时间转换为本地时区时间
                    created_at: this.convertToLocalTime(alert.created_at)
                }));

                // 返回分页格式
                const response = {
                    alerts: formattedAlerts,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: filteredAlerts.length,
                        pages: Math.ceil(filteredAlerts.length / limitNum)
                    }
                };

                res.json(response);
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

                // 获取基于心跳的真实运行状态
                const realRunningStatus = await this.db.getRealRunningTasks(60);

                res.json({
                    latest: latestStatus,
                    isRunning: runningTasks.length > 0,
                    runningTasks: runningTasks,
                    // 新增：基于心跳的真实状态
                    reallyRunning: realRunningStatus.isReallyRunning,
                    activeTasksWithHeartbeat: realRunningStatus.active,
                    staleTasksWithoutHeartbeat: realRunningStatus.stale
                });
            } catch (error) {
                console.error('Error fetching latest scraping status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 手动触发抓取
        this.app.post('/api/scraping/trigger', async (req, res) => {
            try {
                // 检查是否有调度器实例
                if (!this.scheduler) {
                    return res.status(503).json({
                        success: false,
                        error: 'Scheduler not available'
                    });
                }

                // 检查是否已有抓取任务在运行
                const status = await this.scheduler.getStatus();
                if (status.isRunning || status.manualScrapingInProgress) {
                    return res.json({
                        success: false,
                        message: '抓取任务已在运行中，请等待完成后再试'
                    });
                }

                console.log('🚀 Manual full scraping triggered via API (using config settings)');

                // 异步启动抓取任务，不等待完成
                this.scheduler.triggerManualScraping().catch(error => {
                    console.error('Manual scraping task failed:', error);
                });

                // 立即返回成功响应
                res.json({
                    success: true,
                    message: '手动抓取任务已启动',
                    note: '抓取任务正在后台运行，请通过状态接口查看进度'
                });
            } catch (error) {
                console.error('Error triggering manual scraping:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: error.message
                });
            }
        });

        // 获取调度器状态
        this.app.get('/api/scheduler/status', async (req, res) => {
            try {
                if (!this.scheduler) {
                    return res.json({
                        available: false,
                        message: 'Scheduler not available'
                    });
                }

                const status = await this.scheduler.getStatus();
                res.json({
                    available: true,
                    ...status
                });
            } catch (error) {
                console.error('Error fetching scheduler status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 清理僵尸抓取任务
        this.app.post('/api/scraping/cleanup', async (req, res) => {
            try {
                const { timeoutMinutes = 30 } = req.body;
                const cleanedTasks = await this.db.cleanupStaleScrapingTasks(timeoutMinutes);

                // 同时重置调度器的内存状态
                if (this.scheduler) {
                    this.scheduler.isRunning = false;
                    this.scheduler.manualScrapingInProgress = false;
                    console.log('🔄 重置调度器运行状态');
                }

                res.json({
                    success: true,
                    message: `清理了 ${cleanedTasks} 个僵尸抓取任务`,
                    cleanedTasks: cleanedTasks
                });
            } catch (error) {
                console.error('Error cleaning up stale scraping tasks:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: error.message
                });
            }
        });

        // 获取商品活跃度统计
        this.app.get('/api/product-activity', async (req, res) => {
            try {
                const stats = await this.db.getProductActivityStats();
                const inactiveProducts = await this.db.getInactiveProducts(10);

                res.json({
                    statistics: stats,
                    recentInactiveProducts: inactiveProducts.map(product => ({
                        ...product,
                        main_pic: product.main_pic ? `https://www.uniqlo.cn${product.main_pic}` : null,
                        last_seen_at: this.convertToLocalTime(product.last_seen_at),
                        last_price_update: this.convertToLocalTime(product.last_price_update)
                    }))
                });
            } catch (error) {
                console.error('Error getting product activity:', error);
                res.status(500).json({ error: 'Failed to get product activity' });
            }
        });

        // SPA路由支持 - 对于非API和非静态文件请求，返回index.html
        this.app.use((req, res, next) => {
            // 如果请求的是API路径，继续到下一个中间件（会返回404）
            if (req.path.startsWith('/api/')) {
                return next();
            }

            // 如果请求的是静态文件（有文件扩展名），继续到下一个中间件
            if (path.extname(req.path)) {
                return next();
            }

            // 对于其他所有路径（SPA路由），返回前端的index.html
            const frontendPath = path.join(__dirname, '../frontend');
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
    }

    // 获取包含性别信息的警报
    async getAlertsWithGender(hours = 24, type = '') {
        let alerts;
        if (type === 'price_drop') {
            // 获取降价警报并关联商品性别信息
            const sql = `
                SELECT pa.*, p.gender, p.name_zh, p.main_pic
                FROM price_alerts pa
                LEFT JOIN products p ON pa.product_code = p.product_code
                WHERE pa.alert_type = 'price_drop'
                AND pa.created_at >= datetime('now', '-${hours} hours')
                ORDER BY pa.created_at DESC
                LIMIT 50
            `;
            alerts = await this.db.all(sql);
        } else if (type === 'back_in_stock') {
            // 获取补货警报并关联商品性别信息
            const sql = `
                SELECT pa.*, p.gender, p.name_zh, p.main_pic
                FROM price_alerts pa
                LEFT JOIN products p ON pa.product_code = p.product_code
                WHERE pa.alert_type = 'back_in_stock'
                AND pa.created_at >= datetime('now', '-7 days')
                ORDER BY pa.created_at DESC
            `;
            alerts = await this.db.all(sql);
        } else {
            // 获取所有警报并关联商品性别信息
            const sql = `
                SELECT pa.*, p.gender, p.name_zh, p.main_pic
                FROM price_alerts pa
                LEFT JOIN products p ON pa.product_code = p.product_code
                WHERE pa.created_at >= datetime('now', '-${hours} hours')
                ORDER BY pa.created_at DESC
            `;
            alerts = await this.db.all(sql);
        }
        return alerts;
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
            sizes,
            priceLevel,
            showInactive
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

        // 商品库存状态筛选
        console.log(`API筛选参数 inStock: ${inStock}`);
        if (inStock === 'inactive') {
            // 仅显示非活跃商品（长期未出现在搜索结果中）
            whereConditions.push('p.is_active = 0');
            console.log('添加筛选条件: 仅非活跃商品');
        } else if (inStock === 'out_of_stock') {
            // 仅显示无库存商品
            whereConditions.push('ph.stock_status = "N"');
            whereConditions.push('p.is_active = 1'); // 但仍然是活跃商品
            console.log('添加筛选条件: 仅无库存商品');
        } else if (inStock === 'all') {
            // 显示全部商品（有库存、无库存、非活跃）
            // 不添加筛选条件
            console.log('显示全部商品，不添加任何筛选');
        } else {
            // 默认只显示有库存的活跃商品
            whereConditions.push('p.is_active = 1');
            whereConditions.push('ph.stock_status = "Y"');
            console.log('添加筛选条件: 仅有库存的活跃商品');
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

        // 降价档数筛选
        if (priceLevel !== undefined && priceLevel !== '') {
            const level = parseInt(priceLevel);
            if (level === 0) {
                // 未降价：原价等于现价或折扣小于20%
                whereConditions.push('(ph.original_price = ph.current_price OR ((ph.original_price - ph.current_price) / ph.original_price * 100) < 20)');
            } else if (level === 1) {
                // 第一档：20-29%
                whereConditions.push('((ph.original_price - ph.current_price) / ph.original_price * 100) >= 20 AND ((ph.original_price - ph.current_price) / ph.original_price * 100) < 30');
            } else if (level === 2) {
                // 第二档：30-34%
                whereConditions.push('((ph.original_price - ph.current_price) / ph.original_price * 100) >= 30 AND ((ph.original_price - ph.current_price) / ph.original_price * 100) < 35');
            } else if (level === 3) {
                // 第三档：35-39%
                whereConditions.push('((ph.original_price - ph.current_price) / ph.original_price * 100) >= 35 AND ((ph.original_price - ph.current_price) / ph.original_price * 100) < 40');
            } else if (level === 4) {
                // 第四档：40-44%
                whereConditions.push('((ph.original_price - ph.current_price) / ph.original_price * 100) >= 40 AND ((ph.original_price - ph.current_price) / ph.original_price * 100) < 45');
            } else if (level === 5) {
                // 第五档：45%+
                whereConditions.push('((ph.original_price - ph.current_price) / ph.original_price * 100) >= 45');
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
                    SELECT ph2.recorded_at
                    FROM price_history ph2
                    WHERE ph2.product_code = p.product_code
                    ORDER BY ph2.recorded_at DESC
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
                AND ph.id = (
                    SELECT MAX(id) FROM price_history ph2
                    WHERE ph2.product_code = p.product_code
                )
            WHERE 1=1
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
                AND ph.id = (
                    SELECT MAX(id) FROM price_history ph2
                    WHERE ph2.product_code = p.product_code
                )
            WHERE 1=1
            ${whereClause}
        `;

        const countParams = params.slice(0, -2);
        const countResult = await this.db.get(countSql, countParams);

        return {
            products: products.map(product => this.formatProductWithTimeConversion(product)),
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
                    SELECT ph2.recorded_at
                    FROM price_history ph2
                    WHERE ph2.product_code = p.product_code
                    ORDER BY ph2.recorded_at DESC
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
        return product ? this.formatProductWithTimeConversion(product) : null;
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

    formatProductWithTimeConversion(product) {
        return {
            ...product,
            main_pic: product.main_pic ? `https://www.uniqlo.cn${product.main_pic}` : null,
            available_sizes: product.available_sizes ? product.available_sizes.split(',') : [],
            available_colors: product.available_colors ? product.available_colors.split(',') : [],
            category_codes: product.category_code ? product.category_code.split(',') : [],
            // 转换时区
            last_updated: this.convertToLocalTime(product.last_updated),
            last_price_change: this.convertToLocalTime(product.last_price_change)
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
            // SQLite存储的是UTC时间，格式为 'YYYY-MM-DD HH:MM:SS'
            // 我们需要将其转换为本地时间（中国时区 UTC+8）
            let utcDate;

            if (utcTimeString.includes('T')) {
                // 如果已经是ISO格式，直接解析
                utcDate = new Date(utcTimeString.endsWith('Z') ? utcTimeString : utcTimeString + 'Z');
            } else {
                // 如果是SQLite格式 'YYYY-MM-DD HH:MM:SS'，添加Z表示UTC
                utcDate = new Date(utcTimeString + 'Z');
            }

            // 转换为中国时区（UTC+8）
            const localDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));

            // 返回ISO格式但不带Z后缀，表示本地时间
            return localDate.toISOString().replace('Z', '');
        } catch (error) {
            console.error('Error converting time to local:', error);
            return utcTimeString;
        }
    }

    // 转换商品代码为优衣库官方格式
    async convertToOfficialCode(code) {
        // 如果已经是官方格式（以u开头），直接返回
        if (code.startsWith('u')) {
            return code;
        }

        try {
            // 从数据库中查询商品的main_pic，提取真实的产品ID
            const product = await this.db.get(
                'SELECT main_pic FROM products WHERE product_code = ?',
                [code]
            );

            if (product && product.main_pic) {
                // 从main_pic URL中提取产品ID
                // 例如: /hmall/test/u0000000060451/main/first/561/1.jpg -> u0000000060451
                const match = product.main_pic.match(/\/u(\d+)\//);
                if (match) {
                    const realProductCode = `u${match[1]}`;
                    console.log(`Converted ${code} to official code: ${realProductCode}`);
                    return realProductCode;
                }
            }

            console.warn(`Could not extract official code from main_pic for ${code}, using fallback`);
        } catch (error) {
            console.error('Error converting to official code:', error);
        }

        // 回退方案：使用简单的转换逻辑
        return `u${code.padStart(12, '0')}`;
    }

    // 获取优衣库SPU数据
    async fetchUniqloSPU(officialCode) {
        const axios = require('axios');

        const url = `https://www.uniqlo.cn/data/products/spu/zh_CN/${officialCode}.json`;
        const headers = {
            'accept': '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'Referer': `https://www.uniqlo.cn/product-detail.html?productCode=${officialCode}`,
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };

        try {
            console.log(`Fetching SPU data from: ${url}`);
            const response = await axios.get(url, {
                headers,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error(`Failed to fetch SPU data for ${officialCode}:`, error.message);
            throw new Error(`SPU data not available: ${error.message}`);
        }
    }

    // 获取优衣库商品图片数据
    async fetchUniqloImages(officialCode) {
        const axios = require('axios');

        const url = `https://www.uniqlo.cn/data/products/zh_CN/${officialCode}.json`;
        const headers = {
            'accept': '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'Referer': `https://www.uniqlo.cn/product-detail.html?productCode=${officialCode}`,
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };

        try {
            console.log(`Fetching images data from: ${url}`);
            const response = await axios.get(url, {
                headers,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error(`Failed to fetch images data for ${officialCode}:`, error.message);
            throw new Error(`Images data not available: ${error.message}`);
        }
    }

    // 获取优衣库商品库存数据
    async fetchUniqloStock(officialCode) {
        const axios = require('axios');

        const url = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';
        const headers = {
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'authorization': '',
            'content-type': 'application/json',
            'priority': 'u=1, i',
            'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'Referer': 'https://www.uniqlo.cn/',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };

        const requestBody = {
            distribution: 'EXPRESS',
            productCode: officialCode,
            type: 'DETAIL'
        };

        try {
            console.log(`Fetching stock data for: ${officialCode}`);
            const response = await axios.post(url, requestBody, {
                headers,
                timeout: 10000
            });

            if (response.data && response.data.success && response.data.resp && response.data.resp.length > 0) {
                return response.data.resp[0];
            } else {
                throw new Error('No stock data in response');
            }
        } catch (error) {
            console.error(`Failed to fetch stock data for ${officialCode}:`, error.message);
            throw new Error(`Stock data not available: ${error.message}`);
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
