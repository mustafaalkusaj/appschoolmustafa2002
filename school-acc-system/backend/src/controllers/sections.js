const { query } = require("../db/query");

async function listSections(req, res, next) {
  try {
    const { class_id } = req.query;
    const params = [];
    let sql = "SELECT * FROM sections";
    if (class_id) {
      params.push(Number(class_id));
      sql += " WHERE class_id = $1";
    }
    sql += " ORDER BY id DESC";
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function createSection(req, res, next) {
  try {
    const { class_id, name } = req.body;
    const result = await query(
      "INSERT INTO sections (class_id, name) VALUES ($1,$2) RETURNING *",
      [class_id, name]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function updateSection(req, res, next) {
  try {
    const { id } = req.params;
    const { class_id, name } = req.body;
    const result = await query(
      "UPDATE sections SET class_id = $1, name = $2 WHERE id = $3 RETURNING *",
      [class_id, name, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Section not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function deleteSection(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM sections WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Section not found" });
    }
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listSections, createSection, updateSection, deleteSection };
