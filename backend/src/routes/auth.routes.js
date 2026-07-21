import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Company from "../models/Company.js";
import Student from "../models/Student.js";
import HiringDrive from "../models/HiringDrive.js";
import { getExamStartDate } from "../utils/tokens.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const company = await Company.findOne({ email: normalizedEmail });
  if (company && (await bcrypt.compare(password, company.passwordHash))) {
    const token = jwt.sign({ id: company._id, userType: "company" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
    return res.json({ userType: "company", token });
  }

  const student = await Student.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
  if (student && (await bcrypt.compare(password, student.passwordHash))) {
    const drive = await HiringDrive.findById(student.drive);
    const loginOpenAt = new Date(getExamStartDate(drive.examDate, drive.examTime).getTime() - 10 * 60 * 1000);

    if (!student.isActive || Date.now() < loginOpenAt.getTime()) {
      return res.status(403).json({ message: "Student login opens 10 minutes before exam time" });
    }

    const token = jwt.sign({ id: student._id, userType: "student" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });
    return res.json({ userType: "student", token });
  }

  return res.status(401).json({ message: "Invalid email or password" });
});

export default router;
