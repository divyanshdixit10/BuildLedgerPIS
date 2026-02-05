const express = require('express');
const router = express.Router();
const { getFinancialSummary, getDateWiseExpenses, getItemWiseReport, getVendorWiseReport } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/summary', getFinancialSummary);
router.get('/expenses', getDateWiseExpenses);
router.get('/items', getItemWiseReport);
router.get('/vendors', getVendorWiseReport);

module.exports = router;
