import mongoose from "mongoose";

const oralTurnSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  category: {
    type: String,
    enum: ["Fundamental", "Conceptual", "Practical", "Scenario", "Adaptive Follow-up"],
    default: "Conceptual",
  },
  question: { type: String, required: true },
  spokenAnswer: { type: String, default: "" },
  score: { type: Number, min: 0, max: 10, default: null },
  technicalAccuracy: { type: Number, min: 0, max: 10, default: null },
  conceptualKnowledge: { type: Number, min: 0, max: 10, default: null },
  communicationSkill: { type: Number, min: 0, max: 10, default: null },
  completeness: { type: Number, min: 0, max: 10, default: null },
  relevance: { type: Number, min: 0, max: 10, default: null },
  feedback: { type: String, default: "" },
  isSatisfactory: { type: Boolean, default: false },
  answeredAt: { type: Date },
});

const technicalOralInterviewSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HiringDrive",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    jobRole: { type: String, required: true },
    status: {
      type: String,
      enum: ["In Progress", "Completed", "Terminated"],
      default: "In Progress",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    currentQuestionIndex: { type: Number, default: 0 },
    maxQuestions: { type: Number, default: 5 },
    overallScore: { type: Number, min: 0, max: 100, default: null },
    overallFeedback: { type: String, default: "" },
    technicalAccuracyAvg: { type: Number, default: null },
    conceptualKnowledgeAvg: { type: Number, default: null },
    communicationSkillAvg: { type: Number, default: null },
    completenessAvg: { type: Number, default: null },
    relevanceAvg: { type: Number, default: null },
    questions: [oralTurnSchema],
  },
  { timestamps: true }
);

technicalOralInterviewSchema.index({ studentId: 1, driveId: 1 });

export default mongoose.model("TechnicalOralInterview", technicalOralInterviewSchema);
