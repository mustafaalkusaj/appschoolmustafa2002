const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db/query");
const { env } = require("../config/env");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, fullName: user.full_name },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    return res.json({ token });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

async function createUser(req, res, next) {
  try {
    const { full_name, email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, full_name, email, role",
      [full_name, email, passwordHash, role]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me, createUser };
