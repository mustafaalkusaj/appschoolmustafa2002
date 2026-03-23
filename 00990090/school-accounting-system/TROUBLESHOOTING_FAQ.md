# School Accounting System - Troubleshooting & FAQ

Complete guide to troubleshoot common issues and answer frequently asked questions.

---

## 🔧 Common Issues & Solutions

### Database Connection Issues

#### Problem: "Error: connect ECONNREFUSED 127.0.0.1:5432"

**Causes:**
- PostgreSQL is not running
- Wrong database host/port in `.env`
- Database credentials are incorrect

**Solutions:**

1. **Check if PostgreSQL is running:**
```bash
# macOS
brew services list
# Should show "postgresql" as started

# Linux
sudo systemctl status postgresql

# Windows
# Check Services.msc for PostgreSQL
```

2. **Start PostgreSQL:**
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
net start postgresql-x64-XX
```

3. **Verify connection details in `.env`:**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_accounting
DB_USER=postgres
DB_PASSWORD=your_password
```

4. **Test database directly:**
```bash
psql -U postgres -h localhost -d school_accounting
# Should connect successfully
```

5. **Recreate the database:**
```bash
# Drop existing database
dropdb -U postgres school_accounting

# Create fresh database
createdb -U postgres school_accounting

# Import schema
psql -U postgres -d school_accounting < backend/database/schema.sql

# Import sample data
psql -U postgres -d school_accounting < backend/database/sample_data.sql
```

---

#### Problem: "relation 'users' does not exist"

**Causes:**
- Database schema was not imported
- Schema file path is incorrect

**Solutions:**

```bash
cd school-accounting-system
psql -U postgres -d school_accounting < backend/database/schema.sql

# Verify tables exist
psql -U postgres -d school_accounting -c "\dt"
```

---

### Backend Issues

#### Problem: "EADDRINUSE: address already in use :::5000"

**Causes:**
- Another process is using port 5000
- Previous server process didn't shut down properly

**Solutions:**

1. **Kill process on port 5000:**
```bash
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

2. **Use different port:**
```bash
# Edit backend/src/index.js
const PORT = process.env.PORT || 5001;  # Change to 5001
```

3. **Restart backend cleanly:**
```bash
cd backend
npm stop
npm start
```

---

#### Problem: "Cannot find module 'express'"

**Causes:**
- Dependencies not installed
- Node modules deleted
- Incorrect working directory

**Solutions:**

```bash
# Navigate to backend directory
cd backend

# Remove node_modules
rm -rf node_modules

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
npm install

# Start server
npm start
```

---

#### Problem: "JWT token is invalid or expired"

**Causes:**
- Token expired (7-day expiration)
- Token malformed
- JWT secret changed

**Solutions:**

```bash
# Login again to get fresh token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"password"}'

# Use returned token in Authorization header
```

---

#### Problem: "CORS error: Access denied"

**Causes:**
- Frontend URL not in CORS whitelist
- CORS middleware not configured
- Frontend making request from wrong origin

**Solutions:**

1. **Check backend `.env`:**
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

2. **Check CORS configuration in `src/index.js`:**
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

3. **Frontend `.env`:**
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. **Clear browser cache:**
- Press F12 → Right-click refresh → "Empty cache and hard refresh"

---

#### Problem: "Cannot POST /api/students"

**Causes:**
- Route not registered
- Middleware blocking request
- Body parsing not configured

**Solutions:**

```bash
# Test that server is running
curl http://localhost:5000/health

# Check if route exists
curl http://localhost:5000/api/students -H "Authorization: Bearer VALID_TOKEN"

# Check console logs for errors
# Look for: "Route /api/students registered"
```

---

### Frontend Issues

#### Problem: "GET http://localhost:5000/api/students 404"

**Causes:**
- Backend server not running
- Wrong API URL in `.env`
- Route doesn't exist

**Solutions:**

1. **Check backend is running:**
```bash
# Terminal 1
cd backend
npm start
# Should show: "Server running on port 5000"
```

2. **Verify frontend `.env`:**
```
REACT_APP_API_URL=http://localhost:5000/api
```

3. **Check backend routes are registered:**
```bash
# In backend/src/index.js check:
app.use('/api/students', studentRoutes);
```

---

#### Problem: "Module not found: Can't resolve 'react-router-dom'"

**Causes:**
- Dependencies not installed
- Wrong working directory

**Solutions:**

```bash
cd frontend
npm install
npm start
```

---

#### Problem: "Blank white page / Nothing loads"

**Causes:**
- Syntax error in code
- Build process failed
- Server not started

**Solutions:**

1. **Check console for errors:**
- Press F12 → Go to Console tab
- Look for red error messages

2. **Check terminal for build errors:**
```bash
cd frontend
npm start
# Should show build successful
```

3. **Try hard refresh:**
- Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (macOS)

4. **Clear cache and restart:**
```bash
cd frontend
rm -rf node_modules
npm cache clean --force
npm install
npm start
```

---

#### Problem: "Login page shows but can't login"

**Causes:**
- Backend not running
- Wrong credentials
- Database has no users

**Solutions:**

1. **Verify backend is running:**
```bash
curl http://localhost:5000/api/auth/me
# If connection refused, backend is not running
```

2. **Check credentials:**
- Email: `admin@school.com`
- Password: `password`
- Check backend logs for login attempts

3. **Verify users exist in database:**
```bash
psql -U postgres -d school_accounting
SELECT id, name, email, role FROM users;
```

4. **Reseed sample data:**
```bash
cd backend/database
psql -U postgres -d school_accounting < sample_data.sql
```

---

#### Problem: "Token is undefined / Not authenticated"

**Causes:**
- localStorage corrupted
- Token not being saved
- Token expired

**Solutions:**

```bash
# Clear localStorage in browser console (F12)
localStorage.clear()
sessionStorage.clear()

# Login again
# This will store fresh token
```

---

### Page-Specific Issues

#### Students Page - Table not showing

**Debug steps:**
```bash
# 1. Check if backend route works
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/students

# 2. Check browser console (F12)
# Should show fetch request and response

# 3. Check if students exist
psql -U postgres -d school_accounting -c "SELECT * FROM students LIMIT 1;"

# 4. Check pagination
# Default: page=1, limit=10
```

---

#### Dashboard - Charts not showing

**Debug steps:**
1. Check if Chart.js installed:
```bash
cd frontend
npm list chart.js
```

2. Check if data is returning:
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/dashboard/stats
```

3. Check browser console for errors

---

#### Payments - Can't record payment

**Debug steps:**
```bash
# 1. Verify student exists
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/students/1

# 2. Verify fee structure exists
psql -U postgres -d school_accounting \
  -c "SELECT * FROM student_fees WHERE student_id = 1;"

# 3. Check request payload
# student_id, amount, payment_method required

# 4. Check if payment recorded (should trigger email)
psql -U postgres -d school_accounting \
  -c "SELECT * FROM payments ORDER BY id DESC LIMIT 1;"
```

---

---

## ❓ Frequently Asked Questions

### General Questions

**Q: How long does it take to set up?**
A: 15-20 minutes with basic knowledge of Node.js and PostgreSQL. Follow QUICK_START.md for fastest setup.

**Q: What are the system requirements?**
A: Node.js 14+, PostgreSQL 12+, 512MB RAM, 1GB disk space. See SETUP_GUIDE.md for details.

**Q: Can I run both backend and frontend on same port?**
A: Not recommended. Keep backend on 5000, frontend on 3000.

---

### Database Questions

**Q: How do I backup my data?**
A: 
```bash
# PostgreSQL backup
pg_dump -U postgres -d school_accounting > backup.sql

# Restore from backup
psql -U postgres -d school_accounting < backup.sql
```

**Q: Can I reset to sample data?**
A: 
```bash
# Drop tables
psql -U postgres -d school_accounting < backend/database/schema.sql

# Reimport sample
psql -U postgres -d school_accounting < backend/database/sample_data.sql
```

**Q: How do I add a new class?**
A: Use the database directly:
```sql
INSERT INTO classes (name, class_level, description, is_active) 
VALUES ('Grade 5', 5, 'Fifth Grade', true);
```

Or create an API endpoint to do it through the UI.

---

### User & Authentication

**Q: How do I change the default admin password?**
A: Login with default credentials, then:
1. Click user menu (top right)
2. Select "Change Password"
3. Enter old and new passwords

**Q: How do I create new users?**
A: Currently only in database:
```sql
-- Create accountant user
INSERT INTO users (name, email, password_hash, role, is_active) 
VALUES ('John Accountant', 'john@school.com', 
  'hashed_password_here', 'accountant', true);
```

Extend the system by creating a user management page.

**Q: What are the user roles?**
A: 
- **Admin**: Full access to all features
- **Accountant**: Can manage payments, expenses, reports
- **Teacher**: Can view student fees and payment status

---

### Data & Features

**Q: Where is the sample data?**
A: In `backend/database/sample_data.sql`. Imported during setup.

**Q: Can I customize fee types?**
A: Yes, add to fee_structures table:
```sql
INSERT INTO fee_structures (name, class_id, fee_type, amount) 
VALUES ('Sports Fee', 1, 'sports', 500);
```

**Q: How do I generate reports?**
A: Dashboard → Reports page. Or API endpoints:
```bash
# Monthly report
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/dashboard/report/monthly?year=2024&month=1
```

**Q: Can I send bulk emails?**
A: Configure SMTP in `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=app_password
```

---

### Development & Deployment

**Q: How do I add a new feature?**
A:
1. Add database table/columns (schema.sql)
2. Create model (models/NewFeature.js)
3. Create controller (controllers/newFeatureController.js)
4. Create routes (routes/newFeatureRoutes.js)
5. Register in main index.js
6. Create React page/component
7. Update API service

**Q: Can I deploy this to production?**
A: Yes, see SETUP_GUIDE.md "Deployment" section. Recommendation: Use Heroku for backend, Vercel for frontend.

**Q: How do I enable HTTPS?**
A: Use reverse proxy (Nginx, Apache) or deploy to Heroku/AWS which handle SSL.

**Q: Can I run this on Windows?**
A: Yes. Install Node.js and PostgreSQL from official websites. Use `npm start` same as macOS/Linux.

---

### Performance & Optimization

**Q: Why is it slow with many students?**
A: 
```bash
# Add indexes
psql -U postgres -d school_accounting
CREATE INDEX idx_students_admission ON students(admission_number);
CREATE INDEX idx_payments_date ON payments(payment_date);
```

**Q: How do I scale to 1000+ students?**
A: 
- Add database indexes (see above)
- Implement caching (Redis)
- Use pagination (default: 10 items/page)
- Archive old data

**Q: Can I run multiple servers?**
A: Yes, use load balancer (Nginx) to distribute traffic across multiple instances.

---

### Troubleshooting

**Q: I forgot the admin password?**
A: Reset directly in database:
```sql
UPDATE users SET password_hash = '[new_hash]' 
WHERE email = 'admin@school.com';
```
Generate hash using bcryptjs: See password.js utility.

**Q: Database locked error?**
A: 
```bash
# Check active connections
psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Kill if necessary
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'school_accounting' AND pid <> pg_backend_pid();
```

**Q: Port already in use?**
A: Change port in environment:
```bash
# Backend
PORT=5001 npm start

# Frontend
PORT=3001 npm start
```

---

## 🆘 Getting Help

### Before Asking for Help
1. Check the error message carefully
2. Search this guide for similar issue
3. Check console logs (F12 or terminal)
4. Try restarting both backend and frontend

### Where to Get Help
1. **This guide**: Search for your issue
2. **SETUP_GUIDE.md**: Detailed setup instructions
3. **Code comments**: Explanation in source files
4. **GitHub Issues**: Check similar issues
5. **Stack Overflow**: Ask with detailed error message

### What to Include When Asking
1. Full error message (screenshot/copy-paste)
2. Steps to reproduce
3. Your environment (OS, Node version, etc.)
```bash
node --version
npm --version
psql --version
```
4. Relevant logs (from terminal and browser console)

---

## 📈 Performance Tips

1. **Database:**
   - Keep indexes on frequently queried columns
   - Archive old payment records quarterly
   - Vacuum database monthly: `VACUUM ANALYZE;`

2. **Backend:**
   - Enable compression: `npm install compression`
   - Cache responses for read-only endpoints
   - Use connection pooling (already configured)

3. **Frontend:**
   - Use lazy loading for pages
   - Implement infinite scroll instead of pagination
   - Cache API responses with service workers

---

## 🛡️ Security Checklist

- [ ] Change default admin password
- [ ] Secure `.env` files (don't commit to git)
- [ ] Use HTTPS in production
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Enable email verification for new accounts
- [ ] Implement rate limiting on login
- [ ] Regular database backups
- [ ] Monitor server logs for suspicious activity

---

## 📚 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)
- [JWT Introduction](https://jwt.io/introduction)

---

**Last Updated:** January 2024
**Version:** 1.0
**Status:** Complete and Production-Ready
