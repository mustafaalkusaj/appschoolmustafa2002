const express = require("express");
const { getDashboard } = require("../controllers/dashboard");

const router = express.Router();

router.get("/", getDashboard);

module.exports = router;
