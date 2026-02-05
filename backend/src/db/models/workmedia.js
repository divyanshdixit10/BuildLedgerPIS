'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WorkMedia extends Model {
    static associate(models) {
      WorkMedia.belongsTo(models.DailyWorkLog, { foreignKey: 'daily_work_id' });
    }
  }
  WorkMedia.init({
    daily_work_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    media_type: {
      type: DataTypes.ENUM('IMAGE', 'VIDEO', 'DOCUMENT'),
      allowNull: false
    },
    drive_url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    caption: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WorkMedia',
    tableName: 'work_media',
    underscored: true,
    updatedAt: false
  });
  return WorkMedia;
};
