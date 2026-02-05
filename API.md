# BuildLedgerPIS API Documentation

Base URL: `http://localhost:3000/api/v1`

## Authentication

### Login
- **POST** `/auth/login`
- **Body**: `{ "email": "user@example.com", "password": "password" }`
- **Response**: 
  ```json
  {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "role": "ADMIN"
  }
  ```

### Refresh Token
- **POST** `/auth/refresh`
- **Body**: `{ "refreshToken": "refresh_token" }`
- **Response**: `{ "accessToken": "new_jwt_token" }`

## Vendors

### Get All Vendors
- **GET** `/vendors`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `[ { "id": 1, "name": "Vendor A", "normalized_name": "vendora", "contact_details": "...", "tax_id": "..." }, ... ]`

### Create Vendor
- **POST** `/vendors`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "name": "New Vendor", "contact_details": "Phone/Email", "tax_id": "GST123" }`

## Items (Materials/Services)

### Get All Items
- **GET** `/items`
- **Response**: `[ { "id": 1, "name": "Cement", "unit": "BAG", "type": "MATERIAL" }, ... ]`

### Create Item
- **POST** `/items`
- **Body**: `{ "name": "New Item", "type": "MATERIAL", "unit": "KG", "category": "Civil" }`

## Ledger (Materials & Services)

### Get Entries
- **GET** `/materials`
- **Query Params**: `vendor_id` (Paid To), `item_id`, `startDate`, `endDate`
- **Response**: 
  ```json
  [
    {
      "id": 1,
      "entry_date": "2023-10-01",
      "quantity": 100,
      "unit": "BAG",
      "total_amount": "5000.00",
      "rate": "50.00",
      "paid_amount": "0.00",
      "due_amount": "5000.00",
      "Item": { "name": "Cement" },
      "PaidToVendor": { "name": "Vendor A" },
      "SourceVendor": { "name": "Vendor B" }
    }
  ]
  ```

### Create Entry
- **POST** `/materials`
- **Body**: 
  ```json
  {
    "entry_date": "2023-10-01",
    "item_id": 1,
    "paid_to_vendor_id": 1,
    "source_vendor_id": 2,
    "quantity": 100,
    "unit": "BAG",
    "total_amount": 5000,
    "remarks": "Batch 1"
  }
  ```
  - Note: `source_vendor_id` defaults to `paid_to_vendor_id` if not provided.

## Payments

### Get Payments
- **GET** `/payments`
- **Response**: List of payments with `allocated_amount` and `allocation_status`.

### Create Payment
- **POST** `/payments`
- **Body**:
  ```json
  {
    "vendor_id": 1,
    "payment_date": "2023-10-05",
    "amount": 2000,
    "payment_mode": "BANK_TRANSFER",
    "remarks": "Advance"
  }
  ```

### Allocate Payment
- **POST** `/payments/:id/allocate`
- **Body**:
  ```json
  {
    "allocations": [
      { "entry_id": 1, "amount": 1000 },
      { "entry_id": 2, "amount": 500 }
    ]
  }
  ```
- **Rules**: 
  - Transaction-safe.
  - Cannot over-allocate payment capacity.
  - Cannot allocate more than due amount for a material entry.
  - Must belong to the same vendor.

## Daily Work

### Create Work Log
- **POST** `/daily-work`
- **Body**:
  ```json
  {
    "work_date": "2023-10-05",
    "description": "Foundation work",
    "media": [
       { "media_type": "IMAGE", "drive_url": "http://...", "caption": "Site Photo" }
    ]
  }
  ```

## Reports

### Financial Summary
- **GET** `/reports/summary`
- **Response**: `{ "total_project_cost": ..., "total_paid": ..., "total_allocated": ..., "total_due": ..., "total_advance": ... }`

### Other Reports
- `/reports/expenses?startDate=...&endDate=...` (Date-wise)
- `/reports/items` (Item-wise consumption)
- `/reports/vendors` (Vendor-wise ledger)
