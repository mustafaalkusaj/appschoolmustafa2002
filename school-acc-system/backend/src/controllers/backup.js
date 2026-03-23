const { query } = require("../db/query");

const tables = [
  "users",
  "classes",
  "sections",
  "students",
  "fee_structures",
  "fee_structure_items",
  "student_fee_assignments",
  "invoices",
  "invoice_items",
  "payments",
  "installments",
  "expenses",
  "notifications"
];

async function exportBackup(req, res, next) {
  try {
    const backup = {};
    for (const table of tables) {
      const result = await query(`SELECT * FROM ${table}`);
      backup[table] = result.rows;
    }

    return res.json({ created_at: new Date().toISOString(), data: backup });
  } catch (err) {
    return next(err);
  }
}

async function importBackup(req, res, next) {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ message: "Missing backup data" });
    }

    await query("BEGIN");
    await query("SET session_replication_role = 'replica'");

    for (const table of tables.slice().reverse()) {
      await query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }

    for (const table of tables) {
      const rows = data[table] || [];
      if (!rows.length) continue;

      const columns = Object.keys(rows[0]);
      const values = [];
      const params = [];
      let idx = 1;

      rows.forEach((row) => {
        const placeholders = [];
        columns.forEach((col) => {
          placeholders.push(`$${idx++}`);
          params.push(row[col]);
        });
        values.push(`(${placeholders.join(",")})`);
      });

      await query(
        `INSERT INTO ${table} (${columns.join(",")}) VALUES ${values.join(",")}`,
        params
      );
    }

    await query("SET session_replication_role = 'origin'");
    await query("COMMIT");

    return res.json({ message: "Backup restored" });
  } catch (err) {
    await query("ROLLBACK");
    return next(err);
  }
}

module.exports = { exportBackup, importBackup };
