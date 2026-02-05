const express = require('express');
const router = express.Router();
const { createPayment, getPayments, getPaymentById, allocatePayment } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');
const { role } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const { paymentValidation, allocationValidation } = require('../middlewares/validationSchemas');

router.use(protect);

router.route('/')
  .post(role('ADMIN', 'EDITOR'), validate(paymentValidation), createPayment)
  .get(getPayments);

router.get('/:id', getPaymentById);

router.post('/:payment_id/allocate', role('ADMIN', 'EDITOR'), validate(allocationValidation), allocatePayment);

module.exports = router;
