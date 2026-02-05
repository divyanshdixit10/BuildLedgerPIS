const fs = require('fs');
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');
const XLSX = require('xlsx');

// --- CONFIGURATION ---
const SHEETS = {
  DAILY_WORK: '1ADqzj7jByo3iK6D_xXrcZtda7sRuuu6EqgX17HHpIAM',
  PAYMENTS: '1hktu08UsI0pieeAdMzrFNdkVapaYHa1OXBkZF9uDjfE',
  MATERIAL: '1YxxaeRa5bj1T766KPIw-Fti0DIHbzVhPbvys2k6WY-g'
};

// --- HELPER FUNCTIONS ---
function normalizeName(name) {
  if (!name) return null;
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Handle DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  return null; 
}

function formatDate(date) {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

async function fetchSheet(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const response = await axios.get(url, { responseType: 'stream' });
  
  return new Promise((resolve, reject) => {
    const rows = [];
    response.data.pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// --- MAIN LOGIC ---
async function generate() {
  console.log('Fetching sheets...');
  const [dailyRows, paymentRows, materialRows] = await Promise.all([
    fetchSheet(SHEETS.DAILY_WORK),
    fetchSheet(SHEETS.PAYMENTS),
    fetchSheet(SHEETS.MATERIAL)
  ]);

  console.log('Processing data...');

  // --- 1. PRE-PROCESS & NORMALIZE (Date & Vendor Propagation) ---
  function propagateColumn(rows, colName) {
    let lastVal = null;
    return rows.map(row => {
      if (row[colName]) lastVal = row[colName];
      else if (lastVal) row[colName] = lastVal;
      return row;
    });
  }

  let cleanDaily = propagateColumn(dailyRows, 'Date');
  
  let cleanPayments = propagateColumn(paymentRows, 'Date');
  cleanPayments = propagateColumn(cleanPayments, 'Paid To '); // Propagate Vendor
  
  let cleanMaterial = propagateColumn(materialRows, 'Date');
  cleanMaterial = propagateColumn(cleanMaterial, 'Supplier Name'); // Propagate Vendor

  // --- 2. EXTRACT MASTERS (Vendors, Items) ---
  const vendorMap = new Map(); // normalized_name -> { code, name, phone, roles: Set }
  const itemMap = new Map();   // normalized_name -> { code, name, type }

  let vendorCounter = 1;
  let itemCounter = 1;

  function getVendorCode(name, phone, role) {
    if (!name) return null;
    const norm = normalizeName(name);
    if (!vendorMap.has(norm)) {
      vendorMap.set(norm, {
        code: `V${String(vendorCounter++).padStart(3, '0')}`,
        name: name.trim(),
        normalized_name: norm,
        phone: phone || '',
        roles: new Set()
      });
    }
    const v = vendorMap.get(norm);
    if (phone) v.phone = phone; // Update phone if found
    if (role) v.roles.add(role);
    return v.code;
  }

  function getItemCode(name, type) {
    if (!name) return null;
    const norm = normalizeName(name);
    if (!itemMap.has(norm)) {
      itemMap.set(norm, {
        code: `I${String(itemCounter++).padStart(3, '0')}`,
        name: name.trim(),
        normalized_name: norm,
        type: type, // MATERIAL or SERVICE
        default_unit: 'Unit', // Default
        category: 'General'
      });
    }
    return itemMap.get(norm).code;
  }

  // Pass 1: Vendors from Material (Suppliers)
  cleanMaterial.forEach(row => {
    getVendorCode(row['Supplier Name'], row['contact no'], 'SUPPLIER');
  });

  // Pass 2: Vendors from Payments (Payees)
  cleanPayments.forEach(row => {
    getVendorCode(row['Paid To '], null, 'PAYEE'); // Note space in 'Paid To '
  });

  // Pass 3: Items from Material
  cleanMaterial.forEach(row => {
    const itemName = row['Item Name'] || row['Material Category'];
    if (itemName) {
      // Simple heuristic: if Qty is empty, assume Service? Or keyword based?
      // User said "services have quantity = 1".
      // Let's use keyword matching similar to seed script
      const lower = itemName.toLowerCase();
      const isService = lower.includes('labour') || lower.includes('cleaning') || lower.includes('repair') || !row['Quantity'];
      getItemCode(itemName, isService ? 'SERVICE' : 'MATERIAL');
    }
  });

  // --- 3. GENERATE LEDGER ENTRIES ---
  const ledgerEntries = [];
  let entryCounter = 1;

  cleanMaterial.forEach(row => {
    const itemName = row['Item Name'] || row['Material Category'];
    if (!itemName) return;

    const entryDate = parseDate(row['Date']);
    if (!entryDate) return;

    const normItem = normalizeName(itemName);
    const itemCode = itemMap.get(normItem)?.code;

    const normVendor = normalizeName(row['Supplier Name']);
    const sourceVendorCode = vendorMap.get(normVendor)?.code;
    
    // In this dataset, Source = Payee unless specified. 
    // We assume Supplier Name is the primary vendor.
    const paidToVendorCode = sourceVendorCode; 

    const totalAmount = parseFloat((row['Total Cost'] || '0').replace(/,/g, ''));
    let quantity = parseFloat((row['Quantity'] || '1').replace(/,/g, ''));
    
    // Force quantity 1 for services if 0 or NaN
    const itemType = itemMap.get(normItem)?.type;
    if (itemType === 'SERVICE') quantity = 1;
    if (isNaN(quantity) || quantity === 0) quantity = 1;

    const rate = totalAmount / quantity;

    if (totalAmount > 0) {
      ledgerEntries.push({
        entry_code: `L${String(entryCounter++).padStart(4, '0')}`,
        entry_date: formatDate(entryDate),
        item_code: itemCode,
        item_type: itemType,
        quantity: quantity,
        unit: 'Unit', // Default
        total_amount: totalAmount,
        rate: rate.toFixed(2),
        source_vendor_code: sourceVendorCode,
        paid_to_vendor_code: paidToVendorCode,
        remarks: row['Note'] || ''
      });
    }
  });

  // --- 4. GENERATE PAYMENTS ---
  const payments = [];
  let paymentCounter = 1;

  cleanPayments.forEach(row => {
    const amount = parseFloat((row['Amount'] || '0').replace(/,/g, ''));
    if (amount <= 0) return;

    const paymentDate = parseDate(row['Date']);
    if (!paymentDate) return;

    const normVendor = normalizeName(row['Paid To ']);
    const vendorCode = vendorMap.get(normVendor)?.code;

    payments.push({
      payment_code: `P${String(paymentCounter++).padStart(4, '0')}`,
      payment_date: formatDate(paymentDate),
      paid_to_vendor_code: vendorCode,
      amount: amount,
      payment_mode: row['Payment Mode'] || 'CASH',
      reference: row['Bill / Challan '] || '',
      remarks: row['Item Name'] || '' // Using Item Name as remark in payment
    });
  });

  // --- 5. GENERATE ALLOCATIONS (FIFO) ---
  const allocations = [];
  let allocationCounter = 1;

  // Group by Vendor
  const vendorLedgers = {}; // vendorCode -> [entries]
  const vendorPayments = {}; // vendorCode -> [payments]

  ledgerEntries.forEach(entry => {
    if (!entry.paid_to_vendor_code) return; // Orphan entry
    if (!vendorLedgers[entry.paid_to_vendor_code]) vendorLedgers[entry.paid_to_vendor_code] = [];
    vendorLedgers[entry.paid_to_vendor_code].push({ ...entry, remaining: entry.total_amount });
  });

  payments.forEach(payment => {
    if (!payment.paid_to_vendor_code) return; // Orphan payment
    if (!vendorPayments[payment.paid_to_vendor_code]) vendorPayments[payment.paid_to_vendor_code] = [];
    vendorPayments[payment.paid_to_vendor_code].push({ ...payment, remaining: payment.amount });
  });

  // Process Allocation
  for (const vCode of Object.keys(vendorPayments)) {
    const vPayments = vendorPayments[vCode].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
    const vEntries = vendorLedgers[vCode]?.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date)) || [];

    let entryIdx = 0;
    for (const payment of vPayments) {
      while (payment.remaining > 0.01 && entryIdx < vEntries.length) {
        const entry = vEntries[entryIdx];
        
        if (entry.remaining <= 0.01) {
          entryIdx++;
          continue;
        }

        const allocate = Math.min(payment.remaining, entry.remaining);
        
        allocations.push({
          allocation_code: `A${String(allocationCounter++).padStart(4, '0')}`,
          payment_code: payment.payment_code,
          entry_code: entry.entry_code,
          allocated_amount: allocate.toFixed(2)
        });

        payment.remaining -= allocate;
        entry.remaining -= allocate;
      }
    }
  }

  // --- 6. DAILY WORK & MEDIA ---
  const dailyLogs = [];
  const workMedia = [];
  let workCounter = 1;

  cleanDaily.forEach(row => {
    const desc = row['Work'];
    if (!desc) return;

    const date = parseDate(row['Date']);
    if (!date) return;

    const code = `W${String(workCounter++).padStart(4, '0')}`;
    
    dailyLogs.push({
      work_code: code,
      work_date: formatDate(date),
      description: desc
    });

    if (row['Photo/ Video Link']) {
      workMedia.push({
        work_code: code,
        media_type: 'LINK',
        drive_url: row['Photo/ Video Link'],
        caption: 'Site Photo'
      });
    }
  });

  // --- 7. WRITE TO EXCEL ---
  const wb = XLSX.utils.book_new();

  // Convert Sets to Strings for Vendors
  const vendorData = Array.from(vendorMap.values()).map(v => ({
    ...v,
    roles: Array.from(v.roles).join(', ')
  }));
  const itemData = Array.from(itemMap.values());

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendorData), 'vendors_master');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemData), 'items_master');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledgerEntries), 'ledger_entries');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'payments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocations), 'payment_allocations');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyLogs), 'daily_work_logs');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workMedia), 'work_media');

  const outFile = path.join(__dirname, 'canonical_data.xlsx');
  XLSX.writeFile(wb, outFile);
  console.log(`\nGenerated Canonical Excel at: ${outFile}`);
  
  // Log counts
  console.log(`Vendors: ${vendorData.length}`);
  console.log(`Items: ${itemData.length}`);
  console.log(`Ledger Entries: ${ledgerEntries.length}`);
  console.log(`Payments: ${payments.length}`);
  console.log(`Allocations: ${allocations.length}`);
  console.log(`Daily Logs: ${dailyLogs.length}`);
}

generate().catch(console.error);
