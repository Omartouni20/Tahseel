const express = require("express");
const router = express.Router();

const {
  createTemplate,
  listTemplates,
  updateTemplate,
  deleteTemplate,   // ⬅️ جديد
} = require("../controllers/templateController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// عرض القوالب (أي مستخدم مسجّل)
router.get("/", protect, listTemplates);

// إنشاء قالب (أدمن فقط)
router.post("/", protect, authorizeRoles("Admin"), createTemplate);

// تعديل اسم/تفعيل (أدمن فقط)
router.patch("/:id", protect, authorizeRoles("Admin"), updateTemplate);

// حذف قالب (أدمن فقط)
router.delete("/:id", protect, authorizeRoles("Admin"), deleteTemplate);

module.exports = router;
