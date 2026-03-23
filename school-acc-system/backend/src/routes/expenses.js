const express = require("express");
const { listExpenses, createExpense } = require("../controllers/expenses");

const router = express.Router();

router.get("/", listExpenses);
router.post("/", createExpense);

module.exports = router;
