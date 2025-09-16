// src/pages/Login.jsx
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });

      // حفظ التوكن والدور والاسم (لو متاح)
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      if (res.data?.user?.name || res.data?.name) {
        localStorage.setItem("userName", res.data?.user?.name || res.data?.name);
      }

      // التحويل حسب الدور
      if (res.data.role === "User") navigate("/user");
      else if (res.data.role === "Accountant") navigate("/accountant");
      else if (res.data.role === "Admin") navigate("/admin");
      else navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* بطاقة الدخول */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-6 shadow-xl">
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 opacity-20" />
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 opacity-20" />

          {/* رأس البطاقة */}
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white shadow">
              <LogIn size={20} />
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">تسجيل الدخول</h2>
            <p className="text-sm text-gray-500 mt-1">أهلاً بيك! من فضلك أدخل البريد وكلمة السر</p>
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* الفورم */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
              <Mail size={16} className="text-gray-400" />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                className="outline-none w-full text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
              <Lock size={16} className="text-gray-400" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="كلمة المرور"
                className="outline-none w-full text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPass((s) => !s)} className="text-gray-500 hover:text-gray-700">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2 rounded-xl hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "... جاري الدخول" : "دخول"}
            </button>
          </form>

          {/* فوتر صغير */}
          <div className="text-center text-xs text-gray-500 mt-4">
            © {new Date().getFullYear()} Finance System. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}