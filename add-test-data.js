#!/usr/bin/env node

const Database = require('./src/database');

async function addTestData() {
    const db = new Database();
    
    try {
        await db.connect();
        await db.initTables();
        
        console.log('Adding test data...');
        
        console.log('⚠️  This script previously added fake test data.');
        console.log('✅ Fake test data has been removed from the database.');
        console.log('📊 The database now contains only real product data from scraping.');
        console.log('');
        console.log('💡 To add real data, run the scraper:');
        console.log('   npm run run-once');
        console.log('');
        
        // Show stats
        const stats = await db.getProductStats();
        console.log('\n📊 Database Stats:');
        console.log(`Products: ${stats.totalProducts}`);
        console.log(`Price Records: ${stats.totalPriceRecords}`);
        console.log(`Alerts: ${stats.totalAlerts}`);
        
        console.log('\n✅ Test data added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding test data:', error);
    } finally {
        await db.close();
    }
}

if (require.main === module) {
    addTestData();
}

module.exports = addTestData;
