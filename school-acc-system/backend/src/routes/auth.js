const express = require("express");
const { login, me, createUser } = require("../controllers/auth");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/users", requireAuth, requireRole("ADMIN"), createUser);

module.exports = router;
