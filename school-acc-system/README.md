# School Accounting Management System

A full-stack school accounting platform with student management, fee tracking, invoices, payments, expenses, and reports.

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL

## Project Structure
- `backend/` Express API
- `frontend/` React app
- `docs/` SQL schema and API reference

## Setup Instructions

### 1) Database
1. Create a PostgreSQL database named `school_acc`.
2. Update `backend/.env` using `backend/.env.example` as a template.
3. Run migrations and seed data:

```bash
cd backend
npm install
npm run migrate
npm run seed
```

### 2) Backend
```bash
cd backend
npm install
npm run dev
```

API runs at `http://localhost:4000`.

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Demo Credentials
- Email: `admin@school.local`
- Password: `admin123`

## Notes
- Invoices are saved under `backend/storage/invoices`.
- Backup/restore is JSON-based via `/api/backup/export` and `/api/backup/import`.

## Sample Data
Seed script creates a class, section, student, and fee structure.

## Security Highlights
- JWT authentication
- Role-based access (Admin, Accountant)
- Helmet + CORS
- Parameterized SQL queries
