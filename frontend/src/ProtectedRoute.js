// src/ProtectedRoute.js
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // لو مفيش توكن → على طول Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // لو الدور مش من اللي مسموح → رجّعه للمكان الصح
  if (role !== allowedRole) {
    if (role === "User") return <Navigate to="/user" replace />;
    if (role === "Accountant") return <Navigate to="/accountant" replace />;
    if (role === "Admin") return <Navigate to="/admin" replace />;
    if (role === "BranchManager") return <Navigate to="/branch-manager" replace />; // ✅ جديد
    return <Navigate to="/login" replace />;
  }

  // غير كده → اعرض الصفحة
  return children;
}
