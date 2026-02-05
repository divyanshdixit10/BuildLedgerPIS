const express = require('express');
const router = express.Router();
const { createItem, getAllItems, updateItem } = require('../controllers/itemController');
const { protect } = require('../middlewares/authMiddleware');
const { role } = require('../middlewares/roleMiddleware');

router.use(protect);

router.post('/', role('ADMIN', 'EDITOR'), createItem);
router.get('/', getAllItems);
router.put('/:id', role('ADMIN', 'EDITOR'), updateItem);

module.exports = router;
