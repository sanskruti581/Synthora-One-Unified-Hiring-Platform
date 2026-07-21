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

function toPublicDrive(drive) {
  const data = drive.toObject();

  if (data.jobDescriptionFile?.data) {
    delete data.jobDescriptionFile.data;
  }

  if (data.studentFile?.data) {
    delete data.studentFile.data;
  }

  return data;
}

function buildStats(students) {
  const scores = students.map((student) => student.score).filter((score) => typeof score === "number");
  const loggedInStudents = students.filter((student) => student.assessmentStatus === "Logged In").length;
  const startedStudents = students.filter((student) => student.assessmentStatus === "Started").length;

  return {
    studentsInvited: students.length,
    studentsLoggedIn: loggedInStudents,
    studentsWaiting: Math.max(0, loggedInStudents - startedStudents),
    studentsStarted: startedStudents,
    studentsCompleted: students.filter((student) => student.assessmentStatus === "Completed").length,
    averageScore: scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0,
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore: scores.length ? Math.min(...scores) : 0,
    qualifiedStudents: students.filter((student) => student.result === "Qualified").length,
    rejectedStudents: students.filter((student) => student.result === "Rejected").length,
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildResultRows(students) {
  return [
    ["Student Name", "Email", "Invitation Status", "Email Sent", "Assessment Status", "Started Time", "Completed Time", "Score", "Result"],
    ...students.map((student) => [
      student.name,
      student.email,
      student.invitationStatus,
      student.emailSent ? "Yes" : "No",
      student.assessmentStatus,
      student.startedAt ? student.startedAt.toISOString() : "",
      student.completedAt ? student.completedAt.toISOString() : "",
      student.score ?? "",
      student.result,
    ]),
  ];
}

function sendCsv(res, filename, rows) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(rows.map((row) => row.map(csvEscape).join(",")).join("\n"));
}

function pdfTextEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines) {
  const content = [
    "BT",
    "/F1 14 Tf",
    "50 780 Td",
    ...lines.flatMap((line, index) => [
      index === 0 ? "" : "0 -24 Td",
      `(${pdfTextEscape(line)}) Tj`,
    ]).filter(Boolean),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}

router.post(
  "/",
  requireCompany,
  upload.fields([
    { name: "jobDescription", maxCount: 1 },
    { name: "studentFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const company = await Company.findById(req.companyId);
      const jobDescription = req.files?.jobDescription?.[0];
      const studentFile = req.files?.studentFile?.[0];

      if (!company) {
        return res.status(404).json({ message: "Company account not found" });
      }

      if (!req.body.driveName || !req.body.jobRole || !req.body.examDate || !req.body.examTime || !req.body.durationMinutes || !req.body.aptitudeCutoff || !req.body.lastRegistrationDate) {
        return res.status(400).json({ message: "All hiring drive fields are required" });
      }

      if (!jobDescription) {
        return res.status(400).json({ message: "Job description PDF/DOCX file is required" });
      }

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

      let parsedRounds = [];
      try {
        parsedRounds = JSON.parse(req.body.rounds || "[]");
      } catch {
        return res.status(400).json({ message: "Interview rounds format is invalid" });
      }

      const drive = await HiringDrive.create({
        company: req.companyId,
        driveName: req.body.driveName,
        jobRole: req.body.jobRole,
        jobDescriptionFile: { originalName: jobDescription.originalname, mimeType: jobDescription.mimetype, size: jobDescription.size, data: jobDescription.buffer },
        studentFile: { originalName: studentFile.originalname, mimeType: studentFile.mimetype, size: studentFile.size, data: studentFile.buffer },
        examDate: req.body.examDate,
        examTime: req.body.examTime,
        durationMinutes: Number(req.body.durationMinutes),
        rounds: parsedRounds,
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
          studentName: student.name,
          studentEmail: student.email,
          token,
          currentRound: "Aptitude",
          activationOpenAt,
          expiresAt,
        });

        const activationLink = `${clientUrl}/invite/${token}`;

        try {
          const mailResult = await sendStudentInvitationEmail({
            to: student.email,
            studentName: student.name,
            companyName: company.companyName,
            driveName: drive.driveName,
            jobRole: drive.jobRole,
            examDate: drive.examDate,
            examTime: drive.examTime,
            durationMinutes: drive.durationMinutes,
            activationLink,
          });

          invitation.emailStatus = mailResult.status;
          invitation.emailSent = mailResult.status === "sent";
          invitation.sentAt = mailResult.status === "sent" ? new Date() : undefined;
          invitation.sentTime = invitation.sentAt;
          invitation.deliveryStatus = mailResult.status === "sent" ? "Delivered to SMTP" : "SMTP Not Configured";
        } catch (error) {
          invitation.emailStatus = "failed";
          invitation.emailSent = false;
          invitation.deliveryStatus = "Failed";
          invitation.emailError = error.message;
        }

        await invitation.save();
        invitations.push({ email: student.email, activationLink, emailStatus: invitation.emailStatus });
      }

      return res.status(201).json({
        message: "Hiring Drive Created Successfully",
        drive: toPublicDrive(drive),
        studentsInvited: invitations.length,
        invitations,
      });
    } catch (error) {
      console.error("Hiring drive creation failed:", error);
      return res.status(500).json({ message: error.message || "Hiring drive creation failed. Please try again." });
    }
  },
);

router.get("/", requireCompany, async (req, res) => {
  const drives = await HiringDrive.find({ company: req.companyId }).sort({ createdAt: -1 });
  const drivesWithCounts = await Promise.all(
    drives.map(async (drive) => {
      const students = await Student.find({ drive: drive._id });

      return {
        ...toPublicDrive(drive),
        ...buildStats(students),
      };
    }),
  );

  res.json(drivesWithCounts);
});

router.get("/:driveId", requireCompany, async (req, res) => {
  const drive = await HiringDrive.findOne({ _id: req.params.driveId, company: req.companyId });

  if (!drive) {
    return res.status(404).json({ message: "Hiring drive not found" });
  }

  const invitations = await Invitation.find({ drive: drive._id }).sort({ createdAt: 1 });
  const students = await Student.find({ drive: drive._id }).sort({ createdAt: 1 });
  const invitationByStudentId = new Map(invitations.map((invitation) => [String(invitation.student), invitation]));
  const studentRows = students.map((student) => {
    const invitation = invitationByStudentId.get(String(student._id));

    return {
      _id: student._id,
      studentName: student.name,
      email: student.email,
      invitationStatus: invitation?.invitationStatus ?? "Pending",
      emailSent: invitation?.emailSent ?? false,
      emailSentStatus: invitation?.emailStatus ?? "smtp_not_configured",
      deliveryStatus: invitation?.deliveryStatus ?? "Not Sent",
      sentTime: invitation?.sentTime,
      assessmentStatus: student.assessmentStatus,
      startedAt: student.startedAt,
      completedAt: student.completedAt,
      score: student.score,
      result: student.result,
    };
  });

  res.json({
    drive: toPublicDrive(drive),
    stats: buildStats(students),
    students: studentRows,
  });
});

router.delete("/:driveId", requireCompany, async (req, res) => {
  const drive = await HiringDrive.findOneAndDelete({ _id: req.params.driveId, company: req.companyId });

  if (!drive) {
    return res.status(404).json({ message: "Hiring drive not found" });
  }

  await Invitation.deleteMany({ drive: drive._id });
  await Student.deleteMany({ drive: drive._id });

  res.json({ message: "Hiring drive deleted" });
});

router.post("/:driveId/reminders", requireCompany, async (req, res) => {
  const drive = await HiringDrive.findOne({ _id: req.params.driveId, company: req.companyId });
  const company = await Company.findById(req.companyId);

  if (!drive || !company) {
    return res.status(404).json({ message: "Hiring drive not found" });
  }

  const invitations = await Invitation.find({ drive: drive._id }).populate("student");
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  let sent = 0;
  let failed = 0;

  for (const invitation of invitations) {
    try {
      const mailResult = await sendStudentInvitationEmail({
        to: invitation.student.email,
        studentName: invitation.student.name,
        companyName: company.companyName,
        driveName: drive.driveName,
        jobRole: drive.jobRole,
        examDate: drive.examDate,
        examTime: drive.examTime,
        durationMinutes: drive.durationMinutes,
        activationLink: `${clientUrl}/invite/${invitation.token}`,
      });

      invitation.emailStatus = mailResult.status;
      invitation.emailSent = mailResult.status === "sent";
      invitation.deliveryStatus = mailResult.status === "sent" ? "Delivered to SMTP" : "SMTP Not Configured";
      invitation.sentAt = mailResult.status === "sent" ? new Date() : invitation.sentAt;
      invitation.sentTime = invitation.sentAt;
      sent += mailResult.status === "sent" ? 1 : 0;
    } catch (error) {
      invitation.emailStatus = "failed";
      invitation.emailSent = false;
      invitation.deliveryStatus = "Failed";
      invitation.emailError = error.message;
      failed += 1;
    }

    await invitation.save();
  }

  res.json({ message: "Reminder email process completed", sent, failed, total: invitations.length });
});

router.get("/:driveId/download/:type", requireCompany, async (req, res) => {
  const drive = await HiringDrive.findOne({ _id: req.params.driveId, company: req.companyId });

  if (!drive) {
    return res.status(404).json({ message: "Hiring drive not found" });
  }

  if (req.params.type === "jd") {
    if (!drive.jobDescriptionFile?.data) {
      return res.status(404).json({ message: "Job description file not found" });
    }

    res.setHeader("Content-Type", drive.jobDescriptionFile.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${drive.jobDescriptionFile.originalName || "job-description"}"`);
    return res.send(drive.jobDescriptionFile.data);
  }

  if (req.params.type === "students-file") {
    res.setHeader("Content-Type", drive.studentFile.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${drive.studentFile.originalName || "students"}"`);
    return res.send(drive.studentFile.data);
  }

  const students = await Student.find({ drive: drive._id }).sort({ createdAt: 1 });

  if (req.params.type === "qualified") {
    const qualifiedRows = buildResultRows(students.filter((student) => student.result === "Qualified"));
    return sendCsv(res, `${drive.driveName}-qualified-students.csv`, qualifiedRows);
  }

  if (req.params.type === "results") {
    return sendCsv(res, `${drive.driveName}-results.csv`, buildResultRows(students));
  }

  if (req.params.type === "report") {
    const stats = buildStats(students);
    const report = [
      "Synthora Hiring Drive Report",
      `Drive: ${drive.driveName}`,
      `Job Role: ${drive.jobRole}`,
      `Status: ${drive.status}`,
      `Exam: ${drive.examDate} ${drive.examTime}`,
      `Students Invited: ${stats.studentsInvited}`,
      `Students Logged In: ${stats.studentsLoggedIn}`,
      `Students Started: ${stats.studentsStarted}`,
      `Students Completed: ${stats.studentsCompleted}`,
      `Average Score: ${stats.averageScore}`,
      `Highest Score: ${stats.highestScore}`,
      `Lowest Score: ${stats.lowestScore}`,
      `Qualified Students: ${stats.qualifiedStudents}`,
      `Rejected Students: ${stats.rejectedStudents}`,
    ].join("\n");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${drive.driveName}-report.pdf"`);
    return res.send(buildSimplePdf(report.split("\n")));
  }

  return res.status(400).json({ message: "Unsupported download type" });
});

export default router;
