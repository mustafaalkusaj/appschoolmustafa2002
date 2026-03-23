const express = require("express");
const { listSections, createSection, updateSection, deleteSection } = require("../controllers/sections");

const router = express.Router();

router.get("/", listSections);
router.post("/", createSection);
router.put("/:id", updateSection);
router.delete("/:id", deleteSection);

module.exports = router;
