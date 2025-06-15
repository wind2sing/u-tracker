#!/usr/bin/env node

/**
 * 测试脚本：验证心跳机制
 * 用于验证基于心跳的抓取状态检测是否正常工作
 * 
 * 使用方法：
 * node test-heartbeat.js                # 检查当前心跳状态
 * node test-heartbeat.js --create-fake  # 创建假的运行任务（无心跳）
 * node test-heartbeat.js --create-real  # 创建真实的运行任务（有心跳）
 */

const Database = require('./src/database');

async function testHeartbeat() {
    const db = new Database();
    
    try {
        console.log('🔗 连接数据库...');
        await db.connect();
        await db.initTables();
        
        // 检查命令行参数
        const args = process.argv.slice(2);
        const shouldCreateFake = args.includes('--create-fake');
        const shouldCreateReal = args.includes('--create-real');
        
        if (shouldCreateFake) {
            console.log('🧟 创建假的运行任务（无心跳）...');
            const fakeTime = new Date().toISOString();
            await db.insertScrapingStatus({
                task_type: 'manual_scraping',
                status: 'running',
                start_time: fakeTime,
                products_processed: 0,
                new_products: 0,
                price_changes: 0,
                alerts_generated: 0
                // 注意：没有设置 last_heartbeat
            });
            console.log('✅ 假任务已创建（无心跳）');
        }
        
        if (shouldCreateReal) {
            console.log('❤️ 创建真实的运行任务（有心跳）...');
            const realTime = new Date().toISOString();
            const result = await db.insertScrapingStatus({
                task_type: 'manual_scraping',
                status: 'running',
                start_time: realTime,
                products_processed: 0,
                new_products: 0,
                price_changes: 0,
                alerts_generated: 0
            });
            
            // 立即发送心跳
            await db.updateScrapingHeartbeat(result.id, 1, 10);
            console.log('✅ 真实任务已创建（有心跳）');
        }
        
        console.log('\n📊 检查所有运行中的任务...');
        const allRunningTasks = await db.getRunningScrapingTasks();
        console.log(`数据库中运行中的任务总数: ${allRunningTasks.length}`);
        
        if (allRunningTasks.length > 0) {
            console.log('\n所有运行中的任务详情:');
            allRunningTasks.forEach((task, index) => {
                const startTime = new Date(task.start_time);
                const ageMinutes = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
                const hasHeartbeat = task.last_heartbeat ? '有心跳' : '无心跳';
                const heartbeatTime = task.last_heartbeat ? new Date(task.last_heartbeat).toLocaleString() : '从未';
                console.log(`  ${index + 1}. ID: ${task.id}, 类型: ${task.task_type}, 运行时长: ${ageMinutes}分钟, ${hasHeartbeat}, 最后心跳: ${heartbeatTime}`);
            });
        }
        
        console.log('\n💓 检查基于心跳的真实运行状态...');
        const realRunningStatus = await db.getRealRunningTasks(60); // 60秒心跳超时
        
        console.log(`真实运行中的任务数量: ${realRunningStatus.active.length}`);
        console.log(`失去心跳的任务数量: ${realRunningStatus.stale.length}`);
        console.log(`是否真的在运行: ${realRunningStatus.isReallyRunning ? '是' : '否'}`);
        
        if (realRunningStatus.active.length > 0) {
            console.log('\n活跃任务详情（有心跳）:');
            realRunningStatus.active.forEach((task, index) => {
                const heartbeatTime = new Date(task.last_heartbeat).toLocaleString();
                const progress = task.current_page && task.total_pages ? `${task.current_page}/${task.total_pages}` : '未知';
                console.log(`  ${index + 1}. ID: ${task.id}, 进度: ${progress}, 最后心跳: ${heartbeatTime}`);
            });
        }
        
        if (realRunningStatus.stale.length > 0) {
            console.log('\n僵尸任务详情（无心跳或心跳过期）:');
            realRunningStatus.stale.forEach((task, index) => {
                const heartbeatTime = task.last_heartbeat ? new Date(task.last_heartbeat).toLocaleString() : '从未';
                console.log(`  ${index + 1}. ID: ${task.id}, 最后心跳: ${heartbeatTime}`);
            });
        }
        
        console.log('\n🧹 清理建议:');
        if (realRunningStatus.stale.length > 0) {
            console.log('发现僵尸任务，建议运行清理命令：');
            console.log('node test-cleanup.js --force');
        } else {
            console.log('没有发现僵尸任务，系统状态正常。');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await db.close();
        console.log('\n🔚 数据库连接已关闭');
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testHeartbeat().then(() => {
        console.log('✅ 心跳测试完成');
        process.exit(0);
    }).catch(error => {
        console.error('❌ 心跳测试失败:', error);
        process.exit(1);
    });
}

module.exports = testHeartbeat;
