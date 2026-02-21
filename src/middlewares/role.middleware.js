export const authorize = (...roles) => { //...roles is rest parameter, can pass multiple roles like:
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission",
      });
    }

    next();
  };
};