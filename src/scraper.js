const axios = require('axios');
const config = require('../config/default.json');

class UniqloScraper {
    constructor(scraperConfig = {}) {
        // 合并配置，优先使用传入的配置，然后是配置文件，最后是默认值
        this.config = {
            requestDelay: scraperConfig.requestDelay || config.scraper?.requestDelay || 1000,
            maxPages: scraperConfig.maxPages || config.scraper?.maxPages || 50,
            timeout: scraperConfig.timeout || config.scraper?.timeout || 30000,
            retryAttempts: scraperConfig.retryAttempts || config.scraper?.retryAttempts || 3,
            ...scraperConfig
        };

        // 优衣库API端点和请求头（固定不变）
        this.baseUrl = 'https://d.uniqlo.cn/p/hmall-sc-service/search/searchWithCategoryCodeAndConditions/zh_CN';
        this.headers = {
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

        // 使用配置中的请求间隔
        this.requestDelay = this.config.requestDelay;
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
        try {
            console.log(`正在抓取第 ${page} 页数据...`);
            
            const requestBody = this.createRequestBody(page, pageSize);
            
            const response = await axios.post(this.baseUrl, requestBody, {
                headers: this.headers,
                timeout: this.config.timeout
            });

            if (response.data && response.data.resp && response.data.resp.length > 1) {
                const products = response.data.resp[1];
                console.log(`第 ${page} 页获取到 ${products.length} 个商品`);
                return {
                    products: products,
                    hasMore: products.length === pageSize,
                    page: page,
                    pageSize: pageSize
                };
            } else {
                console.log(`第 ${page} 页没有获取到商品数据`);
                return {
                    products: [],
                    hasMore: false,
                    page: page,
                    pageSize: pageSize
                };
            }
        } catch (error) {
            console.error(`抓取第 ${page} 页时出错:`, error.message);
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
                    const retryDelay = this.requestDelay * Math.pow(2, retryCount); // 指数退避
                    console.log(`网络错误，等待 ${retryDelay}ms 后进行第 ${retryCount + 1} 次重试...`);
                    await this.delay(retryDelay);
                    return this.fetchPageWithRetry(page, pageSize, retryCount + 1);
                }
            }
            throw error;
        }
    }

    async fetchAllProducts(maxPages = null) {
        const allProducts = [];
        let currentPage = 1;
        let hasMore = true;
        const maxPagesToFetch = maxPages || this.config.maxPages;

        console.log('开始抓取优衣库超值特惠商品数据...');

        while (hasMore && currentPage <= maxPagesToFetch) {
            try {
                const result = await this.fetchPageWithRetry(currentPage);
                
                if (result.products.length > 0) {
                    allProducts.push(...result.products);
                    hasMore = result.hasMore;
                    currentPage++;
                    
                    // 添加延迟，避免请求过于频繁
                    if (hasMore) {
                        console.log(`等待 ${this.requestDelay}ms 后继续...`);
                        await this.delay(this.requestDelay);
                    }
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error(`抓取过程中出错:`, error.message);
                // 遇到错误时停止抓取
                break;
            }
        }

        console.log(`抓取完成！总共获取到 ${allProducts.length} 个商品`);
        return allProducts;
    }

    async fetchProductsByCategory(categoryCode = 'SALE', maxPages = 50) {
        const allProducts = [];
        let currentPage = 1;
        let hasMore = true;

        console.log(`开始抓取分类 ${categoryCode} 的商品数据...`);

        while (hasMore && currentPage <= maxPages) {
            try {
                const requestBody = this.createRequestBody(currentPage);
                requestBody.categoryCode = categoryCode;
                
                const response = await axios.post(this.baseUrl, requestBody, {
                    headers: this.headers,
                    timeout: this.config.timeout
                });

                if (response.data && response.data.resp && response.data.resp.length > 1) {
                    const products = response.data.resp[1];
                    
                    if (products.length > 0) {
                        allProducts.push(...products);
                        hasMore = products.length === requestBody.pageInfo.pageSize;
                        currentPage++;
                        
                        console.log(`第 ${currentPage - 1} 页获取到 ${products.length} 个商品`);
                        
                        if (hasMore) {
                            await this.delay(this.requestDelay);
                        }
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error(`抓取分类 ${categoryCode} 第 ${currentPage} 页时出错:`, error.message);
                break;
            }
        }

        console.log(`分类 ${categoryCode} 抓取完成！总共获取到 ${allProducts.length} 个商品`);
        return allProducts;
    }

    // 解析商品数据，提取关键信息
    parseProductData(product) {
        return {
            code: product.code,
            name: product.name,
            name4zhCN: product.name4zhCN,
            productName: product.productName,
            productName4zhCN: product.productName4zhCN,
            originPrice: product.originPrice,
            minPrice: product.minPrice,
            maxPrice: product.maxPrice,
            minVaryPrice: product.minVaryPrice,
            maxVaryPrice: product.maxVaryPrice,
            stock: product.stock,
            mainPic: product.mainPic,
            season: product.season,
            season4zhCN: product.season4zhCN,
            material4zhCN: product.material4zhCN,
            sex: product.sex,
            sex4zhCN: product.sex4zhCN,
            categoryCode: product.categoryCode,
            size: product.size,
            colorNums: product.colorNums,
            stores: product.stores,
            sales: product.sales,
            evaluationCount: product.evaluationCount,
            identity: product.identity,
            priceColor: product.priceColor,
            new: product.new,
            searchScore: product.searchScore
        };
    }

    // 批量解析商品数据
    parseProductsData(products) {
        return products.map(product => this.parseProductData(product));
    }
}

module.exports = UniqloScraper;
