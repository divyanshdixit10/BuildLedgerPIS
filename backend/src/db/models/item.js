'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Item extends Model {
    static associate(models) {
      Item.belongsTo(models.ItemType, { foreignKey: 'type_id' });
      Item.hasMany(models.MaterialServiceEntry, { foreignKey: 'item_id' });
    }
  }
  Item.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    normalized_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'General'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Item',
    tableName: 'items',
    underscored: true,
  });
  return Item;
};
