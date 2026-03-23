# School Accounting Management System

A complete, full-stack accounting management system for schools with student management, fee tracking, payment processing, expense management, and comprehensive reporting.

## 🎯 Features

### Core Features
- **Student Management** - Add, edit, delete, and search students
- **Class & Section Management** - Organize students by class and section
- **Fee Structure** - Set fees (monthly, yearly, custom)
- **Payment Tracking** - Record and track all student payments
- **Installment System** - Split payments into installments
- **Automatic Invoice Generation** - Generate PDF invoices
- **Expense Tracking** - Track school expenses by category
- **Revenue Dashboard** - View key financial metrics
- **Reports** - Daily, monthly, and yearly reports

### Advanced Features
- **Search & Filter** - Find students by name, class, payment status
- **Payment Notifications** - Alerts for unpaid fees
- **Multi-user Roles** - Admin, Accountant, Teacher roles
- **Secure Authentication** - JWT-based login system
- **Data Backup & Restore** - Database backup functionality
- **Payment Methods** - Cash, bank transfer, cheque, online

### Technical Stack
- **Frontend:** React 18 with React Router
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **Architecture:** REST API with modular design
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** bcryptjs password hashing, helmet security headers

## 📁 Project Structure

```
school-accounting-system/
├── backend/                  # Express.js server
├── frontend/                 # React application  
├── database/                 # PostgreSQL schema & sample data
├── SETUP_GUIDE.md           # Complete setup instructions
└── README.md                # This file
```

## 🚀 Quick Start

### 1. Database Setup
```bash
# Create PostgreSQL database and load schema
cd database
psql -U postgres < schema.sql
psql -U school_user -d school_accounting < sample_data.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with database credentials
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Visit http://localhost:3000 to access the application.

## 📚 API Endpoints

### Authentication
```
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/change-password
```

### Students
```
GET    /api/students                    # List all students
GET    /api/students/:id                # Get student details
POST   /api/students                    # Create student
PUT    /api/students/:id                # Update student
DELETE /api/students/:id                # Delete student
GET    /api/students/search?query=name  # Search students
```

### Payments
```
GET    /api/payments                    # List all payments
POST   /api/payments                    # Record payment
GET    /api/payments/:id                # Get payment details
PUT    /api/payments/:id                # Update payment
DELETE /api/payments/:id                # Delete payment
GET    /api/payments/summary            # Payment summary report
GET    /api/payments/:id/invoice/:fee_id # Generate invoice
```

### Expenses
```
GET    /api/expenses                    # List all expenses
POST   /api/expenses                    # Create expense
PUT    /api/expenses/:id                # Update expense
PUT    /api/expenses/:id/approve        # Approve expense
DELETE /api/expenses/:id                # Delete expense
GET    /api/expenses/summary            # Expense summary
```

### Dashboard
```
GET    /api/dashboard/stats             # Dashboard statistics
GET    /api/dashboard/report/daily      # Daily report
GET    /api/dashboard/report/monthly    # Monthly report
```

## 🔐 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | (See database) |
| Accountant | accountant@school.com | (See database) |
| Teacher | sarah@school.com | (See database) |

⚠️ **Change default passwords immediately after first login!**

## 📊 Database Schema

The system uses the following main tables:
- **users** - System users (Admin, Accountant, Teacher)
- **students** - Student information
- **classes** - Class definitions
- **sections** - Class sections
- **student_fees** - Fee assignments
- **payments** - Payment records
- **expenses** - Expense tracking
- **invoices** - Generated invoices
- **notifications** - User notifications
- **audit_logs** - System audit trail

## 🔧 Configuration

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_accounting
DB_USER=school_user
DB_PASSWORD=password
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 💡 Key Implementation Details

### Backend Architecture
- **Models** - Database abstraction layer
- **Controllers** - Business logic handlers
- **Routes** - API endpoint definitions
- **Middleware** - Authentication, validation, logging
- **Utils** - Helper functions (JWT, PDF, Email, etc.)

### Frontend Architecture
- **Pages** - Route-based page components
- **Components** - Reusable UI components
- **Services** - API client integration
- **Hooks** - Custom React hooks (useAuth, useFetch)

### Security Features
- JWT token-based authentication
- Password hashing with bcryptjs
- Role-based access control (RBAC)
- SQL injection prevention (parameterized queries)
- CORS protection
- Security headers (helmet)

## 📝 Sample Data Included

The system comes with populated sample data:
- 10 students across different classes
- Multiple fee structures
- Payment records for demonstrations
- Expense entries
- User accounts for testing

## 🎓 Learning Resources

The code includes detailed comments explaining:
- Database relationships and queries
- API request/response handling
- React component lifecycle
- State management patterns
- Form validation
- Error handling

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -i :5000  # Find process
kill -9 <PID>  # Kill process
```

### Database Connection Error
```bash
psql -U school_user -d school_accounting -c "SELECT 1"
```

### Module Not Found
```bash
npm install  # Reinstall dependencies
```

### CORS Issues
- Ensure backend is running
- Check CORS configuration in backend
- Verify API URL in frontend .env

## 📖 Full Documentation

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for:
- Step-by-step installation
- Database configuration
- Environment variables
- API documentation
- Deployment instructions
- Performance optimization
- Security best practices

## 🚀 Deployment

### Backend (Heroku)
```bash
heroku create school-accounting-api
heroku addons:create heroku-postgresql
git push heroku main
```

### Frontend (Vercel)
```bash
vercel --prod
```

## 📄 License

Proprietary - For school use only

## 👥 Support

For issues or questions, contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-17  
**Status:** Production Ready ✅
