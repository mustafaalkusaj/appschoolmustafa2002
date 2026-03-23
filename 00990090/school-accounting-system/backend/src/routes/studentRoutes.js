// Student Routes
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware, authorizeRole } = require('../middleware/auth');

// All protected routes
router.use(authMiddleware);

// Get all students with search and filter
router.get('/', studentController.getAllStudents);

// Search students
router.get('/search', studentController.searchStudents);

// Get student by ID
router.get('/:id', studentController.getStudentById);

// Get student payment summary
router.get('/:id/payment-summary', studentController.getStudentPaymentSummary);

// Create new student (Admin/Accountant only)
router.post('/', authorizeRole(['admin', 'accountant']), studentController.createStudent);

// Update student (Admin/Accountant only)
router.put('/:id', authorizeRole(['admin', 'accountant']), studentController.updateStudent);

// Delete student (Admin only)
router.delete('/:id', authorizeRole(['admin']), studentController.deleteStudent);

module.exports = router;
