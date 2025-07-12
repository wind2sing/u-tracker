#!/usr/bin/env node

/**
 * 测试脚本：清理僵尸抓取任务
 * 用于验证僵尸任务清理功能是否正常工作
 *
 * 使用方法：
 * node test-cleanup.js                 # 检查并清理现有僵尸任务（30分钟阈值）
 * node test-cleanup.js --create-zombie # 创建僵尸任务然后清理（用于测试）
 * node test-cleanup.js --force         # 强制清理所有超过5分钟的任务
 */

const Database = require('./src/database');

async function testCleanup() {
    const db = new Database();

    try {
        console.log('🔗 连接数据库...');
        await db.connect();
        await db.initTables();

        // 检查命令行参数
        const args = process.argv.slice(2);
        const shouldCreateZombie = args.includes('--create-zombie');

        if (shouldCreateZombie) {
            console.log('🧟 创建僵尸任务用于测试...');
            // 创建一个超过30分钟的僵尸任务
            const zombieTime = new Date(Date.now() - 35 * 60 * 1000).toISOString(); // 35分钟前
            await db.insertScrapingStatus({
                task_type: 'manual_scraping',
                status: 'running',
                start_time: zombieTime,
                products_processed: 0,
                new_products: 0,
                price_changes: 0,
                alerts_generated: 0
            });
            console.log('✅ 僵尸任务已创建');
        }

        console.log('📊 查看当前运行中的任务...');
        const runningTasks = await db.getRunningScrapingTasks();
        console.log(`当前运行中的任务数量: ${runningTasks.length}`);

        if (runningTasks.length > 0) {
            console.log('运行中的任务详情:');
            runningTasks.forEach((task, index) => {
                const startTime = new Date(task.start_time);
                const ageMinutes = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
                console.log(`  ${index + 1}. ID: ${task.id}, 类型: ${task.task_type}, 开始时间: ${task.start_time}, 运行时长: ${ageMinutes}分钟`);
            });

            console.log('\n🧹 执行清理操作...');
            // 如果有任务运行超过5分钟，就清理掉（用于测试）
            const timeoutMinutes = args.includes('--force') ? 5 : 30;
            console.log(`使用超时阈值: ${timeoutMinutes} 分钟`);
            const cleanedTasks = await db.cleanupStaleScrapingTasks(timeoutMinutes);
            console.log(`✅ 清理了 ${cleanedTasks} 个僵尸任务`);

            console.log('\n📊 清理后的状态...');
            const remainingTasks = await db.getRunningScrapingTasks();
            console.log(`剩余运行中的任务数量: ${remainingTasks.length}`);
        } else {
            console.log('✅ 没有发现运行中的任务');
        }

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await db.close();
        console.log('🔚 数据库连接已关闭');
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testCleanup().then(() => {
        console.log('✅ 测试完成');
        process.exit(0);
    }).catch(error => {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    });
}

module.exports = testCleanup;
