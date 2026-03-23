const { query } = require("../db/query");

async function listPayments(req, res, next) {
  try {
    const { invoice_id } = req.query;
    const params = [];
    let sql = "SELECT * FROM payments";
    if (invoice_id) {
      params.push(Number(invoice_id));
      sql += " WHERE invoice_id = $1";
    }
    sql += " ORDER BY paid_at DESC";
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function createPayment(req, res, next) {
  try {
    const { invoice_id, amount, method, reference } = req.body;

    const insert = await query(
      "INSERT INTO payments (invoice_id, amount, method, reference, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [invoice_id, amount, method || "CASH", reference || null, req.user.id]
    );

    const invoiceRes = await query("SELECT total_amount FROM invoices WHERE id = $1", [invoice_id]);
    const totalAmount = Number(invoiceRes.rows[0].total_amount);

    const paidRes = await query("SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id = $1", [invoice_id]);
    const paid = Number(paidRes.rows[0].paid);

    let status = "UNPAID";
    if (paid >= totalAmount) {
      status = "PAID";
    } else if (paid > 0) {
      status = "PARTIAL";
    }

    await query("UPDATE invoices SET status = $1 WHERE id = $2", [status, invoice_id]);

    if (status === "PAID") {
      await query("UPDATE installments SET status = 'PAID', paid_at = NOW() WHERE invoice_id = $1", [invoice_id]);
    }

    return res.status(201).json(insert.rows[0]);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listPayments, createPayment };
