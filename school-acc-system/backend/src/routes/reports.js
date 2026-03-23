const express = require("express");
const { summaryReport } = require("../controllers/reports");

const router = express.Router();

router.get("/summary", summaryReport);

module.exports = router;
