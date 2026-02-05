const { Vendor, MaterialServiceEntry, Payment, PaymentAllocation, Sequelize } = require('../db/models');

const normalizeName = (name) => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

exports.createVendor = async (req, res, next) => {
  try {
    const { name, contact_details, tax_id } = req.body;
    const normalized_name = normalizeName(name);

    const vendor = await Vendor.create({
      name,
      normalized_name,
      contact_details,
      tax_id
    });
    res.status(201).json(vendor);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Vendor already exists (duplicate name)' });
    }
    next(error);
  }
};

exports.getAllVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.findAll({
        order: [['name', 'ASC']]
    });
    res.json(vendors);
  } catch (error) {
    next(error);
  }
};

exports.getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    next(error);
  }
};

exports.updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    await vendor.update(req.body);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
};

exports.getVendorLedger = async (req, res, next) => {
  try {
    const ledger = await Vendor.findAll({
      attributes: [
        'id',
        'name',
        [Sequelize.literal(`(SELECT COALESCE(SUM(total_amount), 0) FROM material_service_entries WHERE material_service_entries.paid_to_vendor_id = Vendor.id)`), 'total_material_cost'],
        [Sequelize.literal(`(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.vendor_id = Vendor.id)`), 'total_paid_outflow'],
        [Sequelize.literal(`(SELECT COALESCE(SUM(allocated_amount), 0) FROM payment_allocations JOIN payments ON payment_allocations.payment_id = payments.id WHERE payments.vendor_id = Vendor.id)`), 'total_allocated'],
      ]
    });

    // Calculate derived fields in JS to avoid complex SQL if possible, or use VIRTUAL fields.
    // However, Sequelize literal is already doing the heavy lifting.
    // True Due = total_material_cost - total_allocated
    // Advance = total_paid_outflow - total_allocated

    const result = ledger.map(v => {
      const mat = parseFloat(v.dataValues.total_material_cost);
      const paid = parseFloat(v.dataValues.total_paid_outflow);
      const allocated = parseFloat(v.dataValues.total_allocated);
      return {
        id: v.id,
        name: v.name,
        total_material_cost: mat,
        total_paid_outflow: paid,
        total_allocated: allocated,
        true_due: mat - allocated,
        advance_balance: paid - allocated
      };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
