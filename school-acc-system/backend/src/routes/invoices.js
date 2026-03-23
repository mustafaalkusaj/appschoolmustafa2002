const express = require("express");
const { listInvoices, getInvoice, createInvoice } = require("../controllers/invoices");

const router = express.Router();

router.get("/", listInvoices);
router.get("/:id", getInvoice);
router.post("/", createInvoice);

module.exports = router;
