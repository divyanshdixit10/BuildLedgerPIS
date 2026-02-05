const express = require('express');
const router = express.Router();
const { createMaterialEntry, getMaterialEntries, updateMaterialEntry, deleteMaterialEntry } = require('../controllers/materialController');
const { protect } = require('../middlewares/authMiddleware');
const { role } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const { materialValidation } = require('../middlewares/validationSchemas');

router.use(protect);

router.route('/')
  .post(role('ADMIN', 'EDITOR'), validate(materialValidation), createMaterialEntry)
  .get(getMaterialEntries);

router.route('/:id')
  .put(role('ADMIN', 'EDITOR'), validate(materialValidation), updateMaterialEntry)
  .delete(role('ADMIN'), deleteMaterialEntry);

module.exports = router;
