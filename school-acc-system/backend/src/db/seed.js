const { pool } = require("./pool");
const bcrypt = require("bcryptjs");

async function seed() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await pool.query("BEGIN");

  const admin = await pool.query(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
    ["System Admin", "admin@school.local", passwordHash, "ADMIN"]
  );

  const classA = await pool.query(
    "INSERT INTO classes (name, grade) VALUES ($1,$2) RETURNING id",
    ["Grade 1", "G1"]
  );

  const sectionA = await pool.query(
    "INSERT INTO sections (class_id, name) VALUES ($1,$2) RETURNING id",
    [classA.rows[0].id, "A"]
  );

  const student = await pool.query(
    "INSERT INTO students (admission_no, first_name, last_name, class_id, section_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    ["ADM-001", "Sara", "Hassan", classA.rows[0].id, sectionA.rows[0].id]
  );

  const fee = await pool.query(
    "INSERT INTO fee_structures (name, frequency, amount, description) VALUES ($1,$2,$3,$4) RETURNING id",
    ["Standard Monthly", "MONTHLY", 120.0, "Monthly tuition fee"]
  );

  await pool.query(
    "INSERT INTO student_fee_assignments (student_id, fee_structure_id, start_date) VALUES ($1,$2,$3)",
    [student.rows[0].id, fee.rows[0].id, new Date()]
  );

  await pool.query("COMMIT");
  await pool.end();
  console.log("Seed data inserted.");
}

seed().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
