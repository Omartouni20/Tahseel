// src/pages/UserDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { LogOut, FilePlus2, TrendingUp, Banknote, Wallet, Search } from "lucide-react";

// ===== Chart.js (stable) =====
import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, ChartTooltip, ChartLegend, LineElement, PointElement, Filler);

export default function UserDashboard() {
  // ---------------- الفروع والفورمز ----------------
  const [branches, setBranches] = useState([]);
  const [forms, setForms] = useState([]);
  const [files, setFiles] = useState({});
  const [showForms, setShowForms] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState(null);

  // ---------------- القوالب من الأدمن ----------------
  const [appTemplates, setAppTemplates] = useState([]);
  const [bankTemplates, setBankTemplates] = useState([]);

  // ---------------- اختيارات اليوزر ----------------
  const [applications, setApplications] = useState([]);
  const [bankCollections, setBankCollections] = useState([]);

  // ---------------- بيانات الفورم ----------------
  const [formData, setFormData] = useState({
    formDate: new Date().toISOString().split("T")[0],
    branch: "",
    pettyCash: 0,
    purchases: 0,
    cashCollection: 0,
    actualSales: 0,
    notes: "",
  });

  // ---------------- إعدادات API ----------------
  const token = localStorage.getItem("token");
  const api = axios.create({
baseURL: process.env.REACT_APP_API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  // ---------------- Navbar ----------------
  const meName = localStorage.getItem("userName") || "مستخدم";
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // ---------------- جلب الفروع ----------------
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/users/me/branches");
        setBranches(res.data || []);
      } catch (err) {
        console.error("❌ Error fetching branches", err?.response || err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------------- جلب القوالب من الأدمن ----------------
  useEffect(() => {
    (async () => {
      try {
        const [appsRes, bankRes] = await Promise.all([
          api.get("/api/report-templates?group=applications"),
          api.get("/api/report-templates?group=bank"),
        ]);
        const apps = (appsRes.data || []).filter((t) => t.isActive);
        const banks = (bankRes.data || []).filter((t) => t.isActive);
        setAppTemplates(apps);
        setBankTemplates(banks);
        setApplications([]);
        setBankCollections([]);
      } catch (e) {
        console.error("❌ Error fetching templates:", e?.response || e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------------- الإجماليات لايف ----------------
  const appsTotal = useMemo(
    () => applications.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [applications]
  );
  const bankTotal = useMemo(
    () => bankCollections.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [bankCollections]
  );
  const totalSalesLive = useMemo(
    () =>
      (Number(formData.cashCollection) || 0) +
      appsTotal +
      bankTotal,
    [formData.cashCollection, appsTotal, bankTotal]
  );

  // ---------------- إرسال الفورم ----------------
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const appsPayload = applications
      .filter((x) => x.templateId && Number(x.amount) > 0)
      .map((x) => ({ template: x.templateId, name: x.name, amount: Number(x.amount) }));

    const bankPayload = bankCollections
      .filter((x) => x.templateId && Number(x.amount) > 0)
      .map((x) => ({ template: x.templateId, name: x.name, amount: Number(x.amount) }));

    const payload = {
      ...formData,
      formDate: new Date(formData.formDate),
      applications: appsPayload,
      bankCollections: bankPayload,
      appsCollection: appsTotal,
      // ❌ شيل bankMada و bankVisa عشان ما يضيفوش مرتين
    };

    console.log("📤 Payload to API:", payload);

    const res = await api.post("/api/forms", payload);
    console.log("✅ Response from API:", res.data);

    // Reset form بعد الحفظ
    setForms((prev) => [...prev, res.data]);
    setFormData((d) => ({
      ...d,
      pettyCash: 0,
      purchases: 0,
      cashCollection: 0,
      actualSales: 0,
      notes: "",
    }));
    setApplications([]);
    setBankCollections([]);
    setFiles({});
  } catch (err) {
    console.error("❌ Error creating form:", err?.response || err);
    alert(err?.response?.data?.message || "حصل خطأ أثناء إنشاء الفورم");
  }
};

  // ---------------- جلب الفورمز الخاصة باليوزر ----------------
  const fetchMyForms = async () => {
    try {
      const res = await api.get("/api/forms/me");
      setForms(res.data || []);
    } catch (err) {
      console.error("❌ Error fetching forms", err?.response || err);
    }
  };
  useEffect(() => {
    fetchMyForms();
    // eslint-disable-next-line
  }, [token]);

  // ---------------- المرفقات ----------------
  const fetchAttachments = async (formId) => {
    try {
      const res = await api.get(`/api/documents/${formId}`);
      setSelectedAttachments(res.data || []);
    } catch (err) {
      console.error("❌ Error fetching attachments:", err?.response || err);
    }
  };

  // ---------------- إجمالي المبيعات اليومية ----------------
  const totalDailySales = forms.reduce(
    (sum, f) =>
      sum +
      ((f.cashCollection || 0) +
        (f.bankTotal || 0) +
        (f.appsCollection || 0)),
    0
  );

  // حسابات بسيطة للرسم
  const counts = useMemo(() => {
    const c = { total: forms.length, pending: 0, released: 0, rejected: 0 };
    for (const f of forms) {
      if (f.status === "released") c.released++;
      else if (f.status === "rejected") c.rejected++;
      else c.pending++;
    }
    return c;
  }, [forms]);

  const statusPie = {
    labels: ["Pending", "Released", "Rejected"],
    datasets: [
      {
        data: [counts.pending, counts.released, counts.rejected],
        backgroundColor: ["#f59e0b", "#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const perDay = useMemo(() => {
    const map = new Map();
    for (const f of forms) {
      const d = new Date(f.formDate);
      const k = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
      )
        .toISOString()
        .slice(0, 10);
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, cnt]) => ({ date, cnt }));
  }, [forms]);

  const perDayLine = {
    labels: perDay.map((x) => x.date),
    datasets: [
      {
        label: "عدد التقارير/يوم",
        data: perDay.map((x) => x.cnt),
        fill: true,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,.20)",
        tension: 0.35,
      },
    ],
  };
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  // ---------------- البحث ----------------
  const [q, setQ] = useState("");
  const filteredForms = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return forms;
    return forms.filter(
      (f) =>
        (f.branch?.name || "").toLowerCase().includes(t) ||
        (f.user?.name || "").toLowerCase().includes(t) ||
        (f.notes || "").toLowerCase().includes(t)
    );
  }, [forms, q]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 shadow-lg" />
            <div>
              <p className="text-xs text-gray-500">لوحة المستخدم</p>
              <h1 className="text-lg font-bold tracking-tight">
                إنشاء تقرير يومي
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-600">
              مرحباً، <b>{meName}</b>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition shadow"
            >
              <LogOut size={16} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* كروت علوية */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<FilePlus2 className="opacity-80" />}
            title="إنشاء جديد"
            value="Form"
            tint="from-indigo-500 to-sky-500"
          />
          <StatCard
            icon={<Wallet className="opacity-80" />}
            title="إجمالي التطبيقات (لايف)"
            value={appsTotal.toLocaleString()}
            tint="from-emerald-500 to-teal-500"
          />
          <StatCard
            icon={<Banknote className="opacity-80" />}
            title="إجمالي البنك (لايف)"
            value={bankTotal.toLocaleString()}
            tint="from-amber-500 to-orange-500"
          />
          <StatCard
            icon={<TrendingUp className="opacity-80" />}
            title="إجمالي المبيعات (لايف)"
            value={totalSalesLive.toLocaleString()}
            tint="from-rose-500 to-pink-500"
          />
        </section>

        {/* الفورم */}
        <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">إنشاء فورم جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* التاريخ + الفرع */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={formData.formDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      formDate: e.target.value,
                    })
                  }
                  className="border p-2 rounded-xl w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  الفرع
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      branch: e.target.value,
                    })
                  }
                  className="border p-2 rounded-xl w-full"
                >
                  <option value="">-- اختر الفرع --</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* العهدة + المشتريات + التحصيل النقدي */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UploadBox
                label="العهدة"
                value={formData.pettyCash}
                onChange={(v) =>
                  setFormData({ ...formData, pettyCash: Number(v) })
                }
                fileKey="petty"
                setFiles={setFiles}
              />
              <UploadBox
                label="المشتريات"
                value={formData.purchases}
                onChange={(v) =>
                  setFormData({ ...formData, purchases: Number(v) })
                }
                fileKey="purchase"
                setFiles={setFiles}
              />
              <UploadBox
                label="التحصيل النقدي"
                value={formData.cashCollection}
                onChange={(v) =>
                  setFormData({
                    ...formData,
                    cashCollection: Number(v),
                  })
                }
                fileKey="cash"
                setFiles={setFiles}
              />
            </div>

            {/* التطبيقات */}
            <DynamicRows
              title="التطبيقات"
              rows={applications}
              setRows={setApplications}
              templates={appTemplates}
              addLabel="+ إضافة تطبيق"
              totalLabel={`إجمالي التطبيقات: ${appsTotal.toLocaleString()}`}
            />

            {/* طرق البنك */}
            <DynamicRows
              title="تحصيلات البنك"
              rows={bankCollections}
              setRows={setBankCollections}
              templates={bankTemplates}
              addLabel="+ إضافة طريقة بنك"
              totalLabel={`إجمالي البنك: ${bankTotal.toLocaleString()}`}
            />

            {/* المبيعات الفعلية + الملاحظات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  المبيعات الفعلية
                </label>
                <input
                  type="number"
                  value={formData.actualSales}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actualSales: Number(e.target.value),
                    })
                  }
                  className="border p-2 rounded-xl w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notes: e.target.value,
                    })
                  }
                  className="border p-2 rounded-xl w-full"
                  rows={1}
                  placeholder="اكتب أي ملاحظة لليوم"
                />
              </div>
            </div>

            {/* الإجمالي لايف */}
            <div className="p-3 bg-blue-50 rounded-xl text-right font-bold">
              إجمالي المبيعات (لايف):{" "}
              {totalSalesLive.toLocaleString()}
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-2 rounded-xl hover:opacity-95"
            >
              إضافة فورم
            </button>
          </form>
        </section>

        {/* شارتات سريعة */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
            <h3 className="font-semibold mb-3">حالة تقاريري</h3>
            <div className="h-64">
              <Pie data={statusPie} options={commonOptions} />
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
            <h3 className="font-semibold mb-3">عدد التقارير باليوم</h3>
            <div className="h-64">
              <Line
                data={perDayLine}
                options={{ ...commonOptions, elements: { line: { tension: 0.35 } } }}
              />
            </div>
          </div>
        </section>

        {/* عرض/إخفاء الفورمز */}
        <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-md font-semibold">الفورمز الخاصة بي</h2>
            <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="outline-none w-full text-sm"
                placeholder="بحث بالفرع/المستخدم/ملاحظات…"
              />
            </div>
          </div>

          <button
            onClick={() => setShowForms(!showForms)}
            className="mb-3 w-full bg-gray-900 text-white py-2 rounded-xl hover:opacity-95"
          >
            {showForms ? "إخفاء الفورمز" : "عرض الفورمز الخاصة بي"}
          </button>

          {showForms && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">التاريخ</th>
                      <th className="p-2 border">الفرع</th>
                      <th className="p-2 border">المستخدم</th>
                      <th className="p-2 border">العهدة</th>
                      <th className="p-2 border">المشتريات</th>
                      <th className="p-2 border">إجمالي المبيعات</th>
                      <th className="p-2 border">الملاحظات</th>
                      <th className="p-2 border">المرفقات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForms.map((f) => (
                      <tr key={f._id} className="text-center">
                        <td className="p-2 border">
                          {f.formDate
                            ? new Date(f.formDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-2 border">{f.branch?.name || "-"}</td>
                        <td className="p-2 border">{f.user?.name || "-"}</td>
                        <td className="p-2 border">{f.pettyCash}</td>
                        <td className="p-2 border">{f.purchases}</td>
                        <td className="p-2 border">
                          {(f.cashCollection || 0) +
                            (f.bankTotal || 0) +
                            (f.appsCollection || 0)}
                        </td>
                        <td className="p-2 border">{f.notes || "-"}</td>
                        <td className="p-2 border">
                          <button
                            onClick={() => fetchAttachments(f._id)}
                            className="bg-sky-600 text-white px-3 py-1 rounded-xl hover:bg-sky-700 text-sm"
                          >
                            عرض
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-emerald-50 rounded-xl font-bold text-right">
                ملخص التقارير (إجمالي المبيعات):{" "}
                {totalDailySales.toLocaleString()}
              </div>
            </>
          )}
        </section>

{/* Modal المرفقات */}
{selectedAttachments && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white p-6 rounded-2xl w-full max-w-md relative shadow-2xl">
      <h3 className="text-lg font-bold mb-4">المرفقات</h3>
      {selectedAttachments.length > 0 ? (
        <ul className="space-y-2">
          {selectedAttachments.map((att) => (
            <li
              key={att._id}
              className="flex justify-between items-center border-b pb-2"
            >
              <span>{att.fileUrl.split("/").pop()}</span>
              <a
                href={`${process.env.REACT_APP_API_URL}${att.fileUrl.replace(
                  /\\\\/g,
                  "/"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                فتح
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">لا يوجد مرفقات</p>
      )}
      <button
        onClick={() => setSelectedAttachments(null)}
        className="mt-4 w-full bg-gray-900 text-white py-2 rounded-xl hover:opacity-95"
      >
        إغلاق
      </button>
    </div>
  </div>
)}

      </main>
    </div>
  );
}

// ========= مكوّنات صغيرة =========
function StatCard({ icon, title, value, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div
        className={`absolute -top-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${tint} opacity-20`}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <h4 className="text-2xl font-extrabold tracking-tight">{value}</h4>
        </div>
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-900 text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

function UploadBox({ label, value, onChange, fileKey, setFiles }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border p-2 rounded-xl w-full"
      />
      <input
        type="file"
        className="mt-2"
        onChange={(e) =>
          setFiles((p) => ({ ...p, [fileKey]: e.target.files[0] }))
        }
      />
    </div>
  );
}

function DynamicRows({ title, rows, setRows, templates, addLabel, totalLabel }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{title}</label>
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2">
          <select
            value={row.templateId}
            onChange={(e) => {
              const next = [...rows];
              next[idx].templateId = e.target.value;
              next[idx].name =
                templates.find((t) => t._id === e.target.value)?.name || "";
              setRows(next);
            }}
            className="border p-2 rounded-xl w-48"
          >
            <option value="">-- اختر --</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={row.amount}
            onChange={(e) => {
              const next = [...rows];
              next[idx].amount = Number(e.target.value) || 0;
              setRows(next);
            }}
            className="border p-2 rounded-xl flex-1"
            placeholder="المبلغ"
          />
          <button
            type="button"
            onClick={() => setRows(rows.filter((_, i) => i !== idx))}
            className="px-3 py-2 text-sm border rounded-xl"
          >
            حذف
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRows([...rows, { templateId: "", name: "", amount: 0 }])
        }
        className="mt-2 bg-emerald-600 text-white px-3 py-1 rounded-xl text-sm"
      >
        {addLabel}
      </button>
      <div className="mt-2 text-right font-semibold">{totalLabel}</div>
    </div>
  );
}
