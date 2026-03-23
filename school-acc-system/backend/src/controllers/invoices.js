const { query } = require("../db/query");
const { generateInvoicePdf } = require("../utils/pdf");

async function listInvoices(req, res, next) {
  try {
    const { status, student_id } = req.query;
    const params = [];
    const where = [];

    if (status) {
      params.push(status.toUpperCase());
      where.push(`i.status = $${params.length}`);
    }

    if (student_id) {
      params.push(Number(student_id));
      where.push(`i.student_id = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await query(
      `SELECT i.*, s.first_name, s.last_name FROM invoices i
       JOIN students s ON s.id = i.student_id
       ${whereSql}
       ORDER BY i.issue_date DESC, i.id DESC`,
      params
    );

    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function getInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const invoiceResult = await query("SELECT * FROM invoices WHERE id = $1", [id]);
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const items = await query("SELECT * FROM invoice_items WHERE invoice_id = $1", [id]);
    const payments = await query("SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at DESC", [id]);
    const installments = await query("SELECT * FROM installments WHERE invoice_id = $1 ORDER BY due_date ASC", [id]);

    return res.json({
      ...invoice,
      items: items.rows,
      payments: payments.rows,
      installments: installments.rows
    });
  } catch (err) {
    return next(err);
  }
}

async function createInvoice(req, res, next) {
  try {
    const { student_id, issue_date, due_date, items, installments } = req.body;
    const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const invoiceResult = await query(
      "INSERT INTO invoices (student_id, issue_date, due_date, total_amount, status, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [student_id, issue_date, due_date, total, "UNPAID", req.user.id]
    );

    const invoice = invoiceResult.rows[0];

    if (items && items.length) {
      const values = [];
      const params = [];
      let idx = 1;
      items.forEach((item) => {
        values.push(`($${idx++}, $${idx++}, $${idx++})`);
        params.push(invoice.id, item.title, item.amount);
      });
      await query(
        `INSERT INTO invoice_items (invoice_id, title, amount) VALUES ${values.join(",")}`,
        params
      );
    }

    if (installments && installments.length) {
      const values = [];
      const params = [];
      let idx = 1;
      installments.forEach((ins) => {
        values.push(`($${idx++}, $${idx++}, $${idx++})`);
        params.push(invoice.id, ins.due_date, ins.amount);
      });
      await query(
        `INSERT INTO installments (invoice_id, due_date, amount) VALUES ${values.join(",")}`,
        params
      );
    }

    const student = await query("SELECT first_name, last_name FROM students WHERE id = $1", [student_id]);
    const pdf = generateInvoicePdf(invoice, items, student.rows[0]);
    await query("UPDATE invoices SET pdf_path = $1 WHERE id = $2", [pdf.filePath, invoice.id]);

    return res.status(201).json({ ...invoice, pdf_path: pdf.filePath });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listInvoices, getInvoice, createInvoice };
