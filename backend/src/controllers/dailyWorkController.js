const { DailyWorkLog, WorkMedia, sequelize, Sequelize } = require('../db/models');
const { Op } = Sequelize;

exports.createDailyWorkLog = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { work_date, description, media } = req.body;

    const log = await DailyWorkLog.create({
      work_date,
      description,
      created_by: req.user.id
    }, { transaction: t });

    if (media && Array.isArray(media)) {
      const mediaEntries = media.map(m => ({
        daily_work_id: log.id,
        media_type: m.media_type,
        drive_url: m.drive_url,
        caption: m.caption
      }));
      await WorkMedia.bulkCreate(mediaEntries, { transaction: t });
    }

    await t.commit();

    const fullLog = await DailyWorkLog.findByPk(log.id, {
        include: [WorkMedia]
    });
    
    res.status(201).json(fullLog);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.getDailyWorkLogs = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.work_date = { [Op.between]: [startDate, endDate] };
    }

    const logs = await DailyWorkLog.findAll({
      where,
      include: [
        { model: WorkMedia }
      ],
      order: [['work_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};
