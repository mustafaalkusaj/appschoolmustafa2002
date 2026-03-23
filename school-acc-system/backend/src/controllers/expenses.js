const { query } = require("../db/query");

async function listExpenses(req, res, next) {
  try {
    const result = await query("SELECT * FROM expenses ORDER BY expense_date DESC");
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    const { title, category, amount, expense_date, notes } = req.body;
    const result = await query(
      "INSERT INTO expenses (title, category, amount, expense_date, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [title, category, amount, expense_date, notes || null, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listExpenses, createExpense };
