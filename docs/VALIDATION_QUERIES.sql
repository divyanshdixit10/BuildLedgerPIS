-- 1. Row Counts
SELECT 'Material Entries' AS TableName, COUNT(*) AS Count FROM material_entries
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Daily Work Logs', COUNT(*) FROM daily_work_logs;

-- 2. Total Financials
SELECT 
    (SELECT SUM(total_amount) FROM material_entries) AS Total_Material_Cost,
    (SELECT SUM(amount) FROM payments) AS Total_Payments_Made;

-- 3. Vendor Balance Report (Material Cost vs Payments)
SELECT 
    v.name AS Vendor,
    COALESCE(m.TotalMaterial, 0) AS Total_Material,
    COALESCE(p.TotalPaid, 0) AS Total_Paid,
    (COALESCE(p.TotalPaid, 0) - COALESCE(m.TotalMaterial, 0)) AS Balance_Overpaid_if_Positive
FROM vendors v
LEFT JOIN (
    SELECT vendor_id, SUM(total_amount) AS TotalMaterial 
    FROM material_entries 
    GROUP BY vendor_id
) m ON v.id = m.vendor_id
LEFT JOIN (
    SELECT vendor_id, SUM(amount) AS TotalPaid 
    FROM payments 
    GROUP BY vendor_id
) p ON v.id = p.vendor_id
ORDER BY Balance_Overpaid_if_Positive DESC;

-- 4. Unallocated Payments (All payments are currently unallocated as 'Advance' or 'Regular')
SELECT * FROM payments WHERE id NOT IN (SELECT payment_id FROM payment_allocations);

-- 5. Daily Work with Media
SELECT d.work_date, d.description, m.drive_url 
FROM daily_work_logs d
LEFT JOIN work_media m ON d.id = m.daily_work_id
WHERE m.drive_url IS NOT NULL;
