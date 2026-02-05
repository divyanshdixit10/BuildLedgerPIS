const { MaterialServiceEntry, Payment, PaymentAllocation, Item, Vendor, Sequelize, sequelize } = require('../db/models');
const { Op } = Sequelize;

exports.getFinancialSummary = async (req, res, next) => {
  try {
    const [summary] = await sequelize.query(`
      SELECT 
        (SELECT COALESCE(SUM(total_amount), 0) FROM material_service_entries) as total_project_cost,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) as total_paid,
        (SELECT COALESCE(SUM(allocated_amount), 0) FROM payment_allocations) as total_allocated
    `);

    const result = {
        total_project_cost: parseFloat(summary[0].total_project_cost),
        total_paid: parseFloat(summary[0].total_paid),
        total_allocated: parseFloat(summary[0].total_allocated),
        total_due: parseFloat(summary[0].total_project_cost) - parseFloat(summary[0].total_allocated),
        total_advance: parseFloat(summary[0].total_paid) - parseFloat(summary[0].total_allocated)
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getDateWiseExpenses = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        const replacements = {};

        if (startDate && endDate) {
            dateFilter = 'WHERE entry_date BETWEEN :startDate AND :endDate';
            replacements.startDate = startDate;
            replacements.endDate = endDate;
        }

        const expenses = await sequelize.query(`
            SELECT 
                entry_date, 
                SUM(total_amount) as total_expense,
                COUNT(id) as entry_count
            FROM material_service_entries
            ${dateFilter}
            GROUP BY entry_date
            ORDER BY entry_date DESC
        `, { type: Sequelize.QueryTypes.SELECT, replacements });

        res.json(expenses);
    } catch (error) {
        next(error);
    }
};

exports.getItemWiseReport = async (req, res, next) => {
    try {
        const report = await MaterialServiceEntry.findAll({
            attributes: [
                'item_id',
                [Sequelize.col('Item.name'), 'item_name'],
                [Sequelize.col('Item.unit'), 'unit'],
                [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity'],
                [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'total_cost'],
                [Sequelize.fn('AVG', Sequelize.col('rate')), 'avg_rate']
            ],
            include: [{ model: Item, attributes: [] }],
            group: ['item_id', 'Item.name', 'Item.unit'],
            order: [[Sequelize.literal('total_cost'), 'DESC']]
        });
        
        res.json(report);
    } catch (error) {
        next(error);
    }
};

exports.getVendorWiseReport = async (req, res, next) => {
    try {
        const report = await sequelize.query(`
            SELECT 
                v.id as vendor_id,
                v.name as vendor_name,
                COALESCE(m.total_material_cost, 0) as total_material_cost,
                COALESCE(p.total_paid, 0) as total_paid,
                COALESCE(pa.total_allocated, 0) as total_allocated,
                (COALESCE(m.total_material_cost, 0) - COALESCE(pa.total_allocated, 0)) as total_due,
                (COALESCE(p.total_paid, 0) - COALESCE(pa.total_allocated, 0)) as total_advance
            FROM vendors v
            LEFT JOIN (
                SELECT paid_to_vendor_id as vendor_id, SUM(total_amount) as total_material_cost 
                FROM material_service_entries 
                GROUP BY paid_to_vendor_id
            ) m ON v.id = m.vendor_id
            LEFT JOIN (
                SELECT vendor_id, SUM(amount) as total_paid 
                FROM payments 
                GROUP BY vendor_id
            ) p ON v.id = p.vendor_id
            LEFT JOIN (
                SELECT p.vendor_id, SUM(pa.allocated_amount) as total_allocated
                FROM payment_allocations pa
                JOIN payments p ON pa.payment_id = p.id
                GROUP BY p.vendor_id
            ) pa ON v.id = pa.vendor_id
            ORDER BY total_material_cost DESC
        `, { type: Sequelize.QueryTypes.SELECT });

        res.json(report);
    } catch (error) {
        next(error);
    }
};
