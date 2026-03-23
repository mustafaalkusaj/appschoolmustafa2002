const { query } = require("../db/query");

async function listClasses(req, res, next) {
  try {
    const result = await query("SELECT * FROM classes ORDER BY id DESC");
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function createClass(req, res, next) {
  try {
    const { name, grade } = req.body;
    const result = await query(
      "INSERT INTO classes (name, grade) VALUES ($1,$2) RETURNING *",
      [name, grade || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function updateClass(req, res, next) {
  try {
    const { id } = req.params;
    const { name, grade } = req.body;
    const result = await query(
      "UPDATE classes SET name = $1, grade = $2 WHERE id = $3 RETURNING *",
      [name, grade || null, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Class not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function deleteClass(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM classes WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Class not found" });
    }
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listClasses, createClass, updateClass, deleteClass };
