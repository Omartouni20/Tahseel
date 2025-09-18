// controllers/userController.js
const User = require("../models/User");
const Branch = require("../models/Branch");
const bcrypt = require("bcryptjs");

// (Admin) إنشاء مستخدم جديد
const createUser = async (req, res) => {
  try {
    const { name, email, password, role = "User", assignedBranches = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password مطلوبة" });
    }

    // تأكد إن الدور واحد من القيم المسموحة
    const allowedRoles = ["User", "Accountant", "Admin", "BranchManager"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // تأكد إن الإيميل مش موجود
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    // تحقّق من الفروع (لو اتبعتت)
    if (assignedBranches.length) {
      const count = await Branch.countDocuments({ _id: { $in: assignedBranches } });
      if (count !== assignedBranches.length) {
        return res.status(404).json({ message: "One or more branches not found" });
      }
    }

    // هاش الباسورد
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role,
      assignedBranches,
    });

    // رجّع الداتا بدون الباسورد
    const safeUser = await User.findById(user._id)
      .select("-password")
      .populate("assignedBranches", "name");

    return res.status(201).json(safeUser);
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// (Admin) تعيين فروع لمستخدم
const assignBranchesToUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { branchIds } = req.body;

    if (!Array.isArray(branchIds) || branchIds.length === 0) {
      return res.status(400).json({ message: "branchIds must be a non-empty array" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const branches = await Branch.find({ _id: { $in: branchIds } });
    if (branches.length !== branchIds.length) {
      return res.status(404).json({ message: "One or more branches not found" });
    }

    user.assignedBranches = branchIds;
    await user.save();

    const populated = await user.populate("assignedBranches", "name");
    return res.json({ message: "Branches assigned successfully", user: populated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

// (Admin) عرض كل المستخدمين
const listUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("assignedBranches", "name")
      .sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// (User) فروع المستخدم الحالي
const myBranches = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate("assignedBranches", "name");
    if (!me) return res.status(404).json({ message: "User not found" });
    return res.json(me.assignedBranches);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// (Admin) تعديل مستخدم
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, assignedBranches } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const exists = await User.findOne({ email: emailLower, _id: { $ne: id } });
      if (exists) return res.status(409).json({ message: "Email already exists" });
      user.email = emailLower;
    }

    if (role) {
      const allowedRoles = ["User", "Accountant", "Admin"];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      user.role = role;
    }

    if (name) {
      user.name = name.trim();
    }

    if (Array.isArray(assignedBranches)) {
      const count = await Branch.countDocuments({ _id: { $in: assignedBranches } });
      if (count !== assignedBranches.length) {
        return res.status(404).json({ message: "One or more branches not found" });
      }
      user.assignedBranches = assignedBranches;
    }

    await user.save();

    const safe = await User.findById(user._id)
      .select("-password")
      .populate("assignedBranches", "name");

    return res.json({ message: "User updated", user: safe });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// (Admin) حذف مستخدم
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: "لا يمكنك حذف حسابك الحالي" });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role === "Admin") {
      const adminCount = await User.countDocuments({ role: "Admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "لا يمكن حذف آخر مدير في النظام" });
      }
    }

    await User.findByIdAndDelete(id);
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  assignBranchesToUser,
  listUsers,
  myBranches,
  updateUser,
  deleteUser,
};
