# Data Import Instructions

## Overview
This project includes a robust data import system to migrate legacy data from Google Sheets into the MySQL database.
The import process is designed to be **safe**, **idempotent**, and **audited**.

## Prerequisites
- Backend dependencies installed: `npm install` (inside `backend` directory)
- Database created and migrated: `npx sequelize-cli db:migrate`

## Supported Data Sources
1. **Material & Services Sheet**: `https://docs.google.com/spreadsheets/d/1YxxaeRa5bj1T766KPIw-Fti0DIHbzVhPbvys2k6WY-g`
2. **Payment Sheet**: `https://docs.google.com/spreadsheets/d/1hktu08UsI0pieeAdMzrFNdkVapaYHa1OXBkZF9uDjfE`
3. **Daily Work Sheet**: `https://docs.google.com/spreadsheets/d/1ADqzj7jByo3iK6D_xXrcZtda7sRuuu6EqgX17HHpIAM`

## Execution
To run the import, execute the following command from the `backend` directory:

```bash
node scripts/import_data.js
```

## What the Script Does
1. **Cleans Transaction Data**: Truncates `material_entries`, `payments`, `daily_work_logs` to prevent duplication (Master data like Vendors/Items is preserved).
2. **Fetches CSVs**: Downloads real-time data from Google Sheets.
3. **Normalizes Vendors**: Merges duplicate vendor names (case-insensitive) and creates new vendors if missing.
4. **Normalizes Items**: Creates items/services based on names and categories.
5. **Imports Transactions**:
   - Inserts Material Entries (calculates missing rates).
   - Inserts Payments.
   - Inserts Daily Work Logs and links Media (Drive URLs).
6. **Audits**: Compares source row counts and financial totals with the database.

## Validation
After import, you can run the SQL queries in `docs/VALIDATION_QUERIES.sql` to verify the data integrity.

## Notes
- **Missing Data**: Fields like `Date` or `Vendor` that are missing in the source are stored as `NULL` (schema constraints were relaxed to support this).
- **Payment Allocation**: Payments are imported but NOT automatically allocated to specific material entries to avoid incorrect guessing. They remain as unallocated credits on the vendor account.
