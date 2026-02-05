const { sequelize } = require('../db/models');

exports.getDashboardStats = async (req, res, next) => {
    try {
        // Strict SQL Aggregation as per Core Accounting Truth
        // 1. Total Project Cost = SUM(material_service_entries.total_amount)
        // 2. Total Paid = SUM(payment_allocations.allocated_amount)
        // 3. Total Due = SUM(total_amount - allocated) WHERE allocated < total
        // 4. Total Advance = SUM(amount - allocated) WHERE allocated < amount

        const [results] = await sequelize.query(`
            SELECT
                (
                    SELECT COALESCE(SUM(total_amount), 0) 
                    FROM material_service_entries
                ) as total_project_cost,
                
                (
                    SELECT COALESCE(SUM(allocated_amount), 0) 
                    FROM payment_allocations
                ) as total_paid,
                
                (
                    SELECT COALESCE(SUM(total_amount - allocated), 0) 
                    FROM (
                        SELECT e.total_amount, COALESCE(SUM(pa.allocated_amount), 0) as allocated
                        FROM material_service_entries e
                        LEFT JOIN payment_allocations pa ON e.id = pa.entry_id
                        GROUP BY e.id
                    ) as entry_stats
                    WHERE allocated < total_amount
                ) as total_due,
                
                (
                    SELECT COALESCE(SUM(amount - allocated), 0)
                    FROM (
                        SELECT p.amount, COALESCE(SUM(pa.allocated_amount), 0) as allocated
                        FROM payments p
                        LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
                        GROUP BY p.id
                    ) as payment_stats
                    WHERE allocated < amount
                ) as total_advance
        `);
        
        res.json(results[0]);
    } catch (error) {
        next(error);
    }
};
