-- DATABASE RESET SCRIPT
-- Project: BuildLedgerPIS
-- Author: Principal Database Architect
-- Date: 2026-02-04
-- Description: Complete schema reset and rebuild for enterprise-grade construction accounting.
--              Updated with CRITICAL FIXES: 
--              1. Rate is now a normal column (not generated).
--              2. Payment category removed (derived from allocation).
--              3. Payment status removed from entries (derived).
--              4. Vendor uniqueness relaxed (normalized_name added).

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. DROP EXISTING TABLES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS work_media;
DROP TABLE IF EXISTS daily_work_logs;
DROP TABLE IF EXISTS payment_allocations;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS material_service_entries;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS item_types;
DROP TABLE IF EXISTS vendor_role_assignments;
DROP TABLE IF EXISTS vendor_roles;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS work_material_usage; -- Legacy table cleanup
DROP TABLE IF EXISTS material_entries;    -- Legacy table cleanup

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 2. CREATE NEW SCHEMA
-- -----------------------------------------------------------------------------

-- 2.1 ROLES & USERS
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- ADMIN, EDITOR, VIEWER
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 2.2 VENDORS & ROLES
CREATE TABLE vendor_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE -- SUPPLIER, CONTRACTOR, PAYEE
);

CREATE TABLE vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL, -- NOT UNIQUE (Real world names vary)
    normalized_name VARCHAR(150) NOT NULL UNIQUE, -- Normalized for uniqueness check
    contact_details VARCHAR(100),
    tax_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE vendor_role_assignments (
    vendor_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (vendor_id, role_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES vendor_roles(id) ON DELETE CASCADE
);

-- 2.3 ITEMS
CREATE TABLE item_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE -- MATERIAL, SERVICE
);

CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL, -- NOT UNIQUE (Real world names vary)
    normalized_name VARCHAR(150) NOT NULL UNIQUE, -- Normalized for uniqueness check
    type_id INT NOT NULL,
    unit VARCHAR(20) NOT NULL, -- Default unit (Bags, Kg, Lumpsum)
    category VARCHAR(50) DEFAULT 'General',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES item_types(id)
);

-- 2.4 MATERIAL & SERVICE ENTRIES (The Core Ledger)
CREATE TABLE material_service_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_date DATE NOT NULL,
    item_id INT NOT NULL,
    
    -- Dual Vendor Support (Source vs Payee)
    source_vendor_id INT, -- Who provided the goods/service (e.g. Thekedar)
    paid_to_vendor_id INT, -- Who receives the payment (e.g. Thekedar or Sub-contractor)
    
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL, -- Snapshot of unit at time of entry (Mandatory)
    
    total_amount DECIMAL(12, 2) NOT NULL,
    
    -- FIXED: Rate is now a normal column, not generated
    rate DECIMAL(10, 2) DEFAULT NULL, 
    
    remarks TEXT,
    
    -- FIXED: Payment status removed. It must be derived from allocations.
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (source_vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (paid_to_vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 2.5 PAYMENTS
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_date DATE NOT NULL,
    vendor_id INT NOT NULL, -- The Payee
    
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER') DEFAULT 'BANK_TRANSFER',
    
    -- FIXED: Payment category removed. Derived from allocations.
    
    reference_no VARCHAR(100),
    remarks TEXT,
    
    -- Allocation State
    allocation_status ENUM('UNALLOCATED', 'PARTIAL', 'FULLY_ALLOCATED') DEFAULT 'UNALLOCATED',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 2.6 ALLOCATIONS (The Bridge)
CREATE TABLE payment_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    entry_id INT NOT NULL,
    
    allocated_amount DECIMAL(12, 2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES material_service_entries(id) ON DELETE RESTRICT,
    
    -- Prevent duplicate allocation for same pair
    UNIQUE KEY unique_allocation (payment_id, entry_id)
);

-- 2.7 DAILY WORK LOGS
CREATE TABLE daily_work_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_date DATE NOT NULL,
    description TEXT NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE work_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_work_id INT NOT NULL,
    media_type ENUM('IMAGE', 'VIDEO', 'DOCUMENT') DEFAULT 'IMAGE',
    drive_url TEXT NOT NULL,
    caption VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (daily_work_id) REFERENCES daily_work_logs(id) ON DELETE CASCADE
);

-- 2.8 AUDIT LOGS
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- No FK for changed_by to allow keeping logs even if user deleted
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX idx_mse_date ON material_service_entries(entry_date);
CREATE INDEX idx_mse_vendor ON material_service_entries(paid_to_vendor_id);
CREATE INDEX idx_mse_item ON material_service_entries(item_id);
-- idx_mse_status REMOVED (Column deleted)

CREATE INDEX idx_pay_date ON payments(payment_date);
CREATE INDEX idx_pay_vendor ON payments(vendor_id);
CREATE INDEX idx_pay_status ON payments(allocation_status);

CREATE INDEX idx_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_alloc_entry ON payment_allocations(entry_id);

-- -----------------------------------------------------------------------------
-- 4. INITIAL SEED (System Roles & Types ONLY - NO USER DATA)
-- -----------------------------------------------------------------------------
INSERT INTO roles (name, description) VALUES 
('ADMIN', 'Full system access'),
('EDITOR', 'Can create and edit entries'),
('VIEWER', 'Read-only access');

INSERT INTO vendor_roles (name) VALUES 
('SUPPLIER'), ('CONTRACTOR'), ('PAYEE');

INSERT INTO item_types (name) VALUES 
('MATERIAL'), ('SERVICE');
