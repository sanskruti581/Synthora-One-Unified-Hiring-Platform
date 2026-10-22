import { Router } from "express";
import Invitation from "../models/Invitation.js";
import Student from "../models/Student.js";
import HiringDrive from "../models/HiringDrive.js";
import Company from "../models/Company.js";
import AptitudeQuestion from "../models/AptitudeQuestion.js";
import { requireStudent } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { getExamStartDate, getExamEndDate } from "../utils/tokens.js";
import TechnicalOralInterview from "../models/TechnicalOralInterview.js";
import { generateOralQuestion, evaluateSpokenAnswer, generateFinalOralSummary } from "../services/aiService.js";
import { getTechnicalAssessmentState } from "../utils/technicalAssessment.js";
import { sendAptitudeClearedEmail } from "../utils/mailer.js";
import { getNextRound, normalizeRoundName, calculateOverallScore, determineFinalResult, canAccessRound, getDriveRounds } from "../utils/roundUtils.js";

const router = Router();

// Demo aptitude questions used as fallback when no drive-specific questions are configured
const DEMO_APTITUDE_QUESTIONS = [
  {
    question: "If a number is increased by 20% and then decreased by 20%, what is the net change?",
    options: ["No change", "4% decrease", "4% increase", "2% decrease"],
    correctAnswer: "4% decrease",
    category: "Quantitative",
  },
  {
    question: "A train covers 180 km in 3 hours. What is its average speed?",
    options: ["45 km/h", "50 km/h", "60 km/h", "75 km/h"],
    correctAnswer: "60 km/h",
    category: "Quantitative",
  },
  {
    question: "Choose the next term: 2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "48"],
    correctAnswer: "42",
    category: "Logical Reasoning",
  },
  {
    question: "If 8 workers finish a task in 12 days, how many days will 6 workers take at the same rate?",
    options: ["14", "16", "18", "20"],
    correctAnswer: "16",
    category: "Quantitative",
  },
  {
    question: "Which word is closest in meaning to 'efficient'?",
    options: ["Wasteful", "Productive", "Slow", "Careless"],
    correctAnswer: "Productive",
    category: "Verbal",
  },
  { question: "What is 15% of 200?", options: ["20", "25", "30", "35"], correctAnswer: "30", category: "Quantitative" },
  { question: "A product costs 800 after a 20% discount. What was its original price?", options: ["900", "960", "1000", "1200"], correctAnswer: "1000", category: "Quantitative" },
  { question: "What is the median of 3, 7, 9, 12, 20?", options: ["7", "9", "10", "12"], correctAnswer: "9", category: "Quantitative" },
  { question: "If 5 pens cost 60, how much do 8 pens cost at the same rate?", options: ["84", "90", "96", "100"], correctAnswer: "96", category: "Quantitative" },
  { question: "A car travels 150 km in 2.5 hours. What is its average speed?", options: ["50 km/h", "60 km/h", "65 km/h", "75 km/h"], correctAnswer: "60 km/h", category: "Quantitative" },
  { question: "What is the next number: 3, 6, 12, 24, ?", options: ["36", "42", "48", "52"], correctAnswer: "48", category: "Logical Reasoning" },
  { question: "Find the odd one out: 16, 25, 36, 48, 64", options: ["16", "25", "48", "64"], correctAnswer: "48", category: "Logical Reasoning" },
  { question: "If all Bloops are Razzies and all Razzies are Lazzies, which is true?", options: ["All Lazzies are Bloops", "All Bloops are Lazzies", "No Bloops are Lazzies", "Some Razzies are not Lazzies"], correctAnswer: "All Bloops are Lazzies", category: "Logical Reasoning" },
  { question: "Complete the sequence: A, C, F, J, O, ?", options: ["S", "T", "U", "V"], correctAnswer: "U", category: "Logical Reasoning" },
  { question: "A is taller than B; B is taller than C. Who is shortest?", options: ["A", "B", "C", "Cannot tell"], correctAnswer: "C", category: "Logical Reasoning" },
  { question: "What is the probability of getting heads on a fair coin toss?", options: ["1/4", "1/3", "1/2", "1"], correctAnswer: "1/2", category: "Quantitative" },
  { question: "What is the simple interest on 1000 at 5% per year for 2 years?", options: ["50", "100", "150", "200"], correctAnswer: "100", category: "Quantitative" },
  { question: "A team completes 3/5 of a task. What percentage remains?", options: ["20%", "30%", "40%", "60%"], correctAnswer: "40%", category: "Quantitative" },
  { question: "Which is the largest fraction?", options: ["2/3", "3/5", "5/8", "7/12"], correctAnswer: "2/3", category: "Quantitative" },
  { question: "If x + 7 = 19, what is x?", options: ["10", "11", "12", "13"], correctAnswer: "12", category: "Quantitative" },
  { question: "Choose the word closest in meaning to concise.", options: ["Brief", "Unclear", "Detailed", "Informal"], correctAnswer: "Brief", category: "Verbal" },
  { question: "Choose the opposite of expand.", options: ["Increase", "Extend", "Contract", "Enlarge"], correctAnswer: "Contract", category: "Verbal" },
  { question: "Book is to reading as fork is to:", options: ["Drawing", "Eating", "Writing", "Cutting"], correctAnswer: "Eating", category: "Verbal" },
  { question: "Which sentence is grammatically correct?", options: ["She go to work daily.", "She goes to work daily.", "She going to work daily.", "She gone to work daily."], correctAnswer: "She goes to work daily.", category: "Verbal" },
  { question: "If today is Wednesday, what day will it be in 10 days?", options: ["Friday", "Saturday", "Sunday", "Monday"], correctAnswer: "Saturday", category: "Logical Reasoning" }
];

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

function getAptitudePercentage(score, maxScore) {
  const numericScore = Number(score);
  const numericMax = Number(maxScore || 100);
  if (!Number.isFinite(numericScore) || !Number.isFinite(numericMax) || numericMax <= 0) {
    return 0;
  }
  return Math.round((numericScore / numericMax) * 100);
}

function isAptitudeScoreQualified(score, maxScore, cutoff) {
  return getAptitudePercentage(score, maxScore) >= Number(cutoff || 0);
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
  student.currentRound = isOralPassed ? (getNextRound(drive, "Technical Oral") || "Technical Oral") : "Technical Oral";
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
      currentRound: student.currentRound,
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
      durationMinutes: drive.technicalOralDurationMinutes || 20,
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

  const isCodingRound = invitation.currentRound === "Coding" || student.currentRound === "Coding";

  if (isCodingRound) {
    const codingStartsAt = invitation.codingAccessStartsAt || student.codingAccessStartsAt || now;
    const codingExpiresAt = invitation.codingAccessExpiresAt || student.codingAccessExpiresAt || invitation.expiresAt;
    const isCodingCompleted = student.codingStatus === "Completed" || (student.roundResults && student.roundResults.some(r => normalizeRoundName(r.roundName) === "Coding" && r.status === "Completed"));
    const isCodingExpired = student.codingStatus === "Expired" || (codingExpiresAt && now > new Date(codingExpiresAt));
    const canAccessCoding = !isCodingCompleted && !isCodingExpired && now >= new Date(codingStartsAt);

    return res.json({
      token: invitation.token,
      invitationStatus: isCodingExpired ? "Expired" : "Activated",
      alreadyActivated: true,
      email: student.email,
      studentName: student.name,
      driveName: drive.driveName,
      jobRole: drive.jobRole,
      companyName: company.companyName,
      examDate: drive.examDate,
      examTime: drive.examTime,
      durationMinutes: drive.codingDurationMinutes || 45,
      status: isCodingCompleted ? "Completed" : isCodingExpired ? "Closed" : canAccessCoding ? "Ready to Begin" : "Window Not Open",
      roundName: "Coding Round",
      driveId: drive._id,
      examStartAt: codingStartsAt,
      examEndAt: codingExpiresAt,
      loginWindowOpenAt: codingStartsAt,
      canLogin: canAccessCoding,
      canStartAssessment: canAccessCoding,
      loginCountdownSeconds: 0,
      examCountdownSeconds: 0,
      activationOpenAt: codingStartsAt,
      expiresAt: codingExpiresAt,
      currentRound: "Coding",
      redirectUrl: `/coding/${drive._id}`,
    });
  }
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime, drive.timeZone);
  const examEndAt = getExamEndDate(drive);

  // If exam window schedule extends into the future, revive any expired status
  if (now < examEndAt && invitation.invitationStatus === "Expired") {
    invitation.invitationStatus = invitation.usedAt ? "Activated" : "Pending";
    await invitation.save();
  }

  if (now > examEndAt && invitation.invitationStatus !== "Activated") {
    invitation.invitationStatus = "Expired";
    await invitation.save();
  }

  const examClosed = now >= examEndAt;
  const isWindowOpen = now >= examStartAt && now < examEndAt;
  const canLogin = !examClosed || Boolean(student.isActive || invitation.usedAt);

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
    examEndTime: drive.examEndTime,
    durationMinutes: drive.durationMinutes,
    status:
      invitation.assessmentStatus === "Completed"
        ? "Completed"
        : examClosed
          ? "Closed"
          : isWindowOpen
            ? (invitation.assessmentStatus === "Started" ? "Assessment Started" : "Ready to Begin")
            : "Window Not Open",
    roundName: invitation.currentRound || "Aptitude",
    driveId: drive._id,
    examStartAt,
    examEndAt,
    canLogin,
    canStartAssessment: isWindowOpen,
    examCountdownSeconds: getCountdownSeconds(examStartAt),
    expiresAt: examEndAt,
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

  const isCodingRound = invitation.currentRound === "Coding" || student.currentRound === "Coding";

  if (isCodingRound) {
    const codingStartsAt = invitation.codingAccessStartsAt || student.codingAccessStartsAt || now;
    const codingExpiresAt = invitation.codingAccessExpiresAt || student.codingAccessExpiresAt || invitation.expiresAt;
    const isCodingCompleted = student.codingStatus === "Completed" || (student.roundResults && student.roundResults.some(r => normalizeRoundName(r.roundName) === "Coding" && r.status === "Completed"));
    const isCodingExpired = student.codingStatus === "Expired" || (codingExpiresAt && now > new Date(codingExpiresAt));

    if (isCodingCompleted) {
      return res.status(400).json({ message: "Coding Round is already completed" });
    }

    if (isCodingExpired) {
      student.codingStatus = "Expired";
      invitation.codingStatus = "Expired";
      await Promise.all([invitation.save(), student.save()]);
      return res.status(403).json({ message: "The Coding Assessment access window has expired" });
    }

    if (now < new Date(codingStartsAt)) {
      return res.status(403).json({ message: "The Coding Assessment access window is not open yet" });
    }

    student.isActive = true;
    student.lastLogin = now;
    student.currentRound = "Coding";
    await student.save();

    invitation.invitationStatus = "Activated";
    invitation.currentRound = "Coding";
    invitation.lastLogin = now;
    await invitation.save();

    const authToken = jwt.sign({ id: student._id, userType: "student" }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });

    return res.json({
      message: "Coding Round started",
      token: authToken,
      driveId: drive._id,
      studentName: student.name,
      companyName: company.companyName,
      driveName: drive.driveName,
      currentRound: "Coding",
      redirectUrl: `/coding/${drive._id}`,
      examStartAt: codingStartsAt,
      loginWindowOpenAt: codingStartsAt,
    });
  }
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime, drive.timeZone);
  const examEndAt = getExamEndDate(drive);

  // If exam schedule was extended/updated and now < examEndAt, revive expired invitation
  if (now < examEndAt && invitation.invitationStatus === "Expired") {
    invitation.invitationStatus = invitation.usedAt ? "Activated" : "Pending";
  }

  // Invitation expiry check
  if (now > examEndAt && invitation.invitationStatus !== "Activated") {
    invitation.invitationStatus = "Expired";
    await invitation.save();
    return res.status(403).json({ message: "This invitation has expired" });
  }

  // Exam window closed check
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
    examEndTime: drive.examEndTime,
    durationMinutes: drive.durationMinutes,
    rounds: drive.rounds,
    assessmentStatus: student.assessmentStatus,
    startedAt: student.startedAt,
    completedAt: student.completedAt,
    examStartAt: getExamStartDate(drive.examDate, drive.examTime, drive.timeZone),
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

  const now = new Date();
  const examEndAt = getExamEndDate(drive);
  const durationMs = Number(drive.durationMinutes) * 60 * 1000;

  // Compute server-authoritative personal deadline for the student
  let aptitudeExpiresAt = student.aptitudeExpiresAt;
  if (!aptitudeExpiresAt && student.startedAt) {
    aptitudeExpiresAt = new Date(new Date(student.startedAt).getTime() + durationMs);
    student.aptitudeExpiresAt = aptitudeExpiresAt;
    await student.save();
  }

  // Check if the personal deadline has passed and auto-mark as expired
  if (aptitudeExpiresAt && now >= new Date(aptitudeExpiresAt) && student.assessmentStatus === "Started") {
    // Auto-finalize: assessment time expired on server side
    // Return current state - the submit endpoint handles scoring
  }

  res.json({
    studentName: student.name,
    companyName: company.companyName,
    driveName: drive.driveName,
    driveId: drive._id,
    examDate: drive.examDate,
    examTime: drive.examTime,
    examEndTime: drive.examEndTime,
    durationMinutes: drive.durationMinutes,
    assessmentStatus: student.assessmentStatus,
    startedAt: student.startedAt,
    aptitudeExpiresAt,
    examStartAt: getExamStartDate(drive.examDate, drive.examTime, drive.timeZone),
    examEndAt,
    canStartAssessment:
      student.assessmentStatus !== "Completed" &&
      now >= getExamStartDate(drive.examDate, drive.examTime, drive.timeZone) &&
      now < examEndAt &&
      (student.assessmentStatus === "Started" || examEndAt.getTime() - now.getTime() >= durationMs),
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

// GET /api/students/assessment/:driveId/questions — fetch aptitude questions for the student (no correct answers)
router.get("/assessment/:driveId/questions", requireStudent, async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.studentId, drive: req.params.driveId });
    if (!student) {
      return res.status(404).json({ message: "Assessment not found for this student" });
    }

    // Only allow if assessment is started or pending
    if (student.assessmentStatus === "Completed") {
      return res.status(400).json({ message: "Assessment already submitted" });
    }

    // Look for drive-specific questions
    const driveQuestions = await AptitudeQuestion.find({ drive: req.params.driveId }).sort({ questionNumber: 1 }).lean();

    let questions;
    if (driveQuestions.length > 0) {
      // Strip correct answers before sending to client
      questions = driveQuestions.map(q => ({
        id: String(q._id),
        question: q.question,
        options: q.options,
        marks: q.marks || 1,
        category: q.category || "General",
        difficulty: q.difficulty || "Medium",
      }));
    } else {
      // Fallback: general demo questions (no answer key exposed)
      questions = DEMO_APTITUDE_QUESTIONS.map((q, i) => ({
        id: `demo_q${i + 1}`,
        question: q.question,
        options: q.options,
        marks: 20,
        category: q.category || "General",
        difficulty: "Medium",
      }));
    }

    res.json({ questions, totalQuestions: questions.length, usingDemoQuestions: driveQuestions.length === 0 });
  } catch (err) {
    console.error("[questions] Error fetching aptitude questions:", err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
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
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime, drive.timeZone);
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
  const examStartAt = getExamStartDate(drive.examDate, drive.examTime, drive.timeZone);
  const examEndAt = getExamEndDate(drive);
  const durationMs = Number(drive.durationMinutes) * 60 * 1000;

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

  // Prevent starting if insufficient time remains to complete the assessment
  const remainingMs = examEndAt.getTime() - now.getTime();
  if (remainingMs < durationMs) {
    return res.status(403).json({
      message: `Insufficient time remaining. The assessment requires ${drive.durationMinutes} minutes but only ${Math.floor(remainingMs / 60000)} minutes remain before the window closes.`,
      examEndAt,
    });
  }

  // If student already started, return the existing deadline (do NOT reset timer)
  if (student.assessmentStatus === "Started" && student.aptitudeExpiresAt) {
    return res.json({
      message: "Assessment already in progress",
      assessmentStatus: student.assessmentStatus,
      startedAt: student.startedAt,
      aptitudeExpiresAt: student.aptitudeExpiresAt,
      currentRound: student.currentRound,
    });
  }

  // If already completed, return completed status
  if (student.assessmentStatus === "Completed") {
    return res.status(400).json({ message: "Assessment already completed", assessmentStatus: "Completed" });
  }

  const startedAt = student.startedAt || now;
  const aptitudeExpiresAt = new Date(startedAt.getTime() + durationMs);

  student.assessmentStatus = "Started";
  student.startedAt = startedAt;
  student.aptitudeExpiresAt = aptitudeExpiresAt;
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
    aptitudeExpiresAt: student.aptitudeExpiresAt,
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
  const existingAptitudeRound = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === "Aptitude");
  const existingMaxScore = existingAptitudeRound?.maxScore || 100;

  if (student.assessmentStatus === "Completed" && typeof existingScore === "number") {
    const existingQualified = isAptitudeScoreQualified(existingScore, existingMaxScore, drive.aptitudeCutoff);
    const nextRound = existingQualified ? getNextRound(drive, "Aptitude") : null;
    return res.json({
      message: "Aptitude Assessment Completed",
      score: existingScore,
      maxScore: existingMaxScore,
      percentage: getAptitudePercentage(existingScore, existingMaxScore),
      result: student.result,
      isAptitudeQualified: existingQualified,
      qualifiedForOral: false,
      nextRound: student.result === "Rejected" ? null : nextRound,
      completedAt: student.completedAt,
    });
  }

  const submittedAnswers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  const storedAnswers = student.answers instanceof Map ? Object.fromEntries(student.answers) : (student.answers || {});
  const answers = Object.keys(submittedAnswers).length > 0 ? submittedAnswers : storedAnswers;
  const completedAt = new Date();

  // SERVER-SIDE SCORE CALCULATION: Never trust client-submitted score
  let score = 0;
  let totalMaxScore = 0;

  // Look for drive-specific questions to calculate score authoritatively
  const driveQuestions = await AptitudeQuestion.find({ drive: student.drive }).lean();

  if (driveQuestions.length > 0) {
    // Score against drive-configured questions
    for (const q of driveQuestions) {
      const questionId = String(q._id);
      const questionMarks = q.marks || 1;
      totalMaxScore += questionMarks;
      const studentAnswer = answers[questionId];
      if (studentAnswer && studentAnswer === q.correctAnswer) {
        score += questionMarks;
      }
    }
  } else {
    // Score against demo questions (used when no drive questions exist)
    for (let i = 0; i < DEMO_APTITUDE_QUESTIONS.length; i++) {
      const q = DEMO_APTITUDE_QUESTIONS[i];
      const questionId = `demo_q${i + 1}`;
      const questionMarks = 20;
      totalMaxScore += questionMarks;
      const studentAnswer = answers[questionId];
      if (studentAnswer && studentAnswer === q.correctAnswer) {
        score += questionMarks;
      }
    }
    // Fallback: if student used old numeric IDs (q1, q2...) accept those too
    if (score === 0 && Object.keys(answers).length > 0) {
      const legacyAnswers = answers;
      const legacyMap = Object.fromEntries(Array.from({ length: DEMO_APTITUDE_QUESTIONS.length }, (_, i) => [`q${i + 1}`, i]));
      let legacyScore = 0;
      let legacyMax = 0;
      for (const [qId, answer] of Object.entries(legacyAnswers)) {
        const idx = legacyMap[qId];
        if (idx !== undefined) {
          legacyMax += 20;
          if (answer === DEMO_APTITUDE_QUESTIONS[idx]?.correctAnswer) {
            legacyScore += 20;
          }
        }
      }
      if (legacyMax > 0) {
        score = legacyScore;
        totalMaxScore = legacyMax;
      }
    }
  }

  const isAptitudeQualified = isAptitudeScoreQualified(score, totalMaxScore || 100, drive.aptitudeCutoff);
  const aptitudePercentage = getAptitudePercentage(score, totalMaxScore || 100);

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
    maxScore: totalMaxScore || 100,
    startedAt: student.startedAt,
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
      maxScore: totalMaxScore || 100,
      percentage: aptitudePercentage,
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

    if (nextRound === "Coding") {
      const codingDurationHours = drive.codingWindowDurationHours || 6;
      student.codingStatus = "Active";
      student.codingAccessStartsAt = completedAt;
      student.codingAccessExpiresAt = new Date(completedAt.getTime() + codingDurationHours * 60 * 60 * 1000);
      if (invitation) {
        invitation.codingStatus = "Active";
        invitation.codingAccessStartsAt = student.codingAccessStartsAt;
        invitation.codingAccessExpiresAt = student.codingAccessExpiresAt;
        invitation.expiresAt = student.codingAccessExpiresAt;
      }
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
      maxScore: totalMaxScore || 100,
      percentage: aptitudePercentage,
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
      maxScore: totalMaxScore || 100,
      percentage: aptitudePercentage,
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

    if (!startsAt || !expiresAt || technicalState === "Not Selected" || !invitation?.technicalAssessmentEmailSent) {
      return res.status(403).json({
        message: "You have not been invited to the Technical Assessment yet.",
        technicalAssessmentStatus: "Not Selected",
      });
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
      maxQuestions: 10,
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

const HR_QUESTIONS = [
  "Tell us about yourself and the experiences most relevant to this role.",
  "What interested you in this position and our organization?",
  "Describe a challenging situation at work or school and how you handled it.",
  "How do you respond to constructive feedback or disagreement with a teammate?",
  "What are your professional goals for the next few years?",
];

router.get("/hr/questions", requireStudent, async (req, res) => {
  const student = await Student.findById(req.studentId);
  const drive = student ? await HiringDrive.findById(student.drive) : null;
  if (!student || !drive || !getDriveRounds(drive).includes("HR") || !canAccessRound(drive, student, "HR")) {
    return res.status(403).json({ message: "The HR round is not available yet." });
  }
  res.json({ questions: HR_QUESTIONS });
});

router.post("/hr/submit", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    const drive = student ? await HiringDrive.findById(student.drive) : null;
    if (!student || !drive || !getDriveRounds(drive).includes("HR") || !canAccessRound(drive, student, "HR")) {
      return res.status(403).json({ message: "The HR round is not available yet." });
    }
    const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};
    if (HR_QUESTIONS.some((_, i) => !String(answers[i] || "").trim())) {
      return res.status(400).json({ message: "Please answer all HR questions before submitting." });
    }
    const completedAt = new Date();
    const score = 100;
    student.hrAnswers = answers;
    student.hrScore = score;
    student.roundResults = (student.roundResults || []).filter(r => normalizeRoundName(r.roundName) !== "HR");
    student.roundResults.push({ roundName: "HR", status: "Completed", score, maxScore: 100, completedAt, submission: answers });
    student.currentRound = getNextRound(drive, "HR") || "HR";
    student.result = determineFinalResult(drive, student);
    if (student.result !== "Pending") {
      student.assessmentStatus = "Completed";
      student.completedAt = completedAt;
      student.overallScore = calculateOverallScore(drive, student);
    }
    await student.save();
    const invitation = await Invitation.findOne({ student: student._id, drive: drive._id });
    if (invitation) {
      invitation.currentRound = student.currentRound;
      invitation.result = student.result;
      await invitation.save();
    }
    res.json({ message: "HR round submitted successfully.", score, result: student.result });
  } catch (error) {
    res.status(500).json({ message: error.message || "HR round submission failed." });
  }
});

export default router;
