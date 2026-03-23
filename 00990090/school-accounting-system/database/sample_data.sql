-- Sample Data for School Accounting Management System

-- Insert Users
INSERT INTO users (name, email, password_hash, role, is_active) VALUES
('Admin User', 'admin@school.com', '$2b$10$YVq3mWvvF6HnKsVD6pB9N.Z8GG8c6RGVMwGcZ4EgZqZPDWBpXW1vC', 'admin', true),
('John Accountant', 'accountant@school.com', '$2b$10$YVq3mWvvF6HnKsVD6pB9N.Z8GG8c6RGVMwGcZ4EgZqZPDWBpXW1vC', 'accountant', true),
('Mrs. Sarah Teacher', 'sarah@school.com', '$2b$10$YVq3mWvvF6HnKsVD6pB9N.Z8GG8c6RGVMwGcZ4EgZqZPDWBpXW1vC', 'teacher', true);

-- Insert Classes
INSERT INTO classes (name, class_level, description, is_active) VALUES
('Kindergarten', 1, 'Early childhood education', true),
('Grade 1', 2, 'Primary education - Grade 1', true),
('Grade 2', 3, 'Primary education - Grade 2', true),
('Grade 3', 4, 'Primary education - Grade 3', true),
('Grade 4', 5, 'Primary education - Grade 4', true),
('Grade 5', 6, 'Primary education - Grade 5', true),
('Grade 6', 7, 'Secondary education - Grade 6', true);

-- Insert Sections
INSERT INTO sections (name, class_id, capacity, is_active) VALUES
('A', 1, 30, true),
('B', 1, 30, true),
('A', 2, 35, true),
('B', 2, 35, true),
('A', 3, 35, true),
('B', 3, 35, true),
('A', 4, 40, true),
('B', 4, 40, true),
('A', 5, 40, true),
('A', 6, 40, true),
('A', 7, 40, true);

-- Insert Students
INSERT INTO students (admission_number, first_name, last_name, email, phone, date_of_birth, address, parent_name, parent_phone, parent_email, class_id, section_id, admission_date, is_active) VALUES
('ADM-001', 'Ahmed', 'Ali', 'ahmed.ali@student.com', '0501234567', '2015-05-12', '123 Main Street', 'Hassan Ali', '0501234560', 'hassan.ali@email.com', 2, 3, '2023-09-01', true),
('ADM-002', 'Fatima', 'Khan', 'fatima.khan@student.com', '0502345678', '2015-08-20', '456 Oak Avenue', 'Mohammed Khan', '0502345670', 'khan.mohammed@email.com', 2, 3, '2023-09-01', true),
('ADM-003', 'Omar', 'Hassan', 'omar.hassan@student.com', '0503456789', '2016-01-15', '789 Pine Road', 'Ibrahim Hassan', '0503456780', 'ibrahim.hassan@email.com', 2, 4, '2023-09-01', true),
('ADM-004', 'Aisha', 'Mohamed', 'aisha.mohamed@student.com', '0504567890', '2015-11-22', '321 Elm Street', 'Khalid Mohamed', '0504567890', 'khalid.mohamed@email.com', 3, 5, '2023-09-01', true),
('ADM-005', 'Ibrahim', 'Ibrahim', 'ibrahim.ibrahim@student.com', '0505678901', '2016-03-10', '654 Maple Drive', 'Youssef Ibrahim', '0505678901', 'youssef.ibrahim@email.com', 3, 5, '2023-09-01', true),
('ADM-006', 'Layla', 'Ahmed', 'layla.ahmed@student.com', '0506789012', '2014-07-08', '987 Birch Lane', 'Rashid Ahmed', '0506789012', 'rashid.ahmed@email.com', 4, 7, '2023-09-01', true),
('ADM-007', 'Hassan', 'Abdullah', 'hassan.abdullah@student.com', '0507890123', '2014-12-05', '159 Cedar Court', 'Abdullah Hassan', '0507890123', 'abdullah.hassan@email.com', 4, 7, '2023-09-01', true),
('ADM-008', 'Mona', 'Saleh', 'mona.saleh@student.com', '0508901234', '2015-04-18', '753 Walnut Street', 'Saleh Mona', '0508901234', 'saleh.mona@email.com', 5, 9, '2023-09-01', true),
('ADM-009', 'Ali', 'Samir', 'ali.samir@student.com', '0509012345', '2013-09-25', '852 Spruce Avenue', 'Samir Ali', '0509012345', 'samir.ali@email.com', 6, 10, '2023-09-01', true),
('ADM-010', 'Leena', 'Jamal', 'leena.jamal@student.com', '0510123456', '2013-02-14', '456 Juniper Road', 'Jamal Leena', '0510123456', 'jamal.leena@email.com', 7, 11, '2023-09-01', true);

-- Insert Fee Structures
INSERT INTO fee_structures (name, class_id, fee_type, amount, description, due_date, is_active) VALUES
('Monthly Tuition - Kindergarten', 1, 'monthly', 1500.00, 'Monthly tuition fee for Kindergarten', 1, true),
('Monthly Tuition - Grade 1-2', 2, 'monthly', 2000.00, 'Monthly tuition fee for Grade 1-2', 1, true),
('Monthly Tuition - Grade 3-4', 4, 'monthly', 2500.00, 'Monthly tuition fee for Grade 3-4', 1, true),
('Monthly Tuition - Grade 5-6', 6, 'monthly', 3000.00, 'Monthly tuition fee for Grade 5-6', 1, true),
('Yearly Registration - All Classes', NULL, 'yearly', 500.00, 'One time yearly registration fee', NULL, true),
('Lab Fees - Science Classes', 5, 'monthly', 300.00, 'Lab and practical fees', 10, true),
('Sports Activity Fee', NULL, 'monthly', 200.00, 'Monthly sports and activity fee', 5, true);

-- Insert Student Fees
INSERT INTO student_fees (student_id, fee_structure_id, amount, due_date, status, total_paid, is_active) VALUES
(1, 2, 2000.00, '2024-01-31', 'paid', 2000.00, true),
(1, 5, 500.00, '2024-01-15', 'paid', 500.00, true),
(2, 2, 2000.00, '2024-01-31', 'partial', 1500.00, true),
(2, 7, 200.00, '2024-01-05', 'pending', 0.00, true),
(3, 2, 2000.00, '2024-01-31', 'paid', 2000.00, true),
(4, 2, 2000.00, '2024-02-15', 'overdue', 0.00, true),
(5, 2, 2000.00, '2024-02-15', 'pending', 0.00, true),
(6, 3, 2500.00, '2024-01-10', 'paid', 2500.00, true),
(7, 3, 2500.00, '2024-02-10', 'partial', 1500.00, true),
(8, 4, 3000.00, '2024-01-05', 'paid', 3000.00, true);

-- Insert Payments
INSERT INTO payments (student_id, student_fee_id, amount, payment_method, reference_number, payment_date, receipt_number, notes, created_by) VALUES
(1, 1, 2000.00, 'bank_transfer', 'TRF-001', '2024-01-15', 'RCP-001', 'Monthly tuition January', 2),
(1, 2, 500.00, 'cash', NULL, '2024-01-10', 'RCP-002', 'Yearly registration fee', 2),
(2, 3, 1500.00, 'cheque', 'CHQ-001', '2024-01-20', 'RCP-003', 'Partial payment - Month 1', 2),
(3, 5, 2000.00, 'bank_transfer', 'TRF-002', '2024-01-25', 'RCP-004', 'Monthly tuition January', 2),
(6, 8, 2500.00, 'cash', NULL, '2024-01-15', 'RCP-005', 'Monthly tuition January', 2),
(8, 10, 3000.00, 'online', 'PAY-001', '2024-01-05', 'RCP-006', 'Monthly tuition January', 2);

-- Insert Installments
INSERT INTO installments (student_fee_id, installment_number, amount, due_date, paid_date, paid_amount, status) VALUES
(3, 1, 1000.00, '2024-01-31', '2024-01-20', 1000.00, 'paid'),
(3, 2, 1000.00, '2024-02-28', NULL, 0.00, 'pending'),
(7, 1, 1250.00, '2024-02-28', NULL, 1500.00, 'partial'),
(7, 2, 1250.00, '2024-03-31', NULL, 0.00, 'pending');

-- Insert Invoices
INSERT INTO invoices (invoice_number, student_id, student_fee_id, total_amount, items_description, issue_date, due_date, paid_date, status, created_by) VALUES
('INV-001', 1, 1, 2000.00, 'Monthly Tuition January 2024', '2024-01-01', '2024-01-31', '2024-01-15', 'paid', 2),
('INV-002', 1, 2, 500.00, 'Yearly Registration Fee', '2024-01-01', '2024-01-15', '2024-01-10', 'paid', 2),
('INV-003', 2, 3, 2000.00, 'Monthly Tuition January 2024', '2024-01-01', '2024-01-31', '2024-01-20', 'partial', 2),
('INV-004', 3, 5, 2000.00, 'Monthly Tuition January 2024', '2024-01-01', '2024-01-31', '2024-01-25', 'paid', 2),
('INV-005', 4, 6, 2000.00, 'Monthly Tuition February 2024', '2024-02-01', '2024-02-15', NULL, 'issued', 2),
('INV-006', 6, 8, 2500.00, 'Monthly Tuition January 2024', '2024-01-01', '2024-01-31', '2024-01-15', 'paid', 2);

-- Insert Expenses
INSERT INTO expenses (description, category, amount, expense_date, payment_method, reference_number, approved_by, is_approved, notes, created_by) VALUES
('School Supplies - Notebooks and Pens', 'Supplies', 5000.00, '2024-01-10', 'bank_transfer', 'SUP-001', 1, true, 'Quarterly supply purchase', 1),
('Teacher Salaries - January', 'Salaries', 150000.00, '2024-01-31', 'bank_transfer', 'SAL-001', 1, true, 'Monthly salary payout', 1),
('Building Maintenance - Repairs', 'Maintenance', 20000.00, '2024-01-15', 'cash', NULL, 1, true, 'Roof repair', 1),
('Utilities - Electricity and Water', 'Utilities', 15000.00, '2024-01-20', 'bank_transfer', 'UTIL-001', 1, true, 'Monthly utilities', 1),
('Lab Equipment', 'Equipment', 50000.00, '2024-01-22', 'cheque', 'CHQ-002', 1, false, 'Pending approval', 1),
('Staff Training Program', 'Training', 25000.00, '2024-01-25', 'bank_transfer', 'TRN-001', 1, true, 'Professional development', 1);

-- Insert Notifications
INSERT INTO notifications (student_id, user_id, title, message, notification_type, is_read) VALUES
(2, 2, 'Payment Partial', 'Student Ahmed Ali has paid partial fee. Amount pending: 500.00', 'payment_received', false),
(4, 2, 'Payment Overdue', 'Student Aisha Mohamed has overdue fees. Amount due: 2000.00', 'payment_overdue', false),
(5, 2, 'Fee Due', 'Student Ibrahim Ibrahim fee is due on 2024-02-15', 'fee_due', false),
(7, 2, 'Payment Partial', 'Student Ibrahim Abdullah has made partial payment. Amount pending: 1000.00', 'payment_received', false);

-- Insert Backups
INSERT INTO backups (backup_name, backup_path, backup_size, backup_type, status, created_by) VALUES
('backup_2024_01_01', '/backups/backup_2024_01_01.sql', 5242880, 'full', 'completed', 1),
('backup_2024_01_08', '/backups/backup_2024_01_08.sql', 1048576, 'incremental', 'completed', 1);
