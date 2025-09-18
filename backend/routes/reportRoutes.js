const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getReports } = require("../controllers/reportController");

// 🟢 Admin + BranchManager
router.get("/", protect, authorizeRoles("Admin", "BranchManager"), getReports);

module.exports = router;
