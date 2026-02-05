'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PaymentAllocation extends Model {
    static associate(models) {
      PaymentAllocation.belongsTo(models.Payment, { foreignKey: 'payment_id' });
      PaymentAllocation.belongsTo(models.MaterialServiceEntry, { foreignKey: 'entry_id' });
    }
  }
  PaymentAllocation.init({
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    entry_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    allocated_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'PaymentAllocation',
    tableName: 'payment_allocations',
    underscored: true,
    updatedAt: false
  });
  return PaymentAllocation;
};
