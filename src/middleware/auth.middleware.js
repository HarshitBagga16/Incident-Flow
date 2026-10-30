import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing or malformed",
      });
    }
    // console.log("Authorization header received:", authHeader);
    const match = authHeader.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header format",
      });
    }

    const token = match[1];

    // console.log("Token extracted from header:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!decoded) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }
    // console.log("Decoded token:", decoded);
    req.user = decoded;
    // console.log("User attached to request:", req.user);
    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }
    return next(error);
  }
};
