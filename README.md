# BuildLedger PIS - Construction Accounting System

## Overview
Enterprise-grade construction accounting and operations system designed to handle complex construction data (Materials, Payments, Daily Work Logs).

## Tech Stack
- **Backend:** Node.js, Express.js, Sequelize ORM, MySQL
- **Frontend:** React, Vite, Tailwind CSS (optional), React Router, Axios
- **Database:** MySQL 8.0+

## Project Structure
```
/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── config/   # DB Configuration
│   │   ├── db/       # Models, Migrations, Seeders
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── server.js
├── frontend/         # React + Vite Client
│   ├── src/
│   │   ├── api/      # Central Axios Config
│   │   ├── auth/     # Auth Context & Logic
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── routes/
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MySQL Server

### 1. Database Setup
1. Create a MySQL database (e.g., `buildledger_dev`).
2. Update database credentials in `backend/.env`.

### 2. Backend Setup
```bash
cd backend
npm install
# Update .env with your DB credentials
# Run Migrations
npx sequelize-cli db:migrate
# Run Seeders (Create default users)
npx sequelize-cli db:seed:all
# Start Server
npm run dev
```
Backend runs on `http://localhost:3000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
# Start Client
npm run dev
```
Frontend runs on `http://localhost:5173`.

## Default Users (Seeded)
- **Admin:** `divyansh.osop@gmail.com` / `admin123`
- **Editor:** `dharmendra.bajpai@gmail.com` / `editor123`
- **Viewer:** `sanveerchhabra@gmail.com` / `super123`

## Architecture Notes
- **Normalization:** 3NF Schema designed for flexibility.
- **Relationships:**
  - One-to-Many: Vendor -> Payments, Vendor -> MaterialEntries
  - Many-to-Many: Payments <-> MaterialEntries (via PaymentAllocations)
- **Security:** JWT Authentication, Bcrypt Password Hashing, Role-Based Access Control (RBAC).
