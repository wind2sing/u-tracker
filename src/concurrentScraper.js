const axios = require('axios');
const config = require('../config/default.json');

class ConcurrentUniqloScraper {
    constructor(scraperConfig = {}) {
        // 合并配置
        this.config = {
            requestDelay: scraperConfig.requestDelay || config.scraper?.requestDelay || 500,
            maxPages: scraperConfig.maxPages || config.scraper?.maxPages || 50,
            timeout: scraperConfig.timeout || config.scraper?.timeout || 10000,
            retryAttempts: scraperConfig.retryAttempts || config.scraper?.retryAttempts || 3,
            retryDelay: scraperConfig.retryDelay || config.scraper?.retryDelay || 2000,
            concurrency: scraperConfig.concurrency || config.scraper?.concurrency || 3,
            batchSize: scraperConfig.batchSize || config.scraper?.batchSize || 5,
            ...scraperConfig
        };

        // API配置
        this.baseUrl = 'https://www.uniqlo.cn/hmall-sc-service/search/searchWithCondition';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Content-Type': 'application/json',
            'Origin': 'https://www.uniqlo.cn',
            'Referer': 'https://www.uniqlo.cn/c/SALE.html'
        };

        // 并发控制
        this.activeRequests = 0;
        this.maxConcurrency = this.config.concurrency;
        this.requestQueue = [];
        this.results = [];
        this.errors = [];
        
        console.log(`🚀 并发抓取器初始化完成 - 并发数: ${this.maxConcurrency}, 批次大小: ${this.config.batchSize}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    createRequestBody(page = 1, pageSize = 20) {
        return {
            url: '/c/SALE.html',
            pageInfo: {
                page: page,
                pageSize: pageSize,
                withSideBar: 'Y'
            },
            belongTo: 'pc',
            rank: 'overall',
            priceRange: {
                low: 0,
                high: 0
            },
            color: [],
            size: [],
            season: [],
            material: [],
            sex: [],
            categoryFilter: {},
            identity: [],
            insiteDescription: '',
            exist: [],
            categoryCode: 'SALE',
            searchFlag: false,
            description: ''
        };
    }

    async fetchPage(page = 1, pageSize = 20) {
        const startTime = Date.now();
        
        try {
            console.log(`📄 [页面 ${page}] 开始抓取...`);
            
            const requestBody = this.createRequestBody(page, pageSize);
            
            const response = await axios.post(this.baseUrl, requestBody, {
                headers: this.headers,
                timeout: this.config.timeout
            });

            const duration = Date.now() - startTime;

            if (response.data && response.data.resp && response.data.resp.length > 1) {
                const products = response.data.resp[1];
                console.log(`✅ [页面 ${page}] 获取到 ${products.length} 个商品 (耗时: ${duration}ms)`);
                
                return {
                    products: products,
                    hasMore: products.length === pageSize,
                    page: page,
                    pageSize: pageSize,
                    duration: duration
                };
            } else {
                console.log(`⚠️ [页面 ${page}] 没有获取到商品数据`);
                return {
                    products: [],
                    hasMore: false,
                    page: page,
                    pageSize: pageSize,
                    duration: duration
                };
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ [页面 ${page}] 抓取失败: ${error.message} (耗时: ${duration}ms)`);
            throw error;
        }
    }

    async fetchPageWithRetry(page = 1, pageSize = 20, retryCount = 0) {
        try {
            return await this.fetchPage(page, pageSize);
        } catch (error) {
            if (retryCount < this.config.retryAttempts) {
                const isRetryableError = error.code === 'ECONNRESET' ||
                                       error.code === 'ETIMEDOUT' ||
                                       error.code === 'ENOTFOUND' ||
                                       (error.response && error.response.status >= 500);

                if (isRetryableError) {
                    const retryDelay = this.config.retryDelay * Math.pow(2, retryCount);
                    console.log(`🔄 [页面 ${page}] 网络错误，等待 ${retryDelay}ms 后进行第 ${retryCount + 1} 次重试...`);
                    await this.delay(retryDelay);
                    return this.fetchPageWithRetry(page, pageSize, retryCount + 1);
                }
            }
            throw error;
        }
    }

    async processRequest(page, pageSize = 20) {
        this.activeRequests++;
        
        try {
            const result = await this.fetchPageWithRetry(page, pageSize);
            this.results.push(result);
            return result;
        } catch (error) {
            this.errors.push({ page, error: error.message });
            console.error(`💥 [页面 ${page}] 处理失败:`, error.message);
            return null;
        } finally {
            this.activeRequests--;
            this.processQueue();
        }
    }

    async processQueue() {
        while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrency) {
            const { page, pageSize, resolve, reject } = this.requestQueue.shift();
            
            this.processRequest(page, pageSize)
                .then(resolve)
                .catch(reject);
        }
    }

    async queueRequest(page, pageSize = 20) {
        return new Promise((resolve, reject) => {
            if (this.activeRequests < this.maxConcurrency) {
                this.processRequest(page, pageSize)
                    .then(resolve)
                    .catch(reject);
            } else {
                this.requestQueue.push({ page, pageSize, resolve, reject });
            }
        });
    }

    async fetchAllProductsConcurrent(maxPages = null, heartbeatCallback = null) {
        const startTime = Date.now();
        const maxPagesToFetch = maxPages || this.config.maxPages || 999; // 设置一个很大的默认值

        console.log(`🚀 开始并发抓取优衣库商品数据...`);
        if (maxPages) {
            console.log(`📊 配置: 最大页数=${maxPagesToFetch}, 并发数=${this.maxConcurrency}, 批次大小=${this.config.batchSize}`);
        } else {
            console.log(`📊 配置: 全量抓取（无页数限制）, 并发数=${this.maxConcurrency}, 批次大小=${this.config.batchSize}`);
        }

        // 重置状态
        this.results = [];
        this.errors = [];
        this.activeRequests = 0;
        this.requestQueue = [];

        let allProducts = [];
        let currentPage = 1;
        let hasMore = true;

        while (hasMore && currentPage <= maxPagesToFetch) {
            // 创建当前批次的页面列表
            const batch = [];
            const batchStart = currentPage;
            const batchEnd = Math.min(currentPage + this.config.batchSize - 1, maxPagesToFetch);

            for (let page = batchStart; page <= batchEnd; page++) {
                batch.push(page);
            }

            console.log(`📦 处理批次: 页面 ${batchStart}-${batchEnd}`);

            // 发送心跳（如果提供了回调）
            if (heartbeatCallback && typeof heartbeatCallback === 'function') {
                await heartbeatCallback(batchStart, maxPagesToFetch);
            }

            // 并发处理当前批次
            const batchPromises = batch.map(page => this.queueRequest(page));
            const batchResults = await Promise.allSettled(batchPromises);

            // 处理批次结果
            let batchHasProducts = false;
            for (const result of batchResults) {
                if (result.status === 'fulfilled' && result.value) {
                    const { products, hasMore: pageHasMore } = result.value;
                    if (products.length > 0) {
                        allProducts.push(...products);
                        batchHasProducts = true;
                    }
                    // 如果任何一页没有更多数据，停止抓取
                    if (!pageHasMore) {
                        hasMore = false;
                    }
                }
            }

            // 如果整个批次都没有产品，停止抓取
            if (!batchHasProducts) {
                hasMore = false;
            }

            currentPage = batchEnd + 1;

            // 批次间延迟
            if (hasMore && currentPage <= maxPagesToFetch) {
                console.log(`⏱️ 批次完成，等待 ${this.config.requestDelay}ms 后继续...`);
                await this.delay(this.config.requestDelay);
            }
        }

        const totalTime = Date.now() - startTime;
        const avgTimePerPage = this.results.length > 0 ? totalTime / this.results.length : 0;

        console.log(`🎉 并发抓取完成！`);
        console.log(`📈 统计信息:`);
        console.log(`   - 总商品数: ${allProducts.length}`);
        console.log(`   - 成功页面: ${this.results.length}`);
        console.log(`   - 失败页面: ${this.errors.length}`);
        console.log(`   - 总耗时: ${totalTime}ms (${Math.round(totalTime/1000)}秒)`);
        console.log(`   - 平均每页耗时: ${Math.round(avgTimePerPage)}ms`);
        console.log(`   - 抓取模式: ${maxPages ? '限制页数' : '全量抓取'}`);

        if (this.errors.length > 0) {
            console.log(`⚠️ 失败页面详情:`, this.errors);
        }

        return allProducts;
    }

    // 兼容原有接口
    async fetchAllProducts(maxPages = null, heartbeatCallback = null) {
        return this.fetchAllProductsConcurrent(maxPages, heartbeatCallback);
    }

    getStats() {
        return {
            activeRequests: this.activeRequests,
            queueLength: this.requestQueue.length,
            successfulPages: this.results.length,
            failedPages: this.errors.length,
            totalRequests: this.results.length + this.errors.length,
            config: this.config
        };
    }

    // 解析商品数据 - 兼容原有接口
    parseProductsData(products) {
        if (!Array.isArray(products)) {
            console.warn('parseProductsData: 输入不是数组');
            return [];
        }

        return products.map(product => {
            try {
                return {
                    product_code: product.productCode || product.product_code,
                    name: product.name || '',
                    name_zh: product.name || '',
                    category_code: product.categoryCode || product.category_code || '',
                    gender: product.gender || '',
                    season: product.season || '',
                    main_pic: product.mainPic || product.main_pic || '',
                    current_price: parseFloat(product.currentPrice || product.current_price || 0),
                    original_price: parseFloat(product.originPrice || product.original_price || product.currentPrice || product.current_price || 0),
                    min_price: parseFloat(product.minPrice || product.min_price || product.currentPrice || product.current_price || 0),
                    max_price: parseFloat(product.maxPrice || product.max_price || product.currentPrice || product.current_price || 0),
                    stock_status: product.stockStatus || product.stock_status || 'N',
                    available_sizes: JSON.stringify(product.availableSizes || product.available_sizes || []),
                    available_colors: JSON.stringify(product.availableColors || product.available_colors || []),
                    sales_count: parseInt(product.salesCount || product.sales_count || 0),
                    evaluation_count: parseInt(product.evaluationCount || product.evaluation_count || 0),
                    score: parseFloat(product.score || 0),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            } catch (error) {
                console.error('解析商品数据时出错:', error, product);
                return null;
            }
        }).filter(Boolean); // 过滤掉null值
    }
}

module.exports = ConcurrentUniqloScraper;
