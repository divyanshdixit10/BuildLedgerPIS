'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Vendor, { foreignKey: 'vendor_id' });
      Payment.belongsTo(models.User, { foreignKey: 'created_by' });
      Payment.hasMany(models.PaymentAllocation, { foreignKey: 'payment_id' });
    }
  }
  Payment.init({
    vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    payment_mode: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'BANK_TRANSFER'
    },
    allocation_status: {
      type: DataTypes.ENUM('UNALLOCATED', 'PARTIAL', 'FULLY_ALLOCATED'),
      defaultValue: 'UNALLOCATED'
    },
    reference_no: {
      type: DataTypes.STRING,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true,
    updatedAt: false
  });
  return Payment;
};
