const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function migrate() {
  const schemaPath = path.resolve(__dirname, "../../docs/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(sql);
  await pool.end();
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
