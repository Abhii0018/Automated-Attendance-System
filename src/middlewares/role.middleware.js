export const authorize = (...roles) => {
  // Normalize allowed roles once (case-insensitive comparison)
  const allowed = roles.map((r) => r.toLowerCase());

  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();

    if (!userRole || !allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission",
      });
    }

    next();
  };
};