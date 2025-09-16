const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  createForm,
  getMyForms,
  updateForm,
  releaseForm,
  adminReleaseForm,
  rejectForm,
  listFormsForReview,
  listFormsForAdmin,
  adminRejectForm,
} = require("../controllers/formController");

//
// 🟢 User routes
//

// User ينشئ فورم
router.post("/", protect, createForm);

// User يشوف الفورمز بتاعته
router.get("/me", protect, getMyForms);

// User يحدّث فورمه قبل Release المحاسب
router.patch("/:id", protect, updateForm);

//
// 🟡 Accountant routes
//

// Accountant يجيب كل التقارير للمراجعة (مع فلاتر branch/status/date)
router.get("/review", protect, authorizeRoles("Accountant"), listFormsForReview);

// Accountant يعمل Release/Reject
router.patch("/:id/release", protect, authorizeRoles("Accountant"), releaseForm);
router.patch("/:id/reject", protect, authorizeRoles("Accountant"), rejectForm);

//
// 🔵 Admin routes
//

// Admin: جلب تقارير المحاسب (released فقط) مع فلاتر
router.get("/admin", protect, authorizeRoles("Admin"), listFormsForAdmin);

// Admin يعمل Release بعد المحاسب + (ملاحظات/مبالغ)
router.patch("/:id/admin-release", protect, authorizeRoles("Admin"), adminReleaseForm);

// Admin Reject
router.patch("/:id/admin-reject", protect, authorizeRoles("Admin"), adminRejectForm);

module.exports = router;
