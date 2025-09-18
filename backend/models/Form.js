// models/Form.js
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

  pettyCash: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  cashCollection: { type: Number, default: 0 },
  bankMada: { type: Number, default: 0 },
  bankVisa: { type: Number, default: 0 },

  actualSales: { type: Number, default: 0 },
  notes: { type: String, default: "" },

  applications: [lineItem],
  bankCollections: [lineItem],

  appsTotal: { type: Number, default: 0 },
  bankTotal: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },

  status: { type: String, enum: ["draft", "released", "rejected"], default: "draft" },

  accountantRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date }
  },

  // ✅ جديد
  branchManagerRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date },
    note: { type: String, default: "" }
  },

  adminRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date }
  },

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
  this.appsTotal = sum(this.applications);
  this.bankTotal = sum(this.bankCollections);
  this.totalSales = (this.cashCollection || 0) + this.bankTotal + this.appsTotal;
  next();
});

formSchema.index({
  "accountantRelease.status": 1,
  "branchManagerRelease.status": 1,
  "adminRelease.status": 1,
  branch: 1,
  formDate: -1,
});

module.exports = mongoose.model("Form", formSchema);
