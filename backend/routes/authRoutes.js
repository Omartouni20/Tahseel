const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// تسجيل يوزر جديد
router.post("/register", registerUser);

// تسجيل دخول
router.post("/login", loginUser);

// بيانات اليوزر الحالي
router.get("/me", protect, getMe);

module.exports = router;
