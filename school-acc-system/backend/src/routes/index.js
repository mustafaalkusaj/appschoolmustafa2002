const express = require("express");
const auth = require("./auth");
const students = require("./students");
const classes = require("./classes");
const sections = require("./sections");
const fees = require("./fees");
const invoices = require("./invoices");
const payments = require("./payments");
const expenses = require("./expenses");
const dashboard = require("./dashboard");
const reports = require("./reports");
const notifications = require("./notifications");
const backup = require("./backup");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.use("/auth", auth);

router.use(requireAuth);
router.use("/students", students);
router.use("/classes", classes);
router.use("/sections", sections);
router.use("/fees", fees);
router.use("/invoices", invoices);
router.use("/payments", payments);
router.use("/expenses", expenses);
router.use("/dashboard", dashboard);
router.use("/reports", reports);
router.use("/notifications", notifications);
router.use("/backup", backup);

module.exports = router;
