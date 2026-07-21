import jwt from "jsonwebtoken";

export function requireCompany(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");

    if (payload.userType !== "company") {
      return res.status(403).json({ message: "Company access required" });
    }

    req.companyId = payload.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid authorization token" });
  }
}
