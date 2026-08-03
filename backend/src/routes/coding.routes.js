import { Router } from "express";
import mongoose from "mongoose";
import { requireStudent } from "../middleware/auth.js";
import CodingQuestion from "../models/CodingQuestion.js";
import HiringDrive from "../models/HiringDrive.js";
import Student from "../models/Student.js";
import Invitation from "../models/Invitation.js";
import { executeCode } from "../utils/codeExecutor.js";
import {
  getNextRound,
  normalizeRoundName,
  calculateOverallScore,
  determineFinalResult,
} from "../utils/roundUtils.js";

const router = Router();

// GET /api/coding/questions/:driveId
router.get("/questions/:driveId", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    const drive = await HiringDrive.findById(req.params.driveId);

    if (!student || !drive) {
      return res.status(404).json({ error: "Student or Drive not found" });
    }

    // Verify the drive actually has a Coding round configured
    const driveHasCoding = (drive.rounds || []).some(
      r => normalizeRoundName(r) === "Coding"
    );
    if (!driveHasCoding) {
      return res.status(403).json({ error: "This drive does not have a Coding round" });
    }

    // Allow access when:
    //  (a) the student's currentRound is Coding (normal flow after assessment init), OR
    //  (b) the student has a Coding round result in any active state (In Progress / Completed)
    //      — belt-and-suspenders for the rare case where currentRound hasn't persisted yet.
    const normalizedCurrent = normalizeRoundName(student.currentRound);
    const hasActiveCoding = (student.roundResults || []).some(
      r => normalizeRoundName(r.roundName) === "Coding" &&
           (r.status === "Completed" || r.status === "In Progress")
    );

    if (normalizedCurrent !== "Coding" && !hasActiveCoding) {
      console.warn(
        `[coding/questions] Student ${student._id} blocked: currentRound=${student.currentRound},` +
        ` hasActiveCoding=${hasActiveCoding}`
      );
      return res.status(403).json({ error: "Not currently on the Coding round" });
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
    const { language, sourceCode, questionId } = req.body;
    
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

// POST /api/coding/submit
router.post("/submit", requireStudent, async (req, res) => {
  try {
    const { driveId, solutions } = req.body;
    
    const student = await Student.findById(req.studentId);
    const drive = await HiringDrive.findById(driveId);

    if (!student || !drive) {
      return res.status(404).json({ error: "Student or Drive not found" });
    }

    if (normalizeRoundName(student.currentRound) !== "Coding") {
      return res.status(403).json({ error: "Not currently on the Coding round" });
    }

    // Check if Coding round already completed
    const existingCodingResult = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === "Coding");
    if (existingCodingResult && existingCodingResult.status === "Completed") {
      return res.status(400).json({ error: "Coding round already completed" });
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

    student.codingAnswers = solutions;
    student.codingScore = totalScore;

    // Remove any existing 'Coding' result before pushing
    student.roundResults = (student.roundResults || []).filter(r => normalizeRoundName(r.roundName) !== "Coding");

    student.roundResults.push({
      roundName: "Coding",
      status: "Completed",
      score: totalScore,
      maxScore: totalMaxScore,
      completedAt: new Date(),
      submission: submissionDetails
    });

    const nextRound = getNextRound(drive, "Coding");

    if (nextRound) {
      student.currentRound = nextRound;
      // Note: assessmentStatus remains "Started"
    } else {
      student.assessmentStatus = "Completed";
      student.completedAt = new Date();
      student.overallScore = calculateOverallScore(drive, student);
      student.result = determineFinalResult(drive, student);

      const invitation = await Invitation.findOne({ student: student._id, drive: drive._id });
      if (invitation) {
        invitation.status = "Completed";
        await invitation.save();
      }
    }

    await student.save();

    // Count total test-case pass/fail across all submitted solutions
    let totalPassed = 0;
    let totalTestCases = 0;
    for (const detail of Object.values(submissionDetails)) {
      totalPassed += detail.results.passedCount;
      totalTestCases += detail.results.totalCount;
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

    let needsSave = false;
    let codingResult = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === "Coding");
    if (!codingResult) {
      codingResult = { roundName: "Coding", status: "In Progress", startedAt: new Date() };
      student.roundResults.push(codingResult);
      needsSave = true;
    } else if (!codingResult.startedAt) {
      codingResult.startedAt = new Date();
      needsSave = true;
    }

    // Advance currentRound to Coding so that the questions and submit
    // endpoints (which both check currentRound === "Coding") can proceed.
    // This is safe: arriving at this endpoint means the student is starting
    // the Coding round, regardless of how they navigated here.
    if (normalizeRoundName(student.currentRound) !== "Coding") {
      student.currentRound = "Coding";
      needsSave = true;
    }

    if (needsSave) {
      await student.save();
    }
    
    const codingStartedAt = codingResult.startedAt || new Date();

    // Determine exam end time bounds
    const driveStartStr = `${drive.examDate}T${drive.examTime}`;
    const examStartAt = new Date(driveStartStr);
    const examEndAt = new Date(examStartAt.getTime() + drive.durationMinutes * 60000);

    res.json({
      studentName: student.name,
      companyName: company?.companyName || "Company",
      driveName: drive.driveName,
      driveId: drive._id.toString(),
      examDate: drive.examDate,
      examTime: drive.examTime,
      durationMinutes: drive.durationMinutes,
      codingDurationMinutes: drive.codingDurationMinutes || drive.durationMinutes,
      assessmentStatus: student.assessmentStatus,
      currentRound: student.currentRound,
      startedAt: codingStartedAt.toISOString(),
      examStartAt: examStartAt.toISOString(),
      examEndAt: examEndAt.toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
