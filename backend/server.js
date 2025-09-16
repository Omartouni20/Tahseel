const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 اجعل فولدر uploads متاح للفرونت
console.log("📂 __dirname:", __dirname);
console.log("📂 Uploads path:", path.join(__dirname, "uploads"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🟢 Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/branches", require("./routes/branchRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/forms", require("./routes/formRoutes"));
app.use("/api/documents", require("./routes/documentRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/report-templates", require("./routes/templateRoutes"));
app.use("/api/review", require("./routes/reviewRoutes"));

// ✅ Route للتأكيد
app.get("/", (req, res) => {
  res.send("🚀 Finance System is running successfully on tahseelaty.al-hawas-eg.cloud!");
});

// 🟡 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
