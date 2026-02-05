const path = require('path');
const db = require('../src/db/models');
const { sequelize } = db;

async function validateSeed() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const counts = {};
        
        const tables = [
            'vendors', 
            'items', 
            'material_service_entries', 
            'payments', 
            'payment_allocations', 
            'daily_work_logs', 
            'work_media'
        ];

        for (const table of tables) {
            const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
            counts[table] = result[0].count;
            console.log(`${table}: ${counts[table]}`);
        }

        // Check for orphan records or consistency
        const [orphanedEntries] = await sequelize.query(`
            SELECT COUNT(*) as count 
            FROM material_service_entries mse 
            LEFT JOIN vendors v ON mse.paid_to_vendor_id = v.id 
            WHERE v.id IS NULL
        `);
        console.log(`Orphaned Ledger Entries (invalid vendor): ${orphanedEntries[0].count}`);

        const [orphanedPayments] = await sequelize.query(`
            SELECT COUNT(*) as count 
            FROM payments p 
            LEFT JOIN vendors v ON p.vendor_id = v.id 
            WHERE v.id IS NULL
        `);
        console.log(`Orphaned Payments (invalid vendor): ${orphanedPayments[0].count}`);
        
        // Check total amounts
        const [ledgerTotal] = await sequelize.query('SELECT SUM(total_amount) as total FROM material_service_entries');
        console.log(`Total Ledger Amount: ${ledgerTotal[0].total}`);

        const [paymentTotal] = await sequelize.query('SELECT SUM(amount) as total FROM payments');
        console.log(`Total Payment Amount: ${paymentTotal[0].total}`);
        
        const [allocatedTotal] = await sequelize.query('SELECT SUM(allocated_amount) as total FROM payment_allocations');
        console.log(`Total Allocated Amount: ${allocatedTotal[0].total}`);

        process.exit(0);
    } catch (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    }
}

validateSeed();
