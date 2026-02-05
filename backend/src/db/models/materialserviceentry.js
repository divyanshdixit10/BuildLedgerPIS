'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MaterialServiceEntry extends Model {
    static associate(models) {
      MaterialServiceEntry.belongsTo(models.Item, { foreignKey: 'item_id' });
      MaterialServiceEntry.belongsTo(models.Vendor, { as: 'SourceVendor', foreignKey: 'source_vendor_id' });
      MaterialServiceEntry.belongsTo(models.Vendor, { as: 'PaidToVendor', foreignKey: 'paid_to_vendor_id' });
      MaterialServiceEntry.belongsTo(models.User, { foreignKey: 'created_by' });
      MaterialServiceEntry.hasMany(models.PaymentAllocation, { foreignKey: 'entry_id' });
    }
  }
  MaterialServiceEntry.init({
    entry_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    source_vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    paid_to_vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true // Changed to true for seed script where user might not exist or be set
    }
  }, {
    sequelize,
    modelName: 'MaterialServiceEntry',
    tableName: 'material_service_entries',
    underscored: true,
  });
  return MaterialServiceEntry;
};
