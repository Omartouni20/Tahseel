const mongoose = require("mongoose");

const reportTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // group: يحدد نوع البند
  group: { type: String, enum: ["applications", "bank"], required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("ReportTemplate", reportTemplateSchema);
