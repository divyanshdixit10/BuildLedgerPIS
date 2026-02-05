const express = require('express');
const router = express.Router();
const { createVendor, getAllVendors, getVendorById, updateVendor, getVendorLedger } = require('../controllers/vendorController');
const { protect } = require('../middlewares/authMiddleware');
const { role } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const { vendorValidation } = require('../middlewares/validationSchemas');

router.use(protect);

router.post('/', role('ADMIN', 'EDITOR'), validate(vendorValidation), createVendor);
router.get('/', getAllVendors);
router.get('/ledger', getVendorLedger); // Specific route before :id
router.get('/:id', getVendorById);
router.put('/:id', role('ADMIN', 'EDITOR'), updateVendor);

module.exports = router;
