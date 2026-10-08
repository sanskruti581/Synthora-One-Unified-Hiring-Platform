import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: "HiringDrive", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    passwordHash: { type: String, required: true },
    plainPasswordForInitialEmail: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    activatedAt: { type: Date },
    assessmentStatus: {
      type: String,
      enum: ["Pending", "Logged In", "Started", "Completed"],
      default: "Pending",
    },
    lastLogin: Date,
    startedAt: Date,
    completedAt: Date,
    currentRound: { type: String, default: "Aptitude" },
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    score: { type: Number, default: null },
    aptitudeScore: { type: Number, default: null },
    technicalOralScore: { type: Number, default: null },
    technicalOralStatus: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "Exempt"],
      default: "Not Started",
    },
    technicalAssessmentStatus: {
      type: String,
      enum: ["Not Selected", "Shortlisted", "Active", "In Progress", "Completed", "Expired"],
      default: "Not Selected",
    },
    technicalAssessmentInvitedAt: Date,
    technicalAssessmentAccessStartsAt: Date,
    technicalAssessmentAccessExpiresAt: Date,
    technicalAssessmentEmailStatus: {
      type: String,
      enum: ["sent", "failed", "smtp_not_configured"],
      default: "smtp_not_configured",
    },
    technicalAssessmentEmailSent: { type: Boolean, default: false },
    technicalAssessmentEmailError: String,
    technicalOralInterview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TechnicalOralInterview",
    },
    result: {
      type: String,
      enum: ["Pending", "Qualified", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

studentSchema.index({ email: 1, drive: 1 }, { unique: true });

export default mongoose.model("Student", studentSchema);
