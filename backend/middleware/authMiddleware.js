const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🛡️ Middleware للتحقق من التوكن وصلاحية اليوزر
const protect = async (req, res, next) => {
  let token;

  // هل في Authorization header؟
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // نفصل الكلمة "Bearer" عن التوكن
      token = req.headers.authorization.split(" ")[1];

      // نفك التوكن
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // نجيب اليوزر من DB بدون الباسورد
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next(); // كمل للـ route
    } catch (error) {
      console.error("JWT Error:", error.message);
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  }

  // لو مفيش توكن أصلا
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
