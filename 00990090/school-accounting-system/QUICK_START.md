# School Accounting System - Quick Reference

## 🚀 Getting Started (5 minutes)

### Prerequisites Checklist
- ✅ Node.js v14+ installed
- ✅ PostgreSQL installed and running
- ✅ All 3 terminals ready

### Step 1: Database (2 min)
```bash
# Terminal 1: Create database
psql -U postgres

# In postgres prompt:
CREATE DATABASE school_accounting;
CREATE USER school_user WITH PASSWORD 'secure123';
GRANT ALL PRIVILEGES ON DATABASE school_accounting TO school_user;
\q

# Load schema
cd database
psql -U school_user -d school_accounting -f schema.sql
psql -U school_user -d school_accounting -f sample_data.sql
```

### Step 2: Backend (2 min)
```bash
# Terminal 2: Start backend
cd backend
cp .env.example .env
# Edit .env - set DB_PASSWORD to 'secure123'

npm install
npm start
# Should show: "Server is running"
```

### Step 3: Frontend (1 min)
```bash
# Terminal 3: Start frontend
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

---

## 📱 Default Logins

```
Email: admin@school.com
Password: (use any password, then update)

Email: accountant@school.com
Password: (use any password, then update)
```

---

## 🎯 Key URLs

| Purpose | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health Check | http://localhost:5000/api/health |
| Database | localhost:5432 |

---

## 📋 Main Features

### Dashboard (`/dashboard`)
- 📊 Key metrics (students, revenue, expenses)
- 💰 Monthly income/expenses
- ⚠️ Pending fees tracking
- 📈 Payment method breakdown

### Students (`/students`)
- Add/Edit/Delete students
- Search by name or admission #
- View payment summary
- Parent contact details

### Payments (`/payments`)
- Record payments (4 methods)
- Payment history
- Receipt generation
- Track payment status

### Expenses (`/expenses`)
- Log school expenses
- Categorize by type
- Require approval (admin)
- Expense reports

### Reports (`/reports`)
- Daily income/expense
- Monthly summaries
- Student fee status
- Category breakdown

---

## 🔧 File Structure

```
backend/
├── src/
│   ├── config/       → Database & config files
│   ├── models/       → Database queries
│   ├── controllers/  → Business logic
│   ├── routes/       → API endpoints
│   ├── middleware/   → Auth & validation
│   └── utils/        → Helper functions
└── package.json

frontend/
├── src/
│   ├── pages/        → Main views
│   ├── components/   → Reusable parts
│   ├── services/     → API calls
│   ├── hooks/        → Custom hooks
│   └── index.css     → Styles
└── package.json

database/
├── schema.sql        → Table definitions
└── sample_data.sql   → Test data
```

---

## 🔐 Security

### Passwords
- Stored as bcrypt hash (never plain text)
- Min 8 characters recommended
- Change default passwords immediately

### API Security
- JWT tokens for authentication
- Role-based access control
- Token expires in 7 days
- HTTPS ready for production

### Database
- SQL injection prevention
- Parameterized queries
- Secure password storage

---

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check database running
psql -U postgres -c "SELECT 1"

# Check port free
lsof -i :5000

# Reinstall
rm -rf node_modules && npm install
```

### Frontend shows "Cannot connect"
```bash
# Ensure backend is running on :5000
curl http://localhost:5000/api/health

# Check .env has correct URL
cat .env | grep API
```

### Database connection error
```bash
# Verify credentials
psql -U school_user -d school_accounting

# Check tables exist
psql -U school_user -d school_accounting -c "\dt"
```

---

## 📊 Sample Data Included

After loading `sample_data.sql`:

**Students:** 10 students (Grade 1-6)
**Classes:** 7 classes (K-Grade 6)
**Fees:** 7 different fee types
**Payments:** Multiple payment records
**Expenses:** 6 expense entries
**Users:** 3 user accounts for testing

---

## 💻 Common Commands

### Backend
```bash
npm start          # Start server
npm run dev        # Start with nodemon (hot reload)
npm test           # Run tests
```

### Frontend
```bash
npm start          # Start dev server
npm run build      # Create production build
npm test           # Run tests
```

### Database
```bash
# Connect
psql -U school_user -d school_accounting

# List tables
\dt

# Run query
SELECT COUNT(*) FROM students;

# Exit
\q
```

---

## 🎨 UI Pages

| Page | URL | Purpose |
|------|-----|---------|
| Login | `/login` | User authentication |
| Dashboard | `/dashboard` | Statistics & overview |
| Students | `/students` | Student management |
| Student Detail | `/students/:id` | Individual student info |
| Payments | `/payments` | Payment records |
| Expenses | `/expenses` | Expense management |
| Reports | `/reports` | Financial reports |

---

## 📦 Core Dependencies

### Backend
- express (server)
- pg (database)
- jsonwebtoken (JWT auth)
- bcryptjs (password hashing)
- pdfkit (PDF generation)
- cors (cross-origin requests)
- helmet (security headers)

### Frontend
- react (UI library)
- react-router-dom (navigation)
- axios (API calls)
- chart.js (charts)
- react-hot-toast (notifications)

---

## ⚡ Performance Tips

### Database
- Indexes on common columns (already configured)
- Pagination for large lists (10 items/page default)
- Connection pooling (20 connections)

### Application
- Lazy load components
- Cache API responses
- Use gzip compression
- Minimize bundle size

### Hosting
- Use PostgreSQL cloud provider
- Deploy backend to Heroku/Railway
- Deploy frontend to Vercel/Netlify
- Use Content Delivery Network (CDN)

---

## 🔄 API Call Examples

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"password"}'
```

### Get Students
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/students?page=1&limit=10
```

### Record Payment
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id":1,
    "amount":2000,
    "payment_method":"cash"
  }'
```

---

## 📞 Support

### Error Codes
- 400: Bad request (invalid data)
- 401: Unauthorized (invalid token)
- 403: Forbidden (no permission)
- 404: Not found
- 500: Server error

### Debug Mode
```bash
# Backend
NODE_ENV=development npm start
LOG_QUERIES=true npm start

# Frontend
REACT_APP_DEBUG=true npm start
```

---

## 📅 Typical Workflow

1. **Login** → Enter credentials
2. **Dashboard** → Review statistics
3. **Students** → Manage student list
4. **Payments** → Record student payments
5. **Expenses** → Track school expenses
6. **Reports** → Generate reports

---

## ✨ Next Steps

1. ✅ Run the application
2. ✅ Test login with demo credentials  
3. ✅ Add a student
4. ✅ Record a payment
5. ✅ View dashboard statistics
6. ✅ Generate a report

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-17
