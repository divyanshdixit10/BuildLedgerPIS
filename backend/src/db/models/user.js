'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.MaterialServiceEntry, { foreignKey: 'created_by' });
      User.hasMany(models.Payment, { foreignKey: 'created_by' });
      User.hasMany(models.DailyWorkLog, { foreignKey: 'created_by' });
    }
  }
  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'EDITOR', 'VIEWER'),
      allowNull: false,
      defaultValue: 'VIEWER'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ACTIVE'
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
  });
  return User;
};
