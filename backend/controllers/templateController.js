const ReportTemplate = require("../models/ReportTemplate");

// 🟢 إنشاء بند
const createTemplate = async (req, res) => {
  try {
    const { name, group, isActive = true } = req.body;
    if (!name || !group) return res.status(400).json({ message: "name & group مطلوبين" });

    const t = await ReportTemplate.create({ name, group, isActive, createdBy: req.user._id });
    res.status(201).json(t);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 🟡 جلب البنود
const listTemplates = async (req, res) => {
  try {
    const { group, active } = req.query;
    const q = {};
    if (group) q.group = group;
    if (typeof active !== "undefined") q.isActive = active === "true";
    const data = await ReportTemplate.find(q).sort({ createdAt: -1 });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 🔵 تعديل اسم/تفعيل
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const updated = await ReportTemplate.findByIdAndUpdate(
      id,
      { ...(name ? { name } : {}), ...(typeof isActive === "boolean" ? { isActive } : {}) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Template not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ❌🧹 حذف قالب (للأدمن فقط)
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // (اختياري) امنع الحذف لو القالب مستخدم في فورمات:
    // const Form = require("../models/Form");
    // const used = await Form.exists({ "applications.template": id }) || await Form.exists({ "bankCollections.template": id });
    // if (used) return res.status(409).json({ message: "Template in use" });

    const t = await ReportTemplate.findByIdAndDelete(id);
    if (!t) return res.status(404).json({ message: "Template not found" });
    return res.status(204).send();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { createTemplate, listTemplates, updateTemplate, deleteTemplate };
