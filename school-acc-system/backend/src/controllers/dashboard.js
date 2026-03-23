const { query } = require("../db/query");

async function getDashboard(req, res, next) {
  try {
    const revenue = await query("SELECT COALESCE(SUM(amount),0) AS total FROM payments");
    const expenses = await query("SELECT COALESCE(SUM(amount),0) AS total FROM expenses");
    const unpaid = await query("SELECT COUNT(*) AS total FROM invoices WHERE status = 'UNPAID'");
    const students = await query("SELECT COUNT(*) AS total FROM students WHERE status = 'ACTIVE'");
    const recentPayments = await query(
      "SELECT p.*, s.first_name, s.last_name FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN students s ON i.student_id = s.id ORDER BY p.paid_at DESC LIMIT 5"
    );

    return res.json({
      totalRevenue: Number(revenue.rows[0].total),
      totalExpenses: Number(expenses.rows[0].total),
      net: Number(revenue.rows[0].total) - Number(expenses.rows[0].total),
      unpaidInvoices: Number(unpaid.rows[0].total),
      activeStudents: Number(students.rows[0].total),
      recentPayments: recentPayments.rows
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDashboard };
