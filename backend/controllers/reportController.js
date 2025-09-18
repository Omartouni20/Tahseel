const Form = require("../models/Form");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const getReports = async (req, res) => {
  try {
    const { branchId, startDate, endDate, format } = req.query;

    const filters = { status: "released" };

    // ✅ BranchManager يشوف فقط الفروع المخصصة له
    if (req.user.role === "BranchManager") {
      filters.branch = { $in: req.user.assignedBranches || [] };
    } else if (branchId) {
      filters.branch = branchId;
    }

    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }

    const forms = await Form.find(filters)
      .populate("user", "name email")
      .populate("branch", "name");

    const totals = {
      cash: forms.reduce((s, f) => s + (f.cashCollection || 0), 0),
      bank: forms.reduce((s, f) => s + (f.bankTotal || 0), 0),
      apps: forms.reduce((s, f) => s + (f.appsTotal || 0), 0),
      petty: forms.reduce((s, f) => s + (f.pettyCash || 0), 0),
      purchases: forms.reduce((s, f) => s + (f.purchases || 0), 0),
      totalSales: forms.reduce(
        (s, f) =>
          s + ((f.totalSales || 0) - (f.pettyCash || 0) - (f.purchases || 0)),
        0
      ),
      actualSales: forms.reduce((s, f) => s + (f.actualSales || 0), 0),
    };

    if (!format) return res.json({ totals, forms });

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Reports");

      sheet.columns = [
        { header: "User", key: "user", width: 20 },
        { header: "Branch", key: "branch", width: 18 },
        { header: "Date", key: "date", width: 12 },
        { header: "Cash", key: "cash", width: 10 },
        { header: "Bank", key: "bank", width: 10 },
        { header: "Apps", key: "apps", width: 10 },
        { header: "Petty", key: "petty", width: 10 },
        { header: "Purchases", key: "purchases", width: 12 },
        { header: "Total Sales", key: "totalSales", width: 14 },
        { header: "Actual Sales", key: "actualSales", width: 14 },
        { header: "Notes", key: "notes", width: 30 },
      ];

      forms.forEach(f => {
        const salesOnly =
          (f.totalSales || 0) - (f.pettyCash || 0) - (f.purchases || 0);

        sheet.addRow({
          user: f.user.name,
          branch: f.branch.name,
          date: f.formDate.toISOString().split("T")[0],
          cash: f.cashCollection,
          bank: f.bankTotal,
          apps: f.appsTotal,
          petty: f.pettyCash,
          purchases: f.purchases,
          totalSales: salesOnly,
          actualSales: f.actualSales,
          notes: f.notes || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=reports.xlsx"
      );
      return res.send(buffer);
    }

    if (format === "pdf") {
      const doc = new PDFDocument();
      const filePath = path.join(__dirname, "../uploads/reports.pdf");
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(18).text("Reports Summary", { align: "center" }).moveDown();

      forms.forEach((f, idx) => {
        const salesOnly =
          (f.totalSales || 0) - (f.pettyCash || 0) - (f.purchases || 0);

        doc
          .fontSize(12)
          .text(
            `${idx + 1}) User: ${f.user.name}, Branch: ${
              f.branch.name
            }, Date: ${f.formDate
              .toISOString()
              .split("T")[0]}, Cash: ${f.cashCollection}, Bank: ${
              f.bankTotal
            }, Apps: ${f.appsTotal}, Total: ${salesOnly}, Actual: ${
              f.actualSales
            }, Notes: ${f.notes || "-"}`
          );
      });

      doc.end();
      stream.on("finish", () => {
        res.download(filePath, "reports.pdf", () => {
          fs.unlinkSync(filePath);
        });
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getReports };
