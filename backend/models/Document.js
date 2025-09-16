const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    type: {
      type: String,
      enum: ["cash", "bank", "apps", "purchase", "petty"],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
