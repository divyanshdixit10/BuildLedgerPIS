const { MaterialServiceEntry, Item, Vendor, PaymentAllocation, Sequelize } = require('../db/models');
const { Op } = Sequelize;

exports.createMaterialEntry = async (req, res, next) => {
  try {
    const { 
        item_id, 
        source_vendor_id, 
        paid_to_vendor_id, 
        quantity, 
        unit,
        total_amount, 
        entry_date, 
        remarks 
    } = req.body;
    
    // Core Accounting Rule: quantity > 0
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    // Core Accounting Rule: total_amount is authoritative
    if (total_amount === undefined || total_amount === null) {
        return res.status(400).json({ message: 'Total amount is required' });
    }

    if (!unit) {
        return res.status(400).json({ message: 'Unit is required' });
    }

    // Core Accounting Rule: rate is derived
    const rate = parseFloat(total_amount) / parseFloat(quantity);

    const entry = await MaterialServiceEntry.create({
      item_id,
      source_vendor_id: source_vendor_id || paid_to_vendor_id, // Default source to payee if not provided
      paid_to_vendor_id,
      quantity,
      unit,
      rate: rate.toFixed(2), // Stored as derived value
      total_amount,
      entry_date,
      remarks,
      created_by: req.user.id
    });

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

exports.getMaterialEntries = async (req, res, next) => {
  try {
    const { startDate, endDate, vendor_id, item_id } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.entry_date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.entry_date = { [Op.gte]: startDate };
    } else if (endDate) {
        where.entry_date = { [Op.lte]: endDate };
    }

    // Filter by Paid To Vendor (primary for ledger)
    if (vendor_id) {
        where.paid_to_vendor_id = vendor_id;
    }
    
    if (item_id) where.item_id = item_id;
    
    const entries = await MaterialServiceEntry.findAll({
      where,
      attributes: {
        include: [
          [Sequelize.literal(`(
            SELECT COALESCE(SUM(allocated_amount), 0) 
            FROM payment_allocations 
            WHERE payment_allocations.entry_id = MaterialServiceEntry.id
          )`), 'paid_amount'],
          [Sequelize.literal(`(
            total_amount - (
              SELECT COALESCE(SUM(allocated_amount), 0) 
              FROM payment_allocations 
              WHERE payment_allocations.entry_id = MaterialServiceEntry.id
            )
          )`), 'due_amount']
        ]
      },
      include: [
        { model: Item, attributes: ['name', 'unit', 'type_id', 'category'] },
        { model: Vendor, as: 'SourceVendor', attributes: ['name'] },
        { model: Vendor, as: 'PaidToVendor', attributes: ['name'] }
      ],
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json(entries);
  } catch (error) {
    next(error);
  }
};

exports.updateMaterialEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const entry = await MaterialServiceEntry.findByPk(id);

        if (!entry) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        const { 
            quantity, 
            total_amount, 
            remarks,
            source_vendor_id,
            paid_to_vendor_id,
            entry_date,
            unit
        } = req.body;

        const updates = {};
        if (remarks !== undefined) updates.remarks = remarks;
        if (source_vendor_id) updates.source_vendor_id = source_vendor_id;
        if (paid_to_vendor_id) updates.paid_to_vendor_id = paid_to_vendor_id;
        if (entry_date) updates.entry_date = entry_date;
        if (unit) updates.unit = unit;

        // If financial fields change, recalculate rate
        if (quantity || total_amount) {
            const newQty = quantity || entry.quantity;
            const newTotal = total_amount || entry.total_amount;
            
            if (newQty <= 0) return res.status(400).json({ message: 'Quantity must be > 0' });
            
            updates.quantity = newQty;
            updates.total_amount = newTotal;
            updates.rate = (parseFloat(newTotal) / parseFloat(newQty)).toFixed(2);
        }

        await entry.update(updates);
        res.json(entry);
    } catch (error) {
        next(error);
    }
};

exports.deleteMaterialEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const entry = await MaterialServiceEntry.findByPk(id);

        if (!entry) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        // Check if allocated
        const allocations = await PaymentAllocation.count({ where: { entry_id: id } });
        if (allocations > 0) {
            return res.status(400).json({ message: 'Cannot delete entry with existing payment allocations' });
        }

        await entry.destroy();
        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getMaterialEntryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const entry = await MaterialServiceEntry.findByPk(id, {
            include: [
                { model: Item },
                { model: Vendor, as: 'SourceVendor' },
                { model: Vendor, as: 'PaidToVendor' }
            ]
        });

        if (!entry) return res.status(404).json({ message: 'Entry not found' });
        res.json(entry);
    } catch (error) {
        next(error);
    }
};
