const { query } = require("../db/query");

async function listNotifications(req, res, next) {
  try {
    const result = await query("SELECT * FROM notifications ORDER BY created_at DESC");
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function generateUnpaidNotifications(req, res, next) {
  try {
    const unpaid = await query(
      "SELECT i.id, i.student_id, s.first_name, s.last_name FROM invoices i JOIN students s ON i.student_id = s.id WHERE i.status = 'UNPAID' AND i.due_date < CURRENT_DATE"
    );

    if (!unpaid.rows.length) {
      return res.json({ message: "No unpaid invoices" });
    }

    const values = [];
    const params = [];
    let idx = 1;
    unpaid.rows.forEach((row) => {
      const message = `Unpaid invoice #${row.id} for ${row.first_name} ${row.last_name}`;
      values.push(`($${idx++}, $${idx++}, $${idx++})`);
      params.push(row.student_id, row.id, message);
    });

    await query(
      `INSERT INTO notifications (student_id, invoice_id, message) VALUES ${values.join(",")}`,
      params
    );

    return res.json({ created: unpaid.rows.length });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listNotifications, generateUnpaidNotifications };
