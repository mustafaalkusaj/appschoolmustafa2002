// Dashboard Controller
// Provides dashboard statistics and reports

const db = require('../config/database');

/**
 * Get dashboard statistics
 * GET /dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get total students
    const studentsResult = await db.query(
      'SELECT COUNT(*) as total FROM students WHERE is_active = true'
    );
    const totalStudents = parseInt(studentsResult.rows[0].total);

    // Get total revenue (paid fees)
    const revenueResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE DATE(payment_date) >= CURRENT_DATE - INTERVAL '30 days'
    `);
    const monthlyRevenue = parseFloat(revenueResult.rows[0].total);

    // Get total expenses (approved)
    const expensesResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE is_approved = true
      AND DATE(expense_date) >= CURRENT_DATE - INTERVAL '30 days'
    `);
    const monthlyExpenses = parseFloat(expensesResult.rows[0].total);

    // Get pending fees
    const pendingFeesResult = await db.query(`
      SELECT COALESCE(SUM(amount - COALESCE(total_paid, 0)), 0) as total
      FROM student_fees
      WHERE status IN ('pending', 'overdue')
    `);
    const pendingFees = parseFloat(pendingFeesResult.rows[0].total);

    // Get payment methods breakdown (last 30 days)
    const paymentMethodsResult = await db.query(`
      SELECT payment_method, COUNT(*) as count, SUM(amount) as total
      FROM payments
      WHERE DATE(payment_date) >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY payment_method
    `);

    // Get top students by fees
    const topStudentsResult = await db.query(`
      SELECT TOP 5 s.id, CONCAT(s.first_name, ' ', s.last_name) as name,
             SUM(sf.amount) as total_fees
      FROM students s
      LEFT JOIN student_fees sf ON s.id = sf.student_id
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY total_fees DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalStudents,
        monthlyRevenue,
        monthlyExpenses,
        netIncome: monthlyRevenue - monthlyExpenses,
        pendingFees,
        paymentMethods: paymentMethodsResult.rows,
        topStudents: topStudentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

/**
 * Get daily report
 * GET /dashboard/report/daily?date=2024-01-15
 */
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];

    // Daily revenue
    const revenueResult = await db.query(`
      SELECT COUNT(*) as payment_count, SUM(amount) as total_amount
      FROM payments
      WHERE DATE(payment_date) = $1
    `, [reportDate]);

    // Daily expenses
    const expensesResult = await db.query(`
      SELECT COUNT(*) as expense_count, SUM(amount) as total_amount
      FROM expenses
      WHERE is_approved = true AND DATE(expense_date) = $1
    `, [reportDate]);

    const revenue = revenueResult.rows[0] || { payment_count: 0, total_amount: 0 };
    const expenses = expensesResult.rows[0] || { expense_count: 0, total_amount: 0 };

    res.json({
      success: true,
      data: {
        date: reportDate,
        revenue: {
          count: revenue.payment_count,
          amount: parseFloat(revenue.total_amount || 0)
        },
        expenses: {
          count: expenses.expense_count,
          amount: parseFloat(expenses.total_amount || 0)
        },
        netIncome: parseFloat(revenue.total_amount || 0) - parseFloat(expenses.total_amount || 0)
      }
    });
  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily report'
    });
  }
};

/**
 * Get monthly report
 * GET /dashboard/report/monthly?year=2024&month=1
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Monthly revenue
    const revenueResult = await db.query(`
      SELECT COUNT(*) as payment_count, SUM(amount) as total_amount
      FROM payments
      WHERE EXTRACT(YEAR FROM payment_date) = $1
      AND EXTRACT(MONTH FROM payment_date) = $2
    `, [currentYear, currentMonth]);

    // Monthly expenses
    const expensesResult = await db.query(`
      SELECT COUNT(*) as expense_count, SUM(amount) as total_amount
      FROM expenses
      WHERE is_approved = true
      AND EXTRACT(YEAR FROM expense_date) = $1
      AND EXTRACT(MONTH FROM expense_date) = $2
    `, [currentYear, currentMonth]);

    const revenue = revenueResult.rows[0] || { payment_count: 0, total_amount: 0 };
    const expenses = expensesResult.rows[0] || { expense_count: 0, total_amount: 0 };

    res.json({
      success: true,
      data: {
        period: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        revenue: {
          count: revenue.payment_count,
          amount: parseFloat(revenue.total_amount || 0)
        },
        expenses: {
          count: expenses.expense_count,
          amount: parseFloat(expenses.total_amount || 0)
        },
        netIncome: parseFloat(revenue.total_amount || 0) - parseFloat(expenses.total_amount || 0)
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly report'
    });
  }
};

module.exports = {
  getDashboardStats,
  getDailyReport,
  getMonthlyReport
};
