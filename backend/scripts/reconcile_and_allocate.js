const fs = require('fs');
const path = require('path');
const { Sequelize, Op } = require('sequelize');
const XLSX = require('xlsx');
const { sequelize, Payment, PaymentAllocation, MaterialServiceEntry, Vendor, Item, ItemType } = require('../src/db/models');

const EXCEL_FILE = path.join(__dirname, 'canonical_data.xlsx');

// Helper to normalize names
const normalizeName = (name) => {
    if (!name) return '';
    // DB seems to use stricter normalization: remove all non-alphanumeric
    return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

// Helper to map payment mode
function mapPaymentMode(mode) {
    if (!mode) return 'CASH';
    const m = mode.toString().trim().toUpperCase();
    if (m.includes('NEFT') || m.includes('IMPS') || m.includes('RTGS') || m.includes('BANK') || m.includes('ONLINE') || m.includes('TRANSFER')) return 'BANK_TRANSFER';
    if (m.includes('UPI') || m.includes('GPAY') || m.includes('GOOGLE') || m.includes('PHONE') || m.includes('PAYTM')) return 'UPI';
    if (m.includes('CASH')) return 'CASH';
    if (m.includes('CHEQUE') || m.includes('CHECK')) return 'CHEQUE';
    return 'OTHER';
}

async function reconcileAndAllocate() {
    console.log('--- STARTING RECONCILIATION AND ALLOCATION ---');

    if (!fs.existsSync(EXCEL_FILE)) {
        console.error('Canonical Excel file not found!');
        process.exit(1);
    }

    const wb = XLSX.readFile(EXCEL_FILE);
    const getSheet = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name]);

    const t = await sequelize.transaction();

    try {
        // 1. Load Vendors and Map Codes to DB IDs
        console.log('Mapping Vendors...');
        const vendorSheet = getSheet('vendors_master');
        const dbVendors = await Vendor.findAll({ transaction: t });
        
        const vendorMap = {}; // NormalizedName -> DB_ID
        dbVendors.forEach(v => {
            vendorMap[v.normalized_name] = v.id;
        });

        const excelVendorCodeToIdMap = {}; // ExcelCode -> DB_ID
        for (const v of vendorSheet) {
            const normName = normalizeName(v.name);
            if (vendorMap[normName]) {
                excelVendorCodeToIdMap[v.code] = vendorMap[normName];
            } else {
                console.warn(`Warning: Vendor ${v.name} (${v.code}) not found in DB. Skipping related payments.`);
            }
        }

        // 2. Reconcile Payments
        console.log('Reconciling Payments...');
        const paymentSheet = getSheet('payments');
        
        // Group Excel payments by identity key: "Date|VendorID|Amount"
        const excelPaymentsGroups = {};
        
        for (const p of paymentSheet) {
            const vendorId = excelVendorCodeToIdMap[p.paid_to_vendor_code];
            if (!vendorId) continue;

            // Excel date is usually a serial number or string. 
            // We need to ensure we parse it correctly to YYYY-MM-DD
            // Assuming the seed script handled it, XLSX usually parses to JS Date or number.
            // But strict matching requires careful date handling.
            // Let's assume standard JS Date object if parsed by XLSX with cellDates: true, 
            // but sheet_to_json default might be raw.
            // Let's try to standardize to YYYY-MM-DD string.
            
            let pDateStr = p.payment_date;
            // Basic date parsing logic if it comes as string or number
            // (Leaving simple for now, assuming standard format or matches DB)
            
            const key = `${p.payment_date}|${vendorId}|${parseFloat(p.amount).toFixed(2)}`;
            
            if (!excelPaymentsGroups[key]) excelPaymentsGroups[key] = [];
            excelPaymentsGroups[key].push({
                vendor_id: vendorId,
                payment_date: p.payment_date,
                amount: p.amount,
                payment_mode: mapPaymentMode(p.payment_mode),
                reference_no: (p.reference || '').substring(0, 100),
                remarks: p.remarks || '',
                original_row: p
            });
        }

        // Fetch all DB payments
        const dbPayments = await Payment.findAll({ transaction: t });
        const dbPaymentsGroups = {};

        for (const p of dbPayments) {
            const key = `${p.payment_date}|${p.vendor_id}|${parseFloat(p.amount).toFixed(2)}`;
            if (!dbPaymentsGroups[key]) dbPaymentsGroups[key] = [];
            dbPaymentsGroups[key].push(p);
        }

        // Compare and Sync
        // We iterate over all keys found in Excel
        for (const key in excelPaymentsGroups) {
            const excelList = excelPaymentsGroups[key];
            const dbList = dbPaymentsGroups[key] || [];

            // Update existing
            for (let i = 0; i < Math.min(excelList.length, dbList.length); i++) {
                const excelP = excelList[i];
                const dbP = dbList[i];
                
                await dbP.update({
                    payment_mode: excelP.payment_mode,
                    reference_no: excelP.reference_no,
                    remarks: excelP.remarks
                }, { transaction: t });
            }

            // Insert new
            if (excelList.length > dbList.length) {
                for (let i = dbList.length; i < excelList.length; i++) {
                    const excelP = excelList[i];
                    await Payment.create({
                        vendor_id: excelP.vendor_id,
                        payment_date: excelP.payment_date,
                        amount: excelP.amount,
                        payment_mode: excelP.payment_mode,
                        reference_no: excelP.reference_no,
                        remarks: excelP.remarks,
                        allocation_status: 'UNALLOCATED'
                    }, { transaction: t });
                }
            }
        }
        
        console.log('Payments Reconciled.');

        // 3. Reprocess Allocations
        console.log('Reprocessing Allocations...');
        
        // Truncate Allocations
        await PaymentAllocation.destroy({ where: {}, transaction: t });
        
        // Fetch all Payments and Entries
        const allPayments = await Payment.findAll({ 
            order: [['payment_date', 'ASC'], ['id', 'ASC']],
            transaction: t 
        });
        
        const allEntries = await MaterialServiceEntry.findAll({
            where: { paid_to_vendor_id: { [Op.ne]: null } },
            order: [['entry_date', 'ASC'], ['id', 'ASC']],
            transaction: t
        });

        // Group by Vendor
        const vendorData = {};
        
        allPayments.forEach(p => {
            if (!vendorData[p.vendor_id]) vendorData[p.vendor_id] = { payments: [], entries: [] };
            vendorData[p.vendor_id].payments.push(p);
        });
        
        allEntries.forEach(e => {
            if (!vendorData[e.paid_to_vendor_id]) vendorData[e.paid_to_vendor_id] = { payments: [], entries: [] };
            vendorData[e.paid_to_vendor_id].entries.push(e);
        });

        const newAllocations = [];
        const paymentUpdates = [];

        for (const vendorId in vendorData) {
            const { payments, entries } = vendorData[vendorId];
            
            let pIndex = 0;
            let eIndex = 0;
            
            // Track remaining amounts in memory
            const paymentRemaining = payments.map(p => parseFloat(p.amount));
            const entryRemaining = entries.map(e => parseFloat(e.total_amount));

            while (pIndex < payments.length && eIndex < entries.length) {
                const p = payments[pIndex];
                const e = entries[eIndex];
                
                const pRem = paymentRemaining[pIndex];
                const eRem = entryRemaining[eIndex];

                if (pRem <= 0) {
                    pIndex++;
                    continue;
                }
                if (eRem <= 0) {
                    eIndex++;
                    continue;
                }

                const allocate = Math.min(pRem, eRem);
                
                if (allocate > 0) {
                    newAllocations.push({
                        payment_id: p.id,
                        entry_id: e.id,
                        allocated_amount: allocate
                    });
                    
                    paymentRemaining[pIndex] -= allocate;
                    entryRemaining[eIndex] -= allocate;
                }
            }
            
            // Update Payment Statuses based on remaining
            for (let i = 0; i < payments.length; i++) {
                const original = parseFloat(payments[i].amount);
                const remaining = paymentRemaining[i];
                let status = 'UNALLOCATED';
                if (remaining === 0) status = 'FULLY_ALLOCATED';
                else if (remaining < original) status = 'PARTIAL';
                
                // We will bulk update or just update here
                // For performance, we could batch, but simple update is fine for now
                paymentUpdates.push(payments[i].update({ allocation_status: status }, { transaction: t }));
            }
        }

        // Bulk Insert Allocations
        if (newAllocations.length > 0) {
            // SQLite/MySQL limitation on bulk insert size? Split if necessary.
            // Sequelize bulkCreate handles it reasonably well.
            await PaymentAllocation.bulkCreate(newAllocations, { transaction: t });
        }
        
        await Promise.all(paymentUpdates);

        await t.commit();
        console.log('--- RECONCILIATION AND ALLOCATION COMPLETE ---');

    } catch (error) {
        await t.rollback();
        console.error('Error during reconciliation:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

reconcileAndAllocate();
