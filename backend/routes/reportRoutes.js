const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getReports } = require("../controllers/reportController");

// 🟢 Admin بس يجيب تقارير
router.get("/", protect, authorizeRoles("Admin"), getReports);

module.exports = router;
