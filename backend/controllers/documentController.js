const Document = require("../models/Document");

// 🟢 رفع مرفق
const uploadDocument = async (req, res) => {
  try {
    const { form, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "لم يتم رفع أي ملف" });
    }

    // تحقق من type
    const allowedTypes = ["cash", "bank", "apps", "purchase", "petty"];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        message: `يجب تحديد نوع المرفق بشكل صحيح (القيم المسموحة: ${allowedTypes.join(", ")})`
      });
    }

    // ✅ نخزن المسار بشكل نظيف ثابت
    const cleanPath = `/uploads/${req.file.filename}`.replace(/\\/g, "/");

    const doc = await Document.create({
      form,
      type,
      fileUrl: cleanPath,
    });

    return res.status(201).json(doc);
  } catch (error) {
    console.error("❌ Error uploading document:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟡 جلب مرفقات لفورم
const getDocumentsByForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const docs = await Document.find({ form: formId });
    return res.json(docs);
  } catch (error) {
    console.error("❌ Error fetching documents:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadDocument, getDocumentsByForm };
