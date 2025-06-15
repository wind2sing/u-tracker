#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'uniqlo_tracker.db');

console.log('Starting database migration...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// 检查是否已经有score字段
db.get("PRAGMA table_info(price_history)", (err, row) => {
    if (err) {
        console.error('Error checking table info:', err);
        return;
    }
});

// 添加score字段到price_history表
db.run("ALTER TABLE price_history ADD COLUMN score REAL DEFAULT 0", (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✅ Score column already exists');
        } else {
            console.error('Error adding score column:', err.message);
            process.exit(1);
        }
    } else {
        console.log('✅ Added score column to price_history table');
    }
    
    // 关闭数据库连接
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database migration completed successfully');
            console.log('Database connection closed');
        }
    });
});
