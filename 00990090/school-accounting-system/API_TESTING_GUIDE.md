# School Accounting System - API Testing Guide

Complete guide to test and understand all API endpoints.

## 🔑 Authentication

### 1. Login (Get JWT Token)

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "password"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@school.com",
    "role": "admin"
  }
}
```

**Save the token for subsequent requests:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

### 2. Get Current User Profile

**Endpoint:** `GET /api/auth/me`

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Change Password

**Endpoint:** `POST /api/auth/change-password`

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "oldpass",
    "newPassword": "newpass123"
  }'
```

---

## 👨‍🎓 Students API

### 1. Get All Students (Paginated)

**Endpoint:** `GET /api/students?page=1&limit=10`

```bash
curl -X GET "http://localhost:5000/api/students?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**With Filters:**
```bash
# Filter by class
curl -X GET "http://localhost:5000/api/students?page=1&class_id=2" \
  -H "Authorization: Bearer $TOKEN"

# Filter by search
curl -X GET "http://localhost:5000/api/students?search=ahmed" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "admission_number": "ADM-001",
      "first_name": "Ahmed",
      "last_name": "Ali",
      "email": "ahmed.ali@student.com",
      "class_name": "Grade 1",
      "section_name": "A",
      "parent_phone": "0501234567",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 10,
    "pages": 1
  }
}
```

### 2. Get Student by ID

**Endpoint:** `GET /api/students/:id`

```bash
curl -X GET http://localhost:5000/api/students/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Search Students

**Endpoint:** `GET /api/students/search?query=ahmed`

```bash
curl -X GET "http://localhost:5000/api/students/search?query=ahmed" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Create New Student

**Endpoint:** `POST /api/students`

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admission_number": "ADM-011",
    "first_name": "Fatima",
    "last_name": "Khan",
    "email": "fatima.k@student.com",
    "parent_email": "fatima.parent@email.com",
    "parent_phone": "0502345678",
    "class_id": 2,
    "section_id": 3,
    "date_of_birth": "2015-08-20",
    "address": "123 Main Street"
  }'
```

### 5. Update Student

**Endpoint:** `PUT /api/students/:id`

```bash
curl -X PUT http://localhost:5000/api/students/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Ahmed",
    "last_name": "Ali Khan",
    "parent_email": "newemail@email.com"
  }'
```

### 6. Delete Student

**Endpoint:** `DELETE /api/students/:id`

```bash
curl -X DELETE http://localhost:5000/api/students/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Get Student Payment Summary

**Endpoint:** `GET /api/students/:id/payment-summary`

```bash
curl -X GET http://localhost:5000/api/students/1/payment-summary \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student_id": 1,
    "admission_number": "ADM-001",
    "student_name": "Ahmed Ali",
    "total_fees": 5,
    "total_fee_amount": "6000.00",
    "total_paid": "4500.00",
    "total_pending": "1500.00"
  }
}
```

---

## 💳 Payments API

### 1. Get All Payments

**Endpoint:** `GET /api/payments?page=1&limit=10`

```bash
curl -X GET "http://localhost:5000/api/payments?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**With Filters:**
```bash
# By date range
curl -X GET "http://localhost:5000/api/payments?from_date=2024-01-01&to_date=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"

# By student
curl -X GET "http://localhost:5000/api/payments?student_id=1" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Get Payment by ID

**Endpoint:** `GET /api/payments/:id`

```bash
curl -X GET http://localhost:5000/api/payments/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Record New Payment

**Endpoint:** `POST /api/payments`

```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "student_fee_id": 1,
    "amount": 1000.00,
    "payment_method": "cash",
    "reference_number": "PAY-001",
    "notes": "Monthly tuition January"
  }'
```

**Payment Methods:** `cash`, `bank_transfer`, `cheque`, `online`

### 4. Update Payment

**Endpoint:** `PUT /api/payments/:id`

```bash
curl -X PUT http://localhost:5000/api/payments/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500.00,
    "payment_method": "bank_transfer",
    "reference_number": "UPDATED-001"
  }'
```

### 5. Delete Payment

**Endpoint:** `DELETE /api/payments/:id`

```bash
curl -X DELETE http://localhost:5000/api/payments/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Get Payment Summary

**Endpoint:** `GET /api/payments/summary?from_date=2024-01-01&to_date=2024-01-31`

```bash
curl -X GET "http://localhost:5000/api/payments/summary?from_date=2024-01-01&to_date=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "total_payments": 5,
      "total_amount": "9500.00",
      "total_students": 3,
      "payment_method": "bank_transfer",
      "payment_date": "2024-01-15"
    }
  ]
}
```

### 7. Generate Invoice

**Endpoint:** `GET /api/payments/:student_id/invoice/:fee_id`

```bash
curl -X GET http://localhost:5000/api/payments/1/invoice/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💸 Expenses API

### 1. Get All Expenses

**Endpoint:** `GET /api/expenses?page=1&limit=10`

```bash
curl -X GET "http://localhost:5000/api/expenses?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**With Filters:**
```bash
# By category
curl -X GET "http://localhost:5000/api/expenses?category=Salaries" \
  -H "Authorization: Bearer $TOKEN"

# By approval status
curl -X GET "http://localhost:5000/api/expenses?is_approved=true" \
  -H "Authorization: Bearer $TOKEN"

# By date range
curl -X GET "http://localhost:5000/api/expenses?from_date=2024-01-01&to_date=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Get Expense by ID

**Endpoint:** `GET /api/expenses/:id`

```bash
curl -X GET http://localhost:5000/api/expenses/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create New Expense

**Endpoint:** `POST /api/expenses`

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Teacher Salaries - January",
    "category": "Salaries",
    "amount": 150000.00,
    "expense_date": "2024-01-31",
    "payment_method": "bank_transfer",
    "reference_number": "SAL-001",
    "notes": "Monthly salary payout"
  }'
```

**Common Categories:**
- Salaries
- Supplies
- Maintenance
- Utilities
- Equipment
- Training

### 4. Update Expense

**Endpoint:** `PUT /api/expenses/:id`

```bash
curl -X PUT http://localhost:5000/api/expenses/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 160000.00,
    "notes": "Updated salary"
  }'
```

### 5. Approve Expense (Admin Only)

**Endpoint:** `PUT /api/expenses/:id/approve`

```bash
curl -X PUT http://localhost:5000/api/expenses/1/approve \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Delete Expense

**Endpoint:** `DELETE /api/expenses/:id`

```bash
curl -X DELETE http://localhost:5000/api/expenses/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Get Expense Summary

**Endpoint:** `GET /api/expenses/summary?from_date=2024-01-01&to_date=2024-01-31`

```bash
curl -X GET "http://localhost:5000/api/expenses/summary?from_date=2024-01-01&to_date=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Get Expense Categories

**Endpoint:** `GET /api/expenses/categories`

```bash
curl -X GET http://localhost:5000/api/expenses/categories \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Dashboard API

### 1. Get Dashboard Statistics

**Endpoint:** `GET /api/dashboard/stats`

```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": 10,
    "monthlyRevenue": 15000.00,
    "monthlyExpenses": 180000.00,
    "netIncome": -165000.00,
    "pendingFees": 6500.00,
    "paymentMethods": [
      {
        "payment_method": "cash",
        "count": 3,
        "total": "5000.00"
      }
    ],
    "topStudents": [
      {
        "id": 1,
        "name": "Ahmed Ali",
        "total_fees": "2500.00"
      }
    ]
  }
}
```

### 2. Get Daily Report

**Endpoint:** `GET /api/dashboard/report/daily?date=2024-01-15`

```bash
curl -X GET "http://localhost:5000/api/dashboard/report/daily?date=2024-01-15" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "revenue": {
      "count": 2,
      "amount": 3500.00
    },
    "expenses": {
      "count": 1,
      "amount": 50000.00
    },
    "netIncome": -46500.00
  }
}
```

### 3. Get Monthly Report

**Endpoint:** `GET /api/dashboard/report/monthly?year=2024&month=1`

```bash
curl -X GET "http://localhost:5000/api/dashboard/report/monthly?year=2024&month=1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Testing Workflow

### Step 1: Login & Get Token
```bash
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"password"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"
```

### Step 2: Get Students
```bash
curl -X GET "http://localhost:5000/api/students?page=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Get Student Details
```bash
curl -X GET http://localhost:5000/api/students/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Record Payment
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "amount": 2000.00,
    "payment_method": "cash"
  }'
```

### Step 5: View Dashboard
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 Common Testing Scenarios

### Scenario 1: Register Payment & Check Status

```bash
# 1. Get student ID
curl -X GET http://localhost:5000/api/students/search?query=Ahmed \
  -H "Authorization: Bearer $TOKEN"

# 2. Record payment
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "amount": 1000,
    "payment_method": "cash"
  }'

# 3. Check payment summary
curl -X GET http://localhost:5000/api/students/1/payment-summary \
  -H "Authorization: Bearer $TOKEN"
```

### Scenario 2: Create Expense & Approve

```bash
# 1. Create expense
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "New Supplies",
    "category": "Supplies",
    "amount": 5000
  }'

# 2. Approve expense (admin only)
curl -X PUT http://localhost:5000/api/expenses/1/approve \
  -H "Authorization: Bearer $TOKEN"

# 3. Get summary
curl -X GET "http://localhost:5000/api/expenses/summary?from_date=2024-01-01&to_date=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🛠️ Using Postman

### Import Collection
1. Open Postman
2. Click "Import"
3. Create requests manually using endpoints above
4. Set Authorization header: `Bearer {{token}}`
5. Use variables for `{{token}}` and `{{base_url}}`

### Set Variables
```
base_url = http://localhost:5000
token = (copy from login response)
```

---

## 📋 Error Response Examples

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Invalid authentication token"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions for this action"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Student not found"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## ✨ Pro Tips

- Always include `Authorization: Bearer <token>` header
- Use filters to narrow down results
- Check response status codes
- Test with different user roles (admin, accountant)
- Use date filters for reports
- Save important IDs for reference

---

**Happy Testing! 🎉**
