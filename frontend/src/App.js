// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BranchManagerDashboard from "./pages/BranchManagerDashboard"; // ✅ جديد
import ProtectedRoute from "./ProtectedRoute";

function App() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ✅ تحديث getRedirect مع BranchManager
  const getRedirect = () => {
    if (!token) return <Navigate to="/login" replace />;
    if (role === "User") return <Navigate to="/user" replace />;
    if (role === "Accountant") return <Navigate to="/accountant" replace />;
    if (role === "Admin") return <Navigate to="/admin" replace />;
    if (role === "BranchManager") return <Navigate to="/branch-manager" replace />; // جديد
    return <Navigate to="/login" replace />;
  };

  return (
    <Router>
      <Routes>
        {/* صفحة اللوجين */}
        <Route path="/login" element={<Login />} />

        {/* صفحات محمية */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRole="User">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/accountant"
          element={
            <ProtectedRoute allowedRole="Accountant">
              <AccountantDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ✅ صفحة مدير الفرع */}
        <Route
          path="/branch-manager"
          element={
            <ProtectedRoute allowedRole="BranchManager">
              <BranchManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* الراوت الأساسي "/" → يوديك حسب الدور */}
        <Route path="/" element={getRedirect()} />

        {/* أي مسار غلط → Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
