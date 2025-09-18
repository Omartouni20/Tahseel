// controllers/formController.js
const Form = require("../models/Form");
const ReportTemplate = require("../models/ReportTemplate");

// 🧩 مساعد: تحويل templateId/methodId -> lineItem مع اسم ثابت
async function buildLinesFromTemplates(items, group) {
  const normalized = (items || []).map(x => ({
    templateId: x.templateId || x.methodId || null,
    amount: Number(x.amount) || 0,
    name: x.name,
  }));

  const ids = normalized.filter(x => x.templateId).map(x => x.templateId);
  const templates = ids.length
    ? await ReportTemplate.find({ _id: { $in: ids }, group, isActive: true }).select("_id name")
    : [];
  const map = new Map(templates.map(t => [String(t._id), t]));

  return normalized
    .filter(x => x.templateId || x.name)
    .map(x => {
      if (x.templateId && map.has(String(x.templateId))) {
        const t = map.get(String(x.templateId));
        return { template: t._id, name: t.name, amount: x.amount };
      }
      return { name: String(x.name || ""), amount: x.amount };
    });
}

/* 🔎 Helper لإخراج الفورم بشكل موحّد */
function mapOut(f) {
  const appsTotal = typeof f.appsTotal === "number" ? f.appsTotal : (f.appsCollection || 0);
  const legacyBank = (f.bankMada || 0) + (f.bankVisa || 0);
  const bankDyn = (f.bankCollections || []).reduce((s, x) => s + Number(x?.amount || 0), 0);
  const bankTotal = typeof f.bankTotal === "number" ? f.bankTotal : (legacyBank + bankDyn);
  const totalSales = typeof f.totalSales === "number"
    ? f.totalSales
    : (Number(f.cashCollection || 0) + appsTotal + bankTotal);

  return {
    _id: f._id,
    formDate: f.formDate,
    branch: f.branch,
    user: f.user,

    pettyCash: f.pettyCash || 0,
    purchases: f.purchases || 0,
    cashCollection: f.cashCollection || 0,

    applications: f.applications || [],
    bankCollections: f.bankCollections || [],

    appsTotal,
    bankTotal,
    totalSales,

    actualSales: f.actualSales || 0,
    notes: f.notes || "",

    status: f.status || "draft",
    accountantRelease: f.accountantRelease || { status: "pending" },
    branchManagerRelease: f.branchManagerRelease || { status: "pending" },
    adminRelease: f.adminRelease || { status: "pending" },

    adminNote: f.adminNote || "",
    receivedCash: f.receivedCash || 0,
    receivedApps: f.receivedApps || 0,
    receivedBank: f.receivedBank || 0,

    createdAt: f.createdAt,
  };
}

// 🟢 إنشاء فورم
const createForm = async (req, res) => {
  try {
    const {
      formDate, branch,
      pettyCash = 0, purchases = 0, cashCollection = 0,
      bankMada = 0, bankVisa = 0,
      actualSales = 0, notes = "",
      applications = [],
      bankCollections = []
    } = req.body;

    const assigned = (req.user.assignedBranches || []).map(b => b.toString());
    if (!assigned.includes(String(branch))) {
      return res.status(403).json({ message: "Not authorized for this branch" });
    }

    const appsLine = await buildLinesFromTemplates(applications, "applications");
    const bankLine = await buildLinesFromTemplates(bankCollections, "bank");

    const form = await Form.create({
      user: req.user._id,
      branch,
      formDate: new Date(formDate),

      pettyCash: Number(pettyCash) || 0,
      purchases: Number(purchases) || 0,
      cashCollection: Number(cashCollection) || 0,
      bankMada: Number(bankMada) || 0,
      bankVisa: Number(bankVisa) || 0,

      actualSales: Number(actualSales) || 0,
      notes,

      applications: appsLine,
      bankCollections: bankLine,

      accountantRelease: { status: "pending" },
      branchManagerRelease: { status: "pending" },
      adminRelease: { status: "pending" },
      status: "draft",
    });

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" }
    ]);

    return res.status(201).json(populated);
  } catch (error) {
    console.error("❌ createForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟡 تحديث فورم (قبل Release المحاسب فقط)
const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status === "released") {
      return res.status(400).json({ message: "لا يمكن تعديل التقرير بعد Release المحاسب" });
    }

    const {
      pettyCash, purchases, cashCollection,
      bankMada, bankVisa,
      actualSales, notes,
      applications,
      bankCollections
    } = req.body;

    if (pettyCash !== undefined) form.pettyCash = Number(pettyCash) || 0;
    if (purchases !== undefined) form.purchases = Number(purchases) || 0;
    if (cashCollection !== undefined) form.cashCollection = Number(cashCollection) || 0;
    if (bankMada !== undefined) form.bankMada = Number(bankMada) || 0;
    if (bankVisa !== undefined) form.bankVisa = Number(bankVisa) || 0;
    if (actualSales !== undefined) form.actualSales = Number(actualSales) || 0;
    if (notes !== undefined) form.notes = String(notes || "");

    if (Array.isArray(applications)) {
      form.applications = await buildLinesFromTemplates(applications, "applications");
    }
    if (Array.isArray(bankCollections)) {
      form.bankCollections = await buildLinesFromTemplates(bankCollections, "bank");
    }

    await form.save();

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" }
    ]);

    return res.json(populated);
  } catch (error) {
    console.error("❌ updateForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔵 Release المحاسب
const releaseForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    form.accountantRelease = { status: "released", by: req.user._id, at: new Date() };
    form.status = "released";
    await form.save();

    const populated = await form.populate([{ path: "branch", select: "name" }, { path: "user", select: "name" }]);
    return res.json({ message: "Form released by accountant", form: populated });
  } catch (error) {
    console.error("❌ releaseForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔴 Reject المحاسب
const rejectForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    form.accountantRelease = { status: "rejected", by: req.user._id, at: new Date() };
    form.status = "rejected";
    await form.save();

    const populated = await form.populate([{ path: "branch", select: "name" }, { path: "user", select: "name" }]);
    return res.json({ message: "Form rejected successfully", form: populated });
  } catch (error) {
    console.error("❌ rejectForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟣 Release مدير الفرع
const branchManagerReleaseForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من المحاسب أولًا" });
    }

    form.branchManagerRelease = { status: "released", by: req.user._id, at: new Date(), note };
    await form.save();

    const populated = await form.populate([{ path: "branch", select: "name" }, { path: "user", select: "name" }]);
    return res.json({ message: "Form released by branch manager", form: mapOut(populated) });
  } catch (error) {
    console.error("❌ branchManagerReleaseForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟣 Reject مدير الفرع
const branchManagerRejectForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من المحاسب أولًا" });
    }

    form.branchManagerRelease = { status: "rejected", by: req.user._id, at: new Date(), note };
    form.status = "rejected";
    await form.save();

    const populated = await form.populate([{ path: "branch", select: "name" }, { path: "user", select: "name" }]);
    return res.json({ message: "Form rejected by branch manager", form: mapOut(populated) });
  } catch (error) {
    console.error("❌ branchManagerRejectForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔵 Release الأدمن
const adminReleaseForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "", receivedCash, receivedApps, receivedBank } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من المحاسب أولًا" });
    }
    if (form.branchManagerRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من مدير الفرع أولًا" });
    }

    const fallbackCash = Number(form.cashCollection || 0);
    const fallbackApps = (form.applications || []).reduce((s, a) => s + Number(a?.amount || 0), 0);
    const fallbackBank = (form.bankCollections || []).reduce((s, b) => s + Number(b?.amount || 0), 0);

    form.adminRelease = { status: "released", by: req.user._id, at: new Date() };
    form.adminNote = String(note || "");

    form.receivedCash = receivedCash !== undefined ? Number(receivedCash) || 0 : fallbackCash;
    form.receivedApps = receivedApps !== undefined ? Number(receivedApps) || 0 : fallbackApps;
    form.receivedBank = receivedBank !== undefined ? Number(receivedBank) || 0 : fallbackBank;

    form.status = "released";
    await form.save();

    const populated = await form.populate([{ path: "branch", select: "name" }, { path: "user", select: "name" }]);
    return res.json({ message: "Form released by admin", form: mapOut(populated) });
  } catch (error) {
    console.error("❌ adminReleaseForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔵 Reject الأدمن
const adminRejectForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من المحاسب أولًا" });
    }

    form.adminRelease = { status: "rejected", by: req.user._id, at: new Date() };
    form.adminNote = String(note || "");
    form.status = "rejected";
    await form.save();

    const populated = await form.populate([{ path: "branch", select: "name" }, { path: "user", select: "name" }]);
    return res.json({ message: "Form rejected by admin", form: mapOut(populated) });
  } catch (error) {
    console.error("❌ adminRejectForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟡 فورمز اليوزر
const getMyForms = async (req, res) => {
  try {
    const forms = await Form.find({ user: req.user._id })
      .sort({ formDate: -1 })
      .populate("branch", "name")
      .populate("user", "name");
    return res.json(forms);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 🟡 Accountant review list
const listFormsForReview = async (req, res) => {
  try {
    const { branchId, startDate, endDate, status } = req.query;
    const filters = {};
    if (branchId) filters.branch = branchId;
    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }
    if (status === "released") filters.status = "released";
    else filters.status = { $nin: ["rejected"] };

    const forms = await Form.find(filters)
      .populate("branch", "name")
      .populate("user", "name")
      .sort({ formDate: -1, createdAt: -1 });

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("listFormsForReview error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔵 Admin listing
const listFormsForAdmin = async (req, res) => {
  try {
    const { branchId, startDate, endDate, q = "", adminStatus = "" } = req.query;
    const filters = { "accountantRelease.status": "released", "branchManagerRelease.status": "released" };
    if (branchId) filters.branch = branchId;
    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }
    if (adminStatus) filters["adminRelease.status"] = adminStatus;

    const or = [];
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      or.push({ notes: rx });
    }
    const query = or.length ? { $and: [filters, { $or: or }] } : filters;

    const forms = await Form.find(query)
      .populate("branch", "name")
      .populate("user", "name")
      .sort({ formDate: -1, createdAt: -1 });

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("listFormsForAdmin error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟣 Branch Manager listing
const listFormsForBranchManager = async (req, res) => {
  try {
    const { startDate, endDate, q = "" } = req.query;
    const filters = { "accountantRelease.status": "released" };
    filters.branch = { $in: req.user.assignedBranches || [] };

    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }

    const or = [];
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      or.push({ notes: rx });
    }
    const query = or.length ? { $and: [filters, { $or: or }] } : filters;

    const forms = await Form.find(query)
      .populate("branch", "name")
      .populate("user", "name")
      .sort({ formDate: -1, createdAt: -1 });

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("listFormsForBranchManager error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createForm,
  updateForm,
  getMyForms,
  releaseForm,
  rejectForm,
  branchManagerReleaseForm,
  branchManagerRejectForm,
  adminReleaseForm,
  adminRejectForm,
  listFormsForReview,
  listFormsForAdmin,
  listFormsForBranchManager,
};
