'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DailyWorkLog extends Model {
    static associate(models) {
      DailyWorkLog.belongsTo(models.User, { foreignKey: 'created_by' });
      DailyWorkLog.hasMany(models.WorkMedia, { foreignKey: 'daily_work_id' });
    }
  }
  DailyWorkLog.init({
    work_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'DailyWorkLog',
    tableName: 'daily_work_logs',
    underscored: true,
    updatedAt: false
  });
  return DailyWorkLog;
};
