const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const XLSX = require('xlsx');
const db = require('../src/db/models');

const EXCEL_FILE = path.join(__dirname, 'canonical_data.xlsx');


function mapPaymentMode(mode) {
    if (!mode) return 'CASH'; // Default
    const m = mode.toString().trim().toUpperCase();
    
    if (m.includes('NEFT') || m.includes('IMPS') || m.includes('RTGS') || m.includes('BANK') || m.includes('ONLINE') || m.includes('TRANSFER')) {
        return 'BANK_TRANSFER';
    }
    if (m.includes('UPI') || m.includes('GPAY') || m.includes('GOOGLE') || m.includes('PHONE') || m.includes('PAYTM')) {
        return 'UPI';
    }
    if (m.includes('CASH')) {
        return 'CASH';
    }
    if (m.includes('CHEQUE') || m.includes('CHECK')) {
        return 'CHEQUE';
    }
    return 'OTHER';
}

async function seedFromCanonical() {
  console.log('--- STARTING SEED FROM CANONICAL EXCEL ---');
  
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error('Canonical Excel file not found!');
    process.exit(1);
  }

  // 1. DATA RESET
  console.log('Resetting Database...');
  try {
    const resetScript = require('./execute_data_reset');
    // Note: execute_data_reset.js executes immediately on require in previous version, 
    // or we can just run the logic here if it's not exported.
    // Checking previous file content: it runs `executeReset()` at the end. 
    // So requiring it might run it again or fail if it's already running.
    // Better to just replicate truncation logic here for safety and control.
    
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'payment_allocations', 'payments', 'material_service_entries',
      'work_media', 'daily_work_logs', 'vendor_role_assignments',
      'vendors', 'items', 'audit_logs', 'users'
    ];
    for (const t of tables) {
      await db.sequelize.query(`TRUNCATE TABLE ${t}`);
    }
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database Cleared.');
  } catch (err) {
    console.error('Error resetting DB:', err);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_FILE);
  const getSheet = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name]);

  const t = await db.sequelize.transaction();

  try {
    // --- 2. PRE-LOAD REFERENCE DATA ---
    console.log('Loading Reference Data...');
    
    // Vendor Roles
    const [vRoles] = await db.sequelize.query('SELECT * FROM vendor_roles', { transaction: t });
    const vendorRoleMap = {}; // Name -> ID
    vRoles.forEach(r => vendorRoleMap[r.name] = r.id);

    // Item Types
    const [iTypes] = await db.sequelize.query('SELECT * FROM item_types', { transaction: t });
    const itemTypeMap = {}; // Name -> ID
    iTypes.forEach(r => itemTypeMap[r.name] = r.id);

    // User (Admin)
    const [adminRole] = await db.sequelize.query("SELECT id FROM roles WHERE name='ADMIN'", { transaction: t });
    const [user] = await db.sequelize.query(`
      INSERT INTO users (name, email, password_hash, role_id, status) 
      VALUES ('Admin', 'admin@buildledger.com', 'hash', ${adminRole[0].id}, 'ACTIVE')
    `, { transaction: t });
    const adminUserId = user; // insertId

    // --- MAPS for ID RESOLUTION ---
    const vendorCodeMap = {}; // V001 -> DB_ID
    const itemCodeMap = {};   // I001 -> DB_ID
    const entryCodeMap = {};  // L001 -> DB_ID
    const paymentCodeMap = {};// P001 -> DB_ID
    const workCodeMap = {};   // W001 -> DB_ID

    // --- 3. IMPORT VENDORS ---
    console.log('Importing Vendors...');
    const vendors = getSheet('vendors_master');
    for (const v of vendors) {
      const [res] = await db.sequelize.query(`
        INSERT INTO vendors (name, normalized_name, contact_details)
        VALUES (?, ?, ?)
      `, { 
        replacements: [v.name, v.normalized_name, v.phone],
        transaction: t 
      });
      vendorCodeMap[v.code] = res; // insertId

      // Assign Roles
      if (v.roles) {
        const roles = v.roles.split(',').map(r => r.trim());
        for (const roleName of roles) {
          const roleId = vendorRoleMap[roleName];
          if (roleId) {
            await db.sequelize.query(`
              INSERT INTO vendor_role_assignments (vendor_id, role_id)
              VALUES (?, ?)
            `, { replacements: [res, roleId], transaction: t });
          }
        }
      }
    }

    // --- 4. IMPORT ITEMS ---
    console.log('Importing Items...');
    const items = getSheet('items_master');
    for (const i of items) {
      const typeId = itemTypeMap[i.type];
      if (!typeId) throw new Error(`Unknown Item Type: ${i.type}`);
      
      const [res] = await db.sequelize.query(`
        INSERT INTO items (name, normalized_name, type_id, unit, category)
        VALUES (?, ?, ?, ?, ?)
      `, { 
        replacements: [i.name, i.normalized_name, typeId, i.default_unit, i.category],
        transaction: t 
      });
      itemCodeMap[i.code] = res;
    }

    // --- 5. IMPORT LEDGER ENTRIES ---
    console.log('Importing Ledger Entries...');
    const entries = getSheet('ledger_entries');
    for (const e of entries) {
      const itemId = itemCodeMap[e.item_code];
      const sourceVendorId = vendorCodeMap[e.source_vendor_code];
      const paidToVendorId = vendorCodeMap[e.paid_to_vendor_code];

      const [res] = await db.sequelize.query(`
        INSERT INTO material_service_entries 
        (entry_date, item_id, source_vendor_id, paid_to_vendor_id, quantity, unit, total_amount, rate, remarks, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          e.entry_date, itemId, sourceVendorId || null, paidToVendorId || null, 
          e.quantity, e.unit, e.total_amount, e.rate, e.remarks || '', adminUserId
        ],
        transaction: t
      });
      entryCodeMap[e.entry_code] = res;
    }

    // --- 6. IMPORT PAYMENTS ---
    console.log('Importing Payments...');
    const payments = getSheet('payments');
    for (const p of payments) {
      const vendorId = vendorCodeMap[p.paid_to_vendor_code];
      
      if (!vendorId) {
        console.warn(`Warning: Skipping Payment ${p.payment_code} - Vendor Code ${p.paid_to_vendor_code} not found in map.`);
        continue;
      }

      const [res] = await db.sequelize.query(`
        INSERT INTO payments 
        (payment_date, vendor_id, amount, payment_mode, reference_no, remarks, allocation_status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'UNALLOCATED', ?)
      `, {
        replacements: [
          p.payment_date, vendorId, p.amount, mapPaymentMode(p.payment_mode), 
          (p.reference || '').substring(0, 100), // Truncate to fit VARCHAR(100)
          p.remarks || '', adminUserId
        ],
        transaction: t
      });
      paymentCodeMap[p.payment_code] = res;
    }

    // --- 7. IMPORT ALLOCATIONS ---
    console.log('Importing Allocations...');
    const allocations = getSheet('payment_allocations');
    for (const a of allocations) {
      const paymentId = paymentCodeMap[a.payment_code];
      const entryId = entryCodeMap[a.entry_code];

      await db.sequelize.query(`
        INSERT INTO payment_allocations (payment_id, entry_id, allocated_amount)
        VALUES (?, ?, ?)
      `, {
        replacements: [paymentId, entryId, a.allocated_amount],
        transaction: t
      });
    }

    // Update Payment Allocation Status (Simple logic: check totals)
    // Actually, we can just run a bulk update after
    console.log('Updating Payment Allocation Statuses...');
    await db.sequelize.query(`
      UPDATE payments p
      SET allocation_status = CASE 
        WHEN (SELECT SUM(allocated_amount) FROM payment_allocations pa WHERE pa.payment_id = p.id) >= p.amount THEN 'FULLY_ALLOCATED'
        WHEN (SELECT SUM(allocated_amount) FROM payment_allocations pa WHERE pa.payment_id = p.id) > 0 THEN 'PARTIAL'
        ELSE 'UNALLOCATED'
      END
    `, { transaction: t });


    // --- 8. IMPORT DAILY WORK ---
    console.log('Importing Daily Work...');
    const dailyLogs = getSheet('daily_work_logs');
    for (const w of dailyLogs) {
      const [res] = await db.sequelize.query(`
        INSERT INTO daily_work_logs (work_date, description, created_by)
        VALUES (?, ?, ?)
      `, {
        replacements: [w.work_date, w.description, adminUserId],
        transaction: t
      });
      workCodeMap[w.work_code] = res;
    }

    // --- 9. IMPORT WORK MEDIA ---
    console.log('Importing Work Media...');
    const media = getSheet('work_media');
    for (const m of media) {
      const workId = workCodeMap[m.work_code];
      // Media type enum: 'IMAGE', 'VIDEO', 'DOCUMENT'. 
      // Excel has 'LINK'. Default to 'IMAGE' or check url?
      // User schema default is 'IMAGE'.
      
      await db.sequelize.query(`
        INSERT INTO work_media (daily_work_id, media_type, drive_url, caption)
        VALUES (?, 'IMAGE', ?, ?)
      `, {
        replacements: [workId, m.drive_url, m.caption],
        transaction: t
      });
    }

    await t.commit();
    console.log('\n--- SEED COMPLETE SUCCESSFULLY ---');

  } catch (error) {
    console.error('ERROR during seed:', error);
    await t.rollback();
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

seedFromCanonical();
