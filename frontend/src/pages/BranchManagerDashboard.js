// src/pages/BranchManagerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import {
  LayoutDashboard, Receipt, LogOut, Filter, FileText
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

// Helpers
const currency = (n) => Number(n || 0).toLocaleString();
const formatDateOnly = (d) => (d ? new Date(d).toLocaleDateString() : "-");
const appsWithFallback = (f) => Number(f?.appsTotal || f?.appsCollection || 0);
const bankWithFallback = (f) => Number(f?.bankTotal || 0);
const rowTotal = (f) => Number(f?.cashCollection || 0) + appsWithFallback(f) + bankWithFallback(f);

export default function BranchManagerDashboard() {
  const api = useApi();
  const [tab, setTab] = useState("dashboard");
  const meName = localStorage.getItem("userName") || "مدير فرع";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />

      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 shadow-lg" />
            <div>
              <p className="text-xs text-gray-500">لوحة التحكم</p>
              <h1 className="text-lg font-bold tracking-tight">مدير فرع</h1>
            </div>
          </div>

          {/* Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <NavBtn icon={<LayoutDashboard size={16} />} label="لوحة التحكم" active={tab==="dashboard"} onClick={()=>setTab("dashboard")} />
            <NavBtn icon={<Receipt size={16} />} label="تقارير المحاسب" active={tab==="receipts"} onClick={()=>setTab("receipts")} />
            <NavBtn icon={<FileText size={16} />} label="تقارير Released" active={tab==="released"} onClick={()=>setTab("released")} />
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-600">مرحباً، <b>{meName}</b></span>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition shadow">
              <LogOut size={16} /><span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === "dashboard" && <DashboardHome api={api} />}
        {tab === "receipts" && <ReceiptsView api={api} />}
        {tab === "released" && <ReleasedReports api={api} />}
      </main>
    </div>
  );
}

/* ---------- NavBtn ---------- */
function NavBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 transition ${active ? "bg-gray-900 text-white shadow" : "text-gray-700 hover:bg-gray-100"}`}
    >
      {icon}<span>{label}</span>
    </button>
  );
}

/* ---------- Dashboard (إحصائيات بسيطة) ---------- */
function DashboardHome({ api }) {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(()=>{ (async()=>{
    try{
      const [b,u] = await Promise.all([api.get("/api/branches"), api.get("/api/users")]);
      setBranches(b.data||[]); setUsers(u.data||[]);
    }catch(e){ console.error(e); }
  })(); },[api]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard title="عدد الفروع" value={branches.length} />
      <StatCard title="عدد المستخدمين" value={users.length} />
    </section>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <h4 className="text-2xl font-extrabold tracking-tight">{value}</h4>
        </div>
      </div>
    </div>
  );
}

/* ---------- Receipts (عرض + Release/Reject) ---------- */
function ReceiptsView({ api }) {
  const [forms, setForms] = useState([]);
  const [filters, setFilters] = useState({ q:"", startDate:"", endDate:"" });
  const [loading, setLoading] = useState(false);

  const fetchForms = async ()=>{
    setLoading(true);
    try{
      const res = await api.get("/api/forms/branch-manager", { params: filters });
      setForms(res.data||[]);
    }catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ fetchForms(); },[filters]);

  const handleRelease = async (id)=>{
    try {
      await api.patch(`/api/forms/${id}/branch-release`, { note: "" });
      toast.success("تم عمل Release بنجاح");
      fetchForms();
    } catch (e) {
      toast.error("خطأ أثناء عمل Release");
    }
  };

  const handleReject = async (id)=>{
    try {
      await api.patch(`/api/forms/${id}/branch-reject`, { note: "" });
      toast("تم رفض التقرير", { icon: "⚠️" });
      fetchForms();
    } catch (e) {
      toast.error("خطأ أثناء الرفض");
    }
  };

  // 📊 الإحصائيات
  const stats = useMemo(()=>{
    return {
      total: forms.length,
      released: forms.filter(f=>f.branchManagerRelease?.status==="released").length,
      rejected: forms.filter(f=>f.branchManagerRelease?.status==="rejected").length,
      pending: forms.filter(f=>!f.branchManagerRelease || f.branchManagerRelease.status==="pending").length
    };
  },[forms]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ColorCard title="إجمالي" value={stats.total} color="from-gray-500 to-gray-700"/>
        <ColorCard title="في الانتظار" value={stats.pending} color="from-amber-400 to-yellow-500"/>
        <ColorCard title="تمت الموافقة" value={stats.released} color="from-emerald-500 to-green-600"/>
        <ColorCard title="مرفوضة" value={stats.rejected} color="from-rose-500 to-red-600"/>
      </section>

      {/* Filters */}
      <section className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3 text-gray-600"><Filter size={16}/><b>فلاتر</b></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" value={filters.q} onChange={(e)=>setFilters(p=>({...p,q:e.target.value}))} placeholder="بحث…" className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <input type="date" value={filters.startDate} onChange={(e)=>setFilters(p=>({...p,startDate:e.target.value}))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <input type="date" value={filters.endDate} onChange={(e)=>setFilters(p=>({...p,endDate:e.target.value}))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
        </div>
      </section>

      {/* Table */}
      <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
        <h3 className="font-semibold mb-3">التقارير ({forms.length})</h3>
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
                <th className="p-2 border">الإجمالي</th>
                <th className="p-2 border">الحالة</th>
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
                    <td className="p-2 border">{f.branch?.name||"-"}</td>
                    <td className="p-2 border">{f.user?.name||"-"}</td>
                    <td className="p-2 border">{currency(f.cashCollection)}</td>
                    <td className="p-2 border">{currency(appsWithFallback(f))}</td>
                    <td className="p-2 border">{currency(bankWithFallback(f))}</td>
                    <td className="p-2 border">{currency(rowTotal(f))}</td>
                    <td className="p-2 border">
                      {f.branchManagerRelease?.status==="released" && <span className="text-emerald-600">✔ تمت</span>}
                      {f.branchManagerRelease?.status==="rejected" && <span className="text-rose-600">✘ مرفوض</span>}
                      {!f.branchManagerRelease || f.branchManagerRelease.status==="pending" ? <span className="text-amber-500">⏳ انتظار</span> : null}
                    </td>
                    <td className="p-2 border">
                      {(!f.branchManagerRelease || f.branchManagerRelease.status==="pending") && (
                        <>
                          <button onClick={()=>handleRelease(f._id)} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded">Release</button>
                          <button onClick={()=>handleReject(f._id)} className="px-2 py-1 text-xs bg-rose-600 text-white rounded ml-2">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="p-4 text-center text-gray-500">لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ---------- Released Reports (عرض فقط) ---------- */
function ReleasedReports({ api }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchForms = async ()=>{
    setLoading(true);
    try{
      const res = await api.get("/api/forms/branch-manager");
      const released = (res.data||[]).filter(f=>f.branchManagerRelease?.status==="released");
      setForms(released);
    }catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ fetchForms(); },[]);

  return (
    <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
      <h3 className="font-semibold mb-3">تقارير Released ({forms.length})</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">التاريخ</th>
              <th className="p-2 border">الفرع</th>
              <th className="p-2 border">المحاسب</th>
              <th className="p-2 border">الإجمالي</th>
              <th className="p-2 border">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">جاري التحميل…</td></tr>
            ) : forms.length ? (
              forms.map((f)=>(
                <tr key={f._id} className="text-center">
                  <td className="p-2 border">{formatDateOnly(f.formDate)}</td>
                  <td className="p-2 border">{f.branch?.name||"-"}</td>
                  <td className="p-2 border">{f.user?.name||"-"}</td>
                  <td className="p-2 border">{currency(rowTotal(f))}</td>
                  <td className="p-2 border">{f.notes||"-"}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">لا توجد تقارير Released</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Card ملونة ---------- */
function ColorCard({ title, value, color }) {
  return (
    <div className={`rounded-2xl p-4 shadow text-white bg-gradient-to-tr ${color}`}>
      <p className="text-xs">{title}</p>
      <h4 className="text-2xl font-bold">{value}</h4>
    </div>
  );
}
