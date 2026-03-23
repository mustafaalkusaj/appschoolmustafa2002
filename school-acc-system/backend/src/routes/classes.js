const express = require("express");
const { listClasses, createClass, updateClass, deleteClass } = require("../controllers/classes");

const router = express.Router();

router.get("/", listClasses);
router.post("/", createClass);
router.put("/:id", updateClass);
router.delete("/:id", deleteClass);

module.exports = router;
