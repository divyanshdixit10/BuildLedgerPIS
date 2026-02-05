'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ItemType extends Model {
    static associate(models) {
      ItemType.hasMany(models.Item, { foreignKey: 'type_id' });
    }
  }
  ItemType.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'ItemType',
    tableName: 'item_types',
    underscored: true,
    updatedAt: false,
    createdAt: false // Schema doesn't have timestamps for item_types? checking schema...
    // Schema lines 84-87: id, name. No timestamps.
  });
  return ItemType;
};