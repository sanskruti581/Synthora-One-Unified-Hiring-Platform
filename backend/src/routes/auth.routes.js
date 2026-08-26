import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Company from "../models/Company.js";
import Student from "../models/Student.js";
import HiringDrive from "../models/HiringDrive.js";
import Invitation from "../models/Invitation.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const company = await Company.findOne({ email: normalizedEmail });

    if (company && (await bcrypt.compare(password, company.passwordHash))) {
      const token = jwt.sign({ id: company._id, userType: "company" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
      return res.json({ userType: "company", token });
    }

    const student = await Student.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });

    if (student && (await bcrypt.compare(password, student.passwordHash))) {
      const drive = await HiringDrive.findById(student.drive);

      if (!drive) {
        return res.status(403).json({ message: "Student assessment drive is not available" });
      }

      // Login is now always allowed for students with valid credentials.
      // Assessment start is enforced separately by the assessment routes (examStartAt check).

      await Student.findByIdAndUpdate(student._id, { assessmentStatus: "Logged In", lastLogin: new Date() });
      await Invitation.findOneAndUpdate(
        { student: student._id, drive: student.drive },
        { assessmentStatus: "Logged In", lastLogin: new Date() },
      );

      const token = jwt.sign({ id: student._id, userType: "student" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });
      return res.json({ userType: "student", token });
    }

    return res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
});

export default router;
