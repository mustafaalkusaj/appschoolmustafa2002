const { query } = require("../db/query");

async function listStudents(req, res, next) {
  try {
    const { name, class_id, payment_status } = req.query;
    const params = [];
    const where = [];

    if (name) {
      params.push(`%${name}%`);
      where.push(`(s.first_name ILIKE $${params.length} OR s.last_name ILIKE $${params.length})`);
    }

    if (class_id) {
      params.push(Number(class_id));
      where.push(`s.class_id = $${params.length}`);
    }

    if (payment_status) {
      params.push(payment_status.toUpperCase());
      where.push(`li.status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      WITH latest_invoice AS (
        SELECT DISTINCT ON (student_id) student_id, status
        FROM invoices
        ORDER BY student_id, issue_date DESC, id DESC
      )
      SELECT s.*, c.name AS class_name, sec.name AS section_name, li.status AS payment_status
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN latest_invoice li ON li.student_id = s.id
      ${whereSql}
      ORDER BY s.created_at DESC
    `;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function createStudent(req, res, next) {
  try {
    const { admission_no, first_name, last_name, class_id, section_id } = req.body;
    const result = await query(
      "INSERT INTO students (admission_no, first_name, last_name, class_id, section_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [admission_no, first_name, last_name, class_id, section_id || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const { admission_no, first_name, last_name, class_id, section_id, status } = req.body;
    const result = await query(
      "UPDATE students SET admission_no = $1, first_name = $2, last_name = $3, class_id = $4, section_id = $5, status = $6 WHERE id = $7 RETURNING *",
      [admission_no, first_name, last_name, class_id, section_id || null, status || "ACTIVE", id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM students WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listStudents, createStudent, updateStudent, deleteStudent };
