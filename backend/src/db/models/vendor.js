'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Vendor extends Model {
    static associate(models) {
      Vendor.hasMany(models.MaterialServiceEntry, { foreignKey: 'source_vendor_id', as: 'SourcedEntries' });
      Vendor.hasMany(models.MaterialServiceEntry, { foreignKey: 'paid_to_vendor_id', as: 'PaidEntries' });
      Vendor.hasMany(models.Payment, { foreignKey: 'vendor_id' });
    }
  }
  Vendor.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    normalized_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    contact_details: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tax_id: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Vendor',
    tableName: 'vendors',
    underscored: true,
  });
  return Vendor;
};
