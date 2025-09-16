const mongoose = require("mongoose");

const lineItem = new mongoose.Schema({
  template: { type: mongoose.Schema.Types.ObjectId, ref: "ReportTemplate", required: false },
  name: { type: String, required: true },
  amount: { type: Number, default: 0 }
}, { _id: false });

const formSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  formDate: { type: Date, required: true },

  // قديم
  pettyCash: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  cashCollection: { type: Number, default: 0 },
  bankMada: { type: Number, default: 0 },
  bankVisa: { type: Number, default: 0 },

  // جديد
  actualSales: { type: Number, default: 0 },
  notes: { type: String, default: "" },

  applications: [lineItem],
  bankCollections: [lineItem],

  // Totals
  appsTotal: { type: Number, default: 0 },
  bankTotal: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },

  status: { type: String, enum: ["draft", "released", "rejected"], default: "draft" },

  // Releases
  accountantRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date }
  },
  adminRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date }
  },

  // (جديد) ملاحظات وأرقام الإدمن عند الاستلام
  adminNote: { type: String, default: "" },
  receivedCash: { type: Number, default: 0 },
  receivedApps: { type: Number, default: 0 },
  receivedBank: { type: Number, default: 0 },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

function sum(arr, key = "amount") {
  return (arr || []).reduce((s, x) => s + (Number(x?.[key]) || 0), 0);
}

formSchema.pre("save", function (next) {
  const legacyBank = (this.bankMada || 0) + (this.bankVisa || 0);
  this.appsTotal = sum(this.applications);
  const bankDyn = sum(this.bankCollections);
  this.bankTotal = bankDyn + legacyBank;
  this.totalSales = (this.cashCollection || 0) + this.bankTotal + this.appsTotal;
  next();
});

// اندكس يساعد في الفلاتر
formSchema.index({
  "accountantRelease.status": 1,
  "adminRelease.status": 1,
  branch: 1,
  formDate: -1,
});

module.exports = mongoose.model("Form", formSchema);
