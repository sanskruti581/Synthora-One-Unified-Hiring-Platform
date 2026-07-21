import { Router } from "express";
import Invitation from "../models/Invitation.js";
import Student from "../models/Student.js";
import HiringDrive from "../models/HiringDrive.js";
import Company from "../models/Company.js";

const router = Router();

router.post("/activate/:token", async (req, res) => {
  const invitation = await Invitation.findOne({ token: req.params.token });

  if (!invitation) {
    return res.status(404).json({ message: "Invalid invitation link" });
  }

  const now = new Date();
  if (now < invitation.activationOpenAt) {
    return res.status(403).json({
      message: "This link opens 10 minutes before the exam starts",
      activationOpenAt: invitation.activationOpenAt,
    });
  }

  if (now > invitation.expiresAt) {
    return res.status(403).json({ message: "This invitation has expired" });
  }

  const student = await Student.findByIdAndUpdate(invitation.student, { isActive: true, activatedAt: now }, { new: true });
  const drive = await HiringDrive.findById(invitation.drive);
  const company = await Company.findById(invitation.company);

  invitation.usedAt = now;
  await invitation.save();

  return res.json({
    message: "Invitation activated successfully",
    email: student.email,
    temporaryPassword: student.plainPasswordForInitialEmail,
    driveName: drive.driveName,
    companyName: company.companyName,
    examDate: drive.examDate,
    examTime: drive.examTime,
  });
});

export default router;
