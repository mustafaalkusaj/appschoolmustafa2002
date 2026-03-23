const { query } = require("../db/query");

function getRange(range, dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(date);
  const end = new Date(date);

  if (range === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === "yearly") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

async function summaryReport(req, res, next) {
  try {
    const range = (req.query.range || "daily").toLowerCase();
    const { start, end } = getRange(range, req.query.date);

    const revenue = await query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE paid_at BETWEEN $1 AND $2",
      [start, end]
    );

    const expenses = await query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date BETWEEN $1 AND $2",
      [start, end]
    );

    return res.json({
      range,
      start,
      end,
      revenue: Number(revenue.rows[0].total),
      expenses: Number(expenses.rows[0].total),
      net: Number(revenue.rows[0].total) - Number(expenses.rows[0].total)
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { summaryReport };
