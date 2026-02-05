-- 1. Check for Orphaned Material Entries (NULL item_id)
-- Should be empty if strict constraints are enforced
SELECT * FROM material_entries WHERE item_id IS NULL;

-- 2. Check for Invalid Quantities
-- Should be empty
SELECT * FROM material_entries WHERE quantity <= 0;

-- 3. Payment Allocation Integrity Check
-- Total allocated amount for a payment should not exceed the payment amount
SELECT 
    p.id, 
    p.amount as payment_amount, 
    COALESCE(SUM(pa.allocated_amount), 0) as total_allocated,
    (p.amount - COALESCE(SUM(pa.allocated_amount), 0)) as remaining
FROM payments p
LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
GROUP BY p.id
HAVING total_allocated > p.amount;

-- 4. Material Payment Status Integrity Check
-- Total allocated to a material entry should not exceed its total amount
SELECT 
    me.id, 
    me.total_amount, 
    COALESCE(SUM(pa.allocated_amount), 0) as paid_amount,
    (me.total_amount - COALESCE(SUM(pa.allocated_amount), 0)) as due_amount
FROM material_entries me
LEFT JOIN payment_allocations pa ON me.id = pa.material_entry_id
GROUP BY me.id
HAVING paid_amount > me.total_amount;

-- 5. Vendor Ledger Summary (Validation View)
-- Cross-verify computed totals
SELECT 
    v.name,
    (SELECT COALESCE(SUM(total_amount), 0) FROM material_entries WHERE vendor_id = v.id) as total_material_cost,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE vendor_id = v.id) as total_paid_outflow,
    (SELECT COALESCE(SUM(allocated_amount), 0) FROM payment_allocations pa JOIN payments p ON pa.payment_id = p.id WHERE p.vendor_id = v.id) as total_allocated,
    -- True Due = Cost - Allocated
    ((SELECT COALESCE(SUM(total_amount), 0) FROM material_entries WHERE vendor_id = v.id) - 
     (SELECT COALESCE(SUM(allocated_amount), 0) FROM payment_allocations pa JOIN payments p ON pa.payment_id = p.id WHERE p.vendor_id = v.id)) as true_due,
    -- Advance Balance = Paid - Allocated
    ((SELECT COALESCE(SUM(amount), 0) FROM payments WHERE vendor_id = v.id) - 
     (SELECT COALESCE(SUM(allocated_amount), 0) FROM payment_allocations pa JOIN payments p ON pa.payment_id = p.id WHERE p.vendor_id = v.id)) as advance_balance
FROM vendors v;

-- 6. Verify Payment Status Consistency
-- Payment marked 'FULLY_ALLOCATED' but not fully allocated
SELECT p.id, p.amount, SUM(pa.allocated_amount) as allocated, p.allocation_status
FROM payments p
LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
GROUP BY p.id
HAVING p.allocation_status = 'FULLY_ALLOCATED' AND ABS(p.amount - COALESCE(SUM(pa.allocated_amount), 0)) > 0.01;

-- 7. Verify Material Status Consistency
-- Material marked 'PAID' but not fully paid
SELECT me.id, me.total_amount, SUM(pa.allocated_amount) as paid, me.payment_status
FROM material_entries me
LEFT JOIN payment_allocations pa ON me.id = pa.material_entry_id
GROUP BY me.id
HAVING me.payment_status = 'PAID' AND ABS(me.total_amount - COALESCE(SUM(pa.allocated_amount), 0)) > 0.01;
