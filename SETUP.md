# BuildLedgerPIS Setup Instructions

## Prerequisites
- Node.js (v16+)
- MySQL (v8.0+)
- npm or yarn

## Database Setup
1. Create a MySQL database named `buildledger_pis`.
2. Configure database credentials in `backend/.env` (create if missing).

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=buildledger_pis
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key
NODE_ENV=development
```

## Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run database migrations to create tables:
   ```bash
   npx sequelize-cli db:migrate
   ```
4. (Optional) Seed initial data:
   ```bash
   npx sequelize-cli db:seed:all
   ```
5. Start the server:
   ```bash
   npm run dev
   ```
   Server will start on `http://localhost:3000`.

## Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Frontend will start on `http://localhost:5173`.

## Default Users (Seed Data)
- **Admin**: divyansh.osop@gmail.com / admin123
- **Editor**: dharmendra.bajpai@gmail.com / editor123
- **Viewer**: sanveerchhabra@gmail.com / super123

## Troubleshooting
- If you encounter "Access denied" for MySQL, check your `.env` credentials.
- If tables are missing, ensure migrations ran successfully.
- Ensure the backend server is running on port 3000 before starting the frontend.
