# Data Import Analysis & Mapping Strategy

## 1. Column Analysis

### Sheet 1: Material & Services
*Source: https://docs.google.com/spreadsheets/d/1YxxaeRa5bj1T766KPIw-Fti0DIHbzVhPbvys2k6WY-g*

| Source Column | Semantic Meaning | Target Table.Column | Notes |
| :--- | :--- | :--- | :--- |
| `Date` | Date of transaction | `material_entries.entry_date` | Format: DD/MM/YYYY. Can be empty. |
| `Material Category` | Broad category (e.g., "Ground Cleaning") | `items.category` (if Item Name empty) or `items.name` | Used to infer Item if Name is missing. |
| `Item Name` | Specific item (e.g., "Cement") | `items.name` | Can be empty. |
| `Quantity` | Quantity purchased | `material_entries.quantity` | Can be empty. |
| `Supplier/Source` | Vendor Name (Alternative) | `vendors.name` | Check if different from Supplier Name. |
| `Supplier Name` | Vendor Name (Primary) | `vendors.name` | Normalize & Dedup. Can be empty. |
| `contact no` | Vendor Contact | `vendors.contact_details` | Store in vendor record. |
| `Total Cost` | Total transaction value | `material_entries.total_amount` | Parse "2,000" -> 2000.00. |
| `Note` | Remarks | `material_entries.remarks` | |
| `Site Photo...` | Evidence | `work_media` (maybe) | Usually empty in sample. |

**Issues Identified:**
- Missing `Date`, `Supplier Name`, `Item Name` in some rows.
- `Total Cost` exists even when Supplier is missing.
- **Action**: Schema must be relaxed to `allowNull: true` for `vendor_id`, `item_id`, `entry_date`, `total_amount`.

### Sheet 2: Payment
*Source: https://docs.google.com/spreadsheets/d/1hktu08UsI0pieeAdMzrFNdkVapaYHa1OXBkZF9uDjfE*

| Source Column | Semantic Meaning | Target Table.Column | Notes |
| :--- | :--- | :--- | :--- |
| `Date` | Payment Date | `payments.payment_date` | |
| `Item Name` | Context/Remark | `payments.remarks` | Do NOT map to item_id (Payment is for Vendor). |
| `Quantity` | Context | `payments.remarks` (append) | Irrelevant for payment record usually. |
| `Paid To ` | Vendor Name | `vendors.name` | Normalize & Dedup. |
| `Amount` | Payment Amount | `payments.amount` | Parse numbers. |
| `Payment Mode` | Method (UPI, Cash) | `payments.payment_mode` | |
| `Bill / Challan `| Reference | `payments.reference_no` | |

**Issues Identified:**
- `Paid To` can be empty even if Amount exists.
- **Action**: Schema must allow NULL `vendor_id` in `payments`.

### Sheet 3: Daily Work
*Source: https://docs.google.com/spreadsheets/d/1ADqzj7jByo3iK6D_xXrcZtda7sRuuu6EqgX17HHpIAM*

| Source Column | Semantic Meaning | Target Table.Column | Notes |
| :--- | :--- | :--- | :--- |
| `Date` | Work Date | `daily_work_logs.work_date` | |
| `Work Category` | Type of work | `daily_work_logs.description` | Combine with Work. |
| `Work` | Specific task | `daily_work_logs.description` | Combine with Category. |
| `Photo/ Video Link`| Google Drive Link | `work_media.media_url` | Link to Daily Work Log. |
| `Note` | Remarks | `daily_work_logs.description` | Append to description. |

## 2. Master Data Normalization Strategy

### Vendors
- **Source**: `Material & Services` ("Supplier Name", "Supplier/Source") + `Payment` ("Paid To ").
- **Logic**:
  1. Collect all unique names.
  2. Normalize: Trim spaces, lowercase for comparison.
  3. Create map: `Normalized Name` -> `Original Name`.
  4. Insert into `vendors` if not exists.
  5. Use `Unknown Vendor` (or NULL) if name is empty.

### Items
- **Source**: `Material & Services` ("Item Name", "Material Category").
- **Logic**:
  1. If `Item Name` exists, use it.
  2. If `Item Name` is empty, use `Material Category`.
  3. Type Inference:
     - Default: `MATERIAL`
     - Keywords for `SERVICE`: "Labour", "Cleaning", "Cutting", "Transport", "JCB".
  4. Unit: Default to 'Unit' (or infer from Quantity if possible, but safer to default).

## 3. Schema Modifications (Required)
To satisfy "Missing data must be preserved as NULL", we must alter the strict schema.

**Migration Required:**
- `material_entries`: Allow NULL for `vendor_id`, `item_id`, `quantity`, `rate`, `total_amount`, `entry_date`.
- `payments`: Allow NULL for `vendor_id`, `payment_date`, `amount`, `payment_mode`.
- `daily_work_logs`: Allow NULL for `work_date`.

## 4. Import Execution Plan
1. **Pre-Import**: Run migration to relax constraints.
2. **Step 1: Vendors**: Scan all sheets, seed `vendors` table.
3. **Step 2: Items**: Scan Material sheet, seed `items` table.
4. **Step 3: Materials**: Import Material sheet rows to `material_entries`.
5. **Step 4: Payments**: Import Payment sheet rows to `payments`.
6. **Step 5: Daily Work**: Import Daily Work sheet to `daily_work_logs` & `work_media`.
7. **Step 6: Allocation**: Run `Payment Allocation Logic` (Strict matching).
8. **Validation**: Generate reports.
