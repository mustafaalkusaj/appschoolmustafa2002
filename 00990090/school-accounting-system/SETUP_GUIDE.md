# School Accounting Management System - Setup Guide

Complete setup guide for the School Accounting Management System (SAMS).

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Default Credentials](#default-credentials)
7. [API Documentation](#api-documentation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional)

### Verify Installation

```bash
node --version    # Should be v14+
npm --version     # Should be v6+
psql --version    # Should be v12+
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# In PostgreSQL prompt:
CREATE DATABASE school_accounting;
CREATE USER school_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE school_accounting TO school_user;
\q
```

### 2. Load Database Schema

```bash
# Navigate to project database folder
cd school-accounting-system/database

# Load schema
psql -U school_user -d school_accounting -f schema.sql

# Load sample data
psql -U school_user -d school_accounting -f sample_data.sql

# Verify tables
psql -U school_user -d school_accounting -c "\dt"
```

---

## Backend Setup

### 1. Install Dependencies

```bash
cd school-accounting-system/backend

npm install
# or
yarn install
```

### 2. Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your values (for macOS/Linux use nano or vim)
nano .env
```

**Update these values in `.env`:**

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_accounting
DB_USER=school_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your-super-secret-key-change-this
NODE_ENV=development
PORT=5000
```

### 3. Test Database Connection

```bash
# Start the backend server
npm start

# You should see:
# ╔════════════════════════════════════════════════════════════════╗
# ║  School Accounting Management System - Backend Server Running  ║
# │  Server: http://localhost:5000
```

**If connection fails:**
- Verify PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- Check credentials in `.env`
- Verify database exists: `psql -U school_user -d school_accounting -c "\dt"`

### 4. Test API

```bash
# In another terminal, test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"password"}'
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd school-accounting-system/frontend

npm install
# or
yarn install
```

### 2. Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Default values should work if backend is on localhost:5000
```

### 3. Start Development Server

```bash
npm start

# Frontend will open at http://localhost:3000
# If not automatic, open browser and go to http://localhost:3000
```

---

## Running the Application

### Terminal 1: Start Backend Server

```bash
cd school-accounting-system/backend
npm start

# Output:
# Server is running at http://localhost:5000
```

### Terminal 2: Start Frontend Server

```bash
cd school-accounting-system/frontend
npm start

# Browser opens at http://localhost:3000
```

### Access the Application

- **Frontend URL:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

---

## Default Credentials

### Admin Account
- **Email:** admin@school.com
- **Password:** Default password set in database (update immediately)

### Accountant Account
- **Email:** accountant@school.com
- **Password:** Default password set in database

### Teacher Account
- **Email:** sarah@school.com
- **Password:** Default password set in database

**⚠️ IMPORTANT:** Change all default passwords after first login!

---

## API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/change-password
GET /api/auth/me
```

### Students
```
GET /api/students                    # Get all students
GET /api/students/:id                # Get student by ID
GET /api/students/search?query=name  # Search students
POST /api/students                   # Create student (admin/accountant)
PUT /api/students/:id                # Update student (admin/accountant)
DELETE /api/students/:id             # Delete student (admin only)
GET /api/students/:id/payment-summary # Get payment summary
```

### Payments
```
GET /api/payments                         # Get all payments
POST /api/payments                        # Record payment
GET /api/payments/:id                     # Get payment by ID
PUT /api/payments/:id                     # Update payment
DELETE /api/payments/:id                  # Delete payment
GET /api/payments/summary?from_date=2024-01-01&to_date=2024-01-31
GET /api/payments/:student_id/invoice/:fee_id # Generate invoice
```

### Expenses
```
GET /api/expenses                         # Get all expenses
POST /api/expenses                        # Create expense
PUT /api/expenses/:id                     # Update expense
PUT /api/expenses/:id/approve             # Approve expense (admin)
DELETE /api/expenses/:id                  # Delete expense
GET /api/expenses/summary?from_date=...&to_date=...
GET /api/expenses/categories              # Get categories
```

### Dashboard
```
GET /api/dashboard/stats              # Dashboard statistics
GET /api/dashboard/report/daily       # Daily report
GET /api/dashboard/report/monthly     # Monthly report
```

---

## Project Structure

```
school-accounting-system/
├── backend/                      # Node.js/Express server
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   ├── models/              # Database models
│   │   ├── controllers/         # Request handlers
│   │   ├── routes/              # API routes
│   │   ├── middleware/          # Auth, validation, logging
│   │   ├── utils/               # Helper functions
│   │   └── index.js             # Server entry point
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API services
│   │   ├── hooks/               # Custom React hooks
│   │   ├── App.js               # Main app component
│   │   └── index.js             # Entry point
│   ├── public/
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── database/                     # Database files
│   ├── schema.sql               # Database schema
│   └── sample_data.sql          # Sample data
│
└── README.md                     # This file
```

---

## Key Features

### ✅ Student Management
- Add, edit, delete students
- Search and filter students
- Track student class and section
- Parent contact information

### ✅ Fee Management
- Define fee structures (monthly, yearly, custom)
- Assign fees to students
- Track payment status
- Installment system

### ✅ Payment Tracking
- Record payments (cash, bank transfer, cheque, online)
- Generate payment receipts
- Payment history per student
- Payment summaries and reports

### ✅ Financial Management
- Track school expenses by category
- Approve/reject expenses (admin)
- Expense reports (daily, monthly)
- Income vs. expense analysis

### ✅ Dashboard & Reports
- Key statistics (revenue, expenses, students)
- Charts (pie, bar graphs)
- Daily and monthly reports
- Payment method breakdown

### ✅ Security
- User authentication with JWT
- Role-based access control (Admin, Accountant, Teacher)
- Password hashing with bcryptjs
- Secure API with helmet

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000 (backend)
lsof -i :5000

# Find process using port 3000 (frontend)
lsof -i :3000

# Kill process (macOS/Linux)
kill -9 <PID>

# Or change port in .env (backend) or in npm start
PORT=5001 npm start
```

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify credentials
psql -U school_user -d school_accounting -c "SELECT 1"

# Check .env values match database setup
cat .env | grep DB_
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

Ensure backend is running and CORS is enabled:
- Check backend is at http://localhost:5000
- Verify CORS middleware in `backend/src/index.js`
- Check frontend `.env` has correct API URL

### JWT Token Expired

```javascript
// Tokens expire after 7 days by default
// Change JWT_EXPIRE in .env if needed
JWT_EXPIRE=30d  # For 30 days
```

---

## Performance Optimization

### Database Optimization
```sql
-- Add indexes (already in schema.sql)
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
```

### Backend Optimization
- Connection pooling (configured in database.js)
- Query pagination (default: 10 items per page)
- Response caching (can be added)
- Gzip compression (via helmet)

### Frontend Optimization
- Code splitting with React Router
- Lazy loading of components
- Minimize bundle size
- Use production build for deployment

---

## Deployment

### Backend Deployment (Heroku Example)

```bash
# Install Heroku CLI
# Create account at https://www.heroku.com

heroku login
heroku create school-accounting-api
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set JWT_SECRET=your-secret-key
git push heroku main
```

### Frontend Deployment (Vercel Example)

```bash
# Install Vercel CLI
npm i -g vercel

vercel --prod
# Change REACT_APP_API_URL to heroku backend
```

---

## Security Best Practices

1. **Change default passwords** immediately
2. **Use strong JWT_SECRET** (min 32 characters)
3. **Enable HTTPS** in production
4. **Use environment variables** for sensitive data
5. **Regular database backups**
6. **Update dependencies**: `npm audit fix`
7. **Validate all user inputs**
8. **Use API rate limiting** (optional package)

---

## Support & Documentation

- **Backend:** See `backend/src/controllers/` for implementation details
- **Frontend:** See `frontend/src/pages/` for UI components
- **Database:** See `database/schema.sql` for table structure
- **API:** Test at http://localhost:5000/api/health

---

## Changelog

### Version 1.0.0
- Initial release
- All core features implemented
- Admin and Accountant roles
- Student management
- Payment tracking
- Expense management
- Dashboard and reports

---

## License

This project is proprietary and intended for school use only.

---

**Last Updated:** 2024-01-17
**Author:** School Accounting System Team
