// routes/userRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  createUser,
  assignBranchesToUser,
  listUsers,
  myBranches,
  updateUser,          // ⬅️ جديد
  deleteUser,          // ⬅️ جديد
} = require("../controllers/userController");

// 🟢 Admin ينشئ مستخدم (User/Accountant/Admin)
router.post("/", protect, authorizeRoles("Admin"), createUser);

// 🟢 Admin يعدّل مستخدم
router.patch("/:id", protect, authorizeRoles("Admin"), updateUser);      // ⬅️ جديد

// 🟢 Admin يحذف مستخدم
router.delete("/:id", protect, authorizeRoles("Admin"), deleteUser);     // ⬅️ جديد

// 🟢 Admin يعيّن فروع لمستخدم
router.patch("/:id/assign-branches", protect, authorizeRoles("Admin"), assignBranchesToUser);

// 🟢 Admin يشوف كل اليوزرز
router.get("/", protect, authorizeRoles("Admin"), listUsers);

// 🟡 أي يوزر يشوف الفروع المربوطة بيه
router.get("/me/branches", protect, myBranches);

module.exports = router;
