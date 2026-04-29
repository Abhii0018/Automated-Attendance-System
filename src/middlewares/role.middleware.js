import User from "../models/user.model.js";

export const authorize = (...roles) => {
  // Normalize allowed roles once (case-insensitive comparison)
  const allowed = roles.map((r) => r.toLowerCase());

  return async (req, res, next) => {
    try {
      const userRole = req.user?.role?.toLowerCase();

      if (!userRole || !allowed.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have permission",
        });
      }

      if (userRole === "admin") {
        const userDoc = await User.findById(req.user.id).select("isSuperAdmin adminAccessStatus");
        if (!userDoc) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized user",
          });
        }
        const hasAdminAccess = userDoc.isSuperAdmin || userDoc.adminAccessStatus === "approved";
        if (!hasAdminAccess) {
          return res.status(403).json({
            success: false,
            message: userDoc.adminAccessStatus === "rejected"
              ? "Your admin access request was rejected by super admin."
              : "Your admin access request is pending super admin approval.",
          });
        }
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization check failed",
      });
    }
  };
};