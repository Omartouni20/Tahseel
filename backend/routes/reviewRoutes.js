const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  listFormsForReview,
  accountantReleaseAction,
  adminReleaseAction,
} = require("../controllers/reviewController");

router.get("/", protect, authorizeRoles("Accountant", "Admin"), listFormsForReview);
router.patch("/:id/accountant", protect, authorizeRoles("Accountant"), accountantReleaseAction);
router.patch("/:id/admin", protect, authorizeRoles("Admin"), adminReleaseAction);

module.exports = router;
