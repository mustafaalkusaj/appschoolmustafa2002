-- School Accounting Management System - PostgreSQL Schema
-- This file contains the complete database schema for the system

-- Create Users table (Admin, Accountants)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'accountant', 'teacher')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Classes table
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    class_level INT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, class_level)
);

-- Create Sections table
CREATE TABLE sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    capacity INT DEFAULT 40,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, class_id)
);

-- Create Students table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    parent_name VARCHAR(100),
    parent_phone VARCHAR(20),
    parent_email VARCHAR(100),
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE SET NULL,
    section_id INT NOT NULL REFERENCES sections(id) ON DELETE SET NULL,
    admission_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admission_number (admission_number),
    INDEX idx_class_id (class_id)
);

-- Create Fee Structure table
CREATE TABLE fee_structures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    fee_type VARCHAR(20) CHECK (fee_type IN ('monthly', 'yearly', 'custom')) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    due_date INT, -- Day of month for monthly fees
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Student Fees table (linking students to fee structures)
CREATE TABLE student_fees (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id INT NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) CHECK (status IN ('pending', 'partial', 'paid', 'overdue')) DEFAULT 'pending',
    total_paid DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_status (status)
);

-- Create Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_fee_id INT REFERENCES student_fees(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'online')) NOT NULL,
    reference_number VARCHAR(100),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_time TIME DEFAULT CURRENT_TIME,
    receipt_number VARCHAR(50) UNIQUE,
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status (receipt_number)
);

-- Create Installments table
CREATE TABLE installments (
    id SERIAL PRIMARY KEY,
    student_fee_id INT NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending', 'partial', 'paid', 'overdue')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_fee_id (student_fee_id),
    INDEX idx_due_date (due_date)
);

-- Create Invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_fee_id INT REFERENCES student_fees(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    items_description TEXT,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    status VARCHAR(20) CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'cancelled')) DEFAULT 'draft',
    pdf_path VARCHAR(255),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_invoice_number (invoice_number)
);

-- Create Expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'online')) NOT NULL,
    reference_number VARCHAR(100),
    approved_by INT REFERENCES users(id),
    is_approved BOOLEAN DEFAULT false,
    receipt_path VARCHAR(255),
    notes TEXT,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expense_date (expense_date),
    INDEX idx_category (category)
);

-- Create Audit Logs table for tracking changes
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Create Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) CHECK (notification_type IN ('payment_overdue', 'payment_received', 'fee_due', 'system')) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Backups table
CREATE TABLE backups (
    id SERIAL PRIMARY KEY,
    backup_name VARCHAR(255) NOT NULL,
    backup_path VARCHAR(255) NOT NULL,
    backup_size BIGINT,
    backup_type VARCHAR(20) CHECK (backup_type IN ('full', 'incremental')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('completed', 'failed', 'in_progress')) NOT NULL,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    restored_at TIMESTAMP,
    notes TEXT
);

-- Create Indexes for better query performance
CREATE INDEX idx_students_class_section ON students(class_id, section_id);
CREATE INDEX idx_payments_student_date ON payments(student_id, payment_date);
CREATE INDEX idx_student_fees_status_date ON student_fees(status, updated_at);
CREATE INDEX idx_expenses_approved ON expenses(is_approved, expense_date);

-- Create Views for easier querying
CREATE VIEW student_payment_summary AS
SELECT 
    s.id as student_id,
    s.admission_number,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    c.name as class_name,
    sec.name as section_name,
    COUNT(sf.id) as total_fees,
    SUM(sf.amount) as total_fee_amount,
    SUM(CASE WHEN sf.status = 'paid' THEN sf.amount ELSE sf.total_paid END) as total_paid,
    SUM(CASE WHEN sf.status IN ('pending', 'overdue') THEN sf.amount - sf.total_paid ELSE 0 END) as total_pending
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN sections sec ON s.section_id = sec.id
LEFT JOIN student_fees sf ON s.id = sf.student_id
WHERE s.is_active = true
GROUP BY s.id, s.admission_number, s.first_name, s.last_name, c.name, sec.name;

-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS update_student_fee_status ON payments;

-- Create trigger to automatically update fee status based on payments
CREATE OR REPLACE FUNCTION update_fee_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE student_fees
    SET 
        total_paid = total_paid + NEW.amount,
        status = CASE
            WHEN total_paid + NEW.amount >= amount THEN 'paid'
            WHEN total_paid + NEW.amount > 0 THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.student_fee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_fee_status
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_fee_status();
