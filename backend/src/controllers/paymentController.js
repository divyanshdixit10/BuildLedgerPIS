const { Payment, PaymentAllocation, MaterialServiceEntry, Vendor, Sequelize, sequelize } = require('../db/models');
const { Op } = Sequelize;

exports.createPayment = async (req, res, next) => {
  try {
    const { vendor_id, payment_date, amount, payment_mode, reference_no, remarks } = req.body;

    const payment = await Payment.create({
      vendor_id,
      payment_date,
      amount,
      payment_mode: payment_mode || 'BANK_TRANSFER',
      reference_no,
      remarks,
      created_by: req.user.id,
      allocation_status: 'UNALLOCATED'
    });

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const { startDate, endDate, vendor_id, allocation_status } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.payment_date = { [Op.between]: [startDate, endDate] };
    }
    if (vendor_id) where.vendor_id = vendor_id;
    if (allocation_status) where.allocation_status = allocation_status;

    const payments = await Payment.findAll({
      where,
      attributes: {
        include: [
            [Sequelize.literal(`(
                SELECT COALESCE(SUM(allocated_amount), 0) 
                FROM payment_allocations 
                WHERE payment_allocations.payment_id = Payment.id
            )`), 'allocated_amount']
        ]
      },
      include: [
        { model: Vendor, attributes: ['name'] }
      ],
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

exports.getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findByPk(id, {
            include: [
                { model: Vendor, attributes: ['name'] },
                { 
                    model: PaymentAllocation,
                    include: [{ model: MaterialServiceEntry, attributes: ['entry_date', 'total_amount', 'remarks', 'item_id'], include: [{ model: Vendor, as: 'SourceVendor' }] }]
                }
            ]
        });

        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        next(error);
    }
};

exports.allocatePayment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { payment_id } = req.params;
        const { allocations } = req.body; // Array of { entry_id, amount }

        if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
            await t.rollback();
             return res.status(400).json({ message: 'No allocations provided' });
        }

        const payment = await Payment.findByPk(payment_id, { transaction: t });
        if (!payment) {
            await t.rollback();
            return res.status(404).json({ message: 'Payment not found' });
        }

        // 1. Calculate currently allocated
        const currentAllocated = await PaymentAllocation.sum('allocated_amount', {
            where: { payment_id },
            transaction: t
        }) || 0;

        // 2. Calculate requested total
        const requestedTotal = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);

        if (parseFloat(currentAllocated) + requestedTotal > parseFloat(payment.amount)) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'Allocation exceeds payment amount', 
                currentAllocated, 
                requestedTotal, 
                paymentAmount: payment.amount 
            });
        }

        // 3. Process each allocation
        for (const alloc of allocations) {
            const entry = await MaterialServiceEntry.findByPk(alloc.entry_id, { transaction: t });
            
            if (!entry) {
                throw new Error(`Entry ${alloc.entry_id} not found`);
            }

            if (entry.paid_to_vendor_id !== payment.vendor_id) {
                throw new Error(`Entry ${alloc.entry_id} belongs to a different vendor`);
            }

            // Check entry due amount
            const entryAllocated = await PaymentAllocation.sum('allocated_amount', {
                where: { entry_id: alloc.entry_id },
                transaction: t
            }) || 0;

            const due = parseFloat(entry.total_amount) - parseFloat(entryAllocated);
            if (parseFloat(alloc.amount) > due + 0.01) { // Tolerance for float
                throw new Error(`Allocation ${alloc.amount} exceeds due amount ${due} for entry ${alloc.entry_id}`);
            }

            // Create allocation
            await PaymentAllocation.create({
                payment_id,
                entry_id: alloc.entry_id,
                allocated_amount: alloc.amount
            }, { transaction: t });
        }

        // 4. Update Payment Status
        const finalAllocated = parseFloat(currentAllocated) + requestedTotal;
        let newStatus = 'PARTIAL';
        if (Math.abs(finalAllocated - parseFloat(payment.amount)) < 0.01) {
            newStatus = 'FULLY_ALLOCATED';
        } else if (finalAllocated === 0) {
            newStatus = 'UNALLOCATED';
        }

        await payment.update({ allocation_status: newStatus }, { transaction: t });

        await t.commit();
        res.json({ message: 'Allocation successful', status: newStatus });

    } catch (error) {
        await t.rollback();
        next(error); // Pass to error handler
    }
};

exports.deletePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findByPk(id);

        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        // Check if allocated
        const count = await PaymentAllocation.count({ where: { payment_id: id } });
        if (count > 0) {
            return res.status(400).json({ message: 'Cannot delete payment with allocations. Remove allocations first.' });
        }

        await payment.destroy();
        res.json({ message: 'Payment deleted' });
    } catch (error) {
        next(error);
    }
};
