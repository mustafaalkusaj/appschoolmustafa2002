// Utility helper functions
// Common utility functions used throughout the application

/**
 * Generate a unique receipt number
 * @returns {string} Receipt number
 */
const generateReceiptNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RCP-${timestamp}-${random}`;
};

/**
 * Generate a unique invoice number
 * @returns {string} Invoice number
 */
const generateInvoiceNumber = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
  return `INV-${year}${month}-${random}`;
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Check if fee is overdue
 * @param {Date} dueDate - Due date
 * @returns {boolean} True if past due date
 */
const isOverdue = (dueDate) => {
  return new Date(dueDate) < new Date();
};

/**
 * Calculate days until due
 * @param {Date} dueDate - Due date
 * @returns {number} Number of days
 */
const daysUntilDue = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  const difference = due.getTime() - today.getTime();
  return Math.ceil(difference / (1000 * 3600 * 24));
};

/**
 * Paginate results
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {object} Offset and limit for SQL query
 */
const getPagination = (page = 1, pageSize = 10) => {
  const limit = parseInt(pageSize, 10) || 10;
  const offset = (parseInt(page, 10) - 1) * limit || 0;
  return { offset, limit };
};

/**
 * Generate a full student name
 * @param {object} student - Student object
 * @returns {string} Full name
 */
const getStudentFullName = (student) => {
  return `${student.first_name} ${student.last_name}`;
};

module.exports = {
  generateReceiptNumber,
  generateInvoiceNumber,
  formatCurrency,
  formatDate,
  isOverdue,
  daysUntilDue,
  getPagination,
  getStudentFullName
};
