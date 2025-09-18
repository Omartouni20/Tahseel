// controllers/branchController.js
const Branch = require("../models/Branch");
const Form = require("../models/Form");
const User = require("../models/User");

// إضافة فرع جديد (Admin)
const createBranch = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    const exists = await Branch.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ message: "Branch already exists" });

    const branch = await Branch.create({ name: name.trim() });
    return res.status(201).json(branch);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// جلب كل الفروع (أي مستخدم مسجل)
const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    return res.json(branches);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// تعديل اسم فرع (Admin)
const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    // ممنوع اسم مكرر
    const exists = await Branch.findOne({ name: name.trim(), _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: "Branch name already exists" });

    const updated = await Branch.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Branch not found" });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// حذف فرع (Admin) - Cascade Delete
const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    // امسح كل الفورمز المرتبطة بالفرع
    await Form.deleteMany({ branch: id });

    // شيل الفرع من اليوزرز
    await User.updateMany(
      { assignedBranches: id },
      { $pull: { assignedBranches: id } }
    );

    // امسح الفرع نفسه
    const removed = await Branch.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: "Branch not found" });

    return res.json({ message: "Branch and related data deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
};
