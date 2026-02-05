const { sequelize } = require('../src/db/models');

async function validateReconciliation() {
    console.log('--- VALIDATION REPORT ---');
    
    // 1. SQL Used
    console.log('\n1. SQL Used for Dashboard Totals:');
    console.log(`
            SELECT
                (SELECT COALESCE(SUM(total_amount), 0) FROM material_service_entries) as total_project_cost,
                (SELECT COALESCE(SUM(allocated_amount), 0) FROM payment_allocations) as total_paid,
                (SELECT COALESCE(SUM(total_amount - allocated), 0) 
                 FROM (
                    SELECT e.total_amount, COALESCE(SUM(pa.allocated_amount), 0) as allocated
                    FROM material_service_entries e
                    LEFT JOIN payment_allocations pa ON e.id = pa.entry_id
                    GROUP BY e.id
                 ) as entry_stats
                 WHERE allocated < total_amount
                ) as total_due,
                (SELECT COALESCE(SUM(amount - allocated), 0)
                 FROM (
                    SELECT p.amount, COALESCE(SUM(pa.allocated_amount), 0) as allocated
                    FROM payments p
                    LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
                    GROUP BY p.id
                 ) as payment_stats
                 WHERE allocated < amount
                ) as total_advance
    `);

    // 2. Vendor-wise Report
    console.log('\n2. Vendor-wise Reconciliation Report:');
    const [vendorStats] = await sequelize.query(`
        SELECT 
            v.name as vendor_name,
            COUNT(DISTINCT e.id) as total_entries_count,
            COALESCE(SUM(e.total_amount), 0) as total_entries_amount,
            
            (SELECT COALESCE(SUM(allocated_amount), 0) 
             FROM payment_allocations pa 
             JOIN payments p ON pa.payment_id = p.id 
             WHERE p.vendor_id = v.id) as total_paid_allocated,
             
             (SELECT COALESCE(SUM(amount), 0)
              FROM payments p
              WHERE p.vendor_id = v.id) as total_payment_records_amount,

            /* Due = Sum of (Entry Total - Allocated) for this vendor's entries */
            (SELECT COALESCE(SUM(e2.total_amount - COALESCE((SELECT SUM(pa2.allocated_amount) FROM payment_allocations pa2 WHERE pa2.entry_id = e2.id), 0)), 0)
             FROM material_service_entries e2
             WHERE e2.paid_to_vendor_id = v.id
             AND e2.total_amount > COALESCE((SELECT SUM(pa2.allocated_amount) FROM payment_allocations pa2 WHERE pa2.entry_id = e2.id), 0)
            ) as due_amount,

            /* Advance = Sum of (Payment Amount - Allocated) for this vendor's payments */
            (SELECT COALESCE(SUM(p2.amount - COALESCE((SELECT SUM(pa3.allocated_amount) FROM payment_allocations pa3 WHERE pa3.payment_id = p2.id), 0)), 0)
             FROM payments p2
             WHERE p2.vendor_id = v.id
             AND p2.amount > COALESCE((SELECT SUM(pa3.allocated_amount) FROM payment_allocations pa3 WHERE pa3.payment_id = p2.id), 0)
            ) as advance_amount

        FROM vendors v
        LEFT JOIN material_service_entries e ON e.paid_to_vendor_id = v.id
        GROUP BY v.id
        ORDER BY v.name
    `);

    console.table(vendorStats.map(v => ({
        Vendor: v.vendor_name,
        'Entries Amt': parseFloat(v.total_entries_amount).toFixed(2),
        'Payments Rec Amt': parseFloat(v.total_payment_records_amount).toFixed(2),
        'Allocated (Paid)': parseFloat(v.total_paid_allocated).toFixed(2),
        'Due': parseFloat(v.due_amount).toFixed(2),
        'Advance': parseFloat(v.advance_amount).toFixed(2)
    })));

    // 3. Proof of Old Payments
    console.log('\n3. Proof of Old-Date Payments Included:');
    const [oldPayments] = await sequelize.query(`
        SELECT id, payment_date, amount, vendor_id 
        FROM payments 
        ORDER BY payment_date ASC 
        LIMIT 5
    `);
    console.log('First 5 payments by date:');
    console.table(oldPayments);

    await sequelize.close();
}

validateReconciliation();
