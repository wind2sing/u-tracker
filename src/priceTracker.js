const Database = require('./database');

class PriceTracker {
    constructor(database, alertsConfig = {}) {
        this.db = database;
        this.alertsConfig = {
            priceDropThreshold: alertsConfig.priceDropThreshold || 5,
            significantDropThreshold: alertsConfig.significantDropThreshold || 10,
            enableEmailNotifications: alertsConfig.enableEmailNotifications || false,
            ...alertsConfig
        };
    }

    async processProducts(products) {
        console.log(`开始处理 ${products.length} 个商品的价格数据...`);
        
        let newProducts = 0;
        let priceChanges = 0;
        let alerts = [];

        for (const product of products) {
            try {
                // 保存或更新商品基本信息
                await this.db.insertProduct(product);
                
                // 获取该商品的最新价格记录
                const latestPrice = await this.db.getLatestPrice(product.code);
                
                if (!latestPrice) {
                    // 新商品，直接插入价格记录
                    await this.db.insertPriceHistory(product);
                    newProducts++;
                    console.log(`新商品: ${product.name4zhCN} (${product.code}) - ¥${product.minPrice}`);
                } else {
                    // 检查价格是否有变化
                    const priceChange = await this.checkPriceChange(product, latestPrice);
                    
                    if (priceChange.hasChange) {
                        // 插入新的价格记录
                        await this.db.insertPriceHistory(product);

                        // 创建价格变化警报
                        const alert = await this.createPriceAlert(product, latestPrice, priceChange);
                        if (alert) {
                            await this.db.insertPriceAlert(alert);
                            alerts.push(alert);
                            priceChanges++;
                        }

                        // 更准确的变化日志
                        this.logProductChange(product, latestPrice, priceChange);
                    }
                }
            } catch (error) {
                console.error(`处理商品 ${product.code} 时出错:`, error.message);
            }
        }

        // 标记长期未出现的商品为非活跃状态
        const inactiveCount = await this.db.markInactiveProducts(48); // 48小时未出现则标记为非活跃

        const summary = {
            totalProcessed: products.length,
            newProducts,
            priceChanges,
            alerts,
            inactiveProducts: inactiveCount
        };

        console.log(`处理完成: 总计 ${summary.totalProcessed} 个商品, 新商品 ${summary.newProducts} 个, 价格变化 ${summary.priceChanges} 个, 标记非活跃商品 ${inactiveCount} 个`);

        return summary;
    }

    async checkPriceChange(currentProduct, latestPrice) {
        const currentPrice = currentProduct.minPrice;
        const previousPrice = latestPrice.current_price;
        
        // 检查价格变化
        const priceDiff = currentPrice - previousPrice;
        const priceChangePercentage = previousPrice > 0 ? (priceDiff / previousPrice) * 100 : 0;
        
        // 检查库存状态变化
        const stockChanged = currentProduct.stock !== latestPrice.stock_status;
        
        // 检查尺码变化
        const currentSizes = currentProduct.size ? currentProduct.size.join(',') : '';
        const sizesChanged = currentSizes !== latestPrice.available_sizes;
        
        // 检查颜色变化
        const currentColors = currentProduct.colorNums ? currentProduct.colorNums.join(',') : '';
        const colorsChanged = currentColors !== latestPrice.available_colors;

        const hasChange = Math.abs(priceDiff) >= 0.01 || stockChanged || sizesChanged || colorsChanged;

        return {
            hasChange,
            priceDiff,
            priceChangePercentage,
            stockChanged,
            sizesChanged,
            colorsChanged,
            currentPrice,
            previousPrice
        };
    }

    async createPriceAlert(currentProduct, latestPrice, priceChange) {
        let alertType = null;

        // 检查价格变化是否超过阈值
        const priceChangePercent = Math.abs(priceChange.priceChangePercentage);
        if (Math.abs(priceChange.priceDiff) >= 0.01 && priceChangePercent >= this.alertsConfig.priceDropThreshold) {
            alertType = priceChange.priceDiff < 0 ? 'price_drop' : 'price_increase';
        } else if (priceChange.stockChanged) {
            if (currentProduct.stock === 'Y' && latestPrice.stock_status === 'N') {
                alertType = 'back_in_stock';
            } else if (currentProduct.stock === 'N' && latestPrice.stock_status === 'Y') {
                alertType = 'out_of_stock';
            }
        }

        if (!alertType) {
            return null;
        }

        return {
            product_code: currentProduct.code,
            previous_price: priceChange.previousPrice,
            current_price: priceChange.currentPrice,
            price_change: priceChange.priceDiff,
            change_percentage: priceChange.priceChangePercentage,
            alert_type: alertType
        };
    }

    logProductChange(product, latestPrice, priceChange) {
        const changes = [];

        // 价格变化
        if (Math.abs(priceChange.priceDiff) >= 0.01) {
            changes.push(`价格: ¥${priceChange.previousPrice} → ¥${priceChange.currentPrice}`);
        }

        // 库存状态变化
        if (priceChange.stockChanged) {
            const stockStatus = {
                'Y': '有货',
                'N': '缺货',
                '': '未知'
            };
            changes.push(`库存: ${stockStatus[latestPrice.stock_status] || latestPrice.stock_status} → ${stockStatus[product.stock] || product.stock}`);
        }

        // 尺码变化
        if (priceChange.sizesChanged) {
            changes.push(`尺码变化`);
        }

        // 颜色变化
        if (priceChange.colorsChanged) {
            changes.push(`颜色变化`);
        }

        const changeDescription = changes.join(', ');
        console.log(`商品变化: ${product.name4zhCN} (${product.code}) - ${changeDescription}`);
    }

    async getPriceHistory(productCode, days = 30) {
        const sql = `
            SELECT * FROM price_history 
            WHERE product_code = ? 
            AND recorded_at >= datetime('now', '-${days} days')
            ORDER BY recorded_at DESC
        `;
        return await this.db.all(sql, [productCode]);
    }

    async getRecentAlerts(hours = 24) {
        const sql = `
            SELECT pa.*, p.name_zh, p.main_pic
            FROM price_alerts pa
            LEFT JOIN products p ON pa.product_code = p.product_code
            WHERE pa.created_at >= datetime('now', '-${hours} hours')
            ORDER BY pa.created_at DESC
        `;
        return await this.db.all(sql);
    }

    async getBiggestPriceDrops(days = 7, limit = 10) {
        const sql = `
            SELECT pa.*, p.name_zh, p.main_pic
            FROM price_alerts pa
            LEFT JOIN products p ON pa.product_code = p.product_code
            WHERE pa.alert_type = 'price_drop' 
            AND pa.created_at >= datetime('now', '-${days} days')
            ORDER BY pa.change_percentage ASC
            LIMIT ${limit}
        `;
        return await this.db.all(sql);
    }

    async getProductsBackInStock(days = 7) {
        const sql = `
            SELECT pa.*, p.name_zh, p.main_pic
            FROM price_alerts pa
            LEFT JOIN products p ON pa.product_code = p.product_code
            WHERE pa.alert_type = 'back_in_stock' 
            AND pa.created_at >= datetime('now', '-${days} days')
            ORDER BY pa.created_at DESC
        `;
        return await this.db.all(sql);
    }

    async getProductsByPriceRange(minPrice, maxPrice) {
        const sql = `
            SELECT DISTINCT p.*, ph.current_price, ph.stock_status
            FROM products p
            LEFT JOIN price_history ph ON p.product_code = ph.product_code
            WHERE ph.id IN (
                SELECT MAX(id) FROM price_history 
                GROUP BY product_code
            )
            AND ph.current_price BETWEEN ? AND ?
            AND ph.stock_status = 'Y'
            ORDER BY ph.current_price ASC
        `;
        return await this.db.all(sql, [minPrice, maxPrice]);
    }

    async getTopSellingProducts(limit = 20) {
        const sql = `
            SELECT p.*, ph.current_price, ph.sales_count, ph.stock_status
            FROM products p
            LEFT JOIN price_history ph ON p.product_code = ph.product_code
            WHERE ph.id IN (
                SELECT MAX(id) FROM price_history 
                GROUP BY product_code
            )
            AND ph.stock_status = 'Y'
            ORDER BY ph.sales_count DESC
            LIMIT ${limit}
        `;
        return await this.db.all(sql);
    }

    async generateDailyReport() {
        const stats = await this.db.getProductStats();
        const recentAlerts = await this.getRecentAlerts(24);
        const biggestDrops = await this.getBiggestPriceDrops(1, 5);
        const backInStock = await this.getProductsBackInStock(1);

        return {
            timestamp: new Date().toISOString(),
            statistics: stats,
            recentAlerts: recentAlerts.length,
            biggestPriceDrops: biggestDrops,
            productsBackInStock: backInStock,
            summary: {
                totalAlerts: recentAlerts.length,
                priceDropAlerts: recentAlerts.filter(a => a.alert_type === 'price_drop').length,
                priceIncreaseAlerts: recentAlerts.filter(a => a.alert_type === 'price_increase').length,
                stockAlerts: recentAlerts.filter(a => a.alert_type === 'back_in_stock').length
            }
        };
    }
}

module.exports = PriceTracker;
