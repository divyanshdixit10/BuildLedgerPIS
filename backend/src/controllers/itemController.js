const { Item, ItemType } = require('../db/models');

const normalizeName = (name) => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

exports.createItem = async (req, res, next) => {
  try {
    const { name, type, unit, category, description } = req.body;
    
    // Normalize name
    const normalized_name = normalizeName(name);

    // Resolve Type
    let itemType = await ItemType.findOne({ where: { name: type } });
    if (!itemType) {
        // Auto-create type if not exists (Safety for empty DB)
        if (['MATERIAL', 'SERVICE'].includes(type)) {
            itemType = await ItemType.create({ name: type });
        } else {
            return res.status(400).json({ message: 'Invalid Item Type. Must be MATERIAL or SERVICE.' });
        }
    }

    const item = await Item.create({
        name,
        normalized_name,
        type_id: itemType.id,
        unit,
        category,
        description
    });
    
    res.status(201).json(item);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Item already exists (duplicate name)' });
    }
    next(error);
  }
};

exports.getAllItems = async (req, res, next) => {
  try {
    const items = await Item.findAll({
        include: [{ model: ItemType, attributes: ['name'] }],
        order: [['name', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { name, type, unit, category, description } = req.body;
    const item = await Item.findByPk(req.params.id);
    
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const updates = {};
    if (name) {
        updates.name = name;
        updates.normalized_name = normalizeName(name);
    }
    if (unit) updates.unit = unit;
    if (category) updates.category = category;
    if (description) updates.description = description;
    
    if (type) {
        let itemType = await ItemType.findOne({ where: { name: type } });
        if (!itemType && ['MATERIAL', 'SERVICE'].includes(type)) {
             itemType = await ItemType.create({ name: type });
        }
        if (itemType) {
            updates.type_id = itemType.id;
        }
    }

    await item.update(updates);
    res.json(item);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Item name already exists' });
    }
    next(error);
  }
};
