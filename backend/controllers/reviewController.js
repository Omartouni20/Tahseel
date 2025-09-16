const Form = require("../models/Form");

const listFormsForReview = async (req, res) => {
  try {
    const { branch, status, dateFrom, dateTo } = req.query;
    const q = {};

    if (branch) q.branch = branch;
    if (dateFrom || dateTo) {
      q.formDate = {};
      if (dateFrom) q.formDate.$gte = new Date(dateFrom);
      if (dateTo) q.formDate.$lte = new Date(dateTo);
    }

    // لو محاسب: (اختياري) قَصِر على فروعه
    if (req.user.role === "Accountant") {
      const assigned = (req.user.assignedBranches || []).map(b => String(b));
      q.branch = branch ? branch : { $in: assigned };
    }

    // فلتر حالة السير المناسب للدور
    if (status) {
      if (req.user.role === "Accountant") q["accountantRelease.status"] = status;
      if (req.user.role === "Admin") q["adminRelease.status"] = status;
    }

    const forms = await Form.find(q)
      .sort({ formDate: -1 })
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("adminRelease.by", "name");

    res.json(forms);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const accountantReleaseAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // 'release' | 'reject'
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    form.accountantRelease = {
      status: action === "release" ? "released" : "rejected",
      by: req.user._id,
      at: new Date(),
    };
    // (اختياري) أضف الملاحظة لسطر notes العام
    if (notes) form.notes = `${form.notes ? form.notes + " | " : ""}[ACC] ${notes}`;
    form.status = action === "release" ? "released" : "rejected";

    await form.save();

    const populated = await Form.findById(id)
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("adminRelease.by", "name");

    res.json({ message: "Accountant action saved", form: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const adminReleaseAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "Requires accountant release first" });
    }

    form.adminRelease = {
      status: action === "release" ? "released" : "rejected",
      by: req.user._id,
      at: new Date(),
    };
    if (notes) form.notes = `${form.notes ? form.notes + " | " : ""}[ADMIN] ${notes}`;
    form.status = action === "release" ? "released" : "rejected";

    await form.save();

    const populated = await Form.findById(id)
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("adminRelease.by", "name");

    res.json({ message: "Admin action saved", form: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { listFormsForReview, accountantReleaseAction, adminReleaseAction };
