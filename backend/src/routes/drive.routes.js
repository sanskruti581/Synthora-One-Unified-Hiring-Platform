import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import HiringDrive from "../models/HiringDrive.js";
import Company from "../models/Company.js";
import Student from "../models/Student.js";
import Invitation from "../models/Invitation.js";
import { requireCompany } from "../middleware/auth.js";
import { parseStudentFile } from "../utils/parseStudentFile.js";
import { createInvitationToken, createStudentPassword, getExamStartDate } from "../utils/tokens.js";
import { sendStudentInvitationEmail } from "../utils/mailer.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  requireCompany,
  upload.fields([
    { name: "jobDescription", maxCount: 1 },
    { name: "studentFile", maxCount: 1 },
  ]),
  async (req, res) => {
    const company = await Company.findById(req.companyId);
    const jobDescription = req.files?.jobDescription?.[0];
    const studentFile = req.files?.studentFile?.[0];

    if (!studentFile) {
      return res.status(400).json({ message: "Student Excel/CSV file is required" });
    }

    let students;
    try {
      students = await parseStudentFile(studentFile.buffer, studentFile.originalname);
    } catch (error) {
      return res.status(400).json({ message: error.message || "Unable to parse student file" });
    }

    if (students.length === 0) {
      return res.status(400).json({ message: "Student file must include at least one valid student email" });
    }

    const drive = await HiringDrive.create({
      company: req.companyId,
      driveName: req.body.driveName,
      jobRole: req.body.jobRole,
      jobDescriptionFile: jobDescription
        ? { originalName: jobDescription.originalname, mimeType: jobDescription.mimetype, size: jobDescription.size }
        : undefined,
      studentFile: { originalName: studentFile.originalname, mimeType: studentFile.mimetype, size: studentFile.size },
      examDate: req.body.examDate,
      examTime: req.body.examTime,
      durationMinutes: Number(req.body.durationMinutes),
      rounds: JSON.parse(req.body.rounds || "[]"),
      aptitudeCutoff: Number(req.body.aptitudeCutoff),
      lastRegistrationDate: req.body.lastRegistrationDate,
    });

    const examStart = getExamStartDate(drive.examDate, drive.examTime);
    const activationOpenAt = new Date(examStart.getTime() - 10 * 60 * 1000);
    const expiresAt = new Date(examStart.getTime() + Number(drive.durationMinutes) * 60 * 1000);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const invitations = [];

    for (const studentData of students) {
      const plainPassword = createStudentPassword();
      const passwordHash = await bcrypt.hash(plainPassword, 12);

      const student = await Student.findOneAndUpdate(
        { email: studentData.email, drive: drive._id },
        {
          ...studentData,
          company: req.companyId,
          drive: drive._id,
          passwordHash,
          plainPasswordForInitialEmail: plainPassword,
          isActive: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const token = createInvitationToken();
      const invitation = await Invitation.create({
        student: student._id,
        company: req.companyId,
        drive: drive._id,
        token,
        activationOpenAt,
        expiresAt,
      });

      const activationLink = `${clientUrl}/student/activate/${token}`;

      try {
        const mailResult = await sendStudentInvitationEmail({
          to: student.email,
          studentName: student.name,
          companyName: company.companyName,
          driveName: drive.driveName,
          examDate: drive.examDate,
          examTime: drive.examTime,
          password: plainPassword,
          activationLink,
        });

        invitation.emailStatus = mailResult.status;
        invitation.sentAt = mailResult.status === "sent" ? new Date() : undefined;
      } catch (error) {
        invitation.emailStatus = "failed";
        invitation.emailError = error.message;
      }

      await invitation.save();
      invitations.push({ email: student.email, activationLink, emailStatus: invitation.emailStatus });
    }

    return res.status(201).json({
      message: "Hiring Drive Created Successfully",
      drive,
      studentsInvited: invitations.length,
      invitations,
    });
  },
);

router.get("/", requireCompany, async (req, res) => {
  const drives = await HiringDrive.find({ company: req.companyId }).sort({ createdAt: -1 });
  const drivesWithCounts = await Promise.all(
    drives.map(async (drive) => ({
      ...drive.toObject(),
      studentsInvited: await Student.countDocuments({ drive: drive._id }),
    })),
  );

  res.json(drivesWithCounts);
});

export default router;
