// src/pages/AccountantDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { LogOut, Filter, Search, CheckCircle2, XCircle, Clock3, FileText } from "lucide-react";

// ===== Chart.js setup =====
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
import { Pie, Bar, Line } from "react-chartjs-2";
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, ChartTooltip, ChartLegend, LineElement, PointElement, Filler);

export default function AccountantDashboard() {
  // ================= 1) API =================
  const token = localStorage.getItem("token");
  const api = useMemo(
    () =>
      axios.create({
        baseURL: "http://localhost:5000",
        headers: { Authorization: `Bearer ${token}` },
      }),
    [token]
  );
  const API_BASE = api.defaults.baseURL?.replace(/\/+$/, "") || "";

  // ================= 2) حالات عامة =================
  const [branches, setBranches] = useState([]);
  const [forms, setForms] = useState([]);        // البيانات المعروضة في الجدول (حسب الفلاتر)
  const [formsAll, setFormsAll] = useState([]);  // بيانات الكروت (كل الحالات)
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ================= 3) فلاتر (افتراضي: كل الحالات) =================
  const [filters, setFilters] = useState({
    branchId: "",
    startDate: "",
    endDate: "",
    status: "", // عرض كل الحالات افتراضيًا في الجدول لو فضّلت كده
    q: "",
  });

  // ================= 4) مودال التفاصيل =================
  const [selectedForm, setSelectedForm] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attLoading, setAttLoading] = useState(false);

  // ================= 5) دوال مساعدة =================
  const formatDateOnly = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString() : "-");
  const currency = (n) => Number(n || 0).toLocaleString();

  const sumApps = (f) => (f?.applications || []).reduce((s, a) => s + Number(a?.amount || 0), 0);
  const sumBank = (f) => (f?.bankCollections || []).reduce((s, b) => s + Number(b?.amount || 0), 0);

  const appsWithFallback = (f) => {
    const calc = sumApps(f);
    return calc > 0 ? calc : Number(f?.appsTotal || f?.appsCollection || 0);
  };

  const bankWithFallback = (f) => {
    const calc = sumBank(f);
    return calc > 0 ? calc : Number(f?.bankTotal || 0);
  };

  const rowTotal = (f) => Number(f?.cashCollection || 0) + appsWithFallback(f) + bankWithFallback(f);

  // ================= Navbar =================
  const meName = localStorage.getItem("userName") || "محاسب";
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // ================= 6) جلب الفروع =================
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/branches");
        setBranches(res.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [api]);

  // ================= 7) جلب التقارير (جدول + كروت) =================
  const fetchForms = async () => {
    setLoading(true);
    setErrorMsg("");

    // نبني بارامز مشتركة (من غير status) عشان الكروت
    const baseParams = {};
    if (filters.branchId) baseParams.branchId = filters.branchId;
    if (filters.startDate) baseParams.startDate = filters.startDate;
    if (filters.endDate) baseParams.endDate = filters.endDate;
    if (filters.q) baseParams.q = filters.q;

    // بارامز الجدول (تتضمن الحالة لو موجودة)
    const tableParams = { ...baseParams };
    if (filters.status) tableParams.status = filters.status;

    try {
      // نداء للجدول
      const tableReq = api.get("/api/forms/review", { params: tableParams });

      // نداء للكروت:
      // لو عايزين "كل الحالات" مهما كان فلتر الحالة، نجيب الثلاث حالات ونجمعهم
      const cardReqs = ["pending", "released", "rejected"].map((s) =>
        api.get("/api/forms/review", { params: { ...baseParams, status: s } })
      );

      const [tableRes, ...cardsRes] = await Promise.all([tableReq, ...cardReqs]);

      setForms(tableRes.data || []);

      // دمج نتائج الكروت من الثلاث حالات
// دمج نتائج الكروت من الثلاث حالات + إزالة التكرار
const mergedForCards = cardsRes.flatMap((r) => r?.data || []);
const uniqueForms = Array.from(new Map(mergedForCards.map(f => [f._id, f])).values());
setFormsAll(uniqueForms);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.response?.data?.message || "تعذّر تحميل التقارير");
      setForms([]);
      setFormsAll([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= 8) تحميل أولي + عند تغيير الفلاتر =================
  useEffect(() => {
    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, filters.branchId, filters.startDate, filters.endDate, filters.status, filters.q]);

  // ================= 9) مرفقات =================
  const fetchAttachments = async (formId) => {
    setAttLoading(true);
    try {
      const res = await api.get(`/api/documents/${formId}`);
      setAttachments(res.data || []);
    } catch (e) {
      console.error(e);
      setAttachments([]);
    } finally {
      setAttLoading(false);
    }
  };

  // ================= 10) فتح تفاصيل =================
  const openDetails = (f) => {
    setSelectedForm(f);
    fetchAttachments(f._id);
  };

  // ================= 11) مراجعة =================
  const onRelease = async (f) => {
    if (!window.confirm("تأكيد عمل Release للتقرير؟")) return;
    try {
      const res = await api.patch(`/api/forms/${f._id}/release`);
      alert("تم عمل Release بنجاح");
      fetchForms();
      if (selectedForm && selectedForm._id === f._id) setSelectedForm(res.data?.form || res.data);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "فشل عمل Release");
    }
  };

  const onReject = async (f) => {
    if (!window.confirm("تأكيد عمل Reject للتقرير؟")) return;
    try {
      const res = await api.patch(`/api/forms/${f._id}/reject`);
      alert("تم رفض التقرير");
      fetchForms();
      if (selectedForm && selectedForm._id === f._id) setSelectedForm(res.data?.form || res.data);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "فشل الرفض");
    }
  };

  // ================= 12) كروت العدادات (من formsAll) =================
  const counts = useMemo(() => {
    const c = { total: formsAll.length, pending: 0, released: 0, rejected: 0 };
    for (const f of formsAll) {
      if (f.status === "released") c.released++;
      else if (f.status === "rejected") c.rejected++;
      else c.pending++;
    }
    return c;
  }, [formsAll]);

  // ================= 13) إجماليات الجدول المعروض =================
  const totals = useMemo(() => {
    return forms.reduce(
      (acc, f) => {
        const cash = Number(f?.cashCollection || 0);
        const apps = appsWithFallback(f);
        const bank = bankWithFallback(f);
        acc.cash += cash;
        acc.apps += apps;
        acc.bank += bank;
        acc.totalSales += cash + apps + bank;
        return acc;
      },
      { cash: 0, apps: 0, bank: 0, totalSales: 0 }
    );
  }, [forms]);

  // ================= 14) رسوم (حسب البيانات المعروضة في الجدول) =================
  const statusPie = {
    labels: ["Pending", "Released", "Rejected"],
    datasets: [
      {
        data: [
          forms.filter((f) => f.status !== "released" && f.status !== "rejected").length,
          forms.filter((f) => f.status === "released").length,
          forms.filter((f) => f.status === "rejected").length,
        ],
        backgroundColor: ["#f59e0b", "#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const perBranch = useMemo(() => {
    const map = new Map();
    for (const f of forms) {
      const n = f.branch?.name || "غير محدد";
      map.set(n, (map.get(n) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, cnt]) => ({ name, cnt }));
  }, [forms]);

  const perBranchBar = {
    labels: perBranch.map((x) => x.name),
    datasets: [{ label: "تقارير", data: perBranch.map((x) => x.cnt), backgroundColor: "#3b82f6", borderRadius: 8 }],
  };

  const perDay = useMemo(() => {
    const map = new Map();
    for (const f of forms) {
      const d = new Date(f.formDate);
      if (isNaN(d)) continue;
      const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, cnt]) => ({ date, cnt }));
  }, [forms]);

  const perDayLine = {
    labels: perDay.map((x) => x.date),
    datasets: [
      { label: "عدد التقارير/يوم", data: perDay.map((x) => x.cnt), fill: true, borderColor: "#8b5cf6", backgroundColor: "rgba(139,92,246,.20)", tension: 0.35 },
    ],
  };

  const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 shadow-lg" />
            <div>
              <p className="text-xs text-gray-500">لوحة المحاسب</p>
              <h1 className="text-lg font-bold tracking-tight">مراجعة تقارير الفروع</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-600">مرحباً، <b>{meName}</b></span>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition shadow">
              <LogOut size={16} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* كروت سريعة (من formsAll = كل الحالات) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<FileText className="opacity-80" />} title="إجمالي المعروض" value={counts.total} tint="from-sky-500 to-indigo-500" />
          <StatCard icon={<Clock3 className="opacity-80" />} title="Pending" value={counts.pending} tint="from-amber-500 to-orange-500" />
          <StatCard icon={<CheckCircle2 className="opacity-80" />} title="Released" value={counts.released} tint="from-emerald-500 to-teal-500" />
          <StatCard icon={<XCircle className="opacity-80" />} title="Rejected" value={counts.rejected} tint="from-rose-500 to-pink-500" />
        </section>

        {/* فلاتر */}
        <section className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4 mb-8">
          <div className="flex items-center gap-2 mb-3 text-gray-600"><Filter size={16} /><b>فلاتر البحث</b></div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                className="outline-none w-full text-sm"
                placeholder="بحث بالكلمات (ملاحظات/مستخدم/فرع)…"
              />
            </div>

            <select
              value={filters.branchId}
              onChange={(e) => setFilters((p) => ({ ...p, branchId: e.target.value }))}
              className="border rounded-xl px-3 py-2 bg-white text-sm"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="border rounded-xl px-3 py-2 bg-white text_sm"
            >
              <option value="">كل الحالات</option>
              <option value="pending">Pending</option>
              <option value="released">Released</option>
              <option value="rejected">Rejected</option>
            </select>

            <input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
            <input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm" />

            <div className="md:col-span-6 flex justify-end">
              <button onClick={fetchForms} className="bg-gray-900 text-white px-4 py-2 rounded-xl hover:opacity-95">تحديث</button>
            </div>
          </div>

          {errorMsg && <div className="mt-3 text-red-600">{errorMsg}</div>}
        </section>

        {/* إجماليات النتائج المعروضة (حسب الجدول فقط) */}
        <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4 mb-8">
          <h3 className="text-md font-semibold mb-3">إجماليات النتائج المعروضة</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <MiniTotal title="نقدي" value={currency(totals.cash)} />
            <MiniTotal title="تطبيقات" value={currency(totals.apps)} />
            <MiniTotal title="البنك" value={currency(totals.bank)} />
            <MiniTotal title="إجمالي المبيعات" value={currency(totals.totalSales)} />
          </div>
        </section>

        {/* شبكة الرسوم (حسب الجدول) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
            <h3 className="font-semibold mb-3">حالة التقارير</h3>
            <div className="h-64"><Pie data={statusPie} options={commonOptions} /></div>
          </div>
          <div className="col-span-1 bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
            <h3 className="font-semibold mb-3">عدد التقارير لكل فرع</h3>
            <div className="h-64"><Bar data={perBranchBar} options={{ ...commonOptions, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
          </div>
          <div className="col-span-1 bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
            <h3 className="font-semibold mb-3">عدد التقارير باليوم</h3>
            <div className="h-64"><Line data={perDayLine} options={{ ...commonOptions, elements: { line: { tension: 0.35 } } }} /></div>
          </div>
        </section>

        {/* جدول التقارير */}
        <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">التاريخ</th>
                  <th className="p-2 border">الفرع</th>
                  <th className="p-2 border">المستخدم</th>
                  <th className="p-2 border">نقدي</th>
                  <th className="p-2 border">تطبيقات</th>
                  <th className="p-2 border">بنك</th>
                  <th className="p-2 border">إجمالي</th>
                  <th className="p-2 border">الحالة</th>
                  <th className="p-2 border">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-4 text-center">جاري التحميل…</td></tr>
                ) : forms.length ? (
                  forms.map((f) => (
                    <tr key={f._id} className="text-center">
                      <td className="p-2 border">{formatDateOnly(f.formDate)}</td>
                      <td className="p-2 border">{f.branch?.name || "-"}</td>
                      <td className="p-2 border">{f.user?.name || "-"}</td>

                      <td className="p-2 border">{currency(f.cashCollection)}</td>
                      <td className="p-2 border">{currency(appsWithFallback(f))}</td>
                      <td className="p-2 border">{currency(bankWithFallback(f))}</td>

                      <td className="p-2 border">{currency(rowTotal(f))}</td>

                      <td className="p-2 border">
                        {f.status === "released" ? "Released" : f.status === "rejected" ? "Rejected" : "Pending"}
                      </td>
                      <td className="p-2 border space-y-1">
                        <button onClick={() => openDetails(f)} className="w-full px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">تفاصيل</button>
                        {f.status !== "released" && (
                          <button onClick={() => onRelease(f)} className="w-full px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700">Release</button>
                        )}
                        {f.status !== "rejected" && (
                          <button onClick={() => onReject(f)} className="w-full px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700">Reject</button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-500">لا توجد تقارير</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* مودال التفاصيل */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl">
            {/* Header: العنوان + زر إغلاق */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                تفاصيل تقرير {selectedForm.branch?.name || "-"} — {formatDateOnly(selectedForm.formDate)}
              </h3>
              <button
                onClick={() => setSelectedForm(null)}
                className="border px-3 py-1 rounded-xl hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <MiniBox label="العهدة" value={currency(selectedForm.pettyCash)} />
              <MiniBox label="المشتريات" value={currency(selectedForm.purchases)} />
              <MiniBox label="التحصيل النقدي" value={currency(selectedForm.cashCollection)} />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="border rounded-xl p-3 bg-white/70">
                <div className="font-semibold mb-2">التطبيقات</div>
                {selectedForm.applications?.length ? (
                  <ul className="space-y-1">
                    {selectedForm.applications.map((a, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{a.name}</span>
                        <span className="font-semibold">{currency(a.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">لا يوجد</div>
                )}
                <div className="text-right mt-2 font-bold">
                  الإجمالي: {currency(sumApps(selectedForm) || Number(selectedForm?.appsTotal || selectedForm?.appsCollection || 0))}
                </div>
              </div>

              <div className="border rounded-xl p-3 bg-white/70">
                <div className="font-semibold mb-2">تحصيلات البنك</div>
                {selectedForm.bankCollections?.length ? (
                  <ul className="space-y-1">
                    {selectedForm.bankCollections.map((b, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{b.name}</span>
                        <span className="font-semibold">{currency(b.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">لا يوجد</div>
                )}
                <div className="text-right mt-2 font-bold">
                  الإجمالي: {currency(sumBank(selectedForm) || Number(selectedForm?.bankTotal || 0))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="border rounded-xl p-3 bg-white/70">
                <div className="text-gray-500 mb-1">المبيعات الفعلية</div>
                <div className="font-bold">
                  {currency(Number(selectedForm?.cashCollection || 0) + appsWithFallback(selectedForm) + bankWithFallback(selectedForm))}
                </div>
              </div>
              <div className="border rounded-xl p-3 bg-white/70">
                <div className="text-gray-500 mb-1">الملاحظات</div>
                <div className="whitespace-pre-wrap">{selectedForm.notes || "-"}</div>
              </div>
            </div>

            <div className="border rounded-xl p-3 bg-white/70">
              <div className="font-semibold mb-2">المرفقات</div>
              {attLoading ? (
                <div>جاري التحميل…</div>
              ) : attachments?.length ? (
                <ul className="space-y-1">
                  {attachments.map((att) => {
                    const cleanPath = String(att.fileUrl || "").replace(/\\\\/g, "/");
                    const fileName = cleanPath.split("/").pop();
                    const href = `${API_BASE}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
                    return (
                      <li key={att._id} className="flex justify-between">
                        <span>{fileName}</span>
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">فتح</a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">لا يوجد مرفقات</div>
              )}
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              {selectedForm.status !== "released" && (
                <button onClick={() => onRelease(selectedForm)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">Release</button>
              )}
              {selectedForm.status !== "rejected" && (
                <button onClick={() => onReject(selectedForm)} className="px-3 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700">Reject</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========= مكوّنات صغيرة =========
function StatCard({ icon, title, value, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className={`absolute -top-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${tint} opacity-20`} />
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

function MiniTotal({ title, value }) {
  return (
    <div>
      <div className="text-gray-500">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function MiniBox({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="text-gray-500">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
