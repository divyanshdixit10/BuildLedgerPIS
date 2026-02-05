const { body } = require('express-validator');

exports.paymentValidation = [
    body('vendor_id').isInt().withMessage('Vendor ID must be an integer'),
    body('payment_date').isDate().withMessage('Payment date must be a valid date'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('payment_mode').isIn(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).withMessage('Invalid payment mode'),
    body('payment_type').optional().isIn(['ADVANCE', 'REGULAR', 'SETTLEMENT']).withMessage('Invalid payment type')
];

exports.allocationValidation = [
    body('allocations').isArray({ min: 1 }).withMessage('Allocations must be a non-empty array'),
    body('allocations.*.material_entry_id').isInt().withMessage('Material Entry ID must be an integer'),
    body('allocations.*.amount').isFloat({ min: 0.01 }).withMessage('Allocation amount must be positive')
];

exports.materialValidation = [
    body('entry_date').isDate().withMessage('Entry date must be a valid date'),
    body('item_id').isInt().withMessage('Item ID must be an integer'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
    body('total_amount').isFloat({ min: 0.01 }).withMessage('Total amount must be positive'),
    body('vendor_id').optional({ nullable: true }).isInt().withMessage('Vendor ID must be an integer')
];

exports.vendorValidation = [
    body('name').trim().notEmpty().withMessage('Vendor name is required'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('gst_number').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST Format').bail()
];

exports.dailyWorkValidation = [
    body('work_date').isDate().withMessage('Work date must be a valid date'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('media').optional().isArray().withMessage('Media must be an array'),
    body('materials_used').optional().isArray().withMessage('Materials used must be an array')
];
