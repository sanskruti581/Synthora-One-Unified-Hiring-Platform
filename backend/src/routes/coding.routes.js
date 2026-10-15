import { Router } from "express";
import mongoose from "mongoose";
import { requireStudent } from "../middleware/auth.js";
import CodingQuestion from "../models/CodingQuestion.js";
import HiringDrive from "../models/HiringDrive.js";
import Student from "../models/Student.js";
import Invitation from "../models/Invitation.js";
import Company from "../models/Company.js";
import { executeCode } from "../utils/codeExecutor.js";
import {
  getNextRound,
  normalizeRoundName,
  calculateOverallScore,
  determineFinalResult,
  canAccessRound,
} from "../utils/roundUtils.js";
import { promoteStudentToTechnicalAssessment } from "../utils/technicalAssessment.js";

const router = Router();

function getCodingResult(student) {
  return (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === "Coding");
}

function getCodingDeadline(student, drive) {
  const durationMinutes = Number(drive.codingDurationMinutes || 45);
  const startedAt = student.codingStartedAt || getCodingResult(student)?.startedAt;
  if (!startedAt) return null;
  const sessionEndAt = new Date(new Date(startedAt).getTime() + durationMinutes * 60000);
  if (student.codingAccessExpiresAt && new Date(student.codingAccessExpiresAt).getTime() < sessionEndAt.getTime()) {
    return new Date(student.codingAccessExpiresAt);
  }
  return sessionEndAt;
}

function hasCodingDeadlineExpired(student, drive) {
  const deadline = getCodingDeadline(student, drive);
  return Boolean(deadline && Date.now() > deadline.getTime());
}

async function loadAuthorizedCodingContext(req, res, driveId) {
  const student = await Student.findById(req.studentId);
  const drive = await HiringDrive.findById(driveId);

  if (!student || !drive) {
    res.status(404).json({ error: "Student or Drive not found" });
    return null;
  }

  if (String(student.drive) !== String(drive._id)) {
    res.status(403).json({ error: "This coding round is not assigned to your account" });
    return null;
  }

  const driveHasCoding = (drive.rounds || []).some(r => normalizeRoundName(r) === "Coding");
  if (!driveHasCoding) {
    res.status(403).json({ error: "This drive does not have a Coding round" });
    return null;
  }

  if (!canAccessRound(drive, student, "Coding") || student.result === "Rejected") {
    res.status(403).json({ error: "You must complete and qualify previous rounds before accessing the Coding round" });
    return null;
  }

  return { student, drive };
}

// GET /api/coding/questions/:driveId
router.get("/questions/:driveId", requireStudent, async (req, res) => {
  try {
    const context = await loadAuthorizedCodingContext(req, res, req.params.driveId);
    if (!context) return;
    const { student, drive } = context;

    const normalizedCurrent = normalizeRoundName(student.currentRound);
    const codingResult = getCodingResult(student);
    const hasActiveCoding = codingResult && (codingResult.status === "Completed" || codingResult.status === "In Progress");

    if (normalizedCurrent !== "Coding" && !hasActiveCoding) {
      console.warn(
        `[coding/questions] Student ${student._id} blocked: currentRound=${student.currentRound},` +
        ` hasActiveCoding=${hasActiveCoding}`
      );
      return res.status(403).json({ error: "Not currently on the Coding round" });
    }

    if (hasCodingDeadlineExpired(student, drive) && student.codingStatus !== "Completed") {
      student.codingStatus = "Expired";
      await student.save();
      return res.status(403).json({ error: "Coding round deadline has expired" });
    }

    // Get all coding questions
    const questions = await CodingQuestion.find({}).lean();

    // Strip out hidden test cases before sending to client
    const safeQuestions = questions.map(q => ({
      ...q,
      testCases: q.testCases.filter(tc => !tc.isHidden)
    }));

    res.json({ questions: safeQuestions });
  } catch (err) {
    console.error("[coding/questions] Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/coding/run
router.post("/run", requireStudent, async (req, res) => {
  try {
    const { language, sourceCode, questionId, driveId } = req.body;
    const context = await loadAuthorizedCodingContext(req, res, driveId);
    if (!context) return;
    const { student, drive } = context;

    if (hasCodingDeadlineExpired(student, drive) || student.codingStatus === "Completed") {
      return res.status(403).json({ error: "Coding round is closed" });
    }
    
    const question = await CodingQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Only run visible test cases for "Run"
    const visibleTestCases = question.testCases.filter(tc => !tc.isHidden);

    const result = await executeCode({
      language,
      sourceCode,
      testCases: visibleTestCases,
      timeLimit: question.timeLimit
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// POST /api/coding/save
router.post("/save", requireStudent, async (req, res) => {
  try {
    const { driveId, solutions, autoSubmitted = false } = req.body;
    const context = await loadAuthorizedCodingContext(req, res, driveId);
    if (!context) return;
    const { student, drive } = context;

    if (student.codingStatus === "Completed") {
      return res.status(400).json({ error: "Coding round already completed" });
    }

    if (hasCodingDeadlineExpired(student, drive)) {
      return res.status(403).json({ error: "Coding round deadline has expired" });
    }

    student.codingDrafts = {
      solutions: Array.isArray(solutions) ? solutions : [],
      savedAt: new Date(),
    };
    await student.save();

    res.json({ message: "Coding draft saved", savedAt: student.codingDrafts.savedAt });
  } catch (err) {
    console.error("[coding/save] Error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// POST /api/coding/submit
router.post("/submit", requireStudent, async (req, res) => {
  try {
    const { driveId, solutions, autoSubmitted } = req.body;
    const context = await loadAuthorizedCodingContext(req, res, driveId);
    if (!context) return;
    const { student, drive } = context;

    if (normalizeRoundName(student.currentRound) !== "Coding") {
      return res.status(403).json({ error: "Not currently on the Coding round" });
    }

    // Check if Coding round already completed
    const existingCodingResult = getCodingResult(student);
    if (existingCodingResult && existingCodingResult.status === "Completed") {
      return res.json({
        message: "Coding round already completed",
        codingScore: student.codingScore ?? existingCodingResult.score ?? 0,
        maxCodingScore: existingCodingResult.maxScore ?? 0,
        passedCount: 0,
        totalCount: 0,
        nextRound: null,
        result: student.result || "Pending",
        overallScore: student.overallScore || null,
        completedAt: existingCodingResult.completedAt ? new Date(existingCodingResult.completedAt).toISOString() : undefined,
      });
    }

    if (hasCodingDeadlineExpired(student, drive) && !autoSubmitted) {
      student.codingStatus = "Expired";
      await student.save();
      return res.status(403).json({ error: "Coding round deadline has expired. Final submission is closed." });
    }

    // Evaluate all answers against all test cases (including hidden)
    let totalScore = 0;
    let totalMaxScore = 0;
    const submissionDetails = {};

    for (const sol of (solutions || [])) {
      const questionId = sol.questionId;
      const question = await CodingQuestion.findById(questionId);
      if (!question) continue;

      const maxMarks = question.marks || 10;
      totalMaxScore += maxMarks;

      const execResult = await executeCode({
        language: sol.language,
        sourceCode: sol.sourceCode,
        testCases: question.testCases,
        timeLimit: question.timeLimit
      });

      const score = (execResult.passedCount / execResult.totalCount) * maxMarks;
      totalScore += score;

      submissionDetails[questionId] = {
        language: sol.language,
        sourceCode: sol.sourceCode,
        results: execResult,
        score,
        maxMarks
      };
    }

    // Calculate pass/fail metrics across all submitted solutions
    let totalPassed = 0;
    let totalTestCases = 0;
    for (const detail of Object.values(submissionDetails)) {
      totalPassed += detail.results.passedCount;
      totalTestCases += detail.results.totalCount;
    }

    student.codingAnswers = solutions;
    student.codingScore = totalScore;
    student.codingStatus = "Completed";

    // Remove any existing 'Coding' result before pushing
    student.roundResults = (student.roundResults || []).filter(r => normalizeRoundName(r.roundName) !== "Coding");

    student.roundResults.push({
      roundName: "Coding",
      status: "Completed",
      score: totalScore,
      maxScore: totalMaxScore,
      startedAt: student.codingStartedAt,
      completedAt: new Date(),
      submission: submissionDetails
    });

    // Check qualification criteria for BOTH Aptitude Assessment and Coding Round
    const aptitudeScore = student.aptitudeScore ?? student.score;
    const aptitudeRound = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === "Aptitude");
    const aptitudePercentage = typeof aptitudeScore === "number"
      ? (aptitudeScore / (aptitudeRound?.maxScore || 100)) * 100
      : 100;
    const isAptitudeQualified = typeof aptitudeScore === "number"
      ? (!drive.aptitudeCutoff || aptitudePercentage >= Number(drive.aptitudeCutoff))
      : true;
    const isCodingQualified = !drive.codingCutoff || totalScore >= Number(drive.codingCutoff);
    const isBothQualified = isAptitudeQualified && isCodingQualified;

    if (!isBothQualified) {
      student.result = "Rejected";
      student.assessmentStatus = "Completed";
      student.completedAt = new Date();
      student.overallScore = calculateOverallScore(drive, student);
      await student.save();

      const invitation = await Invitation.findOne({ student: student._id, drive: drive._id });
      if (invitation) {
        invitation.assessmentStatus = "Completed";
        invitation.completedAt = student.completedAt;
        invitation.result = "Rejected";
        invitation.codingScore = totalScore;
        invitation.codingStatus = "Completed";
        invitation.overallScore = student.overallScore;
        await invitation.save();
      }

      return res.json({
        message: "Assessment completed. Cutoff not cleared.",
        codingScore: totalScore,
        maxCodingScore: totalMaxScore,
        passedCount: totalPassed,
        totalCount: totalTestCases,
        nextRound: null,
        result: "Rejected",
        isQualified: false,
        overallScore: student.overallScore,
        completedAt: student.completedAt.toISOString(),
      });
    }

    const nextRound = getNextRound(drive, "Coding");

    if (nextRound) {
      student.currentRound = nextRound;
      student.result = "Pending";

      if (nextRound === "Technical Oral") {
        const company = await Company.findById(drive.company);
        const invitation = await Invitation.findOne({ student: student._id, drive: drive._id });
        await promoteStudentToTechnicalAssessment({
          student,
          drive,
          company,
          invitation,
          codingScore: totalScore
        });
      }
    } else {
      student.assessmentStatus = "Completed";
      student.completedAt = new Date();
      student.overallScore = calculateOverallScore(drive, student);
      student.result = determineFinalResult(drive, student);
    }

    await student.save();

    const invitation = await Invitation.findOne({ student: student._id, drive: drive._id });
    if (invitation) {
      invitation.codingScore = totalScore;
      invitation.codingStatus = "Completed";
      invitation.overallScore = student.overallScore;
      if (nextRound) {
        invitation.currentRound = nextRound;
      } else {
        invitation.assessmentStatus = "Completed";
        invitation.completedAt = student.completedAt;
        invitation.result = student.result;
      }
      await invitation.save();
    }

    res.json({
      message: "Coding assessment completed",
      codingScore: totalScore,
      maxCodingScore: totalMaxScore,
      passedCount: totalPassed,
      totalCount: totalTestCases,
      nextRound,
      result: student.result || "Pending",
      overallScore: student.overallScore || null,
      completedAt: student.completedAt ? student.completedAt.toISOString() : undefined,
    });
  } catch (err) {
    console.error("[coding/submit] Error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// GET /api/coding/assessment/:driveId
router.get("/assessment/:driveId", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    const drive = await HiringDrive.findById(req.params.driveId);

    if (!student || !drive) {
      return res.status(404).json({ error: "Student or Drive not found" });
    }

    const company = await mongoose.model('Company').findById(drive.company);

    // Check that student has completed Aptitude before starting Coding
    if (!canAccessRound(drive, student, "Coding") || student.result === "Rejected") {
      return res.status(403).json({ error: "You must complete and qualify the Aptitude round before accessing the Coding round" });
    }

    let needsSave = false;
    let codingResult = getCodingResult(student);
    if (!codingResult) {
      codingResult = { roundName: "Coding", status: "In Progress", startedAt: new Date() };
      student.roundResults.push(codingResult);
      needsSave = true;
    } else if (!codingResult.startedAt) {
      codingResult.startedAt = new Date();
      needsSave = true;
    }

    if (normalizeRoundName(student.currentRound) !== "Coding") {
      student.currentRound = "Coding";
      needsSave = true;
    }

    if (student.codingStatus !== "In Progress" && student.codingStatus !== "Completed") {
      student.codingStatus = "In Progress";
      needsSave = true;
    }

    if (!student.codingStartedAt) {
      student.codingStartedAt = codingResult.startedAt || new Date();
      needsSave = true;
    }

    const codingStartedAt = codingResult.startedAt || student.codingStartedAt || new Date();
    const codingDurationMinutes = Number(drive.codingDurationMinutes || 45);
    const sessionEndAt = new Date(new Date(codingStartedAt).getTime() + codingDurationMinutes * 60000);
    if (!student.codingExpiresAt || new Date(student.codingExpiresAt).getTime() !== sessionEndAt.getTime()) {
      student.codingExpiresAt = sessionEndAt;
      needsSave = true;
    }

    if (needsSave) {
      await student.save();
    }

    const examStartAt = student.codingAccessStartsAt || codingStartedAt;
    const examEndAt = student.codingAccessExpiresAt && new Date(student.codingAccessExpiresAt).getTime() < sessionEndAt.getTime()
      ? new Date(student.codingAccessExpiresAt)
      : sessionEndAt;

    res.json({
      studentName: student.name,
      companyName: company?.companyName || "Company",
      driveName: drive.driveName,
      driveId: drive._id.toString(),
      examDate: drive.examDate,
      examTime: drive.examTime,
      durationMinutes: drive.durationMinutes,
      codingDurationMinutes,
      assessmentStatus: student.assessmentStatus,
      currentRound: student.currentRound,
      startedAt: new Date(codingStartedAt).toISOString(),
      examStartAt: new Date(examStartAt).toISOString(),
      examEndAt: examEndAt.toISOString(),
      codingExpiresAt: student.codingExpiresAt?.toISOString(),
      savedSolutions: student.codingDrafts?.solutions || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
