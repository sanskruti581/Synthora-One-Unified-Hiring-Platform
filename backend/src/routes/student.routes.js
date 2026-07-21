import { Router } from "express";
import Invitation from "../models/Invitation.js";
import Student from "../models/Student.js";
import HiringDrive from "../models/HiringDrive.js";
import Company from "../models/Company.js";
import { requireStudent } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { getExamStartDate } from "../utils/tokens.js";

const router = Router();

async function getInvitationPayload(token) {
  const invitation = await Invitation.findOne({ token });

  if (!invitation) {
    return null;
  }

  const student = await Student.findById(invitation.student);
  const drive = await HiringDrive.findById(invitation.drive);
  const company = await Company.findById(invitation.company);

  return { invitation, student, drive, company };
}

function getLoginWindowOpenAt(drive) {
  return new Date(getExamStartDate(drive.examDate, drive.examTime).getTime() - 10 * 60 * 1000);
}

function getCountdownSeconds(targetDate) {
  return Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 1000));
}

router.get("/invite/:token", async (req, res) => {
  const payload = await getInvitationPayload(req.params.token);

  if (!payload) {
    return res.status(404).json({ message: "Invalid invitation link" });
  }

  const { invitation, student, drive, company } = payload;
  const now = new Date();
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime);
  const loginWindowOpenAt = getLoginWindowOpenAt(drive);

  if (now > invitation.expiresAt && invitation.invitationStatus !== "Activated") {
    invitation.invitationStatus = "Expired";
    await invitation.save();
  }

  return res.json({
    token: invitation.token,
    invitationStatus: invitation.invitationStatus,
    alreadyActivated: Boolean(student.isActive || invitation.usedAt),
    email: student.email,
    studentName: student.name,
    driveName: drive.driveName,
    jobRole: drive.jobRole,
    companyName: company.companyName,
    examDate: drive.examDate,
    examTime: drive.examTime,
    durationMinutes: drive.durationMinutes,
    status:
      invitation.assessmentStatus === "Completed"
        ? "Completed"
        : now < loginWindowOpenAt
          ? "Login Window Closed"
          : invitation.assessmentStatus === "Started"
            ? "Assessment Started"
            : "Ready to Begin",
    roundName: invitation.currentRound || "Aptitude",
    driveId: drive._id,
    examStartAt,
    loginWindowOpenAt,
    canLogin: now >= loginWindowOpenAt && now < examStartAt,
    canStartAssessment: now >= examStartAt,
    loginCountdownSeconds: getCountdownSeconds(loginWindowOpenAt),
    examCountdownSeconds: getCountdownSeconds(examStartAt),
    activationOpenAt: invitation.activationOpenAt,
    expiresAt: invitation.expiresAt,
  });
});

router.post("/invite/:token/start", async (req, res) => {
  const payload = await getInvitationPayload(req.params.token);

  if (!payload) {
    return res.status(404).json({ message: "Invalid invitation link" });
  }

  const { invitation, student, drive, company } = payload;
  const now = new Date();
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime);
  const loginWindowOpenAt = getLoginWindowOpenAt(drive);

  if (now > invitation.expiresAt) {
    invitation.invitationStatus = "Expired";
    await invitation.save();
    return res.status(403).json({ message: "This invitation has expired" });
  }

  if (now < loginWindowOpenAt) {
    return res.status(403).json({
      message: "The assessment login window has not opened yet.",
      loginWindowOpenAt,
      examStartAt,
      loginCountdownSeconds: getCountdownSeconds(loginWindowOpenAt),
    });
  }

  student.isActive = true;
  student.activatedAt = student.activatedAt || now;
  student.assessmentStatus = "Logged In";
  student.lastLogin = now;
  student.currentRound = "Aptitude";
  await student.save();

  invitation.invitationStatus = "Activated";
  invitation.assessmentStatus = "Logged In";
  invitation.currentRound = "Aptitude";
  invitation.lastLogin = now;
  invitation.usedAt = invitation.usedAt || now;
  await invitation.save();

  const authToken = jwt.sign({ id: student._id, userType: "student" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });

  res.json({
    message: "Assessment started",
    token: authToken,
    driveId: drive._id,
    studentName: student.name,
    companyName: company.companyName,
    driveName: drive.driveName,
    examStartAt,
    loginWindowOpenAt,
  });
});

router.post("/activate/:token", async (req, res) => {
  const payload = await getInvitationPayload(req.params.token);

  if (!payload) {
    return res.status(404).json({ message: "Invalid invitation link" });
  }

  const { invitation, student, drive, company } = payload;

  if (student.isActive || invitation.usedAt) {
    return res.json({
      message: "Invitation already activated",
      alreadyActivated: true,
      email: student.email,
      driveName: drive.driveName,
      companyName: company.companyName,
      examDate: drive.examDate,
      examTime: drive.examTime,
    });
  }

  const now = new Date();
  if (now < invitation.activationOpenAt) {
    return res.status(403).json({
      message: "This link opens 10 minutes before the exam starts",
      activationOpenAt: invitation.activationOpenAt,
    });
  }

  if (now > invitation.expiresAt) {
    invitation.invitationStatus = "Expired";
    await invitation.save();
    return res.status(403).json({ message: "This invitation has expired" });
  }

  await Student.findByIdAndUpdate(invitation.student, { isActive: true, activatedAt: now });
  invitation.invitationStatus = "Activated";
  invitation.usedAt = now;
  await invitation.save();

  return res.json({
    message: "Invitation activated successfully",
    alreadyActivated: false,
    email: student.email,
    temporaryPassword: student.plainPasswordForInitialEmail,
    driveName: drive.driveName,
    companyName: company.companyName,
    examDate: drive.examDate,
    examTime: drive.examTime,
  });
});

router.get("/me/dashboard", requireStudent, async (req, res) => {
  const student = await Student.findById(req.studentId);

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const drive = await HiringDrive.findById(student.drive);
  const company = await Company.findById(student.company);

  if (!drive || !company) {
    return res.status(404).json({ message: "Student assessment drive is not available" });
  }

  res.json({
    companyName: company.companyName,
    driveName: drive.driveName,
    jobRole: drive.jobRole,
    examDate: drive.examDate,
    examTime: drive.examTime,
    durationMinutes: drive.durationMinutes,
    rounds: drive.rounds,
    assessmentStatus: student.assessmentStatus,
    startedAt: student.startedAt,
    completedAt: student.completedAt,
    currentRound: student.currentRound,
    score: student.score,
    result: student.result,
  });
});

router.get("/assessment/:driveId", requireStudent, async (req, res) => {
  const student = await Student.findOne({ _id: req.studentId, drive: req.params.driveId });

  if (!student) {
    return res.status(404).json({ message: "Assessment not found for this student" });
  }

  const drive = await HiringDrive.findById(student.drive);
  const company = await Company.findById(student.company);

  if (!drive || !company) {
    return res.status(404).json({ message: "Assessment drive is not available" });
  }

  res.json({
    studentName: student.name,
    companyName: company.companyName,
    driveName: drive.driveName,
    driveId: drive._id,
    examDate: drive.examDate,
    examTime: drive.examTime,
    durationMinutes: drive.durationMinutes,
    assessmentStatus: student.assessmentStatus,
    examStartAt: getExamStartDate(drive.examDate, drive.examTime),
    loginWindowOpenAt: getLoginWindowOpenAt(drive),
    canStartAssessment: new Date() >= getExamStartDate(drive.examDate, drive.examTime),
    answers: student.answers instanceof Map ? Object.fromEntries(student.answers) : (student.answers || {}),
  });
});

router.post("/assessment/start", requireStudent, async (req, res) => {
  const student = await Student.findById(req.studentId);

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const drive = await HiringDrive.findById(student.drive);

  if (!drive) {
    return res.status(404).json({ message: "Hiring drive not found" });
  }

  const now = new Date();
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime);

  if (now < examStartAt) {
    return res.status(403).json({
      message: "Assessment can only start at the official exam time",
      examStartAt,
      startCountdownSeconds: getCountdownSeconds(examStartAt),
    });
  }

  student.assessmentStatus = "Started";
  student.startedAt = student.startedAt || now;
  student.currentRound = "Aptitude";
  await student.save();

  await Invitation.findOneAndUpdate(
    { student: student._id, drive: student.drive },
    { assessmentStatus: "Started", startedAt: student.startedAt, currentRound: "Aptitude" },
  );

  res.json({ message: "Assessment started", assessmentStatus: student.assessmentStatus, startedAt: student.startedAt });
});

router.post("/assessment/:driveId/start", requireStudent, async (req, res) => {
  const student = await Student.findOne({ _id: req.studentId, drive: req.params.driveId });

  if (!student) {
    return res.status(404).json({ message: "Assessment not found for this student" });
  }

  const drive = await HiringDrive.findById(student.drive);

  if (!drive) {
    return res.status(404).json({ message: "Hiring drive not found" });
  }

  const now = new Date();
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime);

  if (now < examStartAt) {
    return res.status(403).json({
      message: "Assessment can only start at the official exam time",
      examStartAt,
      startCountdownSeconds: getCountdownSeconds(examStartAt),
    });
  }

  student.assessmentStatus = "Started";
  student.startedAt = student.startedAt || now;
  student.currentRound = "Aptitude";
  await student.save();

  await Invitation.findOneAndUpdate(
    { student: student._id, drive: student.drive },
    { assessmentStatus: "Started", startedAt: student.startedAt, currentRound: "Aptitude" },
  );

  res.json({
    message: "Assessment started",
    assessmentStatus: student.assessmentStatus,
    startedAt: student.startedAt,
    currentRound: student.currentRound,
  });
});

router.post("/assessment/:driveId/answers", requireStudent, async (req, res) => {
  const student = await Student.findOne({ _id: req.studentId, drive: req.params.driveId });

  if (!student) {
    return res.status(404).json({ message: "Assessment not found for this student" });
  }

  const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  student.answers = answers;
  await student.save();

  await Invitation.findOneAndUpdate(
    { student: student._id, drive: student.drive },
    { answers },
  );

  res.json({ message: "Answers saved" });
});

router.post("/assessment/complete", requireStudent, async (req, res) => {
  const student = await Student.findById(req.studentId);

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const drive = await HiringDrive.findById(student.drive);

  if (!drive) {
    return res.status(404).json({ message: "Hiring drive not found" });
  }

  const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  const score = Number(req.body.score ?? 0);
  const result = score >= Number(drive.aptitudeCutoff) ? "Qualified" : "Rejected";
  const completedAt = new Date();

  student.assessmentStatus = "Completed";
  student.completedAt = completedAt;
  student.answers = answers;
  student.score = score;
  student.result = result;
  await student.save();

  await Invitation.findOneAndUpdate(
    { student: student._id, drive: student.drive },
    { assessmentStatus: "Completed", completedAt, answers, score, result },
  );

  res.json({ message: "Assessment result stored", score, result, completedAt });
});

export default router;
