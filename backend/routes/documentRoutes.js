const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { uploadDocument, getDocumentsByForm } = require("../controllers/documentController");

// 🟢 رفع مرفق لفورم
router.post("/", protect, upload.single("file"), uploadDocument);

// 🟡 جلب المرفقات لفورم
router.get("/:formId", protect, getDocumentsByForm);

module.exports = router;
