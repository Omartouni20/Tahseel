// src/pages/AdminDashboard.jsx — نسخة كاملة مع لوجز تشخيص + بدون تجميعات في تقارير الإدمن
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useApi } from "../hooks/useApi";
import {
  LayoutDashboard, Receipt, Users as UsersIcon, Building2, Layers3, LogOut,
  Filter, Search, CheckCircle2, XCircle, Clock3, FileText, Pencil, Trash2, Plus, Download
} from "lucide-react";

// ===== Chart.js setup =====
import {
  Chart, ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip as ChartTooltip, Legend as ChartLegend, LineElement, PointElement, Filler,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";

// ===== توستات جميلة =====
import { Toaster, toast } from "react-hot-toast";

Chart.register(
  ArcElement, BarElement, CategoryScale, LinearScale,
  ChartTooltip, ChartLegend, LineElement, PointElement, Filler
);

// ===== Helpers عامة (apps/bank sums المُعلنة) =====
const sumApps = (f) => (f?.applications || []).reduce((s, a) => s + Number(a?.amount || 0), 0);
const sumBank = (f) => (f?.bankCollections || []).reduce((s, b) => s + Number(b?.amount || 0), 0);
const appsWithFallback = (f) => { const calc = sumApps(f); return calc > 0 ? calc : Number(f?.appsTotal || f?.appsCollection || 0); };
const bankWithFallback = (f) => { const calc = sumBank(f); return calc > 0 ? calc : Number(f?.bankTotal || 0); };
const rowTotal = (f) => Number(f?.cashCollection || 0) + appsWithFallback(f) + bankWithFallback(f);
const currency = (n) => Number(n || 0).toLocaleString();
const formatDateOnly = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString() : "-");

// ==== Received-only helpers (بدون أي fallback) ====
const getReceived = (f) => ({
  cash: Number(f?.received?.cash ?? f?.receivedCash ?? 0),
  apps: Number(f?.received?.apps ?? f?.receivedApps ?? 0),
  bank: Number(f?.received?.bank ?? f?.receivedBank ?? 0),
});
const recTotal = (f) => { const r = getReceived(f); return r.cash + r.apps + r.bank; };

// =================== MAIN ===================
export default function AdminDashboard() {
  // ميتاداتا سريعة (مافيهاش api)
  console.log("[ROLE]", localStorage.getItem("role"));
  console.log("[TOKEN?]", !!localStorage.getItem("token"));
  console.log("[API_URL]", import.meta.env?.VITE_API_URL || "http://localhost:5000");

  // API
// API (via hook)
const api = useApi();


  // Interceptors + لوجز على كل ريكويست/ريسبونس
  useEffect(() => {
    const reqId = () => Math.random().toString(36).slice(2,7);

    const onReq = (config) => {
      const id = reqId();
      config.headers["X-Debug-ReqId"] = id;
      console.log("[API→] Req", id, config.method?.toUpperCase(), config.url, { params: config.params, data: config.data });
      return config;
    };
    const onReqErr = (error) => { console.log("[API→] ReqError", error?.message, error); return Promise.reject(error); };

    const onRes = (response) => {
      const id = response.config.headers["X-Debug-ReqId"];
      console.log("[API←] Res", id, response.config.url, { status: response.status, count: Array.isArray(response.data)? response.data.length : null, data: response.data });
      return response;
    };
    const onResErr = (error) => {
      const cfg = error?.config || {};
      console.log("[API←] ResError", cfg.url, error?.response?.status, error?.response?.data || error?.message);
      return Promise.reject(error);
    };

    const i1 = api.interceptors.request.use(onReq, onReqErr);
    const i2 = api.interceptors.response.use(onRes, onResErr);
    return () => { api.interceptors.request.eject(i1); api.interceptors.response.eject(i2); };
  }, [api]);

  // role helper
  const isAdmin = (localStorage.getItem("role") || "") === "Admin";

  // Tabs
  const [tab, setTab] = useState("dashboard"); // dashboard | receipts | users | branches | templates | adminReports

  // Navbar meta
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("role"); window.location.href = "/login"; };
  const meName = localStorage.getItem("userName") || "مشرف";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50">
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />

      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 shadow-lg" />
            <div>
              <p className="text-xs text-gray-500">لوحة التحكم</p>
              <h1 className="text-lg font-bold tracking-tight">الإدارة</h1>
            </div>
          </div>

          {/* Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <NavBtn icon={<LayoutDashboard size={16} />} label="لوحة التحكم" active={tab==="dashboard"} onClick={()=>setTab("dashboard")} />
            <NavBtn icon={<Receipt size={16} />} label="تقارير المحاسب" active={tab==="receipts"} onClick={()=>setTab("receipts")} />
            <NavBtn icon={<UsersIcon size={16} />} label="المستخدمون" active={tab==="users"} onClick={()=>setTab("users")} />
            <NavBtn icon={<Building2 size={16} />} label="الفروع" active={tab==="branches"} onClick={()=>setTab("branches")} />
            <NavBtn icon={<Layers3 size={16} />} label="القوالب" active={tab==="templates"} onClick={()=>setTab("templates")} />
            <NavBtn icon={<FileText size={16} />} label="تقارير الإدمن" active={tab==="adminReports"} onClick={()=>setTab("adminReports")} />
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-600">مرحباً، <b>{meName}</b></span>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition shadow">
              <LogOut size={16} /><span>تسجيل خروج</span>
            </button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden px-2 pb-2 flex gap-2 overflow-auto">
          <SmallNavBtn label="لوحة التحكم" active={tab==="dashboard"} onClick={()=>setTab("dashboard")} />
          <SmallNavBtn label="تحصيلات المحاسب" active={tab==="receipts"} onClick={()=>setTab("receipts")} />
          <SmallNavBtn label="المستخدمون" active={tab==="users"} onClick={()=>setTab("users")} />
          <SmallNavBtn label="الفروع" active={tab==="branches"} onClick={()=>setTab("branches")} />
          <SmallNavBtn label="القوالب" active={tab==="templates"} onClick={()=>setTab("templates")} />
          <SmallNavBtn label="تقارير الإدمن" active={tab==="adminReports"} onClick={()=>setTab("adminReports")} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === "dashboard" && <DashboardHome api={api} />}
        {tab === "receipts" && <AdminReceipts api={api} isAdmin={isAdmin} />}
        {tab === "users" && <UsersPage api={api} isAdmin={isAdmin} />}
        {tab === "branches" && <BranchesPage api={api} isAdmin={isAdmin} />}
        {tab === "templates" && <TemplatesPage api={api} isAdmin={isAdmin} />}
        {tab === "adminReports" && <AdminReports api={api} isAdmin={isAdmin} />}
      </main>
    </div>
  );
}

/* ---------------- Tabs Buttons ---------------- */
function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 transition ${active ? "bg-gray-900 text-white shadow" : "text-gray-700 hover:bg-gray-100"}`}>
      {icon}<span>{label}</span>
    </button>
  );
}
function SmallNavBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-xl text-xs transition whitespace-nowrap ${active ? "bg-gray-900 text-white shadow" : "text-gray-700 bg-white/70 border hover:bg-white"}`}>
      {label}
    </button>
  );
}

/* ---------------- Dashboard (Charts only) ---------------- */
function DashboardHome({ api }) {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [apps, setApps] = useState([]);
  const [banks, setBanks] = useState([]);

  useEffect(() => { (async () => {
    try {
      console.log("[Dashboard] fetching branches/users/templates");
      const [bRes, uRes, aRes, kRes] = await Promise.all([
        api.get("/api/branches"),
        api.get("/api/users"),
        api.get("/api/report-templates?group=applications"),
        api.get("/api/report-templates?group=bank"),
      ]);
      setBranches(bRes.data || []);
      setUsers(uRes.data || []);
      setApps(aRes.data || []);
      setBanks(kRes.data || []);
      console.log("[Dashboard] counts =>", { branches: bRes.data?.length, users: uRes.data?.length, apps: aRes.data?.length, banks: kRes.data?.length });
    } catch (e) { console.error("[Dashboard] error", e); }
  })(); }, [api]);

  const roleCounts = ["Admin", "Accountant", "User"].map((r) => ({ role: r, count: users.filter((u) => u.role === r).length }));
  const pieData = { labels: roleCounts.map((x) => x.role), datasets: [{ data: roleCounts.map((x) => x.count), backgroundColor: ["#ef4444", "#10b981", "#3b82f6"], borderWidth: 0 }] };
  const barData = { labels: branches.map((b) => b.name), datasets: [{ label: "مستخدمون", data: branches.map((b) => users.filter((u) => (u.assignedBranches || []).some((x)=> (x?._id||x)===b._id)).length), backgroundColor: "#3b82f6", borderRadius: 8 }] };
  const areaData = { labels: ["تطبيقات","بنك"], datasets: [ { label: "فعّالة", data: [apps.filter(x=>x.isActive).length, banks.filter(x=>x.isActive).length], fill: true, borderColor: "#10b981", backgroundColor: "rgba(16,185,129,.25)" }, { label: "معطّلة", data: [apps.filter(x=>!x.isActive).length, banks.filter(x=>!x.isActive).length], fill: true, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,.18)" } ] };
  const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } };

  return (
    <>
      {/* Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Layers3 className="opacity-80" />} title="طرق التطبيقات" value={apps.length} tint="from-rose-500 to-pink-500" />
        <StatCard icon={<Layers3 className="opacity-80" />} title="طرق البنك" value={banks.length} tint="from-emerald-500 to-teal-500" />
        <StatCard icon={<Building2 className="opacity-80" />} title="عدد الفروع" value={branches.length} tint="from-sky-500 to-indigo-500" />
        <StatCard icon={<UsersIcon className="opacity-80" />} title="عدد المستخدمين" value={users.length} tint="from-amber-500 to-red-500" />
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
          <h3 className="font-semibold mb-3">توزيع الأدوار</h3>
          <div className="h-64"><Pie data={pieData} options={commonOptions} /></div>
        </div>
        <div className="col-span-1 bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
          <h3 className="font-semibold mb-3">مستخدمون لكل فرع</h3>
          <div className="h-64"><Bar data={barData} options={{ ...commonOptions, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
        </div>
        <div className="col-span-1 bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
          <h3 className="font-semibold mb-3">نشاط القوالب</h3>
          <div className="h-64"><Line data={areaData} options={{ ...commonOptions, elements: { line: { tension: 0.35 } } }} /></div>
        </div>
      </section>
    </>
  );
}

function StatCard({ icon, title, value, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className={`absolute -top-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${tint} opacity-20`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <h4 className="text-2xl font-extrabold tracking-tight">{value}</h4>
        </div>
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-900 text-white">{icon}</div>
      </div>
    </div>
  );
}

/* ---------------- Receipts Page (Admin actions) ---------------- */
function AdminReceipts({ api, isAdmin }) {
  const [forms, setForms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [filters, setFilters] = useState({ branchId: "", startDate: "", endDate: "", q: "", adminStatus: "pending" });

  // modal
  const [activeForm, setActiveForm] = useState(null);
  const [note, setNote] = useState("");
  const [recvCash, setRecvCash] = useState("");
  const [recvApps, setRecvApps] = useState("");
  const [recvBank, setRecvBank] = useState("");
  const [actLoading, setActLoading] = useState(false);

  useEffect(() => { (async () => { try { const res = await api.get("/api/branches"); setBranches(res.data || []); } catch (e) { console.error(e); } })(); }, [api]);

  useEffect(()=>{ console.log("[Receipts] Filters changed:", filters); }, [filters]);

  const fetchForms = async () => {
    setLoading(true); setErrorMsg("");
    try {
      const params = { accountantStatus: "released" };
      if (filters.adminStatus) params.adminStatus = filters.adminStatus;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.q) params.q = filters.q;

      console.log("[Receipts] Fetch params =>", params);

      const res = await api.get("/api/forms/admin", { params });

      console.log("[Receipts] Result length:", Array.isArray(res.data) ? res.data.length : null);
      if (Array.isArray(res.data) && res.data.length) {
        console.log("[Receipts] First row sample:", res.data[0]);
      }

      setForms(res.data || []);
    } catch (e) {
      console.log("[Receipts] Error:", e?.response?.status, e?.response?.data || e?.message);
      setErrorMsg(e?.response?.data?.message || "تعذّر تحميل التقارير");
      setForms([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchForms(); }, [/* eslint-disable-line */ api, filters.branchId, filters.startDate, filters.endDate, filters.q, filters.adminStatus]);

  const counts = useMemo(() => { const c = { total: forms.length, pending: 0, released: 0, rejected: 0 }; for (const f of forms) { if (f.adminStatus === "released") c.released++; else if (f.adminStatus === "rejected") c.rejected++; else c.pending++; } return c; }, [forms]);
  const totals = useMemo(() => forms.reduce((acc, f) => { const cash = Number(f?.cashCollection || 0); const apps = appsWithFallback(f); const bank = bankWithFallback(f); acc.cash += cash; acc.apps += apps; acc.bank += bank; acc.total += cash + apps + bank; return acc; }, { cash: 0, apps: 0, bank: 0, total: 0 }), [forms]);

  // === استلام الإدمن مع Fallback ذكي لو الحقول فاضية
  const doAdminRelease = async () => {
    if (!activeForm) return; if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    setActLoading(true);
    try {
      const fallbackCash = Number(activeForm?.cashCollection ?? 0);
      const fallbackApps = Number(appsWithFallback(activeForm) ?? 0);
      const fallbackBank = Number(bankWithFallback(activeForm) ?? 0);

      const payload = {
        note: note?.trim() || "",
        receivedCash: recvCash === "" ? fallbackCash : Number(recvCash),
        receivedApps: recvApps === "" ? fallbackApps : Number(recvApps),
        receivedBank: recvBank === "" ? fallbackBank : Number(recvBank),
      };

      console.log("[Receipts] AdminRelease payload =>", payload, "for form", activeForm?._id);

      await api.patch(`/api/forms/${activeForm._id}/admin-release`, payload);
      setActiveForm(null); setNote(""); setRecvCash(""); setRecvApps(""); setRecvBank("");
      fetchForms();
      toast.success("تم الاستلام بنجاح ✨");
    } catch (e) { console.error("[Receipts] AdminRelease error:", e?.response?.data || e?.message); toast.error(e?.response?.data?.message || "فشل الاستلام"); }
    finally { setActLoading(false); }
  };

  const doAdminReject = async () => {
    if (!activeForm) return; if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    if (!window.confirm("تأكيد رفض التقرير؟")) return;
    setActLoading(true);
    try {
      console.log("[Receipts] AdminReject", { id: activeForm?._id, note });
      await api.patch(`/api/forms/${activeForm._id}/admin-reject`, { note: note?.trim() || "" });
      setActiveForm(null); setNote(""); setRecvCash(""); setRecvApps(""); setRecvBank("");
      fetchForms();
      toast.success("تم الرفض");
    } catch (e) { console.error("[Receipts] AdminReject error:", e?.response?.data || e?.message); toast.error(e?.response?.data?.message || "فشل الرفض"); }
    finally { setActLoading(false); }
  };

  return (
    <>
      {/* Filters */}
      <section className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-gray-600"><Filter size={16} /><b>فلاتر تحصيلات المحاسب</b></div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
            <Search size={16} className="text-gray-400" />
            <input value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} className="outline-none w-full text-sm" placeholder="بحث (ملاحظات/مستخدم/فرع)…" />
          </div>
          <select value={filters.branchId} onChange={(e) => setFilters((p)=>({ ...p, branchId: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm">
            <option value="">كل الفروع</option>
            {branches.map((b)=><option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <select value={filters.adminStatus} onChange={(e)=> setFilters((p)=>({ ...p, adminStatus: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm">
            <option value="pending">في انتظار الإدمن</option>
            <option value="released">تم استلامها</option>
            <option value="rejected">مرفوضة</option>
            <option value="">كل الحالات (إدمن)</option>
          </select>
          <input type="date" value={filters.startDate} onChange={(e)=> setFilters((p)=>({ ...p, startDate: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <input type="date" value={filters.endDate} onChange={(e)=> setFilters((p)=>({ ...p, endDate: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <div className="md:col-span-6 flex justify-end"><button onClick={fetchForms} className="bg-gray-900 text-white px-4 py-2 rounded-xl hover:opacity-95">تحديث</button></div>
        </div>
        {errorMsg && <div className="mt-3 text-red-600">{errorMsg}</div>}
      </section>

      {/* Counters */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<FileText />} label="إجمالي المعروض" value={counts.total} tint="from-sky-500 to-indigo-500" />
        <KpiCard icon={<Clock3 />} label="Pending (إدمن)" value={counts.pending} tint="from-amber-500 to-orange-500" />
        <KpiCard icon={<CheckCircle2 />} label="Released (إدمن)" value={counts.released} tint="from-emerald-500 to-teal-500" />
        <KpiCard icon={<XCircle />} label="Rejected (إدمن)" value={counts.rejected} tint="from-rose-500 to-pink-500" />
      </section>

      {/* Totals (المبلّغ — يخص شاشة التحصيلات فقط) */}
      <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4 mb-6">
        <h3 className="text-md font-semibold mb-3">إجماليات النتائج المعروضة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <MiniTotal title="نقدي" value={currency(totals.cash)} />
          <MiniTotal title="تطبيقات" value={currency(totals.apps)} />
          <MiniTotal title="البنك" value={currency(totals.bank)} />
          <MiniTotal title="الإجمالي" value={currency(totals.total)} />
        </div>
      </section>

      {/* Table */}
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
                <th className="p-2 border">حالة الإدمن</th>
                <th className="p-2 border">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-4 text-center">جاري التحميل…</td></tr>
              ) : forms.length ? (
                forms.map((f)=>(
                  <tr key={f._id} className="text-center">
                    <td className="p-2 border">{formatDateOnly(f.formDate)}</td>
                    <td className="p-2 border">{f.branch?.name || "-"}</td>
                    <td className="p-2 border">{f.user?.name || "-"}</td>
                    <td className="p-2 border">{currency(f.cashCollection)}</td>
                    <td className="p-2 border">{currency(appsWithFallback(f))}</td>
                    <td className="p-2 border">{currency(bankWithFallback(f))}</td>
                    <td className="p-2 border">{currency(rowTotal(f))}</td>
                    <td className="p-2 border">{f.adminStatus === "released" ? "Released" : f.adminStatus === "rejected" ? "Rejected" : "Pending"}</td>
                    <td className="p-2 border space-y-1">
                      <button
                        onClick={()=>{
                          console.log("[Receipts] Open modal for form:", f._id);
                          setActiveForm(f);
                          setNote("");
                          setRecvCash(String(Number(f?.cashCollection || 0)));
                          setRecvApps(String(Number(appsWithFallback(f) || 0)));
                          setRecvBank(String(Number(bankWithFallback(f) || 0)));
                        }}
                        className="w-full px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        تفاصيل/استلام
                      </button>
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

      {/* Modal */}
      {activeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">استلام تحصيلات — {activeForm.branch?.name || "-"} — {formatDateOnly(activeForm.formDate)}</h3>
              <button onClick={()=> { console.log("[Receipts] Close modal"); setActiveForm(null); }} className="border px-3 py-1 rounded-xl hover:bg-gray-50">إغلاق</button>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <MiniBox label="نقدي (المبلّغ)" value={currency(activeForm.cashCollection)} />
              <MiniBox label="تطبيقات (المبلّغ)" value={currency(appsWithFallback(activeForm))} />
              <MiniBox label="بنك (المبلّغ)" value={currency(bankWithFallback(activeForm))} />
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div><label className="text-sm text-gray-600">نقدي المستلم فعلاً (اختياري)</label><input type="number" className="border rounded-xl p-2 w-full" value={recvCash} onChange={(e)=> setRecvCash(e.target.value)} /></div>
              <div><label className="text-sm text-gray-600">تطبيقات المستلم فعلاً (اختياري)</label><input type="number" className="border rounded-xl p-2 w-full" value={recvApps} onChange={(e)=> setRecvApps(e.target.value)} /></div>
              <div><label className="text-sm text-gray-600">بنك المستلم فعلاً (اختياري)</label><input type="number" className="border rounded-xl p-2 w-full" value={recvBank} onChange={(e)=> setRecvBank(e.target.value)} /></div>
            </div>

            <div className="mb-4"><label className="text-sm text-gray-600">ملاحظات الإدمن</label><textarea className="border rounded-xl p-2 w-full min-h-24" value={note} onChange={(e)=> setNote(e.target.value)} placeholder="اكتب ملاحظاتك هنا…" /></div>

            <div className="flex justify-end gap-2">
              {isAdmin && (
                <>
                  <button disabled={actLoading} onClick={doAdminReject} className="px-3 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-60">رفض</button>
                  <button disabled={actLoading} onClick={doAdminRelease} className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60">استلام (Release)</button>
                </>
              )}
              {!isAdmin && <div className="text-sm text-gray-500">إجراءات الاستلام/الرفض تتطلب صلاحية أدمن</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KpiCard({ icon, label, value, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className={`absolute -top-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${tint} opacity-20`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <h4 className="text-2xl font-extrabold tracking-tight">{value}</h4>
        </div>
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-900 text-white">{icon}</div>
      </div>
    </div>
  );
}
function MiniTotal({ title, value }) { return (<div><div className="text-gray-500">{title}</div><div className="text-xl font-bold">{value}</div></div>); }
function MiniBox({ label, value }) { return (<div className="p-3 bg-gray-50 rounded-xl"><div className="text-gray-500">{label}</div><div className="font-bold">{value}</div></div>); }

/* ---------------- Users (Admin-only add/edit/delete) ---------------- */
function UsersPage({ api, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // تعديل
  const [editingUser, setEditingUser] = useState(null); // { _id, name, email, role, assignedBranches: [] }

  // إنشاء
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "User",
    assignedBranches: [],
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log("[Users] fetch users & branches");
        const [u, b] = await Promise.all([api.get("/api/users"), api.get("/api/branches")]);
        setUsers(u.data || []);
        setBranches(b.data || []);
        console.log("[Users] counts =>", { users: u.data?.length, branches: b.data?.length });
      } catch (e) {
        console.error("[Users] load error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const filtered = users.filter((u) => {
    const t = search.trim().toLowerCase();
    if (!t) return true;
    return (
      (u.name || "").toLowerCase().includes(t) ||
      (u.email || "").toLowerCase().includes(t) ||
      (u.role || "").toLowerCase().includes(t)
    );
  });

  // ====== حذف ======
  async function deleteUser(id) {
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    if (!window.confirm("تأكيد حذف المستخدم؟")) return;
    try {
      console.log("[Users] delete =>", id);
      await api.delete(`/api/users/${id}`);
      setUsers((arr) => arr.filter((u) => u._id !== id));
      toast.success("تم حذف المستخدم");
    } catch (e) {
      console.error("[Users] delete error", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "فشل الحذف");
    }
  }

  // ====== حفظ تعديل ======
  async function saveEditUser(e) {
    e.preventDefault();
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    try {
      console.log("[Users] save edit =>", editingUser?._id);
      await api.patch(`/api/users/${editingUser._id}`, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        assignedBranches: editingUser.assignedBranches,
      });
      setEditingUser(null);
      const res = await api.get("/api/users");
      setUsers(res.data || []);
      toast.success("تم تحديث البيانات");
    } catch (e) {
      console.error("[Users] save edit error", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "فشل التحديث");
    }
  }

  // ====== إنشاء مستخدم ======
  const toggleAssignCreate = (branchId) => {
    setNewUser((p) => {
      const has = p.assignedBranches.includes(branchId);
      return {
        ...p,
        assignedBranches: has ? p.assignedBranches.filter((x) => x !== branchId) : [...p.assignedBranches, branchId],
      };
    });
  };

  async function createUser(e) {
    e.preventDefault();
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    const { name, email, password } = newUser;
    if (!name.trim() || !email.trim() || !password) {
      return toast.error("من فضلك املأ الاسم والبريد وكلمة المرور");
    }
    try {
      setCreating(true);
      console.log("[Users] create =>", { name: newUser.name, email: newUser.email, role: newUser.role, assignedBranches: newUser.assignedBranches.length });
      const res = await api.post("/api/users", {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        assignedBranches: newUser.assignedBranches,
      });
      setUsers((arr) => [res.data, ...arr]);
      setNewUser({ name: "", email: "", password: "", role: "User", assignedBranches: [] });
      setCreateOpen(false);
      toast.success("تم إنشاء المستخدم بنجاح ✨");
    } catch (e) {
      console.error("[Users] create error", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "فشل إنشاء المستخدم");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold">المستخدمون</h3>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-xl p-2 w-60"
            placeholder="بحث…"
          />
          {isAdmin && (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg:black"
            >
              <Plus size={16} /> إنشاء مستخدم
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">الاسم</th>
              <th className="p-2 border">البريد</th>
              <th className="p-2 border">الدور</th>
              <th className="p-2 border">الفروع</th>
              {isAdmin && <th className="p-2 border">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-4 text-center">
                  جاري التحميل…
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u._id} className="text-center">
                  <td className="p-2 border">{u.name}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.role}</td>
                  <td className="p-2 border">{u.assignedBranches?.map((b) => b?.name || b).join("، ") || "-"}</td>
                  {isAdmin && (
                    <td className="p-2 border space-x-2">
                      <button
                        onClick={() =>
                          setEditingUser({
                            _id: u._id,
                            name: u.name || "",
                            email: u.email || "",
                            role: u.role || "User",
                            assignedBranches: u.assignedBranches?.map((b) => (b?._id || b)) || [],
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-yellow-500 text-white hover:opacity-90"
                      >
                        <Pencil size={14} />
                        تعديل
                      </button>
                      <button
                        onClick={() => deleteUser(u._id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-600 text:white hover:opacity-90"
                      >
                        <Trash2 size={14} />
                        مسح
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
            {!loading && !filtered.length && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-4 text-center text-gray-500">
                  لا توجد نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">تعديل مستخدم</h3>
            <form onSubmit={saveEditUser} className="space-y-3">
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="الاسم"
              />
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="البريد"
              />
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="border p-2 rounded-xl w-full"
              >
                <option value="User">User</option>
                <option value="Accountant">Accountant</option>
                <option value="Admin">Admin</option>
                <option value="BranchManager">Branch Manager</option>
              </select>
              <div>
                <p className="mb-1 text-sm">الفروع المصرّح بها</p>
                <BranchCheckboxGrid
                  branches={branches}
                  selected={editingUser.assignedBranches}
                  onToggle={(id) => {
                    const exists = editingUser.assignedBranches.includes(id);
                    setEditingUser({
                      ...editingUser,
                      assignedBranches: exists
                        ? editingUser.assignedBranches.filter((x) => x !== id)
                        : [...editingUser.assignedBranches, id],
                    });
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-3 py-1 border rounded-xl">
                  إلغاء
                </button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-xl">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create modal (Admin) */}
      {isAdmin && createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">إنشاء مستخدم جديد</h3>
            <form onSubmit={createUser} className="space-y-3">
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="الاسم"
              />
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="user@example.com"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="كلمة المرور"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="border p-2 rounded-xl w-full"
              >
                <option value="User">User</option>
                <option value="Accountant">Accountant</option>
                <option value="Admin">Admin</option>
                <option value="BranchManager">Branch Manager</option>
              </select>

              <div>
                <p className="mb-1 text-sm">الفروع المصرّح بها</p>
                <BranchCheckboxGrid
                  branches={branches}
                  selected={newUser.assignedBranches}
                  onToggle={toggleAssignCreate}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-1 border rounded-xl">
                  إلغاء
                </button>
                <button type="submit" disabled={creating} className="px-3 py-1 bg-gray-900 text-white rounded-xl disabled:opacity-60">
                  {creating ? "جاري الإنشاء…" : "إنشاء"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchCheckboxGrid({ branches, selected, onToggle }){
  return (
    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-auto pr-1">
      {branches.map((b)=> (
        <label key={b._id} className="flex items-center gap-2 border p-2 rounded-xl bg-white">
          <input type="checkbox" checked={selected.includes(b._id)} onChange={()=> onToggle(b._id)} />
          {b.name}
        </label>
      ))}
    </div>
  );
}

/* ---------------- Branches (Admin-only add/edit/delete) ---------------- */
function BranchesPage({ api, isAdmin }) {
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null); // { _id, name }
  const [editName, setEditName] = useState("");

  const load = async ()=> { 
    console.log("[Branches] load");
    const res = await api.get("/api/branches"); 
    setBranches(res.data||[]); 
  };
  useEffect(()=>{ load(); },[/*eslint-disable-line*/]);

  const add = async (e)=> {
    e.preventDefault(); if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!name.trim()) return;
    console.log("[Branches] add", name);
    await api.post("/api/branches", { name: name.trim() }); 
    setName(""); 
    await load(); 
    toast.success("تمت الإضافة");
  };
  const saveEdit = async (e)=> {
    e.preventDefault(); if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    console.log("[Branches] save edit", editing?._id, "->", editName);
    await api.patch(`/api/branches/${editing._id}`, { name: editName.trim() }); 
    setEditing(null); setEditName(""); 
    await load(); 
    toast.success("تم حفظ التعديلات");
  };
  const del = async (id)=> {
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!window.confirm("تأكيد مسح الفرع؟")) return;
    console.log("[Branches] delete", id);
    await api.delete(`/api/branches/${id}`); 
    await load(); 
    toast.success("تم المسح");
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <form onSubmit={add} className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4 flex gap-2">
          <input className="border rounded-xl p-2 flex-1" value={name} onChange={(e)=>setName(e.target.value)} placeholder="اسم الفرع" />
          <button className="bg-indigo-600 text-white px-4 rounded-xl">إضافة</button>
        </form>
      )}

      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
        <h3 className="text-md font-semibold mb-2">الفروع</h3>
        <ul className="grid md:grid-cols-3 gap-2">
          {branches.map(b=> (
            <li key={b._id} className="border rounded-xl p-2 bg-white flex items-center justify-between">
              <span>{b.name}</span>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button onClick={()=> { setEditing(b); setEditName(b.name||""); }} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-yellow-500 text-white hover:opacity-90"><Pencil size={14}/>تعديل</button>
                  <button onClick={()=> del(b._id)} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-600 text-white hover:opacity-90"><Trash2 size={14}/>مسح</button>
                </div>
              )}
            </li>
          ))}
          {!branches.length && <li className="text-gray-500">لا توجد فروع</li>}
        </ul>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">تعديل فرع</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <input type="text" value={editName} onChange={(e)=> setEditName(e.target.value)} className="border p-2 rounded-xl w-full" placeholder="اسم الفرع" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=> setEditing(null)} className="px-3 py-1 border rounded-xl">إلغاء</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-xl">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Templates (Admin-only add/toggle/edit/delete) ---------------- */
function TemplatesPage({ api, isAdmin }) {
  const [apps, setApps] = useState([]);
  const [banks, setBanks] = useState([]);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("applications");
  const [editing, setEditing] = useState(null); // {_id, name, group}
  const [editName, setEditName] = useState("");

  const load = async ()=>{
    console.log("[Templates] load");
    const [a, k] = await Promise.all([
      api.get("/api/report-templates?group=applications"),
      api.get("/api/report-templates?group=bank"),
    ]);
    setApps(a.data||[]); setBanks(k.data||[]);
  };
  useEffect(()=>{ load(); },[/*eslint-disable-line*/]);

  const add = async ()=>{
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!name.trim()) return;
    console.log("[Templates] add", { name, group });
    await api.post("/api/report-templates", { name: name.trim(), group });
    setName(""); await load(); toast.success("تمت الإضافة");
  };
  const toggle = async (id, cur)=>{
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    console.log("[Templates] toggle", id, "->", !cur);
    await api.patch(`/api/report-templates/${id}`, { isActive: !cur });
    await load(); toast.success(cur ? "تم التعطيل" : "تم التفعيل");
  };
  const saveEdit = async (e)=>{
    e.preventDefault(); if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    console.log("[Templates] save edit", editing?._id, "->", editName);
    await api.patch(`/api/report-templates/${editing._id}`, { name: editName.trim() });
    setEditing(null); setEditName(""); await load(); toast.success("تم الحفظ");
  };
  const del = async (id)=>{
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!window.confirm("تأكيد مسح الطريقة؟")) return;
    console.log("[Templates] delete", id);
    await api.delete(`/api/report-templates/${id}`);
    await load(); toast.success("تم المسح");
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
          <h3 className="text-md font-semibold mb-3">إضافة طريقة</h3>
          <div className="flex gap-2">
            <input className="border rounded-xl p-2 flex-1" value={name} onChange={(e)=>setName(e.target.value)} placeholder="اسم الطريقة" />
            <select className="border rounded-xl p-2" value={group} onChange={(e)=>setGroup(e.target.value)}>
              <option value="applications">تطبيقات</option>
              <option value="bank">بنك</option>
            </select>
            <button onClick={add} className="bg-gray-900 text-white px-4 rounded-xl">إضافة</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <TemplateList title="طرق التطبيقات" items={apps} onToggle={toggle} onEdit={(a)=> { setEditing({ ...a, group: "applications" }); setEditName(a.name||""); }} onDelete={del} isAdmin={isAdmin} />
        <TemplateList title="طرق البنك" items={banks} onToggle={toggle} onEdit={(b)=> { setEditing({ ...b, group: "bank" }); setEditName(b.name||""); }} onDelete={del} isAdmin={isAdmin} />
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">تعديل طريقة ({editing.group === "applications" ? "تطبيقات" : "بنك"})</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <input type="text" value={editName} onChange={(e)=> setEditName(e.target.value)} className="border p-2 rounded-xl w-full" placeholder="اسم الطريقة" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=> setEditing(null)} className="px-3 py-1 border rounded-xl">إلغاء</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-xl">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateList({ title, items, onToggle, onEdit, onDelete, isAdmin }){
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
      <h3 className="text-md font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((it)=> (
          <li key={it._id} className="flex justify-between items-center border rounded-xl px-3 py-2">
            <span className={it.isActive ? "" : "line-through text-gray-400"}>{it.name}</span>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button onClick={()=> onToggle(it._id, it.isActive)} className="text-xs px-3 py-1 rounded-xl bg-slate-700 text-white hover:opacity-90">{it.isActive ? "تعطيل" : "تفعيل"}</button>
                  <button onClick={()=> onEdit(it)} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-yellow-500 text-white hover:opacity-90"><Pencil size={14}/>تعديل</button>
                  <button onClick={()=> onDelete(it._id)} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-600 text-white hover:opacity-90"><Trash2 size={14}/>مسح</button>
                </>
              )}
            </div>
          </li>
        ))}
        {!items.length && <li className="text-sm text-gray-500">لا توجد عناصر</li>}
      </ul>
    </div>
  );
}

/* ---------------- NEW: AdminReports (received-only + filters + CSV, بدون تجميعات) ---------------- */
function AdminReports({ api }){
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ branchId: "", userId: "", startDate: "", endDate: "", q: "" });
  const [rows, setRows] = useState([]); // released فقط
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async()=>{ try{ const [b,u] = await Promise.all([api.get('/api/branches'), api.get('/api/users')]); setBranches(b.data||[]); setUsers(u.data||[]); }catch(e){ console.error("[AdminReports] meta load error", e); } })(); },[api]);

  useEffect(()=>{ console.log("[AdminReports] Filters changed:", filters); }, [filters]);

  const fetchReleased = async ()=>{
    setLoading(true);
    try{
      const params = { adminStatus: 'released' };
      if(filters.branchId) params.branchId = filters.branchId;
      if(filters.userId) params.userId = filters.userId;
      if(filters.startDate) params.startDate = filters.startDate;
      if(filters.endDate) params.endDate = filters.endDate;
      if(filters.q) params.q = filters.q;

      console.log("[AdminReports] Fetch params =>", params);

      const res = await api.get('/api/forms/admin', { params });
      console.log("[AdminReports] Result length:", Array.isArray(res.data)? res.data.length : null);
      if(Array.isArray(res.data) && res.data.length){ console.log("[AdminReports] First row sample:", res.data[0]); }

      setRows(res.data||[]);
    }catch(e){ console.error("[AdminReports] Error:", e?.response?.data || e?.message); toast.error(e?.response?.data?.message || 'تعذّر تحميل البيانات'); setRows([]); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ fetchReleased(); },[/*eslint-disable-line*/ api, filters.branchId, filters.userId, filters.startDate, filters.endDate, filters.q]);

  // إجماليات (received-only)
// إجماليات (المبلّغ + fallback)
const sums = useMemo(()=> rows.reduce((a,f)=>{
  const cash = Number(f?.cashCollection || 0);
  const apps = appsWithFallback(f);
  const bank = bankWithFallback(f);
  a.cash += cash; a.apps += apps; a.bank += bank; a.total += (cash + apps + bank);
  return a;
},{cash:0,apps:0,bank:0,total:0}),[rows]);


  // تصدير CSV (received-only)
  const exportCSV = ()=>{
    const header = ['التاريخ','الفرع','المستخدم','نقدي (فعلي)','تطبيقات (فعلي)','بنك (فعلي)','الإجمالي (فعلي)'];
    const lines = [header.join(',')];
    for(const f of rows){
      const r = getReceived(f);
      const total = r.cash + r.apps + r.bank;
      lines.push([
        formatDateOnly(f.formDate),
        (f.branch?.name||'-').replaceAll(',',' '),
        (f.user?.name||'-').replaceAll(',',' '),
        r.cash, r.apps, r.bank, total
      ].join(','));
    }
    const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'admin-reports.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير CSV');
  };

  return (
    <div className="space-y-6">
      <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3 text-gray-600"><Filter size={16} /><b>فلاتر تقارير الإدمن (المستلم فقط)</b></div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
            <Search size={16} className="text-gray-400" />
            <input value={filters.q} onChange={(e)=> setFilters(p=>({...p,q:e.target.value}))} className="outline-none w-full text-sm" placeholder="بحث (ملاحظات/مرجع)…" />
          </div>
          <select value={filters.branchId} onChange={(e)=> setFilters(p=>({...p,branchId:e.target.value}))} className="border rounded-xl px-3 py-2 bg-white text-sm">
            <option value="">كل الفروع</option>
            {branches.map(b=> <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <select value={filters.userId} onChange={(e)=> setFilters(p=>({...p,userId:e.target.value}))} className="border rounded-xl px-3 py-2 bg-white text-sm">
            <option value="">كل المستخدمين</option>
            {users.map(u=> <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <input type="date" value={filters.startDate} onChange={(e)=> setFilters(p=>({...p,startDate:e.target.value}))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <input type="date" value={filters.endDate} onChange={(e)=> setFilters(p=>({...p,endDate:e.target.value}))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2 mt-1">
            <div className="text-sm text-gray-500">النتائج: <b>{rows.length}</b></div>
            <div className="flex gap-2">
              <button onClick={()=>{ const d=new Date(); const iso=(x)=>x.toISOString().slice(0,10); setFilters(p=>({...p,startDate:iso(d),endDate:iso(d)})); }} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">اليوم</button>
              <button onClick={()=>{ const d=new Date(); const day=d.getDay()||7; const start=new Date(d); start.setDate(d.getDate()-(day-1)); const iso=(x)=>x.toISOString().slice(0,10); setFilters(p=>({...p,startDate:iso(start),endDate:iso(d)})); }} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">هذا الأسبوع</button>
              <button onClick={()=>{ const d=new Date(); const start=new Date(d.getFullYear(), d.getMonth(), 1); const iso=(x)=>x.toISOString().slice(0,10); setFilters(p=>({...p,startDate:iso(start),endDate:iso(d)})); }} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">هذا الشهر</button>
              <button onClick={exportCSV} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 inline-flex items-center gap-2"><Download size={16}/> تصدير CSV</button>
            </div>
          </div>
        </div>
      </section>

      {/* إجماليات (received-only) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="opacity-80" />} title="إجمالي النقدي" value={currency(sums.cash)} tint="from-amber-500 to-orange-500" />
        <StatCard icon={<Layers3 className="opacity-80" />} title="إجمالي التطبيقات" value={currency(sums.apps)} tint="from-emerald-500 to-teal-500" />
        <StatCard icon={<Layers3 className="opacity-80" />} title="إجمالي البنك" value={currency(sums.bank)} tint="from-sky-500 to-indigo-500" />
        <StatCard icon={<CheckCircle2 className="opacity-80" />} title="الإجمالي الكلي" value={currency(sums.total)} tint="from-rose-500 to-pink-500" />
      </section>

      {/* جدول السجلات (received-only) */}
      <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
        <h3 className="text-md font-semibold mb-3">السجلات المستلمة</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">التاريخ</th>
                <th className="p-2 border">الفرع</th>
                <th className="p-2 border">المستخدم</th>
                <th className="p-2 border">نقدي (فعلي)</th>
                <th className="p-2 border">تطبيقات (فعلي)</th>
                <th className="p-2 border">بنك (فعلي)</th>
                <th className="p-2 border">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center">جاري التحميل…</td></tr>
              ) : rows.length ? (
                rows.map((f)=>{
                  const r = getReceived(f);
                  const total = r.cash + r.apps + r.bank;
                  return (
                    <tr key={f._id} className="text-center">
                      <td className="p-2 border">{formatDateOnly(f.formDate)}</td>
                      <td className="p-2 border">{f.branch?.name || '-'}</td>
                      <td className="p-2 border">{f.user?.name || '-'}</td>
                      <td className="p-2 border">{currency(r.cash)}</td>
                      <td className="p-2 border">{currency(r.apps)}</td>
                      <td className="p-2 border">{currency(r.bank)}</td>
                      <td className="p-2 border">{currency(total)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
