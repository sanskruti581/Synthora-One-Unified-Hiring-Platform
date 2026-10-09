import { Router } from "express";
import Invitation from "../models/Invitation.js";
import Student from "../models/Student.js";
import HiringDrive from "../models/HiringDrive.js";
import Company from "../models/Company.js";
import { requireStudent } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { getExamStartDate } from "../utils/tokens.js";
import TechnicalOralInterview from "../models/TechnicalOralInterview.js";
import { generateOralQuestion, evaluateSpokenAnswer, generateFinalOralSummary } from "../services/aiService.js";
import { getTechnicalAssessmentState, promoteStudentToTechnicalAssessment } from "../utils/technicalAssessment.js";
import { sendAptitudeClearedEmail } from "../utils/mailer.js";
import { getNextRound, normalizeRoundName, calculateOverallScore, determineFinalResult, canAccessRound, getDriveRounds } from "../utils/roundUtils.js";

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

// Login is no longer restricted to a 10-minute window before the exam.
// Students may log in as soon as their invitation is valid.

function getExamEndDate(drive) {
  return new Date(getExamStartDate(drive.examDate, drive.examTime).getTime() + Number(drive.durationMinutes) * 60 * 1000);
}

function getCountdownSeconds(targetDate) {
  return Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 1000));
}

function getDriveContext(drive) {
  return [
    `Drive: ${drive.driveName}`,
    `Role: ${drive.jobRole}`,
    drive.jobDescriptionFile?.originalName ? `Uploaded job description: ${drive.jobDescriptionFile.originalName}` : "",
  ].filter(Boolean).join("\n");
}

function countAnsweredQuestions(interview) {
  return interview.questions.filter((question) => question.score !== null && question.score !== undefined).length;
}

async function syncExpiredTechnicalWindow(student, invitation) {
  const state = getTechnicalAssessmentState(student, invitation);

  if (state !== "Expired" || student.technicalAssessmentStatus === "Expired") {
    return state;
  }

  student.technicalAssessmentStatus = "Expired";
  await student.save();

  if (invitation) {
    invitation.technicalAssessmentStatus = "Expired";
    await invitation.save();
  }

  return state;
}

async function sendAptitudeClearedEmailOnce({ student, invitation, drive, company, score }) {
  if (student.aptitudeClearedEmailSent || invitation?.aptitudeClearedEmailSent) {
    return;
  }

  try {
    const mailResult = await sendAptitudeClearedEmail({
      to: student.email,
      studentName: student.name,
      companyName: company?.companyName || "the hiring team",
      driveName: drive.driveName,
      jobRole: drive.jobRole,
      score,
    });

    student.aptitudeClearedEmailStatus = mailResult.status;
    student.aptitudeClearedEmailSent = mailResult.status === "sent";
    student.aptitudeClearedEmailError = undefined;

    if (invitation) {
      invitation.aptitudeClearedEmailStatus = mailResult.status;
      invitation.aptitudeClearedEmailSent = mailResult.status === "sent";
      invitation.aptitudeClearedEmailError = undefined;
    }
  } catch (error) {
    console.error(`Failed to send aptitude cleared email to ${student.email}:`, error?.message || error);
    student.aptitudeClearedEmailStatus = "failed";
    student.aptitudeClearedEmailSent = false;
    student.aptitudeClearedEmailError = error?.message || "Failed to send email";

    if (invitation) {
      invitation.aptitudeClearedEmailStatus = "failed";
      invitation.aptitudeClearedEmailSent = false;
      invitation.aptitudeClearedEmailError = error?.message || "Failed to send email";
    }
  }

  await student.save();
  if (invitation) {
    await invitation.save();
  }
}

function toOralSessionResponse(interview, extra = {}) {
  return {
    sessionId: interview._id,
    jobRole: interview.jobRole,
    status: interview.status,
    currentQuestionIndex: interview.currentQuestionIndex,
    maxQuestions: interview.maxQuestions,
    currentQuestion: interview.questions[interview.currentQuestionIndex] || null,
    answeredCount: countAnsweredQuestions(interview),
    overallScore: interview.overallScore,
    overallFeedback: interview.overallFeedback,
    technicalAccuracyAvg: interview.technicalAccuracyAvg,
    conceptualKnowledgeAvg: interview.conceptualKnowledgeAvg,
    communicationSkillAvg: interview.communicationSkillAvg,
    completenessAvg: interview.completenessAvg,
    relevanceAvg: interview.relevanceAvg,
    questions: interview.questions,
    isFinished: interview.status === "Completed",
    ...extra,
  };
}

async function completeOralInterview({ interview, studentId }) {
  const evaluatedTurns = interview.questions.filter((question) => question.score !== null && question.score !== undefined);

  if (evaluatedTurns.length < interview.maxQuestions) {
    const error = new Error("Interview cannot be finished until all oral questions are evaluated.");
    error.statusCode = 400;
    throw error;
  }

  const drive = await HiringDrive.findById(interview.driveId);
  const student = await Student.findById(studentId);

  if (!drive || !student) {
    const error = new Error("Interview owner or hiring drive could not be found.");
    error.statusCode = 404;
    throw error;
  }

  const summary = await generateFinalOralSummary({
    jobRole: interview.jobRole,
    jobDescription: getDriveContext(drive),
    turns: interview.questions,
  });

  interview.status = "Completed";
  interview.completedAt = new Date();
  interview.overallScore = Math.min(Math.max(Number(summary.overallScore) || 0, 0), 100);
  interview.overallFeedback = summary.overallFeedback;
  interview.technicalAccuracyAvg = summary.technicalAccuracyAvg;
  interview.conceptualKnowledgeAvg = summary.conceptualKnowledgeAvg;
  interview.communicationSkillAvg = summary.communicationSkillAvg;
  interview.completenessAvg = summary.completenessAvg;
  interview.relevanceAvg = summary.relevanceAvg;
  await interview.save();

  const oralCutoff = drive.technicalOralCutoff ?? 60;
  const isOralPassed = interview.overallScore >= oralCutoff;
  const finalResult = isOralPassed ? "Qualified" : "Rejected";
  const completedAt = new Date();

  student.technicalOralScore = interview.overallScore;
  student.technicalOralStatus = "Completed";
  student.technicalAssessmentStatus = "Completed";
  student.technicalOralInterview = interview._id;
  student.assessmentStatus = "Completed";
  student.completedAt = completedAt;

  // Record roundResults
  student.roundResults = (student.roundResults || []).filter(r => normalizeRoundName(r.roundName) !== "Technical Oral");
  student.roundResults.push({
    roundName: "Technical Oral",
    status: "Completed",
    score: interview.overallScore,
    maxScore: 100,
    completedAt,
  });

  student.overallScore = calculateOverallScore(drive, student);
  student.result = determineFinalResult(drive, student);
  await student.save();

  await Invitation.findOneAndUpdate(
    { student: student._id, drive: interview.driveId },
    {
      technicalOralScore: interview.overallScore,
      technicalOralStatus: "Completed",
      technicalAssessmentStatus: "Completed",
      assessmentStatus: "Completed",
      completedAt,
      overallScore: student.overallScore,
      result: student.result,
    }
  );

  return { summary, result: student.result };
}

router.get("/invite/:token", async (req, res) => {
  const payload = await getInvitationPayload(req.params.token);

  if (!payload) {
    return res.status(404).json({ message: "Invalid invitation link" });
  }

  const { invitation, student, drive, company } = payload;
  const now = new Date();
  const isTechnicalRound = invitation.currentRound === "Technical Oral" || student.currentRound === "Technical Oral";

  if (isTechnicalRound) {
    const techStartsAt = invitation.technicalAssessmentAccessStartsAt || student.technicalAssessmentAccessStartsAt || now;
    const techExpiresAt = invitation.technicalAssessmentAccessExpiresAt || student.technicalAssessmentAccessExpiresAt || invitation.expiresAt;
    const isTechCompleted = invitation.technicalOralStatus === "Completed" || student.technicalOralStatus === "Completed";
    const isTechExpired = invitation.technicalAssessmentStatus === "Expired" || (techExpiresAt && now > new Date(techExpiresAt));
    const canAccessTech = !isTechCompleted && !isTechExpired && now >= new Date(techStartsAt);

    return res.json({
      token: invitation.token,
      invitationStatus: isTechExpired ? "Expired" : "Activated",
      alreadyActivated: true,
      email: student.email,
      studentName: student.name,
      driveName: drive.driveName,
      jobRole: drive.jobRole,
      companyName: company.companyName,
      examDate: drive.examDate,
      examTime: drive.examTime,
      durationMinutes: 15,
      status: isTechCompleted ? "Completed" : isTechExpired ? "Closed" : canAccessTech ? "Ready to Begin" : "Window Not Open",
      roundName: "Technical Oral Round (AI Viva)",
      driveId: drive._id,
      examStartAt: techStartsAt,
      examEndAt: techExpiresAt,
      loginWindowOpenAt: techStartsAt,
      canLogin: canAccessTech,
      canStartAssessment: canAccessTech,
      loginCountdownSeconds: 0,
      examCountdownSeconds: 0,
      activationOpenAt: techStartsAt,
      expiresAt: techExpiresAt,
      currentRound: "Technical Oral",
      redirectUrl: `/assessment/${drive._id}/oral`,
    });
  }
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime);
  const examEndAt = getExamEndDate(drive);

  if (now > invitation.expiresAt && invitation.invitationStatus !== "Activated") {
    invitation.invitationStatus = "Expired";
    await invitation.save();
  }

  // canLogin: students may log in any time before the exam window closes (or has expired)
  const invitationExpired = now > invitation.expiresAt && invitation.invitationStatus !== "Activated";
  const examClosed = now >= examEndAt;
  const canLogin = !invitationExpired && !examClosed;

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
        : examClosed
          ? "Closed"
          : invitation.assessmentStatus === "Started"
            ? "Assessment Started"
            : "Ready to Begin",
    roundName: invitation.currentRound || "Aptitude",
    driveId: drive._id,
    examStartAt,
    examEndAt,
    canLogin,
    canStartAssessment: now >= examStartAt && now < examEndAt,
    examCountdownSeconds: getCountdownSeconds(examStartAt),
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
  const isTechnicalRound = invitation.currentRound === "Technical Oral" || student.currentRound === "Technical Oral";

  if (isTechnicalRound) {
    const techStartsAt = invitation.technicalAssessmentAccessStartsAt || student.technicalAssessmentAccessStartsAt || now;
    const techExpiresAt = invitation.technicalAssessmentAccessExpiresAt || student.technicalAssessmentAccessExpiresAt || invitation.expiresAt;
    const isTechCompleted = invitation.technicalOralStatus === "Completed" || student.technicalOralStatus === "Completed";
    const isTechExpired = invitation.technicalAssessmentStatus === "Expired" || (techExpiresAt && now > new Date(techExpiresAt));

    if (isTechCompleted) {
      return res.status(400).json({ message: "Technical Oral Round is already completed" });
    }

    if (isTechExpired) {
      invitation.technicalAssessmentStatus = "Expired";
      student.technicalAssessmentStatus = "Expired";
      await Promise.all([invitation.save(), student.save()]);
      return res.status(403).json({ message: "The Technical Assessment access window has expired" });
    }

    if (now < new Date(techStartsAt)) {
      return res.status(403).json({ message: "The Technical Assessment access window is not open yet" });
    }

    student.isActive = true;
    student.lastLogin = now;
    student.currentRound = "Technical Oral";
    await student.save();

    invitation.invitationStatus = "Activated";
    invitation.currentRound = "Technical Oral";
    invitation.lastLogin = now;
    await invitation.save();

    const authToken = jwt.sign({ id: student._id, userType: "student" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });

    return res.json({
      message: "Technical Oral Round started",
      token: authToken,
      driveId: drive._id,
      studentName: student.name,
      companyName: company.companyName,
      driveName: drive.driveName,
      currentRound: "Technical Oral",
      redirectUrl: `/assessment/${drive._id}/oral`,
      examStartAt: techStartsAt,
      loginWindowOpenAt: techStartsAt,
    });
  }
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime);
  const examEndAt = getExamEndDate(drive);

  // Invitation expiry check (unchanged)
  if (now > invitation.expiresAt && invitation.invitationStatus !== "Activated") {
    invitation.invitationStatus = "Expired";
    await invitation.save();
    return res.status(403).json({ message: "This invitation has expired" });
  }

  // Exam window closed check (unchanged)
  if (now >= examEndAt) {
    return res.status(403).json({ message: "The assessment window has already closed.", examEndAt });
  }

  // No login-window restriction: students may log in any time before the exam window closes.

  student.isActive = true;
  student.activatedAt = student.activatedAt || now;
  if (student.assessmentStatus === "Pending") {
    student.assessmentStatus = "Logged In";
  }
  student.lastLogin = now;
  if (!student.currentRound) {
    student.currentRound = "Aptitude";
  }
  await student.save();

  invitation.invitationStatus = "Activated";
  if (invitation.assessmentStatus === "Pending") {
    invitation.assessmentStatus = "Logged In";
  }
  if (!invitation.currentRound) {
    invitation.currentRound = "Aptitude";
  }
  invitation.lastLogin = now;
  invitation.usedAt = invitation.usedAt || now;
  await invitation.save();

  const authToken = jwt.sign({ id: student._id, userType: "student" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });

  const redirectUrl =
    student.currentRound === "Technical Oral"
      ? `/assessment/${drive._id}/oral`
      : student.currentRound === "Coding"
        ? `/coding/${drive._id}`
        : `/assessment/${drive._id}`;

  res.json({
    message: "Logged in successfully",
    token: authToken,
    driveId: drive._id,
    studentName: student.name,
    companyName: company.companyName,
    driveName: drive.driveName,
    currentRound: student.currentRound,
    redirectUrl,
    examStartAt,
    examEndAt,
    canStartAssessment: now >= examStartAt && now < examEndAt,
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
  // Removed: login-window restriction that blocked activation until 10 min before exam.
  // Students may activate their invitation as soon as the link is valid.

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
  const invitation = await Invitation.findOne({ student: student._id, drive: student.drive });

  if (!drive || !company) {
    return res.status(404).json({ message: "Student assessment drive is not available" });
  }

  const technicalAssessmentStatus = await syncExpiredTechnicalWindow(student, invitation);

  res.json({
    companyName: company.companyName,
    driveName: drive.driveName,
    driveId: drive._id,
    jobRole: drive.jobRole,
    examDate: drive.examDate,
    examTime: drive.examTime,
    durationMinutes: drive.durationMinutes,
    rounds: drive.rounds,
    assessmentStatus: student.assessmentStatus,
    startedAt: student.startedAt,
    completedAt: student.completedAt,
    examStartAt: getExamStartDate(drive.examDate, drive.examTime),
    examEndAt: getExamEndDate(drive),
    currentRound: student.currentRound,
    score: student.score,
    aptitudeScore: student.aptitudeScore ?? student.score,
    codingScore: student.codingScore,
    overallScore: student.overallScore ?? student.score,
    technicalOralScore: student.technicalOralScore,
    technicalOralStatus: student.technicalOralStatus || "Not Started",
    technicalAssessmentStatus,
    technicalAssessmentInvitedAt: invitation?.technicalAssessmentInvitedAt || student.technicalAssessmentInvitedAt,
    technicalAssessmentAccessStartsAt: invitation?.technicalAssessmentAccessStartsAt || student.technicalAssessmentAccessStartsAt,
    technicalAssessmentAccessExpiresAt: invitation?.technicalAssessmentAccessExpiresAt || student.technicalAssessmentAccessExpiresAt,
    roundResults: student.roundResults,
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
  const invitation = await Invitation.findOne({ student: student._id, drive: student.drive });

  if (!drive || !company) {
    return res.status(404).json({ message: "Assessment drive is not available" });
  }

  const technicalAssessmentStatus = await syncExpiredTechnicalWindow(student, invitation);

  res.json({
    studentName: student.name,
    companyName: company.companyName,
    driveName: drive.driveName,
    driveId: drive._id,
    examDate: drive.examDate,
    examTime: drive.examTime,
    durationMinutes: drive.durationMinutes,
    assessmentStatus: student.assessmentStatus,
    startedAt: student.startedAt,
    examStartAt: getExamStartDate(drive.examDate, drive.examTime),
    examEndAt: getExamEndDate(drive),
    canStartAssessment: new Date() >= getExamStartDate(drive.examDate, drive.examTime) && new Date() < getExamEndDate(drive),
    answers: student.answers instanceof Map ? Object.fromEntries(student.answers) : (student.answers || {}),
    rounds: drive.rounds,
    aptitudeCutoff: drive.aptitudeCutoff,
    technicalOralCutoff: drive.technicalOralCutoff || 60,
    aptitudeScore: student.aptitudeScore ?? student.score,
    codingScore: student.codingScore,
    overallScore: student.overallScore ?? student.score,
    technicalOralScore: student.technicalOralScore,
    technicalOralStatus: student.technicalOralStatus || "Not Started",
    technicalAssessmentStatus,
    technicalAssessmentInvitedAt: invitation?.technicalAssessmentInvitedAt || student.technicalAssessmentInvitedAt,
    technicalAssessmentAccessStartsAt: invitation?.technicalAssessmentAccessStartsAt || student.technicalAssessmentAccessStartsAt,
    technicalAssessmentAccessExpiresAt: invitation?.technicalAssessmentAccessExpiresAt || student.technicalAssessmentAccessExpiresAt,
    currentRound: student.currentRound,
    roundResults: student.roundResults,
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
  const examEndAt = getExamEndDate(drive);

  if (now < examStartAt) {
    return res.status(403).json({
      message: "Assessment can only start at the official exam time",
      examStartAt,
      startCountdownSeconds: getCountdownSeconds(examStartAt),
    });
  }

  if (now >= examEndAt) {
    return res.status(403).json({ message: "Assessment window is closed", examStartAt, examEndAt });
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
  const examEndAt = getExamEndDate(drive);

  if (now < examStartAt) {
    return res.status(403).json({
      message: "Assessment can only start at the official exam time",
      examStartAt,
      startCountdownSeconds: getCountdownSeconds(examStartAt),
    });
  }

  if (now >= examEndAt) {
    return res.status(403).json({ message: "Assessment window is closed", examStartAt, examEndAt });
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

  const company = await Company.findById(drive.company);
  const invitation = await Invitation.findOne({ student: student._id, drive: student.drive });
  const existingScore = student.aptitudeScore ?? student.score;

  if (student.assessmentStatus === "Completed" && typeof existingScore === "number") {
    const existingQualified = existingScore >= Number(drive.aptitudeCutoff);
    return res.json({
      message: "Aptitude Assessment Completed",
      score: existingScore,
      result: student.result,
      isAptitudeQualified: existingQualified,
      qualifiedForOral: false,
      nextRound: null,
      completedAt: student.completedAt,
    });
  }

  const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  const score = Number(req.body.score ?? 0);
  const isAptitudeQualified = score >= Number(drive.aptitudeCutoff);
  const completedAt = new Date();

  // Save basic aptitude info
  student.answers = answers;
  student.score = score;
  student.aptitudeScore = score;

  // Add round result for Aptitude
  student.roundResults = (student.roundResults || []).filter(r => normalizeRoundName(r.roundName) !== "Aptitude");
  student.roundResults.push({
    roundName: "Aptitude",
    status: "Completed",
    score: score,
    maxScore: (Object.keys(answers).length || 0) * 20 || 100,
    completedAt: completedAt,
  });

  if (!isAptitudeQualified) {
    student.assessmentStatus = "Completed";
    student.completedAt = completedAt;
    student.result = "Rejected";
    student.currentRound = "Aptitude";
    student.overallScore = calculateOverallScore(drive, student);
    await student.save();

    if (invitation) {
      invitation.assessmentStatus = "Completed";
      invitation.completedAt = completedAt;
      invitation.answers = answers;
      invitation.score = score;
      invitation.aptitudeScore = score;
      invitation.result = "Rejected";
      await invitation.save();
    }

    return res.json({
      message: "Aptitude Assessment Completed. Cutoff not cleared.",
      score,
      result: "Rejected",
      isAptitudeQualified: false,
      nextRound: null,
      completedAt,
    });
  }

  // Aptitude cleared!
  try {
    await sendAptitudeClearedEmailOnce({ student, invitation, drive, company, score });
  } catch (err) {
    console.warn("Could not send aptitude cleared email:", err?.message);
  }

  const nextRound = getNextRound(drive, "Aptitude");

  if (nextRound) {
    student.currentRound = nextRound;
    student.result = "Pending";

    if (nextRound === "Technical Oral") {
      await promoteStudentToTechnicalAssessment({ student, drive, company, invitation });
    }

    await student.save();

    if (invitation) {
      invitation.currentRound = nextRound;
      invitation.answers = answers;
      invitation.score = score;
      invitation.aptitudeScore = score;
      invitation.result = "Pending";
      await invitation.save();
    }

    return res.json({
      message: `Aptitude round completed! Next round is ${nextRound}.`,
      score,
      result: "Qualified",
      isAptitudeQualified: true,
      nextRound,
      completedAt,
    });
  } else {
    student.assessmentStatus = "Completed";
    student.completedAt = completedAt;
    student.result = "Qualified";
    student.overallScore = calculateOverallScore(drive, student);
    await student.save();

    if (invitation) {
      invitation.assessmentStatus = "Completed";
      invitation.completedAt = completedAt;
      invitation.answers = answers;
      invitation.score = score;
      invitation.aptitudeScore = score;
      invitation.result = "Qualified";
      await invitation.save();
    }

    return res.json({
      message: "Assessment result stored",
      score,
      result: "Qualified",
      isAptitudeQualified: true,
      nextRound: null,
      completedAt,
    });
  }
});

// ==========================================
// TECHNICAL ORAL ROUND (AI VIVA) ROUTES
// ==========================================

router.post("/oral/start", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const drive = await HiringDrive.findById(student.drive);
    if (!drive) {
      return res.status(404).json({ message: "Hiring drive not found" });
    }

    const hasOralRound = Array.isArray(drive.rounds) && drive.rounds.includes("Technical Oral");
    if (!hasOralRound) {
      return res.status(400).json({ message: "Technical Oral Round is not configured for this hiring drive" });
    }

    // Validate candidate has completed and qualified all previous rounds (Aptitude -> Coding)
    if (!canAccessRound(drive, student, "Technical Oral") || student.result === "Rejected") {
      return res.status(403).json({ message: "You must complete and qualify previous rounds before accessing the Technical Oral Round" });
    }

    const invitation = await Invitation.findOne({ student: student._id, drive: drive._id });
    let startsAt = invitation?.technicalAssessmentAccessStartsAt || student.technicalAssessmentAccessStartsAt;
    let expiresAt = invitation?.technicalAssessmentAccessExpiresAt || student.technicalAssessmentAccessExpiresAt;
    let technicalState = await syncExpiredTechnicalWindow(student, invitation);

    if (!startsAt || !expiresAt || technicalState === "Not Selected") {
      if (student.currentRound === "Technical Oral" || canAccessRound(drive, student, "Technical Oral")) {
        const company = await Company.findById(drive.company);
        await promoteStudentToTechnicalAssessment({ student, drive, company, invitation });
        startsAt = student.technicalAssessmentAccessStartsAt;
        expiresAt = student.technicalAssessmentAccessExpiresAt;
        technicalState = "Active";
      } else {
        return res.status(403).json({
          message: "You have not been invited to the Technical Assessment yet.",
          technicalAssessmentStatus: "Not Selected",
        });
      }
    }

    const now = new Date();
    if (now < new Date(startsAt)) {
      return res.status(403).json({
        message: "Your Technical Assessment is not available yet.",
        technicalAssessmentStatus: "Shortlisted",
        technicalAssessmentAccessStartsAt: startsAt,
        technicalAssessmentAccessExpiresAt: expiresAt,
      });
    }

    if (now > new Date(expiresAt) && student.technicalOralStatus !== "Completed") {
      return res.status(403).json({
        message: "Your Technical Assessment access window has expired.",
        technicalAssessmentStatus: "Expired",
        technicalAssessmentAccessStartsAt: startsAt,
        technicalAssessmentAccessExpiresAt: expiresAt,
      });
    }

    // Check for existing interview session
    let interview = await TechnicalOralInterview.findOne({
      studentId: student._id,
      driveId: drive._id,
      companyId: drive.company,
      status: { $ne: "Terminated" },
    }).sort({ createdAt: -1 });

    if (interview) {
      if (interview.status === "Completed") {
        return res.json(toOralSessionResponse(interview, {
          message: "Technical Oral Round already completed",
        }));
      }

      // Resume existing in-progress session
      return res.json(toOralSessionResponse(interview, {
        message: "Resuming oral interview session",
      }));
    }

    // Generate Question 1
    const firstQ = await generateOralQuestion({
      jobRole: drive.jobRole,
      jobDescription: getDriveContext(drive),
      questionNumber: 1,
      previousTurns: [],
    });

    interview = await TechnicalOralInterview.create({
      studentId: student._id,
      driveId: drive._id,
      companyId: drive.company,
      jobRole: drive.jobRole,
      status: "In Progress",
      currentQuestionIndex: 0,
      maxQuestions: 5,
      questions: [
        {
          questionNumber: 1,
          category: firstQ.category,
          question: firstQ.question,
        },
      ],
    });

    student.technicalOralInterview = interview._id;
    student.technicalOralStatus = "In Progress";
    student.technicalAssessmentStatus = "In Progress";
    student.currentRound = "Technical Oral";
    await student.save();

    await Invitation.findOneAndUpdate(
      { student: student._id, drive: drive._id },
      { currentRound: "Technical Oral", technicalOralStatus: "In Progress", technicalAssessmentStatus: "In Progress" }
    );

    res.json(toOralSessionResponse(interview, {
      message: "Technical Oral interview started",
    }));
  } catch (error) {
    console.error("[Synthora Oral] Start oral error:", error);
    res.status(500).json({ message: "Failed to initialize Technical Oral Round", error: error.message });
  }
});

router.post("/oral/:sessionId/answer", requireStudent, async (req, res) => {
  try {
    const { spokenAnswer = "" } = req.body;
    const interview = await TechnicalOralInterview.findOne({
      _id: req.params.sessionId,
      studentId: req.studentId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview session not found or unauthorized" });
    }

    if (interview.status === "Completed") {
      return res.status(400).json({ message: "Interview session is already completed" });
    }

    const currentIndex = interview.currentQuestionIndex;
    const currentQ = interview.questions[currentIndex];

    if (!currentQ) {
      return res.status(400).json({ message: "Active question not found" });
    }

    if (currentQ.score !== null && currentQ.score !== undefined) {
      return res.status(400).json({ message: "Current question was already evaluated" });
    }

    const drive = await HiringDrive.findOne({ _id: interview.driveId, company: interview.companyId });
    if (!drive) {
      return res.status(404).json({ message: "Hiring drive not found for this interview" });
    }

    // Evaluate answer with Groq
    const evaluation = await evaluateSpokenAnswer({
      jobRole: interview.jobRole,
      jobDescription: getDriveContext(drive),
      category: currentQ.category,
      question: currentQ.question,
      answer: spokenAnswer,
    });

    currentQ.spokenAnswer = spokenAnswer;
    currentQ.score = evaluation.score;
    currentQ.technicalAccuracy = evaluation.technicalAccuracy;
    currentQ.conceptualKnowledge = evaluation.conceptualKnowledge;
    currentQ.communicationSkill = evaluation.communicationSkill;
    currentQ.completeness = evaluation.completeness;
    currentQ.relevance = evaluation.relevance;
    currentQ.feedback = evaluation.feedback;
    currentQ.isSatisfactory = evaluation.isSatisfactory;
    currentQ.answeredAt = new Date();

    const isLastQuestion = currentIndex >= interview.maxQuestions - 1;

    if (isLastQuestion) {
      await interview.save();
      const { summary, result } = await completeOralInterview({ interview, studentId: req.studentId });

      return res.json({
        isFinished: true,
        evaluation,
        overallScore: summary.overallScore,
        overallFeedback: summary.overallFeedback,
        result,
        interview: toOralSessionResponse(interview),
      });
    }

    // Generate Next Question
    const nextQuestionNumber = currentIndex + 2;
    const nextQ = await generateOralQuestion({
      jobRole: interview.jobRole,
      jobDescription: getDriveContext(drive),
      questionNumber: nextQuestionNumber,
      previousTurns: interview.questions,
    });

    interview.questions.push({
      questionNumber: nextQuestionNumber,
      category: nextQ.category,
      question: nextQ.question,
    });
    interview.currentQuestionIndex = currentIndex + 1;
    await interview.save();

    return res.json({
      isFinished: false,
      evaluation,
      currentQuestionIndex: interview.currentQuestionIndex,
      nextQuestion: interview.questions[interview.currentQuestionIndex],
      answeredCount: countAnsweredQuestions(interview),
    });
  } catch (error) {
    console.error("[Synthora Oral] Answer evaluation error:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Failed to evaluate response" });
  }
});

router.get("/oral/:sessionId", requireStudent, async (req, res) => {
  try {
    const interview = await TechnicalOralInterview.findOne({
      _id: req.params.sessionId,
      studentId: req.studentId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview session not found" });
    }

    res.json(toOralSessionResponse(interview));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch oral session", error: error.message });
  }
});

router.post("/oral/:sessionId/finish", requireStudent, async (req, res) => {
  try {
    const interview = await TechnicalOralInterview.findOne({
      _id: req.params.sessionId,
      studentId: req.studentId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview session not found or unauthorized" });
    }

    if (interview.status === "Completed") {
      return res.json(toOralSessionResponse(interview, {
        message: "Technical Oral Round already completed",
      }));
    }

    const { summary, result } = await completeOralInterview({ interview, studentId: req.studentId });

    return res.json(toOralSessionResponse(interview, {
      message: "Technical Oral Round finished",
      overallScore: summary.overallScore,
      overallFeedback: summary.overallFeedback,
      result,
    }));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Failed to finish oral interview" });
  }
});

export default router;
