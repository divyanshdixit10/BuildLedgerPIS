const express = require('express');
const router = express.Router();
const { createDailyWorkLog, getDailyWorkLogs } = require('../controllers/dailyWorkController');
const { protect } = require('../middlewares/authMiddleware');
const { role } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const { dailyWorkValidation } = require('../middlewares/validationSchemas');

router.use(protect);

router.route('/')
  .post(role('ADMIN', 'EDITOR'), validate(dailyWorkValidation), createDailyWorkLog)
  .get(getDailyWorkLogs);

module.exports = router;
