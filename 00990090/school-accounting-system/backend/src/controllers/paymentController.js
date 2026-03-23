// Payment Controller
// Handles payment and fee operations

const PaymentModel = require('../models/Payment');
const StudentModel = require('../models/Student');
const db = require('../config/database');
const { getPagination, generateInvoiceNumber } = require('../utils/helpers');
const { generateInvoicePDF } = require('../utils/pdf');
const { sendPaymentReceipt } = require('../utils/email');

/**
 * Get all payments
 * GET /payments?page=1&limit=10&from_date=2024-01-01&to_date=2024-01-31
 */
const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, student_id, from_date, to_date } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    const filters = {};
    if (student_id) filters.student_id = parseInt(student_id);
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;

    const result = await PaymentModel.getAll(filters, offset, pageLimit);

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
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments'
    });
  }
};

/**
 * Get payment by ID
 * GET /payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await PaymentModel.getById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment'
    });
  }
};

/**
 * Record a payment
 * POST /payments
 */
const recordPayment = async (req, res) => {
  try {
    const { student_id, student_fee_id, amount, payment_method, reference_number, notes } = req.body;

    // Validate input
    if (!student_id || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, amount, and payment method are required'
      });
    }

    // Create payment
    const paymentData = {
      student_id,
      student_fee_id,
      amount,
      payment_method,
      reference_number,
      notes,
      created_by: req.user.id
    };

    const payment = await PaymentModel.create(paymentData);

    // Get student info for email
    const student = await StudentModel.getById(student_id);
    
    // Send receipt email (non-blocking)
    if (student.parent_email) {
      sendPaymentReceipt(student.parent_email, {
        studentName: `${student.first_name} ${student.last_name}`,
        className: student.class_name,
        receiptNumber: payment.receipt_number,
        amount: amount,
        paymentDate: payment.payment_date
      }).catch(err => console.error('Email send error:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment'
    });
  }
};

/**
 * Update payment
 * PUT /payments/:id
 */
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    const payment = await PaymentModel.update(id, paymentData);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment'
    });
  }
};

/**
 * Delete payment
 * DELETE /payments/:id
 */
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    await PaymentModel.delete(id);

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment'
    });
  }
};

/**
 * Get payment summary for date range
 * GET /payments/summary?from_date=2024-01-01&to_date=2024-01-31
 */
const getPaymentSummary = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'From date and to date are required'
      });
    }

    const summary = await PaymentModel.getSummary(from_date, to_date);

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
 * Generate and download invoice PDF
 * GET /payments/:student_id/invoice/:fee_id
 */
const generateInvoice = async (req, res) => {
  try {
    const { student_id, fee_id } = req.params;

    const student = await StudentModel.getById(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get student fee details
    const feeResult = await db.query(
      'SELECT * FROM student_fees WHERE id = $1 AND student_id = $2',
      [fee_id, student_id]
    );

    if (feeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }

    const fee = feeResult.rows[0];

    // Create invoice data
    const invoiceData = {
      invoice_number: generateInvoiceNumber(),
      student_id,
      student_fee_id: fee_id,
      total_amount: fee.amount,
      items_description: 'School Fee',
      issue_date: new Date(),
      due_date: fee.due_date,
      status: 'issued'
    };

    // Generate PDF
    const pdfPath = await generateInvoicePDF(invoiceData, student);

    // Save invoice to database
    await db.query(`
      INSERT INTO invoices (
        invoice_number, student_id, student_fee_id, total_amount,
        items_description, status, pdf_path, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoiceData.invoice_number,
      student_id,
      fee_id,
      fee.amount,
      'School Fee',
      'issued',
      pdfPath,
      req.user.id
    ]);

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        invoice_number: invoiceData.invoice_number,
        pdf_path: pdfPath
      }
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice'
    });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  recordPayment,
  updatePayment,
  deletePayment,
  getPaymentSummary,
  generateInvoice
};
