const express = require("express");
const {
  listFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  assignFeeToStudent
} = require("../controllers/fees");

const router = express.Router();

router.get("/structures", listFeeStructures);
router.post("/structures", createFeeStructure);
router.put("/structures/:id", updateFeeStructure);
router.delete("/structures/:id", deleteFeeStructure);
router.post("/assign", assignFeeToStudent);

module.exports = router;
