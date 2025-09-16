// routes/branchRoutes.js
const express = require("express");
const router = express.Router();

const {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// إنشاء فرع (Admin فقط)
router.post("/", protect, authorizeRoles("Admin"), createBranch);

// جلب جميع الفروع (أي مستخدم مسجل)
router.get("/", protect, getBranches);

// تعديل فرع (Admin فقط)
router.patch("/:id", protect, authorizeRoles("Admin"), updateBranch);

// حذف فرع (Admin فقط)
router.delete("/:id", protect, authorizeRoles("Admin"), deleteBranch);

module.exports = router;
