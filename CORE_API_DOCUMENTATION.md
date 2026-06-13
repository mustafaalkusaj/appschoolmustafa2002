# Core API Documentation - Multi-Branch System
**Version:** 1.0  
**Build Date:** April 20, 2026  
**Status:** Production Ready  

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Students API](#students-api)
5. [Attendance API](#attendance-api)
6. [Accounts API](#accounts-api)
7. [Transactions API](#transactions-api)
8. [Employees API](#employees-api)
9. [Salaries API](#salaries-api)
10. [Testing Guide](#testing-guide)
11. [Performance Tips](#performance-tips)

---

## Overview

The Core API provides production-ready endpoints for managing a multi-branch school system with:

- **Complete Branch Isolation:** All queries automatically filtered by schoolId and branchId
- **JWT Authentication:** Secure token-based access with role-based permissions
- **Audit Logging:** All operations logged for compliance and debugging
- **Soft Deletes:** Data retention with logical deletion
- **Real-time Balance Calculations:** Account and salary computations
- **Conflict Prevention:** Duplicate record detection and prevention

### API Base URL
```
http://localhost:3000/api/core
```

### Rate Limiting
- Standard: 100 requests per minute per user
- Bulk operations: 10 requests per minute

---

## Authentication

All endpoints require JWT authentication via the Authorization header.

### Header Format
```http
Authorization: Bearer <jwt_token>
```

### JWT Token Claims
```json
{
  "userId": "user_id",
  "email": "user@example.com",
  "schoolId": "school_id",
  "branchId": "branch_id",  // null for investors
  "role": "INVESTOR|BRANCH_MANAGER|ACCOUNTANT|ATTENDANCE_OFFICER|...",
  "isSinglePageUser": false,
  "exp": 1704067200  // 24-hour expiration
}
```

### Getting a Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "SecurePassword123"
  }'
```

Response:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "admin@school.com",
    "schoolId": "school_123",
    "role": "INVESTOR"
  }
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "details": {
    "fieldName": "Field-specific error message"
  }
}
```

### HTTP Status Codes
- **200:** Success
- **201:** Created successfully
- **400:** Validation error
- **401:** Unauthorized (missing/invalid token)
- **403:** Forbidden (insufficient permissions)
- **404:** Resource not found
- **409:** Conflict (e.g., duplicate record)
- **500:** Internal server error

### Example Error Response
```json
{
  "error": "Validation failed",
  "details": {
    "nameAr": "Arabic name required",
    "registrationNumber": "Registration number required"
  }
}
```

---

## Students API

### List Students
```http
GET /api/core/students?page=1&limit=20&classId=class_123&status=active
```

**Query Parameters:**
- `page` (int, default: 1) - Page number for pagination
- `limit` (int, 1-100, default: 20) - Records per page
- `classId` (uuid, optional) - Filter by class
- `status` (enum: active|inactive|graduated, optional) - Filter by status

**Required Role:** Any authenticated user

**Response:**
```json
{
  "ok": true,
  "students": [
    {
      "id": "student_123",
      "nameAr": "محمد أحمد",
      "nameEn": "Mohammed Ahmed",
      "registrationNumber": "STU001",
      "dateOfBirth": "2010-05-15",
      "status": "active",
      "schoolId": "school_123",
      "branchId": "branch_primary",
      "classId": "class_gr5_a",
      "class": {
        "nameAr": "الصف الخامس أ",
        "nameEn": "Grade 5 A"
      },
      "branch": {
        "nameAr": "الفرع الرئيسي",
        "nameEn": "Primary Branch"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-03-20T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "pages": 7
  }
}
```

### Create Student
```http
POST /api/core/students
Content-Type: application/json

{
  "nameAr": "فاطمة علي",
  "nameEn": "Fatima Ali",
  "classId": "class_123",
  "registrationNumber": "STU002",
  "dateOfBirth": "2011-08-22",
  "status": "active"
}
```

**Request Body:**
- `nameAr` (string, 2-100 chars) - Arabic name **required**
- `nameEn` (string, 2-100 chars) - English name **required**
- `classId` (uuid) - Class ID **required**
- `registrationNumber` (string, 1-50 chars) - Registration number **required**
- `dateOfBirth` (string, YYYY-MM-DD) - Birth date **required**
- `status` (enum, default: active) - active|inactive|graduated

**Required Role:** INVESTOR, BRANCH_MANAGER, ACCOUNTANT

**Response:**
```json
{
  "ok": true,
  "student": {
    "id": "student_456",
    "nameAr": "فاطمة علي",
    "nameEn": "Fatima Ali",
    "registrationNumber": "STU002",
    "dateOfBirth": "2011-08-22",
    "status": "active",
    "schoolId": "school_123",
    "branchId": "branch_primary",
    "classId": "class_123",
    "createdAt": "2024-04-20T10:00:00Z"
  }
}
```

### Get Student Details
```http
GET /api/core/students/student_123
```

**Response:**
```json
{
  "ok": true,
  "student": {
    "id": "student_123",
    "nameAr": "محمد أحمد",
    "nameEn": "Mohammed Ahmed",
    "registrationNumber": "STU001",
    "status": "active",
    "class": {
      "id": "class_gr5_a",
      "nameAr": "الصف الخامس أ",
      "nameEn": "Grade 5 A"
    },
    "branch": {
      "id": "branch_primary",
      "nameAr": "الفرع الرئيسي",
      "nameEn": "Primary Branch"
    },
    "attendances": [
      {
        "id": "att_001",
        "attendanceDate": "2024-04-20",
        "status": "present"
      }
    ]
  }
}
```

### Update Student
```http
PUT /api/core/students/student_123
Content-Type: application/json

{
  "nameAr": "محمد أحمد علي",
  "status": "active"
}
```

**Required Role:** INVESTOR, BRANCH_MANAGER, ACCOUNTANT

### Delete Student
```http
DELETE /api/core/students/student_123
```

**Required Role:** INVESTOR, BRANCH_MANAGER

---

## Attendance API

### List Attendance Records
```http
GET /api/core/attendance?page=1&limit=50&startDate=2024-04-01&endDate=2024-04-30&status=present
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, 1-100, default: 50) - Records per page
- `studentId` (uuid, optional) - Filter by student
- `classId` (uuid, optional) - Filter by class
- `startDate` (YYYY-MM-DD, optional) - Start date
- `endDate` (YYYY-MM-DD, optional) - End date
- `status` (enum: present|absent|excused|late, optional) - Filter by status

**Required Role:** Any authenticated user

**Response:**
```json
{
  "ok": true,
  "records": [
    {
      "id": "att_001",
      "studentId": "student_123",
      "student": {
        "id": "student_123",
        "nameEn": "Mohammed Ahmed",
        "nameAr": "محمد أحمد",
        "registrationNumber": "STU001"
      },
      "attendanceDate": "2024-04-20",
      "status": "present",
      "notes": "Regular attendance",
      "schoolId": "school_123",
      "branchId": "branch_primary"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 850,
    "pages": 17
  }
}
```

### Record Attendance
```http
POST /api/core/attendance
Content-Type: application/json

{
  "studentId": "student_123",
  "attendanceDate": "2024-04-20",
  "status": "present",
  "notes": "Regular attendance"
}
```

**Request Body:**
- `studentId` (uuid) - Student ID **required**
- `attendanceDate` (YYYY-MM-DD) - Attendance date **required**
- `status` (enum: present|absent|excused|late) - Status **required**
- `notes` (string, 0-500 chars, optional) - Additional notes

**Required Role:** BRANCH_MANAGER, ATTENDANCE_OFFICER, ACCOUNTANT

**Response:** 201 Created
```json
{
  "ok": true,
  "record": {
    "id": "att_002",
    "studentId": "student_123",
    "attendanceDate": "2024-04-20",
    "status": "present",
    "notes": "Regular attendance",
    "createdAt": "2024-04-20T10:00:00Z"
  }
}
```

---

## Accounts API

### List Accounts
```http
GET /api/core/accounts?page=1&limit=20&accountType=asset
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, 1-100, default: 20) - Records per page
- `accountType` (enum: asset|liability|equity|income|expense, optional) - Account type

**Required Role:** Any authenticated user

**Response:**
```json
{
  "ok": true,
  "accounts": [
    {
      "id": "acc_001",
      "accountCode": "1001",
      "accountNameEn": "Student Accounts",
      "accountNameAr": "حسابات الطلاب",
      "accountType": "asset",
      "balance": 150000.00,
      "branch": {
        "nameAr": "الفرع الرئيسي",
        "nameEn": "Primary Branch"
      },
      "transactions": [
        {
          "id": "txn_001",
          "amount": 5000,
          "transactionType": "credit",
          "transactionDate": "2024-04-20"
        }
      ]
    }
  ]
}
```

### Create Account
```http
POST /api/core/accounts
Content-Type: application/json

{
  "accountCode": "1002",
  "accountNameAr": "النفقات",
  "accountNameEn": "Expenses",
  "accountType": "expense",
  "balance": 0,
  "branchId": "branch_123"
}
```

**Request Body:**
- `accountCode` (string, 1-50) - Unique account code **required**
- `accountNameAr` (string, 2-100) - Arabic name **required**
- `accountNameEn` (string, 2-100) - English name **required**
- `accountType` (enum) - asset|liability|equity|income|expense **required**
- `balance` (number, default: 0) - Initial balance
- `branchId` (uuid, required for investors) - Branch ID

**Required Role:** INVESTOR, BRANCH_MANAGER, ACCOUNTANT

---

## Transactions API

### List Transactions
```http
GET /api/core/transactions?page=1&limit=50&startDate=2024-04-01&accountId=acc_001
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, 1-100, default: 50) - Records per page
- `accountId` (uuid, optional) - Filter by account
- `transactionType` (enum: debit|credit, optional) - Transaction type
- `startDate` (YYYY-MM-DD, optional) - Start date
- `endDate` (YYYY-MM-DD, optional) - End date

**Required Role:** Any authenticated user

**Response:**
```json
{
  "ok": true,
  "transactions": [
    {
      "id": "txn_001",
      "accountId": "acc_001",
      "account": {
        "id": "acc_001",
        "accountCode": "1001",
        "accountNameEn": "Student Accounts",
        "accountNameAr": "حسابات الطلاب"
      },
      "amount": 5000,
      "transactionType": "credit",
      "transactionDate": "2024-04-20",
      "description": "Monthly fee collection",
      "referenceNumber": "FEE202404001",
      "schoolId": "school_123"
    }
  ]
}
```

### Record Transaction
```http
POST /api/core/transactions
Content-Type: application/json

{
  "accountId": "acc_001",
  "amount": 5000,
  "transactionDate": "2024-04-20",
  "transactionType": "credit",
  "description": "Monthly fee collection",
  "referenceNumber": "FEE202404001"
}
```

**Request Body:**
- `accountId` (uuid) - Account ID **required**
- `amount` (number, > 0) - Amount **required**
- `transactionDate` (YYYY-MM-DD) - Date **required**
- `transactionType` (enum: debit|credit) - Type **required**
- `description` (string, 1-500) - Description **required**
- `referenceNumber` (string, 0-50, optional) - Reference number

**Required Role:** ACCOUNTANT, BRANCH_MANAGER

**Response:** 201 Created
```json
{
  "ok": true,
  "transaction": {
    "id": "txn_002",
    "accountId": "acc_001",
    "amount": 5000,
    "transactionType": "credit",
    "transactionDate": "2024-04-20",
    "description": "Monthly fee collection"
  },
  "newBalance": 155000.00
}
```

---

## Employees API

### List Employees
```http
GET /api/core/employees?page=1&limit=20&position=Teacher
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, 1-100, default: 20) - Records per page
- `position` (string, optional) - Filter by position

**Required Role:** Any authenticated user

**Response:**
```json
{
  "ok": true,
  "employees": [
    {
      "id": "emp_001",
      "employeeCode": "EMP001",
      "fullNameAr": "أحمد محمد",
      "fullNameEn": "Ahmed Mohammed",
      "position": "Teacher",
      "email": "ahmed@school.com",
      "phone": "+964770000000",
      "baseSalary": 2500000,
      "hireDate": "2022-09-01",
      "isActive": true,
      "branch": {
        "nameAr": "الفرع الرئيسي",
        "nameEn": "Primary Branch"
      },
      "salaries": [
        {
          "id": "sal_001",
          "baseSalary": 2500000,
          "month": 4,
          "year": 2024,
          "status": "pending"
        }
      ]
    }
  ]
}
```

### Create Employee
```http
POST /api/core/employees
Content-Type: application/json

{
  "employeeCode": "EMP002",
  "fullNameAr": "فاطمة علي",
  "fullNameEn": "Fatima Ali",
  "position": "Teacher",
  "email": "fatima@school.com",
  "phone": "+964770000001",
  "baseSalary": 2500000,
  "hireDate": "2024-01-01",
  "branchId": "branch_123"
}
```

**Request Body:**
- `employeeCode` (string, 1-50) - Employee code **required**
- `fullNameAr` (string, 2-100) - Arabic name **required**
- `fullNameEn` (string, 2-100) - English name **required**
- `position` (string, 2-100) - Position **required**
- `email` (email, optional) - Email address
- `phone` (string, 10+ chars, optional) - Phone number
- `baseSalary` (number, > 0) - Base salary **required**
- `hireDate` (YYYY-MM-DD) - Hire date **required**
- `branchId` (uuid, required for investors) - Branch ID

**Required Role:** INVESTOR, BRANCH_MANAGER

---

## Salaries API

### List Salary Records
```http
GET /api/core/salaries?page=1&limit=20&month=4&year=2024&status=pending
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, 1-100, default: 20) - Records per page
- `employeeId` (uuid, optional) - Filter by employee
- `month` (int, 1-12, optional) - Filter by month
- `year` (int, optional) - Filter by year
- `status` (enum: pending|approved|paid, optional) - Filter by status

**Required Role:** Any authenticated user

**Response:**
```json
{
  "ok": true,
  "salaries": [
    {
      "id": "sal_001",
      "employeeId": "emp_001",
      "employee": {
        "id": "emp_001",
        "fullNameEn": "Ahmed Mohammed",
        "fullNameAr": "أحمد محمد",
        "position": "Teacher",
        "baseSalary": 2500000
      },
      "baseSalary": 2500000,
      "bonus": 500000,
      "deductions": 200000,
      "netSalary": 2800000,
      "month": 4,
      "year": 2024,
      "status": "pending",
      "notes": "Monthly salary"
    }
  ]
}
```

### Record Salary
```http
POST /api/core/salaries
Content-Type: application/json

{
  "employeeId": "emp_001",
  "baseSalary": 2500000,
  "bonus": 500000,
  "deductions": 200000,
  "month": 4,
  "year": 2024,
  "notes": "Monthly salary"
}
```

**Request Body:**
- `employeeId` (uuid) - Employee ID **required**
- `baseSalary` (number, > 0) - Base salary **required**
- `bonus` (number, >= 0, default: 0) - Bonus amount
- `deductions` (number, >= 0, default: 0) - Deductions
- `month` (int, 1-12) - Month **required**
- `year` (int) - Year **required**
- `notes` (string, 0-500, optional) - Notes

**Required Role:** BRANCH_MANAGER, ACCOUNTANT

**Response:** 201 Created
```json
{
  "ok": true,
  "salary": {
    "id": "sal_002",
    "employeeId": "emp_001",
    "baseSalary": 2500000,
    "bonus": 500000,
    "deductions": 200000,
    "netSalary": 2800000,
    "month": 4,
    "year": 2024,
    "status": "pending"
  }
}
```

---

## Testing Guide

### 1. Authentication Setup
```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "SecurePassword123"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

### 2. Test Student Creation
```bash
curl -X POST http://localhost:3000/api/core/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nameAr": "محمد علي",
    "nameEn": "Mohammed Ali",
    "classId": "class_gr5_a",
    "registrationNumber": "STU003",
    "dateOfBirth": "2010-06-15",
    "status": "active"
  }' | jq
```

### 3. Test Attendance Recording
```bash
curl -X POST http://localhost:3000/api/core/attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student_123",
    "attendanceDate": "2024-04-20",
    "status": "present",
    "notes": "Regular"
  }' | jq
```

### 4. Test Financial Transactions
```bash
curl -X POST http://localhost:3000/api/core/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc_001",
    "amount": 5000,
    "transactionDate": "2024-04-20",
    "transactionType": "credit",
    "description": "Fee collection",
    "referenceNumber": "FEE001"
  }' | jq
```

---

## Performance Tips

### Pagination Best Practices
- Use `limit=50` for attendance/transaction lists
- Use `limit=20` for student/employee lists
- Avoid requesting more than 100 records per page

### Query Optimization
- Filter by date ranges to reduce result sets
- Use `classId` or `position` filters when available
- Batch operations when possible (avoid N+1 queries)

### Caching Strategy
- Cache branch data for 5 minutes
- Cache employee rosters daily
- Avoid caching transaction lists (always fresh)

### Rate Limiting
- Standard endpoints: 100 req/min
- Bulk operations: 10 req/min
- Implement exponential backoff on 429 responses

---

## Security Checklist

✅ All endpoints require JWT authentication  
✅ Branch isolation enforced at database level  
✅ Role-based access control on all operations  
✅ Soft deletes preserve audit trail  
✅ Audit logging on create/update/delete  
✅ Input validation with Zod schemas  
✅ HTTPS enforced in production  
✅ Rate limiting prevents abuse  
✅ Error messages don't leak sensitive data  

---

## Support & Troubleshooting

### Common Issues

**401 Unauthorized**
- Token expired: Get a new token
- Invalid token: Check token format (Bearer <token>)
- Missing header: Include Authorization header

**403 Forbidden**
- Insufficient role permissions
- Cross-branch access attempt
- User doesn't have access to resource

**404 Not Found**
- Resource deleted or soft deleted
- Wrong student/employee/account ID
- User can't access cross-branch resource

**409 Conflict**
- Duplicate attendance record
- Duplicate salary for month/year
- Duplicate employee code in branch

---

## API Versioning

Current version: **1.0**  
Base URL pattern: `/api/core`

Future versions will be introduced as `/api/v2`, `/api/v3`, etc.  
This version will be maintained for 12 months from release.

---

*Last Updated: April 20, 2026*  
*Production Ready - All endpoints tested and secure*
