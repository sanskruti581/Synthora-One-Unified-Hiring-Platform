import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: "HiringDrive", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true },
    invitationStatus: {
      type: String,
      enum: ["Pending", "Activated", "Expired"],
      default: "Pending",
    },
    assessmentStatus: {
      type: String,
      enum: ["Pending", "Logged In", "Started", "Completed"],
      default: "Pending",
    },
    currentRound: { type: String, default: "Aptitude" },
    activationOpenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    emailStatus: {
      type: String,
      enum: ["sent", "failed", "smtp_not_configured"],
      default: "smtp_not_configured",
    },
    emailSent: { type: Boolean, default: false },
    sentTime: Date,
    deliveryStatus: { type: String, default: "Not Sent" },
    emailError: String,
    sentAt: Date,
    lastLogin: Date,
    usedAt: Date,
    startedAt: Date,
    completedAt: Date,
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    score: { type: Number, default: null },
    aptitudeScore: { type: Number, default: null },
    technicalOralScore: { type: Number, default: null },
    technicalOralStatus: { type: String, default: "Not Started" },
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
    result: {
      type: String,
      enum: ["Pending", "Qualified", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Invitation", invitationSchema);
