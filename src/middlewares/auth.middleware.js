import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    // First Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // Second Extract token
    const token = authHeader.split(" ")[1];

    // Third  Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);   // its checking expiry time of token and ,match with your signed token with secret
    // console.log(decoded);

    // Four  Attach decoded payload to request
    req.user = decoded;
    console.log(req.user)

    next();
  } catch (error) {
     console.log("JWT ERROR:", error.message);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token invalid or expired",
    });
  }
};