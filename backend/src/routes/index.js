const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const vendorRoutes = require('./vendorRoutes');
const itemRoutes = require('./itemRoutes');
const materialRoutes = require('./materialRoutes');
const paymentRoutes = require('./paymentRoutes');
const dailyWorkRoutes = require('./dailyWorkRoutes');
const reportRoutes = require('./reportRoutes');
const dashboardRoutes = require('./dashboardRoutes');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

router.use('/auth', authRoutes);
router.use('/vendors', vendorRoutes);
router.use('/items', itemRoutes);
router.use('/materials', materialRoutes);
router.use('/payments', paymentRoutes);
router.use('/daily-work', dailyWorkRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
