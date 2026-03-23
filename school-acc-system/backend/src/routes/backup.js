const express = require("express");
const { exportBackup, importBackup } = require("../controllers/backup");

const router = express.Router();

router.get("/export", exportBackup);
router.post("/import", importBackup);

module.exports = router;
