// Student Controller
// Handles student management operations

const StudentModel = require('../models/Student');
const db = require('../config/database');
const { getPagination } = require('../utils/helpers');

/**
 * Get all students
 * GET /students?page=1&limit=10&search=ahmed&class_id=1
 */
const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, class_id } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    const filters = {};
    if (search) filters.search = search;
    if (class_id) filters.class_id = parseInt(class_id);

    const result = await StudentModel.getAll(filters, offset, pageLimit);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: result.total,
        pages: Math.ceil(result.total / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
};

/**
 * Get student by ID
 * GET /students/:id
 */
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await StudentModel.getById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student'
    });
  }
};

/**
 * Create new student
 * POST /students
 */
const createStudent = async (req, res) => {
  try {
    const studentData = req.body;

    // Validate admission number is unique
    const existing = await StudentModel.getByAdmissionNumber(studentData.admission_number);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Admission number already exists'
      });
    }

    const student = await StudentModel.create(studentData);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating student'
    });
  }
};

/**
 * Update student
 * PUT /students/:id
 */
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const studentData = req.body;

    const student = await StudentModel.update(id, studentData);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student'
    });
  }
};

/**
 * Delete student
 * DELETE /students/:id
 */
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await StudentModel.delete(id);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student'
    });
  }
};

/**
 * Get student payment summary
 * GET /students/:id/payment-summary
 */
const getStudentPaymentSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await StudentModel.getPaymentSummary(id);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment summary'
    });
  }
};

/**
 * Search students
 * GET /students/search?query=ahmed
 */
const searchStudents = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const result = await db.query(`
      SELECT id, admission_number, first_name, last_name, class_id
      FROM students
      WHERE is_active = true AND (
        first_name ILIKE $1 OR
        last_name ILIKE $1 OR
        admission_number LIKE $1
      )
      LIMIT 20
    `, [`%${query}%`]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching students'
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentPaymentSummary,
  searchStudents
};
