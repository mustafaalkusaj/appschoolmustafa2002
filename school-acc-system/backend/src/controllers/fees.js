const { query } = require("../db/query");

async function listFeeStructures(req, res, next) {
  try {
    const structures = await query("SELECT * FROM fee_structures ORDER BY id DESC");
    const ids = structures.rows.map((row) => row.id);
    let itemsById = {};
    if (ids.length) {
      const items = await query(
        `SELECT * FROM fee_structure_items WHERE fee_structure_id = ANY($1::int[])`,
        [ids]
      );
      itemsById = items.rows.reduce((acc, item) => {
        acc[item.fee_structure_id] = acc[item.fee_structure_id] || [];
        acc[item.fee_structure_id].push(item);
        return acc;
      }, {});
    }

    const data = structures.rows.map((row) => ({
      ...row,
      items: itemsById[row.id] || []
    }));

    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function createFeeStructure(req, res, next) {
  try {
    const { name, frequency, amount, description, items } = req.body;
    const result = await query(
      "INSERT INTO fee_structures (name, frequency, amount, description) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, frequency, amount || 0, description || null]
    );

    const structure = result.rows[0];
    if (items && items.length) {
      const values = [];
      const params = [];
      let idx = 1;
      items.forEach((item) => {
        values.push(`($${idx++}, $${idx++}, $${idx++})`);
        params.push(structure.id, item.title, item.amount);
      });
      await query(
        `INSERT INTO fee_structure_items (fee_structure_id, title, amount) VALUES ${values.join(",")}`,
        params
      );
    }

    return res.status(201).json(structure);
  } catch (err) {
    return next(err);
  }
}

async function updateFeeStructure(req, res, next) {
  try {
    const { id } = req.params;
    const { name, frequency, amount, description, active } = req.body;
    const result = await query(
      "UPDATE fee_structures SET name = $1, frequency = $2, amount = $3, description = $4, active = $5 WHERE id = $6 RETURNING *",
      [name, frequency, amount, description || null, active !== false, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Fee structure not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function deleteFeeStructure(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM fee_structures WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Fee structure not found" });
    }
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
}

async function assignFeeToStudent(req, res, next) {
  try {
    const { student_id, fee_structure_id, start_date, end_date, discount_amount } = req.body;
    const result = await query(
      "INSERT INTO student_fee_assignments (student_id, fee_structure_id, start_date, end_date, discount_amount) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [student_id, fee_structure_id, start_date, end_date || null, discount_amount || 0]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  assignFeeToStudent
};
