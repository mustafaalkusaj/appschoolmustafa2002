const express = require("express");
const { listNotifications, generateUnpaidNotifications } = require("../controllers/notifications");

const router = express.Router();

router.get("/", listNotifications);
router.post("/unpaid", generateUnpaidNotifications);

module.exports = router;
